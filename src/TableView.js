import React from 'react';
import './TableView.css'; // Import the CSS file

const TableView = ({ columns, data }) => {
  return (
    <div className="table-view-container">
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