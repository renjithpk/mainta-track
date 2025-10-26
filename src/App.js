import React, { useState, useEffect } from "react";
import TableView from "./TableView";
import CSVLoader from "./CSVLoader";
import RadioButtons from "./RadioButtons";
import { generateResultData } from "./utils";
import './App.css';
import MaintenanceGeneratorUI from "./MaintenanceGeneratorUI";

const App = () => {
  const [view, setView] = useState("result");
  const [tab, setTab] = useState("mapping");
  const [previousMaintenanceData, setPreviousMaintenanceData] = useState([]);
  const [bankTransactionsData, setBankTransactionsData] = useState([]);
  const [waterChargesData, setWaterChargesData] = useState([]);
  const [resultData, setResultData] = useState([]);
  const [manualMappings, setManualMappings] = useState([]); // in-memory manual mappings: { flatNo, transactionId, reason }
  const [error, setError] = useState(null); // State variable for error messages
  const [tabError, setTabError] = useState(null); // State for tab-specific errors
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyPenaltyRate, setDailyPenaltyRate] = useState(20);

  const maintenanceColumns = [
    { id: "index", header: "Index", accessorKey: "index" },
    { id: "flatno", header: "Flat No", accessorKey: "flatno" },
    { id: "residentname", header: "Resident Name", accessorKey: "residentname" },
    { id: "balance", header: "Balance", accessorKey: "balance" },
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

  const resultColumns = [
    { id: "index", header: "Index", accessorKey: "index" },
    { id: "flat", header: "Flat No", accessorKey: "flatNo" },
    { id: "name", header: "Resident Name", accessorKey: "name" },
    { id: "amount", header: "Amount", accessorKey: "amount" },
    { id: "assign", header: "Assign Flat", accessorKey: "assignFlat" },
    { id: "transactionamountinr", header: "Transaction", accessorKey: "transactionamountinr" },
    { id: "transactiondate", header: "Transaction Date", accessorKey: "transactiondate" },
    { id: "confidence", header: "Confidence", accessorKey: "confidence" },
    { id: "description", header: "Description", accessorKey: "description" },
    { id: "transactionid", header: "Transaction ID", accessorKey: "transactionid" },
  ];

  // State to manage which result columns are visible in the Result view.
  // Initialize with the full set to preserve current default behaviour (and keep 'confidence' present).
  const [visibleResultColumns, setVisibleResultColumns] = useState(resultColumns);

  // Optional columns the user can toggle for the Result table. These map to accessor keys
  // used in the generated result rows. 'morecolumn' is included per request (treated as optional
  // placeholder if not present in data).
  const optionalResultColumns = [
    { id: "morecolumn", header: "More Column", accessorKey: "morecolumn" },
    { id: "lastMaintenance", header: "Last Maintenance Amount", accessorKey: "amount" },
    { id: "amountPaid", header: "Amount Paid", accessorKey: "transactionamountinr" },
    { id: "date", header: "Date", accessorKey: "transactiondate" },
    { id: "transactionid_opt", header: "Transaction ID", accessorKey: "transactionid" },
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

  const validateHeaders = (data, columns) => {
    const headers = Object.keys(data[0]);
    const missingHeaders = columns.filter(column => column.accessorKey !== "index" && !headers.includes(column.accessorKey));
    if (missingHeaders.length > 0) {
      return `Missing headers in the loaded CSV file: ${missingHeaders.map(column => column.header).join(", ")}`;
    }
    return null;
  };

  const handleBankTransactionsDataParsed = (data) => {
    console.log("Bank transactions data parsed:", data);
    try {
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
      const indexedData = data.map((row, index) => ({
        index: index + 1, // Adding a 1-based index
        ...row,
      }));
      setPreviousMaintenanceData(indexedData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to parse previous maintenance CSV");
    }
  };

  const handleWaterChargesDataParsed = (data) => {
    try {
      const indexedData = data.map((row, index) => ({
        index: index + 1, // Adding a 1-based index
        ...row,
      }));
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
    console.log("Generated resultData:", result);
    setResultData(result);
  }, [previousMaintenanceData, bankTransactionsData, manualMappings]);

  // Compute available (unallocated) flats based on previous maintenance data
  const availableFlats = React.useMemo(() => {
    const allFlats = previousMaintenanceData.map(r => (r.flatno || '').toString().trim()).filter(Boolean);
    const confirmed = new Set(resultData.filter(r => r.status === 'confirmed').map(r => (r.assignedFlat || r.flatNo || '').toString().trim()));
    return allFlats.filter(f => f && !confirmed.has(f));
  }, [previousMaintenanceData, resultData]);

  // Handler to assign a flat to a result row (in-memory, optimistic)
  const handleAssignFlat = (rowIndex, selectedFlat) => {
    console.debug('handleAssignFlat called', { rowIndex, selectedFlat });
    if (!selectedFlat) return;
    const row = resultData[rowIndex];
    if (!row) return;
    if (row.status === 'confirmed') {
      // already confirmed; do nothing
      alert('This row is already confirmed and cannot be reassigned here.');
      return;
    }

    // If this row has no flat (it's a transaction-only row), try to move the transaction
    // to the corresponding maintenance row that has the selectedFlat.
    const newResultData = [...resultData];
    const sourceRow = { ...row };
    const txId = sourceRow.transactionid;

    if (!sourceRow.flatNo || sourceRow.flatNo.toString().trim() === '') {
      // find maintenance row that matches selectedFlat and currently has no transaction
      const targetIndex = newResultData.findIndex(r => r.flatNo && r.flatNo.toString().trim() === selectedFlat && (!r.transactionid || r.transactionid === ""));
      console.debug('transaction-only source; targetIndex:', targetIndex);
      if (targetIndex !== -1) {
        const targetRow = { ...newResultData[targetIndex] };
        // Move transaction fields into the target maintenance row
        targetRow.transactionid = sourceRow.transactionid || '';
        targetRow.transactionamountinr = sourceRow.transactionamountinr || '';
        targetRow.transactiondate = sourceRow.transactiondate || '';
        targetRow.description = sourceRow.description || '';
        targetRow.confidence = 'manually assigned';
        targetRow.status = 'confirmed';
        targetRow.assignedFlat = selectedFlat;
        targetRow.assignedBy = 'local';
        targetRow.assignedAt = new Date().toISOString();

        // Also update the source previousMaintenanceData to persist assignment when reprocessing
        const updatedPrevMaintenance = previousMaintenanceData.map(pm => {
          try {
            if (pm && pm.flatno && pm.flatno.toString().trim() === selectedFlat) {
              return { ...pm, transactionid: targetRow.transactionid, transactionamountinr: targetRow.transactionamountinr, transactiondate: targetRow.transactiondate, description: targetRow.description, assigned: true };
            }
            return pm;
          } catch (err) {
            return pm;
          }
        });

        // Clear transaction fields from the source transaction-only row
        sourceRow.transactionid = '';
        sourceRow.transactionamountinr = '';
        sourceRow.transactiondate = '';
        sourceRow.description = '';
        sourceRow.status = 'resolved';

        newResultData[targetIndex] = targetRow;
        newResultData[rowIndex] = sourceRow;

        // Update bank transactions assigned flag
        const newBankTx = bankTransactionsData.map(tx => {
          if (tx.transactionid && tx.transactionid === txId) {
            return { ...tx, assigned: true, flat: { flatNumber: selectedFlat.replace(/[^0-9]/g, ''), confidence: 'M' } };
          }
          return tx;
        });

        console.debug('Applying moved transaction to previousMaintenanceData and bankTransactionsData');
        setPreviousMaintenanceData(updatedPrevMaintenance);
        setResultData(newResultData);
        setBankTransactionsData(newBankTx);
        return;
      }
      // if no target found, fall through to attach to the source row itself
    }

    // Default: attach to the current row
    const updatedRow = { ...sourceRow };
    updatedRow.assignedFlat = selectedFlat;
    updatedRow.flatNo = selectedFlat; // keep display in sync
    updatedRow.status = 'confirmed';
    updatedRow.confidence = 'manually assigned';
    updatedRow.assignedBy = 'local';
    updatedRow.assignedAt = new Date().toISOString();

    newResultData[rowIndex] = updatedRow;

    // Update corresponding bankTransactionsData if transactionid exists
    const newBankTx = bankTransactionsData.map(tx => {
      if (tx.transactionid && tx.transactionid === txId) {
        return { ...tx, assigned: true, flat: { flatNumber: selectedFlat.replace(/[^0-9]/g, ''), confidence: 'M' } };
      }
      return tx;
    });

    console.debug('Applying assignment to resultData and bankTransactionsData');
    setResultData(newResultData);
    setBankTransactionsData(newBankTx);
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
      default:
        return "Selected View";
    }
  };

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
            Penalty per Day (₹):
            <input 
              type="number" 
              value={dailyPenaltyRate} 
              onChange={(e) => setDailyPenaltyRate(Number(e.target.value))} 
              min="0" 
              style={{ marginLeft: '5px', width: '80px' }}
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
            {optionalResultColumns.map((col) => {
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
            {view === "result" && <TableView columns={visibleResultColumns} data={resultData} viewType="result" onAssignFlat={handleAssignFlat} availableFlats={availableFlats} />}
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
          <MaintenanceGeneratorUI payments={resultData} prevMaintenance={previousMaintenanceData} waterCharges={waterChargesData} dueDate={dueDate} dailyPenaltyRate={dailyPenaltyRate} />
        </div>
      )}
    </div>
  );
};

export default App;