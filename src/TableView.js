import React from 'react';
import './TableView.css'; // Import the CSS file
import { exportToCSV, generateExportFilename } from './exportUtils';

const TableView = ({ columns, data, viewType, onAssignFlat, availableFlats = [] }) => {
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
              {columns.map((column) => {
                // Special rendering for the assignment column
                if (column.accessorKey === 'assignFlat') {
                  // If there is no transaction mapped for this maintenance row, do not show a dropdown
                  // (these typically have confidence like "no matching transaction" and no transactionid)
                  if (!row.transactionid) {
                    return <td key={column.id}>{row.confidence && row.confidence.toString().toLowerCase().includes('no matching transaction') ? 'No matching transaction' : (row.assignedFlat || '')}</td>;
                  }

                  // If already confirmed, render read-only
                  if (row.status === 'confirmed') {
                    return <td key={column.id}>{row.assignedFlat || row.flatNo}</td>;
                  }

                  // Editable select for available flats (only when a transaction exists)
                  return (
                    <td key={column.id}>
                      <select
                        value={row.assignedFlat || ''}
                        onChange={(e) => {
                          console.debug('assign select changed', { rowIndex, value: e.target.value });
                          onAssignFlat && onAssignFlat(rowIndex, e.target.value);
                        }}
                        disabled={!onAssignFlat || !availableFlats || availableFlats.length === 0}
                      >
                        <option value="">-- select flat --</option>
                        {availableFlats.map((f, i) => (
                          <option key={i} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                  );
                }

                return <td key={column.id}>{row[column.accessorKey]}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;