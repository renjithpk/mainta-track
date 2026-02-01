import React from 'react';
import Papa from 'papaparse';
import './FileUploader.css'; // Import the CSS file

const FileUploader = ({ onDataParsed, tooltip }) => {
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
        complete: (results) => {
          onDataParsed(results.data);
        },
      });
    }
  };

  return (
    <div className="file-uploader-container">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="file-input"
        title={tooltip || ''}
        aria-label={tooltip || 'Upload CSV file'}
      />
    </div>
  );
};

export default FileUploader;