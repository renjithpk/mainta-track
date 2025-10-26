import React from 'react';
import './TableView.css'; // Import the CSS file
import { exportToCSV, generateExportFilename } from './exportUtils';

const TableView = ({ columns, data, viewType }) => {
  const handleExport = () => {
    const filename = generateExportFilename(viewType);
    exportToCSV(data, columns, filename);
  };

  return (
    <div className="table-view-container">
      <div className="table-header">
        <div className="table-info">
          <span className="record-count">Records: {data.length}</span>
        </div>
        <button 
          className="export-button" 
          onClick={handleExport}
          disabled={!data || data.length === 0}
        >
          📥 Export to CSV
        </button>
      </div>
      <table className="table-view">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.id}>{row[column.accessorKey]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;