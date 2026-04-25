import levenshtein from 'fast-levenshtein';

// Water billing months per maintenance quarter (use lower-case 3-letter month keys)
// `q1` corresponds to maintenance quarter Q1 -> water billed for previous quarter Oct-Dec
export const waterBillingMonths = {
  q1: ['oct', 'nov', 'dec'],
  q2: ['jan', 'feb', 'mar'],
  q3: ['apr', 'may', 'jun'],
  q4: ['jul', 'aug', 'sep'],
};

export const generateResultData = (previousMaintenanceData, bankTransactionsData, manualMappings = []) => {
  let result = [];

  try {
    let remainingMaintenance = preprocessMaintenance(previousMaintenanceData);
    let remainingTransactions = preprocessTransactions(bankTransactionsData);

    // Apply manual mappings first (highest precedence)
    if (Array.isArray(manualMappings) && manualMappings.length > 0) {
      ({ result, remainingTransactions, remainingMaintenance } = byManualMapping(manualMappings, remainingMaintenance, remainingTransactions, result));
    }

    // Chain multiple assignTransaction calls
    ({ result, remainingTransactions, remainingMaintenance } = assignTransactionByFlatNum(remainingMaintenance, remainingTransactions, result));
    console.log("After assignTransactionByFlatNum, total matching result:", result.length);
    ({ result, remainingTransactions, remainingMaintenance } = assignTransactionsByNameSimilarity(remainingMaintenance, remainingTransactions, result));
    console.log("After assignTransactionsByNameSimilarity, total matching result:", result.length);
    ({ result, remainingTransactions, remainingMaintenance } = assignTransactionsByAmount(remainingMaintenance, remainingTransactions, result));
    console.log("After assignTransactionsByNameSimilarity, total matching result:", result.length);
    ({ result, remainingTransactions, remainingMaintenance } = assignTransactionsByNameAndFlat(remainingMaintenance, remainingTransactions, result));
    console.log("After assignTransactionsByNameAndFlat, total matching result:", result.length);
    ({ result, remainingTransactions, remainingMaintenance } = assignTransactionsByOnlyName(remainingMaintenance, remainingTransactions, result));
    // add reaming maintenance to result
    remainingMaintenance.forEach((maintenance) => {
      result.push(buildResult(maintenance, { transactionid: "", description: "", transactionamountinr: "" }, "no matching transaction"));
    });
    // add reaming transactions to result
    remainingTransactions.forEach((transaction) => {
      result.push(buildResult({ index: "", flatno: "", residentname: "", balance: "", assigned: false }, transaction, "no matching flat"));
    });
    console.log("Finished generateResultData successfully");
    return result;
  } catch (error) {
    console.error("Error in generateResultData:", error);
    return [];
  }
};

function preprocessMaintenance(previousMaintenanceData) {
  return previousMaintenanceData.map((row) => {
    try {
      return {
        ...row,
        balance: parseCurrency(row?.balance),
        // preserve any existing assigned flag
        assigned: row?.assigned === true,
      };
    } catch (error) {
      console.error("Error in preprocessMaintenance for row:", row, error);
      return { ...row, balance: "0", assigned: false };
    }
  });
}

