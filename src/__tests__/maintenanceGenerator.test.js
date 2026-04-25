import MaintenanceSheetGenerator from '../maintenanceGenerator';

describe('MaintenanceSheetGenerator.calculatePenalty', () => {
  const generator = new MaintenanceSheetGenerator({ dailyPenaltyRate: 20 });

  test('does not apply penalty on due date when arrears exist', () => {
    const dueDate = new Date();
    const dueDateString = dueDate.toISOString().split('T')[0];

    const penalty = generator.calculatePenalty(
      { arrears: 1000 },
      null,
      dueDateString
    );

    expect(penalty).toBe(0);
  });

  test('does not apply penalty before grace period ends', () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 10);
    const dueDateString = dueDate.toISOString().split('T')[0];

    const penalty = generator.calculatePenalty(
      { arrears: 1000 },
      null,
      dueDateString
    );

    expect(penalty).toBe(0);
  });

  test('applies penalty only after grace period', () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 35);
    const dueDateString = dueDate.toISOString().split('T')[0];

    const penalty = generator.calculatePenalty(
      { arrears: 1000 },
      null,
      dueDateString
    );

    expect(penalty).toBe(5 * 20);
  });

  test('does not apply penalty for payment made on due date', () => {
    const dueDate = new Date();
    const dueDateString = dueDate.toISOString().split('T')[0];

    const penalty = generator.calculatePenalty(
      { arrears: 1000 },
      { transactionDate: dueDateString, amount: 1000 },
      dueDateString
    );

    expect(penalty).toBe(0);
  });
});
