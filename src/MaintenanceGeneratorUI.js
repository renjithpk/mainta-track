import React, { useState } from "react";
import MaintenanceSheetGenerator from "./maintenanceGenerator";
import TableView from './TableView';

const MaintenanceGeneratorUI = ({ payments, prevMaintenance, waterCharges, dueDate, dailyPenaltyRate, amcEnabled, amcValue }) => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Column order (all available columns in the intended display order)
  const columnsOrder = [
    'Flat No',
    'Resident Name',
    'Monthly',
    'Current Maintenance',
    'Water Bill July',
    'Water Bill Aug',
    'Water Bill Sept',
    'Water Bill Total',
    'Previous Maintenance',
    'Transaction Amount',
    'Transaction ID',
    'Transaction Date',
    'Description',
    'Confidence',
    'Maintenance Arrears',
    'Penalty',
    'AMC',
    'Balance'
  ];

  // Default selections shown when user clicks "Default"
  const defaultSelections = [
    'Previous Maintenance',
    'Transaction Amount',
    'Flat No',
    'Resident Name',
    'Current Maintenance',
    'Water Bill Total',
    'Penalty',
    'Balance'
  ];

  // Currently selected columns (drives generator and table order)
  const [columnSelected, setColumnSelected] = useState(defaultSelections);

  const handleResetToDefault = () => {
    setColumnSelected(defaultSelections);
  };

  const handleColumnToggle = (column) => {
    setColumnSelected(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleGenerate = async () => {
    console.log("Generate button clicked");
    console.log("prevMaintenance length:", prevMaintenance?.length);
    console.log("payments length:", payments?.length);
    console.log("waterCharges length:", waterCharges?.length);
    setError(null);
    setResult(null);
    if (!prevMaintenance || !payments || !waterCharges) {
      console.log("Missing required data");
      setError("Please ensure all required data is available: previous maintenance, payment mapping, and water charges.");
      return;
    }
    console.log("All data available, proceeding to generate");
    try {
      // Generate maintenance sheet
      const generator = new MaintenanceSheetGenerator({ dailyPenaltyRate });
      console.log("Generator created with dailyPenaltyRate:", dailyPenaltyRate);
      const generated = generator.generateMaintenanceSheet(
        prevMaintenance,
        payments,
        waterCharges,
        {
          quarter: "Current", // Not hardcoded
          dueDate: dueDate,
          dailyPenaltyRate: dailyPenaltyRate,
          selectedColumns: columnSelected,
          columnsOrder: columnsOrder,
          amcEnabled: !!amcEnabled,
          amcValue: amcValue || 0
        }
      );
      console.log("Generated result:", generated);
      setResult(generated);
    } catch (err) {
      console.log("Error during generation:", err);
      setError("Error generating maintenance sheet: " + err.message);
    }
  };

  return (
    <div className="generator-ui">
      <div className="column-selection">
        <div className="column-selection-header">
          <h4>Select Columns to Include:</h4>
          <button className="default-btn" onClick={handleResetToDefault}>Default</button>
        </div>
        <div className="column-checkboxes">
          {columnsOrder.map(column => (
            <label key={column} className="column-checkbox">
              <input
                type="checkbox"
                checked={columnSelected.includes(column)}
                onChange={() => handleColumnToggle(column)}
              />
              {column}
            </label>
          ))}
        </div>
      </div>
      <button className="generator-btn" onClick={handleGenerate}>Generate Maintenance Sheet</button>
      {error && <div className="error-message">{error}</div>}
      {result && result.length > 0 && (
        <div className="generator-result">
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
