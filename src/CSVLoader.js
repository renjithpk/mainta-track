import React from "react";
import FileUploader from "./FileUploader";

const CSVLoader = ({ onPreviousMaintenanceDataParsed, onBankTransactionsDataParsed, onWaterChargesDataParsed }) => {

  const handleMaintenanceUpload = (data) => {
    onPreviousMaintenanceDataParsed(data);
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
          <h3 title="flatno,balance">Previous Maintenance Sheet</h3>
          <FileUploader
            onDataParsed={handleMaintenanceUpload}
            tooltip={"flatno,balance,penalty,lastmaintenancewithoutpenalty,maintenancearrears"}
          />
        </div>
        <div>
          <h3 title="depositamtinr,transactionamountinr,crdr">Bank Transactions</h3>
          <FileUploader
            onDataParsed={handleBankTransactionsUpload}
            tooltip={"depositamtinr,transactionamountinr,crdr,transactiondate,transactionid,description,transactionremarks,tranid,withdrawalamtinr"}
          />
        </div>
        <div>
          <h3 title="flatno,monthjuly,monthaug,monthsept,total">Water Charges</h3>
          <FileUploader
            onDataParsed={handleWaterChargesUpload}
            tooltip={"flatno,monthjuly,monthaug,monthsept,total"}
          />
        </div>
      </div>
    </div>
  );
};

export default CSVLoader;

