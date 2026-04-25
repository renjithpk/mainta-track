import React, { useState } from "react";
import MaintenanceSheetGenerator from "./maintenanceGenerator";
import TableView from './TableView';
import { waterBillingMonths } from './utils';

const MaintenanceGeneratorUI = ({ payments, prevMaintenance, waterCharges, dueDate, dailyPenaltyRate, amcEnabled, amcValue, quarter }) => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
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

  // Column order (all available columns in the intended display order)
  const getQuarterMonths = (quarterLabel) => {
    const qMatch = (quarterLabel || '').toString().toUpperCase().match(/Q([1-4])/);
    const qKey = qMatch ? `q${qMatch[1]}` : null;
    return qKey && waterBillingMonths[qKey] ? waterBillingMonths[qKey] : null;
  };

  const capitalize = (s) => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : s;

  const months = getQuarterMonths(quarter);
  if (!months) {
    // show immediate error in the component UI when quarter cannot be parsed
    // use local error state so it doesn't override generator errors
    // We prefer to show a clear message rather than silently defaulting months
    return (
      <div className="generator-ui">
        <div className="error-message">Invalid quarter selected — please choose a valid Quarter (e.g. Q1-26)</div>
      </div>
    );
  }
  const columnsOrder = [
    'Flat No',
    'Resident Name',
    'Monthly',
    'Current Maintenance',
    `Water Bill ${capitalize(months[0])}`,
    `Water Bill ${capitalize(months[1])}`,
    `Water Bill ${capitalize(months[2])}`,
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

  // Default selections shown when user clicks "Default" (already declared above)

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
    // Validate dueDate vs selected quarter rules
    try {
      if (quarter && typeof quarter === 'string') {
        const m = quarter.match(/^Q([1-4])-(\d{2})$/);
        if (m) {
          const qNum = Number(m[1]);
          const yy = Number(m[2]);
          // Build full year from yy (assume 2000+)
          const qYear = 2000 + yy;
          if (qNum === 1) {
            // previous quarter is Q4 of previous year
            const prevQ = 4;
            const prevYear = qYear - 1;
            // dueDate must fall within prevQuarter months Oct-Dec of prevYear
            const due = new Date(dueDate);
            if (isNaN(due.getTime())) {
              setError('Invalid due date');
              return;
            }
            const dueMonth = due.getMonth(); // 0-11
            const dueYear = due.getFullYear();
            const validMonths = [9,10,11]; // Oct,Nov,Dec
            if (dueYear !== prevYear || !validMonths.includes(dueMonth)) {
              setError(`For ${quarter} maintenance, Due Date must be in previous quarter (Oct-Dec ${prevYear}).`);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error validating quarter/dueDate', err);
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
          quarter: quarter || "Current",
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
              exportMeta={{ quarter: quarter }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceGeneratorUI;
