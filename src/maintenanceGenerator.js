// Browser-friendly MaintenanceSheetGenerator
// Pure JS class for use in the React app (no fs or Papa dependencies)

export class MaintenanceSheetGenerator {
  constructor(options = {}) {
    this.FIXED_PENALTY_ARREARS = 4300; // Fixed penalty for significant arrears (kept but not used)
    this.DAILY_PENALTY_RATE = options.dailyPenaltyRate || 20; // ₹20 per day
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
    // Only apply time-based penalty for late payments
    if (!paymentRecord) {
      return 0; // No penalty if no payment record
    }

    // Payment made - calculate time-based penalty
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
    console.log("generateMaintenanceSheet called");
    console.log("prevData length:", prevData?.length);
    console.log("paymentRecords length:", paymentRecords?.length);
    console.log("waterChargesData length:", waterChargesData?.length);
    const {
      quarter = 'Current',
      dueDate = new Date().toISOString().split('T')[0],
      months = ['Month1', 'Month2', 'Month3'],
      dailyPenaltyRate = 20,
      selectedColumns = null,
      columnsOrder = null,
      amcEnabled = false,
      amcValue = 3000
    } = options;
    console.log("Options:", { quarter, dueDate, months, dailyPenaltyRate, selectedColumns, amcEnabled, amcValue });

    // Update penalty rate
    this.DAILY_PENALTY_RATE = dailyPenaltyRate;

    // Extract month names dynamically from water charges data
    // Water charges should have columns: flatno, month-july, month-aug, month-sept, total
    let waterMonths = [];
    let waterMonthsDisplay = ['July', 'Aug', 'Sept']; // Default display names
    if (waterChargesData && waterChargesData.length > 0) {
      const headers = Object.keys(waterChargesData[0]);
      console.log("Water charges headers (excluding index):", headers.slice(1));

      // Validate second column is flat number (first is index)
      if (!headers[1] || !headers[1].toLowerCase().includes('flat')) {
        throw new Error(`Second column must be flat number. Found: ${headers[1]}. All headers: ${headers.join(', ')}`);
      }

      // Month columns should be at indices 2, 3, 4 (3rd, 4th, 5th columns)
      const monthColumns = [headers[2], headers[3], headers[4]].filter(h => h);
      console.log("Month columns extracted:", monthColumns);
      console.log("Headers indices 2,3,4:", headers[2], headers[3], headers[4]);

      // Validate month prefix (case insensitive) - accept either "month..." or direct month names
      const expectedMonths = ['july', 'aug', 'sept'];
      const invalidColumns = monthColumns.filter(col => {
        const lowerCol = col.toLowerCase();
        return !lowerCol.startsWith('month') && !expectedMonths.includes(lowerCol);
      });
      if (invalidColumns.length > 0) {
        throw new Error(`Water charges CSV columns 3-5 must have 'Month-' prefix or be month names (july, aug, sept). Invalid columns: ${invalidColumns.join(', ')}`);
      }

      // Extract month keys for data access and display names for columns
      waterMonths = monthColumns; // Full keys like ["monthjuly", "monthaug", "monthsept"]
      waterMonthsDisplay = monthColumns.map(col => {
        const lowerCol = col.toLowerCase();
        const monthName = lowerCol.startsWith('month') ? lowerCol.replace(/^month/, '') : lowerCol;
        return monthName.charAt(0).toUpperCase() + monthName.slice(1); // Capitalize first letter
      }); // Display names like ["July", "Aug", "Sept"]
    } else {
      waterMonths = ['monthjuly', 'monthaug', 'monthsept']; // fallback keys
    }

    const out = [];

    prevData.forEach((row) => {
      if (!row['flatno'] && !row['flatno ']) return;
      const flatKey = row['flatno'] ? 'flatno' : 'flatno ';
      const flatNo = String(row[flatKey]).trim();
      const residentName = row['residentname'] || row['residentname'] || '';
      const monthlyMaintenance = this.parseCurrency(row['monthly'] || row['monthly'] || row['monthly ']);
      const prevBalance = this.parseCurrency(row['balance'] || row['balance']);

      const paymentRecord = paymentRecords.find(p => p.flatNo && String(p.flatNo).trim() === flatNo);
      const waterCharges = waterChargesData.find(w => (w['flatno'] === flatNo) || (w['flatno '] === flatNo) || (w['flatno'] && String(w['flatno']).trim() === flatNo));

      const paidAmount = paymentRecord ? this.parseCurrency(paymentRecord.transactionamountinr) : 0;

      // Arrears (signed) = previous maintenance (balance) - amount paid
      // This can be negative (overpayment) or positive (outstanding).
      const arrearsSigned = prevBalance - paidAmount;
      // Keep old clamped value available if needed elsewhere
      const newArrears = Math.max(0, arrearsSigned);

      const quarterly = monthlyMaintenance * 3;

      const water1 = waterCharges ? this.parseCurrency(waterCharges[waterMonths[0]]) : 0;
      const water2 = waterCharges ? this.parseCurrency(waterCharges[waterMonths[1]]) : 0;
      const water3 = waterCharges ? this.parseCurrency(waterCharges[waterMonths[2]]) : 0;


      const penalty = this.calculatePenalty({ flatNo, arrears: newArrears, prevBalance }, paymentRecord ? { transactionDate: paymentRecord.transactiondate, amount: this.parseCurrency(paymentRecord.transactionamountinr) } : null, dueDate);

      const amcVal = amcEnabled ? this.parseCurrency(amcValue) : 0;

      // Use signed arrears in total balance so negative arrears (overpayments) subtract from the due amount
      const totalBalance = quarterly + arrearsSigned + water1 + water2 + water3 + penalty + amcVal;

      const waterTotal = water1 + water2 + water3;

      const outRow = {
        'Flat No': flatNo,
        'Resident Name': residentName,
        'Monthly': this.formatCurrency(monthlyMaintenance),
        [`${quarter} Maintenance`]: this.formatCurrency(quarterly),
        // Present the maintenance arrears as the signed difference (prevBalance - paidAmount)
        // so it reflects overpayments as negative values and outstanding as positive values.
        'Maintenance Arrears': this.formatCurrency(arrearsSigned),
        [`Water Bill ${waterMonthsDisplay[0] || months[0]}`]: `रु ${water1.toLocaleString('en-IN')}`,
        [`Water Bill ${waterMonthsDisplay[1] || months[1]}`]: `रु ${water2.toLocaleString('en-IN')}`,
        [`Water Bill ${waterMonthsDisplay[2] || months[2]}`]: `रु ${water3.toLocaleString('en-IN')}`,
        'Water Bill Total': `रु ${waterTotal.toLocaleString('en-IN')}`,
        'Penalty': this.formatCurrency(penalty),
        'AMC': amcEnabled ? this.formatCurrency(amcVal) : '',
        'Balance': this.formatCurrency(totalBalance),
        // Previous maintenance columns
        'Previous Maintenance': this.formatCurrency(prevBalance),
        // Payment columns
        'Transaction Amount': paymentRecord ? this.formatCurrency(this.parseCurrency(paymentRecord.transactionamountinr)) : '',
        'Transaction ID': paymentRecord ? paymentRecord.transactionid || '' : '',
        'Transaction Date': paymentRecord ? paymentRecord.transactiondate || '' : '',
        'Description': paymentRecord ? paymentRecord.description || '' : '',
        'Confidence': paymentRecord ? paymentRecord.confidence || '' : ''
      };

      // Filter columns based on selectedColumns
      // Filter and order columns for output. If a `columnsOrder` array is provided
      // use it to decide header order (but only include keys that are selected).
      const filteredRow = selectedColumns
        ? (Array.isArray(columnsOrder)
          ? columnsOrder.reduce((acc, key) => {
            if (selectedColumns.includes(key) && outRow.hasOwnProperty(key)) {
              acc[key] = outRow[key];
            }
            return acc;
          }, {})
          : selectedColumns.reduce((acc, key) => {
            if (outRow.hasOwnProperty(key)) {
              acc[key] = outRow[key];
            }
            return acc;
          }, {}))
        : outRow;

      // intentionally keep logs minimal — detailed debug logs removed

      out.push(filteredRow);
    });

    console.log("Generated maintenance sheet with", out.length, "records");
    return out;
  }
}

export default MaintenanceSheetGenerator;
