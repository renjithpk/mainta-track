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
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [bankTransactionsData, setBankTransactionsData] = useState([]);
  const [resultData, setResultData] = useState([]);
  const [error, setError] = useState(null); // State variable for error messages

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

  const handleMaintenanceDataParsed = (data) => {
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
      setMaintenanceData(indexedData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to parse maintenance CSV");
    }
  };

  useEffect(() => {
    if (maintenanceData.length === 0 || bankTransactionsData.length === 0) {
      return;
    }
    setResultData(generateResultData(maintenanceData, bankTransactionsData));
  }, [maintenanceData, bankTransactionsData, view]);

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
      <h1>Maintenance Transaction Tracker</h1>
      <div className="tabs-container">
        <button className={`tab-btn${tab === 'mapping' ? ' active' : ''}`} onClick={() => setTab('mapping')}>1. Bank Transaction Mapping</button>
        <button className={`tab-btn${tab === 'maintenance' ? ' active' : ''}`} onClick={() => setTab('maintenance')}>2. Maintenance Calculation</button>
      </div>
      <div className="tab-content">
        {tab === 'mapping' && (
          <>
            <div className="card controls-card">
              <div className="section-header">Transaction Mapping</div>
              <div className="controls-row">
                <CSVLoader 
                  onMaintenanceDataParsed={handleMaintenanceDataParsed} 
                  onBankTransactionsDataParsed={handleBankTransactionsDataParsed} 
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="description-text">
                <strong>Instructions:</strong> Download the matching results CSV, manually adjust flat numbers if needed, then use the result along with previous quarter maintenance and water charges to generate the next maintenance sheet.
              </div>
            </div>
            <div className="card results-card">
              <div className="section-header">{getViewTitle()}</div>
              <div className="controls-row">
                <RadioButtons view={view} setView={setView} />
              </div>
              {view === "maintenance" && <TableView columns={maintenanceColumns} data={maintenanceData} viewType="maintenance" />}
              {view === "transaction" && <TableView columns={transactionColumns} data={bankTransactionsData} viewType="transaction" />}
              {view === "result" && (
                <div style={{ width: '100%' }}>
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

                  <TableView columns={visibleResultColumns} data={resultData} viewType="result" />
                </div>
              )}
            </div>
          </>
        )}
        {tab === 'maintenance' && (
          <div className="card generator-card">
            <div className="section-header">Maintenance Sheet Generator</div>
            <div className="description-text">
              <strong>Instructions:</strong> Upload the previous maintenance sheet, payment mapping CSV, and water charges CSV. Click 'Generate Maintenance Sheet' to create the new sheet for the current period. You can use this tool for any quarter or period.
            </div>
            <MaintenanceGeneratorUI />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;