import React, { useState, useEffect } from "react";
import TableView from "./TableView";
import CSVLoader from "./CSVLoader";
import RadioButtons from "./RadioButtons";
import { generateResultData } from "./utils";
import './App.css';

const App = () => {
  const [view, setView] = useState("result");
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
    { id: "description", header: "Description", accessorKey: "description" },
    { id: "transactionamountinr", header: "Transaction Amount (INR)", accessorKey: "transactionamountinr" },
  ];

  const resultColumns = [
    { id: "index", header: "Index", accessorKey: "index" },
    { id: "flat", header: "Flat No", accessorKey: "flatNo" },
    { id: "name", header: "Resident Name", accessorKey: "name" },
    { id: "amount", header: "Amount", accessorKey: "amount" },
    { id: "transactionamountinr", header: "Transaction", accessorKey: "transactionamountinr" },
    { id: "confidence", header: "Confidence", accessorKey: "confidence" },
    { id: "description", header: "Description", accessorKey: "description" },
    { id: "transactionid", header: "Transaction ID", accessorKey: "transactionid" },
  ];

  const validateHeaders = (data, columns) => {
    const headers = Object.keys(data[0]);
    const missingHeaders = columns.filter(column => column.accessorKey !== "index" && !headers.includes(column.accessorKey));
    if (missingHeaders.length > 0) {
      return `Missing headers in the loaded CSV file: ${missingHeaders.map(column => column.header).join(", ")}`;
    }
    return null;
  };

  const handleBankTransactionsDataParsed = (data) => {
    const errorMessage = validateHeaders(data, transactionColumns);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    try {
      const filteredData = data.filter(row => row["crdr"].toLowerCase() !== 'dr');
      const indexedData = filteredData.map((row, index) => ({
        index: index + 1, // Adding a 1-based index
        ...row,
      }));
      setBankTransactionsData(indexedData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to parse bank transactions CSV");
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
      <h1>Maintenance transaction tracker</h1>
      <div className="controls-container">
        <RadioButtons view={view} setView={setView} />
        <CSVLoader 
          onMaintenanceDataParsed={handleMaintenanceDataParsed} 
          onBankTransactionsDataParsed={handleBankTransactionsDataParsed} 
        />
      </div>
      
      {error && <div className="error-message">{error}</div>} {/* Display error message if any */}
      
      <h1>{getViewTitle()}</h1>
      {view === "maintenance" && <TableView columns={maintenanceColumns} data={maintenanceData} />}
      {view === "transaction" && <TableView columns={transactionColumns} data={bankTransactionsData} />}
      {view === "result" && <TableView columns={resultColumns} data={resultData} />}
    </div>
  );
};

export default App;