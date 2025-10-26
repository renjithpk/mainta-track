// Test script to validate CSV parsing logic
const fs = require('fs');
const Papa = require('papaparse');

// Read the bank statement CSV
const csvContent = fs.readFileSync('/Users/renjithkrishnan/src/jsons/mainta-track/bank_statement.csv', 'utf8');

// Parse with the same transformation as FileUploader
Papa.parse(csvContent, {
  header: true,
  dynamicTyping: true,
  transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
  complete: (results) => {
    console.log('Headers:', Object.keys(results.data[0] || {}));
    console.log('First few rows:');
    results.data.slice(0, 3).forEach((row, i) => {
      console.log(`Row ${i + 1}:`, {
        tranid: row.tranid,
        transactionremarks: row.transactionremarks,
        withdrawalamtinr: row.withdrawalamtinr,
        depositamtinr: row.depositamtinr,
        balanceinr: row.balanceinr
      });
    });
    
    // Test the new format detection logic
    const hasNewFormat = results.data.length > 0 && 
      (results.data[0].hasOwnProperty('withdrawalamtinr') || results.data[0].hasOwnProperty('depositamtinr'));
    console.log('Has new format:', hasNewFormat);
    
    // Test filtering for deposits only
    const depositsOnly = results.data.filter(row => 
      row.depositamtinr && row.depositamtinr !== "" && row.depositamtinr !== null
    );
    console.log('Total rows:', results.data.length);
    console.log('Deposit rows only:', depositsOnly.length);
    console.log('Sample deposit row:', depositsOnly[0]);
  },
  error: (error) => {
    console.error('Parse error:', error);
  }
});