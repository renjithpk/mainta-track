// Export utilities for downloading data as CSV files

/**
 * Converts array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column definitions with header and accessorKey
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row from column definitions
  const headers = columns.map(col => col.header).join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.accessorKey] || '';
      
      // Handle values that might contain commas, quotes, or newlines
      if (typeof value === 'string') {
        // Escape quotes by doubling them and wrap in quotes if needed
        if (value.includes('"') || value.includes(',') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
      }
      
      return value;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

/**
 * Downloads a CSV file with the given data
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions
 * @param {string} filename - Name of the file to download (without .csv extension)
 */
export const exportToCSV = (data, columns, filename = 'export') => {
  const csvContent = convertToCSV(data, columns);
  
  if (!csvContent) {
    alert('No data to export');
    return;
  }

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    alert('Export not supported in this browser');
  }
};

/**
 * Generate appropriate filename based on view type and current date
 * @param {string} viewType - Type of view (maintenance, transaction, result)
 * @returns {string} Generated filename
 */
export const generateExportFilename = (viewType) => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const viewNames = {
    maintenance: 'maintenance_sheet',
    transaction: 'bank_transactions', 
    result: 'matching_results'
  };
  
  const baseName = viewNames[viewType] || 'export';
  return `${baseName}_${date}`;
};