function preprocessTransactions(bankTransactionsData) {
  return bankTransactionsData.map((row) => {
    try {
      // Clean up amount values - remove commas and quotes, convert to number
      let transactionAmount = row.transactionamountinr;
      if (typeof transactionAmount === 'string') {
        // Remove commas, quotes and convert to number
        transactionAmount = parseFloat(transactionAmount.replace(/[",]/g, ''));
      }

      return {
        ...row,
        transactionamountinr: transactionAmount || 0,
        assigned: row?.assigned === true,
        flat: row?.flat || extractFlatNumber(row.description),
      };
    } catch (error) {
      console.error("Error in preprocessTransactions for row:", row, error);
      return { ...row, transactionamountinr: 0, assigned: false, flat: { flatNumber: "None", confidence: "N" } };
    }
  });
}

/**
 * Apply manual mappings supplied by the user.
 * manualMappings: [{ flatNo, transactionId, reason? }]
 */
function byManualMapping(manualMappings, maintenanceList, transactionList, result) {
  // Build quick lookup maps
  const txById = new Map();
  transactionList.forEach((tx, idx) => {
    if (tx && tx.transactionid) txById.set(tx.transactionid.toString().trim(), { tx, idx });
  });

  const mByFlat = new Map();
  maintenanceList.forEach((m, idx) => {
    if (m && m.flatno) mByFlat.set(m.flatno.toString().trim(), { m, idx });
  });

  manualMappings.forEach((mapping) => {
    try {
      const flat = (mapping.flatNo || mapping.flatno || mapping.flat || '').toString().trim();
      const txId = (mapping.transactionId || mapping.transactionid || mapping.txid || '').toString().trim();
      const reason = mapping.reason || mapping.assignReason || '';

      if (!flat && !txId) return;

      const txEntry = txId ? txById.get(txId) : null;
      const maintEntry = flat ? mByFlat.get(flat) : null;

      if (txEntry && maintEntry) {
        const tx = txEntry.tx;
        const m = maintEntry.m;
        tx.assigned = true;
        m.assigned = true;
        // Build a concise manual confidence string similar to auto-matching confidence
        try {
          const diff = (m && m.balance !== undefined && tx && tx.transactionamountinr !== undefined) ? (Number(m.balance) - Number(tx.transactionamountinr)) : null;
          const diffPart = diff !== null ? `Diff:${diff}` : '';
          const flatConf = tx && tx.flat && tx.flat.confidence ? `Flat(${tx.flat.confidence})` : '';
          const names = matchingNameInTransaction(tx.description, m.residentname);
          const namePart = (names && names.length) ? `name (${names.join(", ")}) match` : '';
          const metaParts = [];
          if (diffPart) metaParts.push(diffPart);
          if (flatConf && namePart) metaParts.push(`${flatConf} and ${namePart}`);
          else if (flatConf) metaParts.push(flatConf);
          else if (namePart) metaParts.push(namePart);
          const confidence = ['manual', ...metaParts].filter(Boolean).join(', ');
          result.push(buildResultWithMeta(m, tx, confidence, reason));
        } catch (e) {
          // Fallback to a simple manual label
          result.push(buildResultWithMeta(m, tx, 'manual', reason));
        }
      } else if (txEntry && !maintEntry) {
        const tx = txEntry.tx;
        tx.assigned = true;
        // No maintenance row present — label as manual with a note
        result.push(buildResultWithMeta({ index: '', flatno: '', residentname: '', balance: '', assigned: false }, tx, `manual (no maintenance)${reason ? `: ${reason}` : ''}`, reason));
      } else if (!txEntry && maintEntry) {
        const m = maintEntry.m;
        m.assigned = true;
        // No transaction present — label as manual with a note
        result.push(buildResultWithMeta(m, { transactionid: '', description: '', transactionamountinr: '' }, `manual (no transaction)${reason ? `: ${reason}` : ''}`, reason));
      }
    } catch (err) {
      console.error('Error applying manual mapping', mapping, err);
    }
  });

  return buildFilteredResponse(maintenanceList, transactionList, result);
}

const assignTransactionByFlatNum = (maintenanceList, transactionList, result) => {
  console.log("Assigning transactions by flat number");
  maintenanceList.forEach((maintenance) => {
    if (!maintenance.flatno) {
      return;
    }
    const flatNumber = maintenance.flatno.replace(/[^0-9]/g, "");
    console.debug("checking for flat number: ", flatNumber, " in transaction list");
    const transaction = transactionList.find((transaction) => {
      if (transaction.flat.flatNumber === "None") {
        return false;
      } else if (transaction.flat.flatNumber === flatNumber) {
        return true;
      }
      return false;
    });
    if (transaction) {
      const difference = maintenance.balance - transaction.transactionamountinr;
      if (Math.abs(difference) <= 1) {
        const confidence = `Flat (${transaction.flat.confidence}) and amount match ${difference != 0 ? `, diff:${difference}` : ""}`;
        transaction.assigned = true;
        maintenance.assigned = true;
        result.push(buildResult(maintenance, transaction, confidence));
      }
    }
  });
  return buildFilteredResponse(maintenanceList, transactionList, result);
};

const assignTransactionsByNameSimilarity = (maintenanceList, transactionList, result) => {
  console.log("Assigning transactions by name similarity");
  maintenanceList.forEach((maintenance) => {
    const matchingTransactions = transactionList.filter((transaction) => {
      const difference = maintenance.balance - transaction.transactionamountinr;
      return Math.abs(difference) <= 1;
    });

    if (matchingTransactions.length === 1) {
      console.debug("Found matching transaction amount for flat: ", maintenance.flatno);
      const transaction = matchingTransactions[0];
      if (!transaction.description) {
        console.error("Transaction description is empty for transaction id ", transaction.transactionid);
        return;
      }
      const names = matchingNameInTransaction(transaction.description, maintenance.residentname);
      if (names.length === 0) {
        console.debug("Ignore now, no matching name found for transaction id ", transaction.transactionid, " and flat ", maintenance.flatno);
        return;
      }
      let difference = maintenance.balance - transaction.transactionamountinr;
      const confidence = `amount and name (${names.join(", ")}) match ${difference != 0 ? `, diff:${difference}` : ""}`;
      transaction.assigned = true;
      maintenance.assigned = true;
      console.debug("Matching name and amount, adding flat: ", maintenance.flatno, " in result, with confidence: ", confidence);
      result.push(buildResult(maintenance, transaction, confidence));
    }
  });

  const remainingTransactions = transactionList.filter((transaction) => !transaction.assigned);
  const remainingMaintenance = maintenanceList.filter((row) => !row.assigned);

  return { result, remainingTransactions, remainingMaintenance };
};

function assignTransactionsByAmount(maintenanceList, transactionList, result) {
  console.log("Assigning transactions by amount");
  maintenanceList.forEach((maintenance) => {
    const transactions = transactionList.filter((transaction) => { return (maintenance.balance - transaction.transactionamountinr) == 0 })
    if (transactions.length == 1) {
      console.debug("Found matching transaction amount for flat: ", maintenance.flatno);
      const transaction = transactions[0];
      const difference = maintenance.balance - transaction.transactionamountinr;
      if (difference == 0) {
        const confidence = `only amount match`;
        transaction.assigned = true;
        maintenance.assigned = true;
        result.push(buildResult(maintenance, transaction, confidence));
      }
    }
  });
  return buildFilteredResponse(maintenanceList, transactionList, result);
};

function assignTransactionsByNameAndFlat(maintenanceList, transactionList, result) {
  console.log("Assigning transactions by name and flat");
  maintenanceList.forEach((maintenance) => {
    if (!maintenance.flatno) {
      return;
    }
    const flatNumber = maintenance.flatno.replace(/[^0-9]/g, "");
    console.debug("checking for flat number: ", flatNumber, " in transaction list");
    const transaction = transactionList.find((transaction) => {
      if (transaction.flat.flatNumber === "None") {
        return false;
      } else if (transaction.flat.flatNumber === flatNumber) {
        return true;
      }
      return false;
    });
    if (!transaction) {
      return;
    }
    const names = matchingNameInTransaction(transaction.description, maintenance.residentname);
    if (names.length === 0) {
      console.debug("Ignore now, no matching name found for transaction id ", transaction.transactionid, " and flat ", maintenance.flatno);
      return;
    }
    const confidence = `Diff:${maintenance.balance - transaction.transactionamountinr}, Flat(${transaction.flat.confidence}) and name (${names.join(", ")}) match`;
    transaction.assigned = true;
    maintenance.assigned = true;
    console.debug("Matching name and amount, adding flat: ", maintenance.flatno, " in result, with confidence: ", confidence);
    result.push(buildResult(maintenance, transaction, confidence));

  });

  return buildFilteredResponse(maintenanceList, transactionList, result);
}

function assignTransactionsByOnlyName(maintenanceList, transactionList, result) {
  console.log("Assigning transactions by only name");
  maintenanceList.forEach((maintenance) => {
    const transactions = transactionList.filter((transaction) => {
      const names = matchingNameInTransaction(transaction.description, maintenance.residentname);
      return names.length > 0;
    });
    if (transactions.length === 1) {
      console.debug("Found matching transaction amount for flat: ", maintenance.flatno);
      const transaction = transactions[0];
      const names = matchingNameInTransaction(transaction.description, maintenance.residentname);
      if (names.length === 0) {
        console.debug("Ignore now, no matching name found for transaction id ", transaction.transactionid, " and flat ", maintenance.flatno);
        return;
      }
      const difference = maintenance.balance - transaction.transactionamountinr;
      const confidence = `Diff: ${difference},  only name match: ${names.join(", ")}`;
      transaction.assigned = true;
      maintenance.assigned = true;
      console.debug("Matching name and amount, adding flat: ", maintenance.flatno, " in result, with confidence: ", confidence);
      result.push(buildResult(maintenance, transaction, confidence));
    }
  });

  return buildFilteredResponse(maintenanceList, transactionList, result);
}

function buildResult(maintenance, transaction, confidence) {
  return {
    // propagate maintenance fields first so original CSV columns are available as top-level fields
    ...maintenance,
    // normalized/display fields (override any maintenance keys if necessary)
    index: maintenance.index,
    flatNo: maintenance.flatno,
    name: maintenance.residentname,
    // amount is the maintenance 'balance' (with penalty)
    amount: maintenance.balance,
    transactionid: transaction.transactionid,
    description: transaction.description,
    transactionamountinr: transaction.transactionamountinr,
    transactiondate: transaction.transactiondate,
    // propagate maintenance-side fields so result rows can show them when requested
    penalty: maintenance.penalty || '',
    lastmaintenancewithoutpenalty: maintenance.lastmaintenancewithoutpenalty || '',
    prevarrears: maintenance.prevarrears || '',
    confidence,
    // assignment metadata for UI and availability
    status: (maintenance.assigned && transaction.assigned) ? 'confirmed' : 'unresolved',
    assignedFlat: maintenance.flatno || '',
    assignedTransactionId: transaction.transactionid || '',
    assignedBy: '',
    assignReason: ''
  };
}

function buildResultWithMeta(maintenance, transaction, confidence, assignReason = '') {
  return {
    // propagate maintenance fields so original CSV columns are available
    ...maintenance,
    index: maintenance.index,
    flatNo: maintenance.flatno,
    name: maintenance.residentname,
    amount: maintenance.balance,
    transactionid: transaction.transactionid,
    description: transaction.description,
    transactionamountinr: transaction.transactionamountinr,
    transactiondate: transaction.transactiondate,
    // propagate maintenance-side fields
    penalty: maintenance.penalty || '',
    lastmaintenancewithoutpenalty: maintenance.lastmaintenancewithoutpenalty || '',
    prevarrears: maintenance.prevarrears || '',
    confidence,
    status: (maintenance.assigned && transaction.assigned) ? 'confirmed' : 'unresolved',
    assignedFlat: maintenance.flatno || '',
    assignedTransactionId: transaction.transactionid || '',
    assignReason
  };
}

function buildFilteredResponse(previousMaintenanceData, bankTransactionsData, result) {
  console.log("Building filtered response");
  const remainingTransactions = bankTransactionsData.filter((transaction) => !transaction.assigned);
  const remainingMaintenance = previousMaintenanceData.filter((row) => !row.assigned);
  return { remainingMaintenance, remainingTransactions, result };
}

export function tokenizeInput(input) {
  input = input.toUpperCase();
  return input.match(/Q[1-4]|\d+|[A-Za-z]+/g) || [];
}

export function findTokenDistance(tokens, fromIndex, toToken) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === toToken) {
      return i - fromIndex;
    }
  }
  return null;
}

