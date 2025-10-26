import React, { useState } from "react";
import MaintenanceSheetGenerator from "./maintenanceGenerator";
import Papa from 'papaparse';
import TableView from './TableView';

const MaintenanceGeneratorUI = () => {
  const [prevMaintenanceFile, setPrevMaintenanceFile] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [waterFile, setWaterFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (setter) => (e) => {
    setter(e.target.files[0] || null);
  };

  const handleGenerate = async () => {
    setError(null);
    setResult(null);
    if (!prevMaintenanceFile || !paymentFile || !waterFile) {
      setError("Please upload all three files.");
      return;
    }
    try {
      // Read files as text
      const readFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      const [prevMaintenanceText, paymentText, waterText] = await Promise.all([
        readFile(prevMaintenanceFile),
        readFile(paymentFile),
        readFile(waterFile)
      ]);
  // Parse CSVs
  const prevMaintenance = Papa.parse(prevMaintenanceText, { header: true }).data;
  const payments = Papa.parse(paymentText, { header: true }).data;
  const waterCharges = Papa.parse(waterText, { header: true }).data;
      // Generate maintenance sheet
      const generator = new MaintenanceSheetGenerator();
      const generated = generator.generateMaintenanceSheet(
        prevMaintenance,
        payments,
        waterCharges,
        {
          quarter: "Current", // Not hardcoded
          dueDate: new Date().toISOString().split("T")[0],
          months: ["July", "Aug", "Sept"]
        }
      );
      setResult(generated);
    } catch (err) {
      setError("Error generating maintenance sheet: " + err.message);
    }
  };

  const handleDownload = () => {
    if (!result || result.length === 0) return;
    const headers = Object.keys(result[0]);
    const rows = result.map(row => headers.map(h => row[h]).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "maintenance_sheet.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="generator-ui">
      <div className="generator-inputs">
        <label>
          Previous Maintenance Sheet (CSV):
          <input type="file" accept=".csv" onChange={handleFileChange(setPrevMaintenanceFile)} />
        </label>
        <label>
          Payment Mapping CSV:
          <input type="file" accept=".csv" onChange={handleFileChange(setPaymentFile)} />
        </label>
        <label>
          Water Charges CSV:
          <input type="file" accept=".csv" onChange={handleFileChange(setWaterFile)} />
        </label>
      </div>
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
