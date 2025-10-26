import React from "react";
import FileUploader from "./FileUploader";

const CSVLoader = ({ onMaintenanceDataParsed, onBankTransactionsDataParsed, onWaterChargesDataParsed }) => {

  const handleMaintenanceUpload = (data) => {
    onMaintenanceDataParsed(data);
  };

  const handleBankTransactionsUpload = (data) => {
    onBankTransactionsDataParsed(data);
  };

  const handleWaterChargesUpload = (data) => {
    onWaterChargesDataParsed(data);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h3>Previous Maintenance Sheet</h3>
          <FileUploader onDataParsed={handleMaintenanceUpload} />
        </div>
        <div>
          <h3>Bank Transactions</h3>
          <FileUploader onDataParsed={handleBankTransactionsUpload} />
        </div>
        <div>
          <h3>Water Charges</h3>
          <FileUploader onDataParsed={handleWaterChargesUpload} />
        </div>
      </div>
    </div>
  );
};

export default CSVLoader;

