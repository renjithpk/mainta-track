import React from "react";
import FileUploader from "./FileUploader";
import { waterBillingMonths } from './utils';

const CSVLoader = ({ onPreviousMaintenanceDataParsed, onBankTransactionsDataParsed, onWaterChargesDataParsed, selectedQuarter }) => {

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
          {(() => {
            // Determine quarter key like 'q1' from selectedQuarter e.g. 'Q1-26'
            const qMatch = (selectedQuarter || '').toString().toUpperCase().match(/Q([1-4])/);
            const qKey = qMatch ? `q${qMatch[1]}` : null;
            const months = qKey && waterBillingMonths[qKey] ? waterBillingMonths[qKey] : ['jul', 'aug', 'sep'];
            const monthFields = months.map(m => `month${m}`).join(',');
            const tooltip = `flatno,${monthFields},total`;
            return (
              <>
                <h3 title={tooltip}>Water Charges</h3>
                <FileUploader
                  onDataParsed={handleWaterChargesUpload}
                  tooltip={tooltip}
                />
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CSVLoader;