export function extractFlatNumber(input) {
  if (input.startsWith("NEFT-HDFCN")) {
    return { flatNumber: "None", confidence: "N" };
  }

  const tokens = tokenizeInput(input);
  let confidence = "N";
  let flatNumber = "None";

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    token = token.replace(/^[A-Z]/i, "");

    if (/^\d{3}$/.test(token)) {
      const num = parseInt(token, 10);
      if ((num >= 0 && num <= 16) || (num >= 100 && num <= 116) ||
        (num >= 200 && num <= 216) || (num >= 300 && num <= 316)) {
        flatNumber = token.padStart(3, '0');
        confidence = "L";

        const distanceA = findTokenDistance(tokens, i, "A");
        const distanceB = findTokenDistance(tokens, i, "B");
        const distanceQ1 = findTokenDistance(tokens, i, "Q1");
        const hasFlatKeyword = tokens.includes("Flat");

        const hasABNearby = (distanceA === -1 || distanceA === 1) || (distanceB === -1 || distanceB === 1);
        const hasQ1Nearby = (distanceQ1 !== null && Math.abs(distanceQ1) >= 1 && Math.abs(distanceQ1) <= 3);

        if (hasFlatKeyword || (hasABNearby && hasQ1Nearby)) {
          confidence = "H";
        } else if (hasABNearby || hasQ1Nearby) {
          confidence = "M";
        }
      }
    }
  }

  return { flatNumber, confidence };
}

