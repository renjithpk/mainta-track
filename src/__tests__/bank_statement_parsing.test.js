import Papa from 'papaparse';

// Mock CSV data matching the bank_statement.csv format
const mockBankStatementCSV = `S.N.,Tran. Id,Value Date,Transaction Date,Transaction Posted Date,Cheque. No./Ref. No.,Transaction Remarks,Withdrawal Amt (INR),Deposit Amt (INR),Balance (INR)
1,S92159466,20/Jul/2025,20/Jul/2025,20/07/2025 08:50:50 PM,,UPI/ANKIT KUMA/9334113993-3@i/A114Q32025/ICICI Bank/424580095193/IBLe3c303324f8b45c8aebb7c4baaea273b,,"8,917.00","7,57,695.49"
2,S74859041,07/Jul/2025,07/Jul/2025,07/07/2025 06:19:08 PM,,MMT/IMPS/518818293159/June salary/BABUSECURI/HDFC0001208,"52,000.00",,"7,72,089.49"
3,S92513320,20/Jul/2025,20/Jul/2025,20/Jul/2025 09:41:37 PM,,UPI/SRIVATHSAN/mssrivathsan1@/A201  Q3 M/ICICI Bank/526661168169/AXL8c24ae0f00654002801bdee7be15d745,,"11,681.00","7,69,376.49"`;

// Test CSV parsing functionality
describe('Bank Statement CSV Parsing', () => {
  test('should correctly parse new format CSV with withdrawal/deposit columns', () => {
    const result = Papa.parse(mockBankStatementCSV, {
      header: true,
      dynamicTyping: true,
      transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    });

    const data = result.data;
    
    // Check that headers are transformed correctly
    expect(data[0]).toHaveProperty('sn');
    expect(data[0]).toHaveProperty('tranid');
    expect(data[0]).toHaveProperty('transactionremarks');
    expect(data[0]).toHaveProperty('withdrawalamtinr');
    expect(data[0]).toHaveProperty('depositamtinr');
    expect(data[0]).toHaveProperty('balanceinr');
  });

  test('should filter out withdrawal transactions and keep only deposits', () => {
    const result = Papa.parse(mockBankStatementCSV, {
      header: true,
      dynamicTyping: true,
      transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    });

    const data = result.data;
    
    // Simulate the filtering logic from App.js
    const hasNewFormat = data.length > 0 && (data[0].hasOwnProperty('withdrawalamtinr') || data[0].hasOwnProperty('depositamtinr'));
    expect(hasNewFormat).toBe(true);

    const processedData = data
      .filter(row => {
        return row.depositamtinr && row.depositamtinr !== "" && row.depositamtinr !== null;
      })
      .map(row => ({
        ...row,
        transactionamountinr: row.depositamtinr,
        description: row.transactionremarks || row.description || "",
        transactionid: row.tranid || row.transactionid || ""
      }));

    // Should have 2 deposit transactions (rows 1 and 3)
    expect(processedData).toHaveLength(2);
    expect(processedData[0].transactionid).toBe('S92159466');
    expect(processedData[0].transactionamountinr).toBe('8,917.00');
    expect(processedData[1].transactionid).toBe('S92513320');
    expect(processedData[1].transactionamountinr).toBe('11,681.00');
  });

  test('should correctly map transaction fields for new format', () => {
    const result = Papa.parse(mockBankStatementCSV, {
      header: true,
      dynamicTyping: true,
      transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    });

    const data = result.data;
    const row = data[0]; // First deposit transaction

    const processedRow = {
      ...row,
      transactionamountinr: row.depositamtinr,
      description: row.transactionremarks || row.description || "",
      transactionid: row.tranid || row.transactionid || ""
    };

    expect(processedRow.transactionid).toBe('S92159466');
    expect(processedRow.description).toContain('UPI/ANKIT KUMA');
    expect(processedRow.transactionamountinr).toBe('8,917.00');
  });

  test('should handle amount parsing correctly', () => {
    // Test amount parsing logic from utils.js
    const testAmounts = ['8,917.00', '"52,000.00"', '10500'];
    
    testAmounts.forEach(amount => {
      let transactionAmount = amount;
      if (typeof transactionAmount === 'string') {
        transactionAmount = parseFloat(transactionAmount.replace(/[",]/g, ''));
      }
      
      expect(typeof transactionAmount).toBe('number');
      expect(transactionAmount).toBeGreaterThan(0);
    });

    // Specific test cases
    expect(parseFloat('8,917.00'.replace(/[",]/g, ''))).toBe(8917);
    expect(parseFloat('"52,000.00"'.replace(/[",]/g, ''))).toBe(52000);
    expect(parseFloat('10500'.replace(/[",]/g, ''))).toBe(10500);
  });
});