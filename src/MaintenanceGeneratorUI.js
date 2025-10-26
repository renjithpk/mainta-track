import React, { useState } from "react";
import MaintenanceSheetGenerator from "./maintenanceGenerator";
import TableView from './TableView';

const MaintenanceGeneratorUI = ({ payments, prevMaintenance, waterCharges, dueDate, dailyPenaltyRate }) => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setError(null);
    setResult(null);
    if (!prevMaintenance || !payments || !waterCharges) {
      setError("Please ensure all required data is available: previous maintenance, payment mapping, and water charges.");
      return;
    }
    try {
      // Generate maintenance sheet
      const generator = new MaintenanceSheetGenerator({ dailyPenaltyRate });
      const generated = generator.generateMaintenanceSheet(
        prevMaintenance,
        payments,
        waterCharges,
        {
          quarter: "Current", // Not hardcoded
          dueDate: dueDate,
          months: ["July", "Aug", "Sept"]
        }
      );
      setResult(generated);
    } catch (err) {
      setError("Error generating maintenance sheet: " + err.message);
    }
  };

  return (
    <div className="generator-ui">
      <button className="generator-btn" onClick={handleGenerate}>Generate Maintenance Sheet</button>
      {error && <div className="error-message">{error}</div>}
      {result && result.length > 0 && (
        <div className="generator-result">
          <div className="result-summary">Generated {result.length} records.</div>
          {/* CSV export is available via the table's top-right Export button; removed duplicate Download button */}
          <div style={{ marginTop: 16, width: '100%' }}>
            {/* Preview table of generated results */}
            <TableView
              columns={Object.keys(result[0]).map(k => ({ id: k, header: k, accessorKey: k }))}
              data={result}
              viewType="result"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceGeneratorUI;