export function isSimilar(name, desc, threshold = null) {
  const ignoreWords = ["HDFC", "BANK", "NEFT", "IMPS", "PAYMENT", "FROM", "FEDERAL"];
  if (ignoreWords.includes(desc)) {
    return false;
  }
  if (threshold === null) {
    if (name === desc) {
      return true; // Exact match
    }
    const len = Math.min(name.length, desc.length);
    if (len <= 4) {
      threshold = 0; // Exact match
    } else if (len <= 5) {
      threshold = 1;
    } else if (len <= 7) {
      threshold = 2;
    } else {
      threshold = 3;
    }
  }
  return levenshtein.get(name, desc) <= threshold;
}

export function matchingNameInTransaction(description, name) {
  if (!description || !name) {
    return [];
  }
  const descTokens = description.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const nameTokens = name.toLowerCase().match(/\b\w{4,}\b/g) || [];
  return nameTokens.filter(nameToken =>
    descTokens.some(descToken => isSimilar(nameToken, descToken))
  );
}

export function normalizeFlatNo(flat) {
  if (!flat) return '';
  return String(flat).replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function isSameFlat(flat1, flat2) {
  if (!flat1 || !flat2) return false;
  return normalizeFlatNo(flat1) === normalizeFlatNo(flat2);
}

export function parseCurrency(currencyStr) {
  if (currencyStr === undefined || currencyStr === null || currencyStr === '') return 0;
  if (typeof currencyStr === 'number') return currencyStr;
  
  // Remove commas and spaces
  let str = String(currencyStr).replace(/[, ]/g, '');
  
  // Match the first valid numeric pattern (optional negative sign, digits, optional decimal part)
  const match = str.match(/-?\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }
  return 0;
}