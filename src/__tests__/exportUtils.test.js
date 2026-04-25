import { convertToCSV, generateExportFilename } from '../exportUtils';

describe('Export Utilities', () => {
  const mockColumns = [
    { id: 'id', header: 'ID', accessorKey: 'id' },
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'amount', header: 'Amount', accessorKey: 'amount' },
    { id: 'date', header: 'Date', accessorKey: 'date' }
  ];

  const mockData = [
    { id: 1, name: 'John Doe', amount: '1,000.00', date: '2025-07-20' },
    { id: 2, name: 'Jane "Smith"', amount: '2,500.50', date: '2025-07-21' },
    { id: 3, name: 'Bob, Wilson', amount: '750.25', date: '2025-07-22' }
  ];

  test('should convert data to CSV format correctly', () => {
    const csv = convertToCSV(mockData, mockColumns);
    
    expect(csv).toContain('ID,Name,Amount,Date');
    expect(csv).toContain('1,John Doe,"1,000.00",2025-07-20');
    expect(csv).toContain('2,"Jane ""Smith""","2,500.50",2025-07-21');
    expect(csv).toContain('3,"Bob, Wilson",750.25,2025-07-22');
  });

  test('should handle empty data', () => {
    const csv = convertToCSV([], mockColumns);
    expect(csv).toBe('');
  });

  test('should handle missing values', () => {
    const dataWithMissingValues = [
      { id: 1, name: 'John' }, // missing amount and date
      { id: 2, amount: '100.00' } // missing name and date
    ];

    const csv = convertToCSV(dataWithMissingValues, mockColumns);
    expect(csv).toContain('1,John,,');
    expect(csv).toContain('2,,100.00,');
  });

  test('should generate appropriate filenames', () => {
    const maintenanceFilename = generateExportFilename('maintenance');
    const transactionFilename = generateExportFilename('transaction');
    const resultFilename = generateExportFilename('result');

    expect(maintenanceFilename).toMatch(/maintenance_sheet_\d{4}-\d{2}-\d{2}/);
    expect(transactionFilename).toMatch(/bank_transactions_\d{4}-\d{2}-\d{2}/);
    expect(resultFilename).toMatch(/matching_results_\d{4}-\d{2}-\d{2}/);
  });

  test('should generate maintenance-style filename when quarter meta provided', () => {
    const filename = generateExportFilename('result', { quarter: 'Q1-26' });
    expect(filename).toBe('Maintenance_Q1_2026');
  });

  test('should handle unknown view types', () => {
    const filename = generateExportFilename('unknown');
    expect(filename).toMatch(/export_\d{4}-\d{2}-\d{2}/);
  });
});