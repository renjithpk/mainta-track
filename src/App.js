import React, { useState, useEffect } from "react";
import TableView from "./TableView";
import CSVLoader from "./CSVLoader";
import RadioButtons from "./RadioButtons";
import { generateResultData, waterBillingMonths } from "./utils";
import { exportToCSV } from "./exportUtils";
import './App.css';
import MaintenanceGeneratorUI from "./MaintenanceGeneratorUI";

const App = () => {
  const [view, setView] = useState("result");
  const [tab, setTab] = useState("mapping");
  const [previousMaintenanceData, setPreviousMaintenanceData] = useState([]);
  const [bankTransactionsData, setBankTransactionsData] = useState([]);
  const [waterChargesData, setWaterChargesData] = useState([]);
  const [resultData, setResultData] = useState([]);
  const [error, setError] = useState(null); // State variable for error messages
  const [tabError, setTabError] = useState(null); // State for tab-specific errors
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyPenaltyRate, setDailyPenaltyRate] = useState(50);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getDefaultQuarterLabel = (date = new Date()) => {
    const month = date.getMonth(); // 0-based
    const year = date.getFullYear();
    const yy = String(year).slice(-2);
    let q = 1;
    if (month >= 0 && month <= 2) q = 1;
    else if (month >= 3 && month <= 5) q = 2;
    else if (month >= 6 && month <= 8) q = 3;
    else q = 4;
    return `Q${q}-${yy}`;
  };
  const [selectedQuarter, setSelectedQuarter] = useState(getDefaultQuarterLabel());

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setSelectedYear(newYear);
    const currentQMatch = selectedQuarter.match(/^Q([1-4])/);
    if (currentQMatch) {
      const qNum = currentQMatch[1];
      const yy = String(newYear).slice(-2);
      setSelectedQuarter(`Q${qNum}-${yy}`);
    }
  };
  const [amcEnabled, setAmcEnabled] = useState(false);
  const [amcValue, setAmcValue] = useState(3000);

  const maintenanceColumns = [
    { id: "index", header: "Index", accessorKey: "index" },
    { id: "flatno", header: "Flat No", accessorKey: "flatno" },
    { id: "residentname", header: "Resident Name", accessorKey: "residentname" },
    { id: "balance", header: "Balance", accessorKey: "balance" },
    // Additional fields requested: Penalty, Last Maintenance without Penalty, Arrears
    { id: "penalty", header: "Penalty", accessorKey: "penalty" },
    { id: "lastmaintenance_nopenalty", header: "Last Maintenance (no Penalty)", accessorKey: "lastmaintenancewithoutpenalty" },
    // Use previous arrears from maintenance sheet as-is; expose as `prevarrears` to avoid accidental recalculation
    { id: "prevarrears", header: "Prev Arrears", accessorKey: "prevarrears" },
  ];

  const transactionColumns = [
    { id: "index", header: "Index", accessorKey: "index" },
    { id: "transactionid", header: "Transaction ID", accessorKey: "transactionid" },
    { id: "transactiondate", header: "Transaction Date", accessorKey: "transactiondate" },
    { id: "description", header: "Description", accessorKey: "description" },
    { id: "transactionamountinr", header: "Transaction Amount (INR)", accessorKey: "transactionamountinr" },
    { id: "withdrawalamtinr", header: "Withdrawal Amt (INR)", accessorKey: "withdrawalamtinr" },
    { id: "depositamtinr", header: "Deposit Amt (INR)", accessorKey: "depositamtinr" },
    { id: "tranid", header: "Tran. Id", accessorKey: "tranid" },
    { id: "transactionremarks", header: "Transaction Remarks", accessorKey: "transactionremarks" },
  ];

  const getQuarterMonths = (quarterLabel) => {
    const qMatch = (quarterLabel || '').toString().toUpperCase().match(/Q([1-4])/);
    const qKey = qMatch ? `q${qMatch[1]}` : null;
    return qKey && waterBillingMonths[qKey] ? waterBillingMonths[qKey] : null;
  };

  const capitalize = (s) => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : s;

  // Order: maintenance-sheet fields first (use normalized accessor keys),
  // then bank transaction fields, then generated fields (confidence / assignment metadata).
  const resultColumns = React.useMemo(() => {
    const months = getQuarterMonths(selectedQuarter);
    const waterCols = months.map(m => ({ id: `waterbill${m}`, header: `Water Bill ${capitalize(m)}`, accessorKey: `waterbill${m}` }));

    return [
      { id: "index", header: "Index", accessorKey: "index" },
      { id: "flat", header: "Flat No", accessorKey: "flatNo" },
      { id: "name", header: "Resident Name", accessorKey: "name" },
      // Maintenance sheet original fields (normalized accessor keys from uploaded CSV)
      { id: "monthly", header: "Monthly", accessorKey: "monthly" },
      { id: "q3maintenance", header: "Q3-25 Maintenance", accessorKey: "q325maintenance" },
      { id: "maintenancearrears", header: "Maintenance Arrears", accessorKey: "maintenancearrears" },
      ...waterCols,
      { id: "penalty", header: "Penalty", accessorKey: "penalty" },

      // Place balance after penalty (make balance the final maintenance field)
      { id: "balance", header: "balance", accessorKey: "balance" },

      // Bank transaction fields
      { id: "transactionamountinr", header: "Transaction Amount (INR)", accessorKey: "transactionamountinr" },
      { id: "transactiondate", header: "Transaction Date", accessorKey: "transactiondate" },
      { id: "description", header: "Description", accessorKey: "description" },
      { id: "transactionid", header: "Transaction ID", accessorKey: "transactionid" },

      // Generated / derived fields (computed by the app)
      { id: "lastMaintenanceNoPenalty", header: "Last Maintenance (no Penalty)", accessorKey: "lastmaintenancewithoutpenalty" },
      { id: "assign", header: "Assign Flat", accessorKey: "assignFlat" },
      { id: "confidence", header: "Confidence", accessorKey: "confidence" },
      { id: "status", header: "Status", accessorKey: "status" },
      { id: "assignedFlat", header: "Assigned Flat", accessorKey: "assignedFlat" },
      { id: "assignedTransactionId", header: "Assigned Transaction ID", accessorKey: "assignedTransactionId" },
    ];
  }, [selectedQuarter]);

  // Default visible columns (ordered): Flat No, Resident Name, Balance,
  // Transaction amount, Transaction Date, Description, Assign Flat, Confidence
  const defaultVisibleResultColumns = [
    'flatNo',
    'name',
    'transactionamountinr',
    'transactiondate',
    'description',
    'assignFlat',
    'confidence',
    // Keep balance as the final visible column per request
    'balance',
  ].map((key) => {
    return resultColumns.find((c) => c.accessorKey === key) || optionalResultColumns.find((c) => c.accessorKey === key) || { id: key, header: key, accessorKey: key };
  }).filter(Boolean);

  // State to manage which result columns are visible in the Result view.
  // Initialize from our ordered default so the UI shows the requested columns by default.
  const [visibleResultColumns, setVisibleResultColumns] = useState(defaultVisibleResultColumns);
  const [manualMappings, setManualMappings] = useState([]); // { flatNo, transactionId, reason? }
  // Use a static order derived from `resultColumns` — this is intentionally not stateful so order stays fixed.
  const resultColumnsOrder = React.useMemo(() => resultColumns.map(c => c.accessorKey), [resultColumns]);

  // Optional columns the user can toggle for the Result table. These map to accessor keys
  // used in the generated result rows. 'morecolumn' is included per request (treated as optional
  // placeholder if not present in data).
  const optionalResultColumns = [
    { id: "amountPaid", header: "Amount Paid", accessorKey: "transactionamountinr" },
    { id: "date", header: "Date", accessorKey: "transactiondate" },
    { id: "transactionid_opt", header: "Transaction ID", accessorKey: "transactionid" },
    // maintenance-derived optional fields (these will show values if present on the previousMaintenance rows
    // and are propagated into result rows by utils.generateResultData)
    { id: "penalty", header: "Penalty", accessorKey: "penalty" },
    { id: "lastmaintenance_nopenalty", header: "Last Maintenance (no Penalty)", accessorKey: "lastmaintenancewithoutpenalty" },
  ];

  const toggleResultColumn = (col) => {
    setVisibleResultColumns((prev) => {
      const exists = prev.find((c) => c.accessorKey === col.accessorKey);
      // Never remove the 'confidence' (status) column
      if (exists) {
        if (col.accessorKey === 'confidence') return prev;
        return prev.filter((c) => c.accessorKey !== col.accessorKey);
      }

      // If column is not present, try to find a definition in the original resultColumns
      const baseDef = resultColumns.find((c) => c.accessorKey === col.accessorKey) || { id: col.id, header: col.header, accessorKey: col.accessorKey };
      return [...prev, baseDef];
    });
  };

  const resetResultColumnsToDefault = () => {
    setVisibleResultColumns(defaultVisibleResultColumns);
  };

  const orderedVisibleResultColumns = React.useMemo(() => {
    // Preserve the requested order from resultColumnsOrder for visible columns
    const byOrder = resultColumnsOrder.map(k => visibleResultColumns.find(c => c.accessorKey === k)).filter(Boolean);
    // Append any visible columns not present in the order (safety)
    const remainder = visibleResultColumns.filter(c => !resultColumnsOrder.includes(c.accessorKey));
    return [...byOrder, ...remainder];
  }, [visibleResultColumns, resultColumnsOrder]);

  // Load persisted visible columns from localStorage on mount (if available)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('visibleResultColumns');
      if (!saved) return;
      const keys = JSON.parse(saved);
      if (!Array.isArray(keys)) return;
      // Map saved accessor keys back to column definitions, prefer resultColumns, then optionalResultColumns
      const cols = keys.map(k => {
        return resultColumns.find(c => c.accessorKey === k) || optionalResultColumns.find(c => c.accessorKey === k) || { id: k, header: k, accessorKey: k };
      }).filter(Boolean);
      // Ensure 'confidence' is present
      if (!cols.find(c => c.accessorKey === 'confidence')) {
        const conf = resultColumns.find(c => c.accessorKey === 'confidence');
        if (conf) cols.push(conf);
      }
      // Remove duplicates while preserving order
      const seen = new Set();
      const unique = cols.filter(c => {
        if (seen.has(c.accessorKey)) return false;
        seen.add(c.accessorKey);
        return true;
      });
      if (unique.length > 0) setVisibleResultColumns(unique);
    } catch (err) {
      // ignore parse errors and continue with defaults
      console.debug('Could not load visibleResultColumns from localStorage', err);
    }
  }, []);

  // Persist visibleResultColumns accessor keys to localStorage whenever they change
  useEffect(() => {
    try {
      const keys = visibleResultColumns.map(c => c.accessorKey);
      localStorage.setItem('visibleResultColumns', JSON.stringify(keys));
    } catch (err) {
      console.debug('Could not persist visibleResultColumns to localStorage', err);
    }
  }, [visibleResultColumns]);

  // Build a full list of columns to render in the filter UI: prefer definitions from
  // `resultColumns` and then include any optional columns that are not already present.
  const allResultColumns = React.useMemo(() => {
    const map = new Map();
    // preserve resultColumns order first
    resultColumns.forEach(c => map.set(c.accessorKey, c));
    optionalResultColumns.forEach(c => {
      if (!map.has(c.accessorKey)) map.set(c.accessorKey, c);
    });
    return Array.from(map.values());
  }, [resultColumns, optionalResultColumns]);

  const validateHeaders = (data, columns) => {
    if (!data || data.length === 0) return 'CSV file appears empty';
    const headers = Object.keys(data[0]);
    // Only require essential fields for previous maintenance: flatno and balance.
    // Optional columns (penalty, lastmaintenancewithoutpenalty, arrears) are not mandatory.
    const required = ['flatno', 'balance'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      return `Missing required headers in the loaded CSV file: ${missing.join(', ')}`;
    }
    return null;
  };

  const validateBankHeaders = (data) => {
    if (!data || data.length === 0) return 'CSV file appears empty';
    const headers = Object.keys(data[0]);
    // Accept either new format (deposit/withdrawal) or old format (cr/dr)
    const hasNewFormat = headers.includes('depositamtinr') || headers.includes('withdrawalamtinr') || headers.includes('transactionamountinr');
    const hasOldFormat = headers.includes('crdr');
    if (!hasNewFormat && !hasOldFormat) {
      return 'Bank transactions CSV missing expected headers: depositamtinr or withdrawalamtinr or crdr';
    }
    return null;
  };

  const handleBankTransactionsDataParsed = (data) => {
    console.log("Bank transactions data parsed:", data);
    try {
      const headerError = validateBankHeaders(data);
      if (headerError) {
        setError(headerError);
        return;
      }
      const headers = Object.keys(data[0] || {});
      let processedData = data;

      // Check if this is the new format (has withdrawal/deposit columns) or old format (has crdr column)
      const hasNewFormat = data.length > 0 && (data[0].hasOwnProperty('withdrawalamtinr') || data[0].hasOwnProperty('depositamtinr'));
      const hasOldFormat = data.length > 0 && data[0].hasOwnProperty('crdr');

      if (hasNewFormat) {
        // New format: process withdrawal/deposit columns
        processedData = data
          .filter(row => {
            // Only include deposit transactions (credits) - skip withdrawals (debits)
            return row.depositamtinr && row.depositamtinr !== "" && row.depositamtinr !== null;
          })
          .map(row => ({
            ...row,
            // Create unified transaction amount from deposit amount
            transactionamountinr: row.depositamtinr,
            // Map description from transaction remarks and map transaction ID
            description: row.transactionremarks || row.description || "",
            transactionid: row.tranid || row.transactionid || ""
          }));
      } else if (hasOldFormat) {
        // Old format: filter out debit transactions
        processedData = data.filter(row => row["crdr"].toLowerCase() !== 'dr');
      } else {
        setError("CSV format not recognized. Expected either new format with withdrawal/deposit columns or old format with cr/dr column.");
        return;
      }

      if (!processedData || processedData.length === 0) {
        // Provide a more specific error so the user knows which field is wrong or empty
        if (hasNewFormat) {
          const hasDepositHeader = data[0].hasOwnProperty('depositamtinr');
          const hasTxnHeader = data[0].hasOwnProperty('transactionamountinr');
          if (!hasDepositHeader && !hasTxnHeader) {
            setError("Bank transactions CSV missing credit column: expected 'depositamtinr' or 'transactionamountinr'.");
            return;
          }

          const field = hasDepositHeader ? 'depositamtinr' : 'transactionamountinr';
          const anyNonEmpty = data.some(r => {
            const v = r[field];
            if (v === undefined || v === null || String(v).trim() === '') return false;
            const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
            return !isNaN(n) && n !== 0;
          });
          if (!anyNonEmpty) {
            setError(`Column '${field}' contains no credit values (all empty or zero).`);
            return;
          }
        } else if (hasOldFormat) {
          const anyCr = data.some(r => r['crdr'] && String(r['crdr']).toLowerCase().includes('cr'));
          const anyDr = data.some(r => r['crdr'] && String(r['crdr']).toLowerCase().includes('dr'));
          if (!anyCr && anyDr) {
            setError("Field 'crdr' contains only debit (DR) entries; no credit (CR) entries found.");
            return;
          }
          if (!anyCr && !anyDr) {
            setError("Field 'crdr' contains no recognizable values; expected 'CR' or 'DR'.");
            return;
          }
        }

        // Build a diagnostic message so the user knows exactly what's present/missing
        const headerList = headers.join(', ');
        const depositCount = data.reduce((c, r) => {
          const v = r.depositamtinr;
          if (v === undefined || v === null || String(v).trim() === '') return c;
          const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
          return c + (isNaN(n) ? 0 : (n !== 0 ? 1 : 0));
        }, 0);
        const txnAmtCount = data.reduce((c, r) => {
          const v = r.transactionamountinr;
          if (v === undefined || v === null || String(v).trim() === '') return c;
          const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
          return c + (isNaN(n) ? 0 : (n !== 0 ? 1 : 0));
        }, 0);
        const crCount = data.reduce((c, r) => {
          const v = r.crdr;
          if (!v) return c;
          const s = String(v).toLowerCase();
          return c + (s.includes('cr') ? 1 : 0);
        }, 0);
        const drCount = data.reduce((c, r) => {
          const v = r.crdr;
          if (!v) return c;
          const s = String(v).toLowerCase();
          return c + (s.includes('dr') ? 1 : 0);
        }, 0);

        let diag = `No credit transactions found. Detected headers: ${headerList}.`;
        diag += ` depositamtinr credits=${depositCount}; transactionamountinr credits=${txnAmtCount}; crdr CR=${crCount} DR=${drCount}.`;
        diag += ` Ensure the CSV has a credit column with non-zero values (depositamtinr or transactionamountinr) or 'crdr' marked as CR.`;
        setError(diag);
        return;
      }

      const indexedData = processedData.map((row, index) => ({
        index: index + 1, // Adding a 1-based index
        ...row,
      }));

      setBankTransactionsData(indexedData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to parse bank transactions CSV: " + err.message);
    }
  };

  const handlePreviousMaintenanceDataParsed = (data) => {
    const errorMessage = validateHeaders(data, maintenanceColumns);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    try {
      // helper to parse currency-like strings to number
      const parseCurrency = (val) => {
        if (val === undefined || val === null || val === "") return 0;
        // If it's already a number, return it
        if (typeof val === 'number') return val;
        const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const formatCurrency = (num) => {
        if (num === null || num === undefined || num === '') return '';
        // Return numeric string without currency symbol
        return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      };

      const indexedData = data.map((row, index) => {
        const keys = Object.keys(row || {});

        // Parse numeric values from the maintenance sheet
        const parseBalanceRaw = (val) => {
          if (val === undefined || val === null || val === "") return 0;
          return parseCurrency(val);
        };

        const pen = parseCurrency(row.penalty || 0);
        const balanceVal = parseBalanceRaw(row.balance);

        // Per request: Last Maintenance (no Penalty) = Balance - Penalty
        const lastWithoutPenalty = Math.max(0, balanceVal - pen);

        // find a key in CSV that explicitly contains 'arrear' (e.g. maintenancearrears)
        const arrearsKey = keys.find(k => k.includes('arrear'));
        const prevarrearsRaw = arrearsKey ? row[arrearsKey] : (row.balance !== undefined ? row.balance : '');

        return {
          index: index + 1,
          ...row,
          // Penalty should come directly from the maintenance sheet if present; otherwise format parsed value
          penalty: (row.penalty !== undefined && row.penalty !== '') ? row.penalty : (pen ? formatCurrency(pen) : ''),
          // store formatted no-penalty value for UI
          lastmaintenancewithoutpenalty: formatCurrency(lastWithoutPenalty),
          // preserve the maintenance sheet's arrears value as-is (no recalculation)
          prevarrears: prevarrearsRaw,
        };
      });

      setPreviousMaintenanceData(indexedData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to parse previous maintenance CSV");
    }
  };

  const handleWaterChargesDataParsed = (data) => {
    try {
      if (!data || data.length === 0) {
        setError('Water Charges CSV appears empty');
        return;
      }

      const headers = Object.keys(data[0] || {});
      // Determine expected months from selectedQuarter (e.g. 'Q1-26')
      const qMatch = (selectedQuarter || '').toString().toUpperCase().match(/Q([1-4])/);
      const qKey = qMatch ? `q${qMatch[1]}` : null;
      const expectedMonths = qKey && waterBillingMonths[qKey] ? waterBillingMonths[qKey] : null;

      if (expectedMonths) {
        // Normalize headers to alphanumeric lower-case (FileUploader already does this, but be safe)
        const normHeaders = headers.map(h => (h || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase());

        const missing = expectedMonths.filter((m) => {
          // Accept headers that start with optional 'month' prefix followed by the 3-letter month
          const re = new RegExp(`^(month)?${m}`);
          return !normHeaders.some(h => re.test(h));
        });

        if (missing.length > 0) {
          const headerList = headers.join(', ');
          setError(`Water Charges CSV missing expected month columns for: ${missing.join(', ')}. Detected headers: ${headerList}. Expected month columns (start with): ${expectedMonths.map(m => `month${m}`).join(', ')}.`);
          return;
        }
      }

      // Build list of month accessor keys from data or expectedMonths
      const dataKeys = Object.keys(data[0] || {});
      const normKeys = dataKeys.map(k => ({ raw: k, norm: (k || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase() }));
      let monthAccessors = [];
      if (expectedMonths) {
        monthAccessors = expectedMonths.map((m) => {
          const re = new RegExp(`^(month)?${m}`);
          const found = normKeys.find(k => re.test(k.norm));
          return found ? found.raw : `month${m}`;
        });
      } else {
        // fallback: any keys starting with month or 3-letter month
        monthAccessors = normKeys.filter(k => /^(month)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(k.norm)).map(k => k.raw);
      }

      const parseNum = (v) => {
        if (v === undefined || v === null || v === '') return 0;
        if (typeof v === 'number') return v;
        const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const indexedData = data.map((row, index) => {
        const total = monthAccessors.reduce((sum, key) => sum + parseNum(row[key]), 0);
        return {
          index: index + 1, // Adding a 1-based index
          ...row,
          total,
        };
      });
      setWaterChargesData(indexedData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to parse water charges CSV");
    }
  };

  useEffect(() => {
    if (previousMaintenanceData.length === 0 || bankTransactionsData.length === 0) {
      return;
    }
    const result = generateResultData(previousMaintenanceData, bankTransactionsData, manualMappings);
    setResultData(result);
  }, [previousMaintenanceData, bankTransactionsData, manualMappings]);

  const availableFlats = React.useMemo(() => {
    // Build a list of flat objects { flatNo, label } that include helpful details
    const allFlats = previousMaintenanceData.map(r => (r.flatno || '').toString().trim()).filter(Boolean);
    const confirmed = new Set(resultData.filter(r => r.status === 'confirmed').map(r => (r.assignedFlat || r.flatNo || '').toString().trim()));
    const freeFlats = allFlats.filter(f => f && !confirmed.has(f));

    // For each free flat, attempt to find the maintenance row and build a concise label
    // Format requested: "<flat number> <name> <balance> (<balance - penalty>)"
    const flatsWithDetails = freeFlats.map(flatNo => {
      const row = previousMaintenanceData.find(r => (r.flatno || '').toString().trim() === flatNo) || {};

      const namePart = row.residentname ? ` ${row.residentname}` : '';
      const balancePart = row.balance ? ` ${row.balance}` : '';
      const lastPart = row.lastmaintenancewithoutpenalty ? ` (${row.lastmaintenancewithoutpenalty})` : '';

      // Build label with minimal separators as requested
      const label = `${flatNo}${namePart}${balancePart}${lastPart}`.trim();
      return { flatNo, label };
    });

    return flatsWithDetails;
  }, [previousMaintenanceData, resultData]);

  const handleAssignFlat = (rowIndex, selectedFlat) => {
    if (!selectedFlat) return;
    const row = resultData[rowIndex];
    if (!row || !row.transactionid) return; // only allow assigning when a transaction exists

    const txId = row.transactionid;
    const now = new Date().toISOString();

    setManualMappings((prev) => {
      // remove any existing mappings for this transaction or for this flat (avoid duplicates)
      const filtered = prev.filter(m => {
        const mid = (m.transactionId || m.transactionid || '').toString();
        const mflat = (m.flatNo || m.flatno || '').toString();
        return mid !== (txId || '') && mflat !== (selectedFlat || '');
      });
      const newMapping = { flatNo: selectedFlat, transactionId: txId, reason: 'manual assign' };
      return [...filtered, newMapping];
    });
  };

  const exportManualMappings = () => {
    if (!manualMappings || manualMappings.length === 0) {
      alert('No manual mappings to export');
      return;
    }
    // Build export rows by enriching manualMappings with confidence from resultData
    const exportRows = manualMappings.map(m => {
      const txId = (m.transactionId || m.transactionid || '').toString();
      const matched = resultData.find(r => (r.transactionid || r.assignedTransactionId || '').toString() === txId);
      return {
        flatNo: m.flatNo,
        transactionId: m.transactionId,
        residentName: matched ? (matched.name || matched.residentname || '') : '',
        transactionDescription: matched ? (matched.description || '') : '',
        confidence: matched ? matched.confidence : '',
      };
    });

    // Define columns for manual mapping export: include resident name and transaction description
    const columns = [
      { id: 'flatNo', header: 'Flat No', accessorKey: 'flatNo' },
      { id: 'transactionId', header: 'Transaction ID', accessorKey: 'transactionId' },
      { id: 'residentName', header: 'Resident Name', accessorKey: 'residentName' },
      { id: 'transactionDescription', header: 'Transaction Description', accessorKey: 'transactionDescription' },
      { id: 'confidence', header: 'Confidence', accessorKey: 'confidence' },
    ];

    const date = new Date().toISOString().split('T')[0];
    const filename = `manual_mappings_${date}`;
    exportToCSV(exportRows, columns, filename);
  };

  useEffect(() => {
    if (tab === 'mapping') {
      if (previousMaintenanceData.length === 0 || bankTransactionsData.length === 0) {
        setTabError("Please upload Previous Maintenance Sheet and Bank Transactions CSV files.");
      } else {
        setTabError(null);
      }
    } else if (tab === 'maintenance') {
      if (previousMaintenanceData.length === 0 || waterChargesData.length === 0 || resultData.length === 0) {
        setTabError("Please upload Previous Maintenance Sheet, Water Charges CSV files, and ensure Bank Transaction Mapping results are available.");
      } else {
        setTabError(null);
      }
    }
  }, [tab, previousMaintenanceData, bankTransactionsData, waterChargesData, resultData]);

  const getViewTitle = () => {
    switch (view) {
      case "maintenance":
        return "Maintenance Sheet";
      case "transaction":
        return "Transactions Sheet";
      case "result":
        return "Result Sheet";
      case "watercharges":
        return "Water Charges";
      default:
        return "Selected View";
    }
  };

  const defaultWaterColumns = React.useMemo(() => {
    const months = getQuarterMonths(selectedQuarter);
    return [
      { id: 'w_index', header: 'Index', accessorKey: 'index' },
      { id: 'w_flatno', header: 'Flat No', accessorKey: 'flatno' },
      { id: 'w_month1', header: `Month ${capitalize(months[0])}`, accessorKey: `month${months[0]}` },
      { id: 'w_month2', header: `Month ${capitalize(months[1])}`, accessorKey: `month${months[1]}` },
      { id: 'w_month3', header: `Month ${capitalize(months[2])}`, accessorKey: `month${months[2]}` },
      { id: 'w_total', header: 'Total', accessorKey: 'total' },
    ];
  }, [selectedQuarter]);

  const buildWaterColumns = React.useCallback(() => {
    // Build accessor keys from actual data keys, but keep header labels stable
    if (!waterChargesData || waterChargesData.length === 0) return defaultWaterColumns;
    const keys = Object.keys(waterChargesData[0] || {});
    const normKeys = keys.map(k => ({ raw: k, norm: (k || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase() }));
    const months = getQuarterMonths(selectedQuarter);

    const monthCols = months.map((m, i) => {
      const re = new RegExp(`^(month)?${m}`);
      const found = normKeys.find(k => re.test(k.norm));
      const accessor = found ? found.raw : `month${m}`;
      return { id: `w_month${i + 1}`, header: `Month ${capitalize(m)}`, accessorKey: accessor };
    });

    // index and flatno keys may be present in data; prefer data keys if available
    const idxKey = keys.find(k => k.toLowerCase() === 'index') || 'index';
    const flatKey = keys.find(k => k.toLowerCase() === 'flatno') || 'flatno';
    const totalKey = keys.find(k => k.toLowerCase() === 'total') || 'total';

    return [
      { id: 'w_index', header: 'Index', accessorKey: idxKey },
      { id: 'w_flatno', header: 'Flat No', accessorKey: flatKey },
      ...monthCols,
      { id: 'w_total', header: 'Total', accessorKey: totalKey },
    ];
  }, [waterChargesData, selectedQuarter, defaultWaterColumns]);

  const waterChargesColumns = (waterChargesData && waterChargesData.length > 0) ? buildWaterColumns() : defaultWaterColumns;

  return (
    <div className="App">
      <h1>Maintenance Calculator</h1>
      <div className="card controls-card">
        <div className="section-header">File Selection & Settings</div>
        <div className="controls-row">
          <CSVLoader
            onPreviousMaintenanceDataParsed={handlePreviousMaintenanceDataParsed}
            onBankTransactionsDataParsed={handleBankTransactionsDataParsed}
            onWaterChargesDataParsed={handleWaterChargesDataParsed}
            selectedQuarter={selectedQuarter}
          />
        </div>
        <div className="settings-row" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
          <label>
            Due Date:
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ marginLeft: '5px' }}
            />
          </label>
          <label>
            Year:
            <select value={selectedYear} onChange={handleYearChange} style={{ marginLeft: '5px' }}>
              {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            Quarter:
            <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} style={{ marginLeft: '5px' }}>
              {[1,2,3,4].map(q => {
                const yy = String(selectedYear).slice(-2);
                return <option key={`Q${q}-${yy}`} value={`Q${q}-${yy}`}>{`Q${q}-${yy}`}</option>;
              })}
            </select>
          </label>
          <label>
            Penalty per Day:
            <input
              type="number"
              value={dailyPenaltyRate}
              onChange={(e) => setDailyPenaltyRate(Number(e.target.value))}
              min="0"
              style={{ marginLeft: '5px', width: '80px' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={amcEnabled}
              onChange={(e) => setAmcEnabled(e.target.checked)}
            />
            <span>Include AMC</span>
          </label>
          <label>
            AMC:
            <input
              type="number"
              value={amcValue}
              onChange={(e) => setAmcValue(Number(e.target.value))}
              min="0"
              style={{ marginLeft: '5px', width: '100px' }}
              disabled={!amcEnabled}
            />
          </label>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="description-text">
          <strong>Instructions:</strong> Upload all required CSV files: Previous Maintenance Sheet (used for both mapping and calculation), Bank Transactions, and Water Charges for processing.
        </div>
      </div>
      <div className="tabs-container">
        <button className={`tab-btn${tab === 'mapping' ? ' active' : ''}`} onClick={() => setTab('mapping')}>1. Bank Transaction Mapping</button>
        <button className={`tab-btn${tab === 'maintenance' ? ' active' : ''}`} onClick={() => setTab('maintenance')}>2. Maintenance Calculation</button>
      </div>
      {tab === 'mapping' && (
        <>
          <div className="controls-row">
            <RadioButtons view={view} setView={setView} />
          </div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600 }}>Columns:</div>
            <button onClick={resetResultColumnsToDefault} style={{ marginRight: 8 }}>Default</button>
            {allResultColumns.map((col) => {
              const checked = visibleResultColumns.some(c => c.accessorKey === col.accessorKey);
              const disabled = col.accessorKey === 'confidence'; // keep status/default column non-removable
              return (
                <label key={col.accessorKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleResultColumn(col)}
                  />
                  <span>{col.header}</span>
                </label>
              );
            })}
          </div>
          {tabError && <div className="error-message">{tabError}</div>}
          <div className="card results-card">
            <div className="section-header">{getViewTitle()}</div>
            {view === "maintenance" && <TableView columns={maintenanceColumns} data={previousMaintenanceData} viewType="maintenance" />}
            {view === "transaction" && <TableView columns={transactionColumns} data={bankTransactionsData} viewType="transaction" />}
            {view === "result" && <TableView columns={orderedVisibleResultColumns} data={resultData} viewType="result" onAssignFlat={handleAssignFlat} availableFlats={availableFlats} onExportManualMappings={exportManualMappings} />}
            {view === "watercharges" && <TableView columns={waterChargesColumns} data={waterChargesData} viewType="watercharges" />}
          </div>
        </>
      )}
      {tab === 'maintenance' && (
        <div className="card generator-card">
          <div className="section-header">Maintenance Sheet Generator</div>
          <div className="description-text">
            <strong>Instructions:</strong> Ensure all required CSV files are uploaded at the top. The Previous Maintenance Sheet is used for both mapping and calculation. Click 'Generate Maintenance Sheet' to create the new sheet for the current period.
          </div>
          {tabError && <div className="error-message">{tabError}</div>}
          <MaintenanceGeneratorUI
            payments={resultData}
            prevMaintenance={previousMaintenanceData}
            waterCharges={waterChargesData}
            dueDate={dueDate}
            dailyPenaltyRate={dailyPenaltyRate}
            amcEnabled={amcEnabled}
            amcValue={amcValue}
            quarter={selectedQuarter}
          />
        </div>
      )}
    </div>
  );
};

export default App;