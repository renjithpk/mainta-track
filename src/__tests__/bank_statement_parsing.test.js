import Papa from 'papaparse';

// Mock CSV data matching the new mandatory generic format
const mockBankStatementCSV = `Date,Transaction ID,Description,Amount
20/Jul/2025,S92159466,UPI/ANKIT KUMA/9334113993-3@i/A114Q32025,"8,917.00"
07/Jul/2025,S74859041,MMT/IMPS/518818293159/June salary/BABUSECURI,"52,000.00"
20/Jul/2025,S92513320,UPI/SRIVATHSAN/mssrivathsan1@/A201  Q3 M,"11,681.00"`;

// Test CSV parsing functionality
describe('Bank Statement CSV Parsing', () => {
  test('should correctly parse new generic format CSV', () => {
    const result = Papa.parse(mockBankStatementCSV, {
      header: true,
      dynamicTyping: true,
      transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    });

    const data = result.data;
    
    // Check that headers are transformed correctly
    expect(data[0]).toHaveProperty('date');
    expect(data[0]).toHaveProperty('transactionid');
    expect(data[0]).toHaveProperty('description');
    expect(data[0]).toHaveProperty('amount');
  });

  test('should correctly process raw rows into internal format', () => {
    const result = Papa.parse(mockBankStatementCSV, {
      header: true,
      dynamicTyping: true,
      transformHeader: (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    });

    const data = result.data;

    const processedData = data
      .filter(row => {
        const amt = row.amount;
        if (amt === undefined || amt === null || String(amt).trim() === '') return false;
        const parsedLevel = parseFloat(String(amt).replace(/[^0-9.\-]/g, ''));
        return !isNaN(parsedLevel) && parsedLevel > 0;
      })
      .map((row, index) => ({
        index: index + 1,
        ...row,
        transactiondate: row.date || "",
        transactionid: row.transactionid || "",
        description: row.description || "",
        transactionamountinr: row.amount || 0
      }));

    expect(processedData).toHaveLength(3);
    expect(processedData[0].transactionid).toBe('S92159466');
    expect(processedData[0].transactionamountinr).toBe('8,917.00');
    expect(processedData[0].transactiondate).toBe('20/Jul/2025');
    
    expect(processedData[1].transactionid).toBe('S74859041');
    expect(processedData[1].transactionamountinr).toBe('52,000.00');
  });

  test('should handle amount parsing correctly', () => {
    // Test amount parsing logic
    const testAmounts = ['8,917.00', '"52,000.00"', '10500'];
    
    testAmounts.forEach(amount => {
      let parsedLevel = parseFloat(String(amount).replace(/[^0-9.\-]/g, ''));
      expect(typeof parsedLevel).toBe('number');
      expect(parsedLevel).toBeGreaterThan(0);
    });

    // Specific test cases
    expect(parseFloat('8,917.00'.replace(/[^0-9.\-]/g, ''))).toBe(8917);
    expect(parseFloat('"52,000.00"'.replace(/[^0-9.\-]/g, ''))).toBe(52000);
    expect(parseFloat('10500'.replace(/[^0-9.\-]/g, ''))).toBe(10500);
  });
});