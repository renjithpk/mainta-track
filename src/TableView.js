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
                  const hasTransaction = row.transactionid && row.transactionid !== '';
                  const isManual = row.assignedBy && row.assignedBy === 'local';
                  const isConfirmedAuto = row.status === 'confirmed' && !isManual;

                  // If there is no transaction and it's not a manual-assigned row, show text
                  if (!hasTransaction && !isManual) {
                    return <td key={column.id}>{row.confidence && row.confidence.toString().toLowerCase().includes('no matching transaction') ? 'No matching transaction' : (row.assignedFlat || '')}</td>;
                  }

                  // If already confirmed by auto matching and not manual, render read-only
                  if (isConfirmedAuto) {
                    return <td key={column.id}>{row.assignedFlat || row.flatNo}</td>;
                  }

                  // Editable select for available flats (when a transaction exists or manual assignment)
                  const current = row.assignedFlat || row.flatNo || '';
                  // include current value in options even if not in availableFlats
                  const options = current ? [current, ...availableFlats.filter(f => f !== current)] : availableFlats;

                  return (
                    <td key={column.id}>
                      <select
                        value={current}
                        onChange={(e) => onAssignFlat && onAssignFlat(rowIndex, e.target.value)}
                        disabled={!onAssignFlat || (!availableFlats || availableFlats.length === 0) && !current}
                      >
                        <option value="">-- select flat --</option>
                        {options.map((f, i) => (
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