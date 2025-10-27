import React from 'react';
import './TableView.css'; // Import the CSS file
import { exportToCSV, generateExportFilename } from './exportUtils';
import AssignSelect from './AssignSelect';

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

                  // Use custom AssignSelect so we can control popup width while keeping the visible button compact
                  const current = row.assignedFlat || row.flatNo || '';
                  // normalize availableFlats to objects { flatNo, label }
                  const normalize = (item) => (typeof item === 'string' ? { flatNo: item, label: item } : (item || { flatNo: '', label: '' }));
                  const normalized = (availableFlats || []).map(normalize);

                  // ensure current is present first
                  const finalOptionsMap = new Map();
                  if (current) finalOptionsMap.set(current, normalize(current));
                  normalized.forEach(o => { if (o.flatNo) finalOptionsMap.set(o.flatNo, o); });
                  const finalOptions = Array.from(finalOptionsMap.values());

                  return (
                    <td key={column.id} style={{ position: 'relative' }}>
                      <AssignSelect
                        value={current}
                        options={finalOptions}
                        onChange={(flatNo) => onAssignFlat && onAssignFlat(rowIndex, flatNo)}
                      />
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