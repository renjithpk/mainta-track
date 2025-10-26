// Q4 Maintenance Sheet Generator
// Based on analysis of Q3 data, payment records, and penalty structure

const fs = require('fs');
const Papa = require('papaparse');

class MaintenanceSheetGenerator {
  constructor() {
    this.FIXED_PENALTY_ARREARS = 4300; // Fixed penalty for significant arrears
    this.DAILY_PENALTY_RATE = 20; // ₹20 per day
    this.GRACE_PERIOD_DAYS = 30; // 30 days grace period
  }

  // Parse currency string to number
  parseCurrency(currencyStr) {
    if (!currencyStr) return 0;
    return parseFloat(currencyStr.toString().replace(/[^0-9.]/g, '')) || 0;
  }

  // Format number to Indian currency format
  formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  // Calculate penalty based on payment status and arrears
  calculatePenalty(flat, paymentRecord, dueDate) {
    // Rule 1: Fixed penalty for significant arrears (> ₹5000)
    if (flat.arrears > 5000) {
      return this.FIXED_PENALTY_ARREARS;
    }

    // Rule 2: No payment made
    if (!paymentRecord) {
      // Apply penalties based on arrears or other factors
      if (flat.arrears > 0) {
        return this.FIXED_PENALTY_ARREARS;
      }
      // Could add time-based penalty for no payment
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

  // Generate Q4 maintenance sheet
  generateQ4MaintenanceSheet(q3Data, paymentRecords, waterChargesQ4, options = {}) {
    const {
      quarter = 'Q4-25',
      dueDate = '2025-10-01', // Q4 due date
      months = ['July', 'Aug', 'Sept']
    } = options;

    console.log('=== GENERATING Q4 MAINTENANCE SHEET ===\n');

    const q4MaintenanceData = [];

    q3Data.forEach((q3Row, index) => {
      if (!q3Row['Flat No']) return;

      const flatNo = q3Row['Flat No'].trim();
      const residentName = q3Row['Resident Name'];
      const monthlyMaintenance = this.parseCurrency(q3Row['Monthly']);
      const q3Balance = this.parseCurrency(q3Row['Balance']);
      const q3Arrears = this.parseCurrency(q3Row['Maintenance Arrears']);

      // Find payment record for this flat
      const paymentRecord = paymentRecords.find(p => 
        p['Flat No'] && p['Flat No'].trim() === flatNo
      );

      // Find water charges for Q4
      const waterCharges = waterChargesQ4.find(w => 
        w['Flat No '] && w['Flat No '].trim() === flatNo
      );

      // Calculate new maintenance arrears
      let newArrears = 0;
      if (paymentRecord) {
        const paidAmount = this.parseCurrency(paymentRecord['Amount']);
        newArrears = Math.max(0, q3Balance - paidAmount);
      } else {
        // No payment made, entire Q3 balance becomes arrears
        newArrears = q3Balance;
      }

      // Q4 maintenance (quarterly = monthly × 3)
      const q4Maintenance = monthlyMaintenance * 3;

      // Water bills for Q4
      const waterBillJuly = waterCharges ? this.parseCurrency(waterCharges['July']) : 0;
      const waterBillAug = waterCharges ? this.parseCurrency(waterCharges['Aug']) : 0;
      const waterBillSept = waterCharges ? this.parseCurrency(waterCharges['Sept']) : 0;

      // Calculate penalty
      const penalty = this.calculatePenalty(
        { 
          flatNo, 
          arrears: newArrears,
          q3Balance 
        },
        paymentRecord ? {
          transactionDate: paymentRecord['Transaction Date'],
          amount: this.parseCurrency(paymentRecord['Amount'])
        } : null,
        dueDate
      );

      // Calculate total balance
      const totalBalance = q4Maintenance + newArrears + waterBillJuly + waterBillAug + waterBillSept + penalty;

      // Create Q4 row
      const q4Row = {
        'Flat No': flatNo,
        'Resident Name': residentName,
        'Monthly': this.formatCurrency(monthlyMaintenance),
        [`${quarter} Maintenance`]: this.formatCurrency(q4Maintenance),
        'Maintenance Arrears': this.formatCurrency(newArrears),
        [`Water Bill ${months[0]}`]: waterCharges ? `रु ${waterBillJuly.toLocaleString('en-IN')}` : 'रु 0',
        [`Water Bill ${months[1]}`]: waterCharges ? `रु ${waterBillAug.toLocaleString('en-IN')}` : 'रु 0',
        [`Water Bill ${months[2]}`]: waterCharges ? `रु ${waterBillSept.toLocaleString('en-IN')}` : 'रु 0',
        'Penalty': this.formatCurrency(penalty),
        'Balance': this.formatCurrency(totalBalance)
      };

      q4MaintenanceData.push(q4Row);

      // Log the calculation for verification
      console.log(`${flatNo}: Q3 Balance: ₹${q3Balance}, Paid: ₹${paymentRecord ? this.parseCurrency(paymentRecord['Amount']) : 0}, New Arrears: ₹${newArrears}, Penalty: ₹${penalty}`);
    });

    return q4MaintenanceData;
  }

  // Save Q4 maintenance sheet to CSV
  saveToCSV(data, filename = 'Q4_maintenance_2025.csv') {
    const csv = Papa.unparse(data);
    fs.writeFileSync(filename, csv);
    console.log(`\nQ4 maintenance sheet saved to: ${filename}`);
    return filename;
  }

  // Generate summary report
  generateSummary(q4Data, paymentRecords) {
    console.log('\n=== Q4 MAINTENANCE SUMMARY ===');
    
    const totalFlats = q4Data.length;
    const totalMaintenance = q4Data.reduce((sum, row) => sum + this.parseCurrency(row['Balance']), 0);
    const totalPenalties = q4Data.reduce((sum, row) => sum + this.parseCurrency(row['Penalty']), 0);
    const totalArrears = q4Data.reduce((sum, row) => sum + this.parseCurrency(row['Maintenance Arrears']), 0);
    
    const flatsWithPenalty = q4Data.filter(row => this.parseCurrency(row['Penalty']) > 0).length;
    const flatsWithArrears = q4Data.filter(row => this.parseCurrency(row['Maintenance Arrears']) > 0).length;

    console.log(`Total Flats: ${totalFlats}`);
    console.log(`Total Amount Due: ${this.formatCurrency(totalMaintenance)}`);
    console.log(`Total Penalties: ${this.formatCurrency(totalPenalties)}`);
    console.log(`Total Arrears: ${this.formatCurrency(totalArrears)}`);
    console.log(`Flats with Penalty: ${flatsWithPenalty}`);
    console.log(`Flats with Arrears: ${flatsWithArrears}`);
    console.log(`Q3 Payments Processed: ${paymentRecords.filter(p => p['Flat No']).length}`);
  }
}

// Main execution function
function generateQ4Sheet() {
  const generator = new MaintenanceSheetGenerator();

  // Load data
  console.log('Loading data files...');
  const q3Data = Papa.parse(fs.readFileSync('Q3_maintance_2025.csv', 'utf8'), { header: true }).data;
  const paymentRecords = Papa.parse(fs.readFileSync('matching_results_2025-10-26.csv', 'utf8'), { header: true }).data;
  const waterChargesQ4 = Papa.parse(fs.readFileSync('total_water_charges_Q4 - Sheet1.csv', 'utf8'), { header: true }).data;

  console.log(`Loaded: ${q3Data.length} Q3 records, ${paymentRecords.length} payment records, ${waterChargesQ4.length} water charge records\n`);

  // Generate Q4 maintenance sheet
  const q4MaintenanceData = generator.generateQ4MaintenanceSheet(
    q3Data,
    paymentRecords,
    waterChargesQ4,
    {
      quarter: 'Q4-25',
      dueDate: '2025-10-01',
      months: ['July', 'Aug', 'Sept']
    }
  );

  // Save to CSV
  const filename = generator.saveToCSV(q4MaintenanceData);

  // Generate summary
  generator.generateSummary(q4MaintenanceData, paymentRecords);

  return { data: q4MaintenanceData, filename };
}

// Run the generator
if (require.main === module) {
  generateQ4Sheet();
}

module.exports = { MaintenanceSheetGenerator, generateQ4Sheet };