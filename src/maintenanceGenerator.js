// Browser-friendly MaintenanceSheetGenerator
// Pure JS class for use in the React app (no fs or Papa dependencies)

export class MaintenanceSheetGenerator {
  constructor() {
    this.FIXED_PENALTY_ARREARS = 4300; // Fixed penalty for significant arrears
    this.DAILY_PENALTY_RATE = 20; // ₹20 per day
    this.GRACE_PERIOD_DAYS = 30; // 30 days grace period
  }

  // Parse currency string to number
  parseCurrency(currencyStr) {
    if (!currencyStr && currencyStr !== 0) return 0;
    return parseFloat(String(currencyStr).replace(/[^0-9.]/g, '')) || 0;
  }

  // Format number to Indian currency format
  formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  // Calculate penalty based on payment status and arrears
  calculatePenalty(flat, paymentRecord, dueDate) {
    // Rule 1: Fixed penalty for significant arrears (> ₹5000)
    if (flat.arrears > 5000) {
      return this.FIXED_PENALTY_ARREARS;
    }

    // Rule 2: No payment made
    if (!paymentRecord) {
      if (flat.arrears > 0) {
        return this.FIXED_PENALTY_ARREARS;
      }
      return 0;
    }

    // Rule 3: Payment made - calculate time-based penalty
    const paymentDate = new Date(paymentRecord.transactionDate);
    const dueDateObj = new Date(dueDate);
    const daysLate = Math.ceil((paymentDate - dueDateObj) / (1000 * 60 * 60 * 24));

    if (daysLate > this.GRACE_PERIOD_DAYS) {
      const penaltyDays = daysLate - this.GRACE_PERIOD_DAYS;
      return penaltyDays * this.DAILY_PENALTY_RATE;
    }

    return 0;
  }

  // Generate maintenance sheet (generic, not hardcoded to Q4)
  generateMaintenanceSheet(prevData, paymentRecords, waterChargesData, options = {}) {
    const {
      quarter = 'Current',
      dueDate = new Date().toISOString().split('T')[0],
      months = ['Month1', 'Month2', 'Month3']
    } = options;

    const out = [];

    prevData.forEach((row) => {
      if (!row['Flat No'] && !row['Flat No ']) return;
      const flatKey = row['Flat No'] ? 'Flat No' : 'Flat No ';
      const flatNo = String(row[flatKey]).trim();
      const residentName = row['Resident Name'] || row['Resident Name'] || '';
      const monthlyMaintenance = this.parseCurrency(row['Monthly'] || row['monthly'] || row['Monthly ']);
      const prevBalance = this.parseCurrency(row['Balance'] || row['balance']);
      const prevArrears = this.parseCurrency(row['Maintenance Arrears'] || row['Maintenance Arrears']);

      const paymentRecord = paymentRecords.find(p => p['Flat No'] && String(p['Flat No']).trim() === flatNo);
      const waterCharges = waterChargesData.find(w => (w['Flat No'] === flatNo) || (w['Flat No '] === flatNo) || (w['Flat No'] && String(w['Flat No']).trim() === flatNo));

      let newArrears = 0;
      if (paymentRecord) {
        const paidAmount = this.parseCurrency(paymentRecord['Amount'] || paymentRecord['Amount'] || paymentRecord['amount']);
        newArrears = Math.max(0, prevBalance - paidAmount);
      } else {
        newArrears = prevBalance;
      }

      const quarterly = monthlyMaintenance * 3;

      const water1 = waterCharges ? this.parseCurrency(waterCharges[months[0]] || waterCharges['July'] || waterCharges['July']) : 0;
      const water2 = waterCharges ? this.parseCurrency(waterCharges[months[1]] || waterCharges['Aug'] || waterCharges['Aug']) : 0;
      const water3 = waterCharges ? this.parseCurrency(waterCharges[months[2]] || waterCharges['Sept'] || waterCharges['Sept']) : 0;

      const penalty = this.calculatePenalty({ flatNo, arrears: newArrears, prevBalance }, paymentRecord ? { transactionDate: paymentRecord['Transaction Date'], amount: this.parseCurrency(paymentRecord['Amount'] || paymentRecord['amount']) } : null, dueDate);

      const totalBalance = quarterly + newArrears + water1 + water2 + water3 + penalty;

      const outRow = {
        'Flat No': flatNo,
        'Resident Name': residentName,
        'Monthly': this.formatCurrency(monthlyMaintenance),
        [`${quarter} Maintenance`]: this.formatCurrency(quarterly),
        'Maintenance Arrears': this.formatCurrency(newArrears),
        [`Water Bill ${months[0]}`]: `रु ${water1.toLocaleString('en-IN')}`,
        [`Water Bill ${months[1]}`]: `रु ${water2.toLocaleString('en-IN')}`,
        [`Water Bill ${months[2]}`]: `रु ${water3.toLocaleString('en-IN')}`,
        'Penalty': this.formatCurrency(penalty),
        'Balance': this.formatCurrency(totalBalance)
      };

      out.push(outRow);
    });

    return out;
  }
}

export default MaintenanceSheetGenerator;
