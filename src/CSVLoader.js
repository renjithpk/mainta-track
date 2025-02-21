import React, { useState } from "react";
import FileUploader from "./FileUploader";

const CSVLoader = ({ onMaintenanceDataParsed, onBankTransactionsDataParsed }) => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [bankTransactionsData, setBankTransactionsData] = useState([]);

  const handleMaintenanceUpload = (data) => {
    setMaintenanceData(data);
    onMaintenanceDataParsed(data);
  };

  const handleBankTransactionsUpload = (data) => {
    setBankTransactionsData(data);
    onBankTransactionsDataParsed(data);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <div>
          <h3>Maintenance Sheet</h3>
          <FileUploader onDataParsed={handleMaintenanceUpload} />
        </div>
        <div>
          <h3>Bank Transactions</h3>
          <FileUploader onDataParsed={handleBankTransactionsUpload} />
        </div>
      </div>
    </div>
  );
};

export default CSVLoader;

