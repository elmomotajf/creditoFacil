const MINUTE_MS = 60 * 1000;

export function toUtcDate(dateInput) {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getTime());
  }

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return new Date(`${dateInput}T00:00:00.000Z`);
  }

  return new Date(dateInput);
}

export function toDateKey(dateInput) {
  return toUtcDate(dateInput).toISOString().split('T')[0];
}

export function generateInstallmentDates(startDateInput, endDateInput, numberOfInstallments) {
  const startDate = toUtcDate(startDateInput);
  const endDate = toUtcDate(endDateInput);

  if (!Number.isInteger(numberOfInstallments) || numberOfInstallments < 1) {
    throw new Error('numberOfInstallments must be an integer greater than 0');
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid start or end date');
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error('finalPaymentDate must be after loanDate');
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const spanMs = endMs - startMs;
  const dates = [];

  let previousMs = startMs;

  for (let index = 1; index <= numberOfInstallments; index += 1) {
    if (index === numberOfInstallments) {
      dates.push(new Date(endMs).toISOString());
      continue;
    }

    const rawMs = startMs + Math.round((spanMs * index) / numberOfInstallments);
    let dueMs = rawMs;

    if (dueMs <= previousMs) {
      dueMs = previousMs + MINUTE_MS;
    }

    if (dueMs >= endMs) {
      dueMs = endMs - MINUTE_MS;
    }

    previousMs = dueMs;
    dates.push(new Date(dueMs).toISOString());
  }

  return dates;
}

export function calculatePaymentStatusFromInstallments(installments, now = new Date()) {
  if (!installments || installments.length === 0) {
    return 'pending';
  }

  const currentTime = now.getTime();
  let paidInstallments = 0;
  let overdueInstallments = 0;

  for (const installment of installments) {
    if (installment.status === 'paid') {
      paidInstallments += 1;
      continue;
    }

    const dueAt = toUtcDate(installment.dueDate).getTime();
    const isOverdueByDate = !Number.isNaN(dueAt) && dueAt < currentTime;

    if (installment.status === 'overdue' || isOverdueByDate) {
      overdueInstallments += 1;
    }
  }

  if (paidInstallments === installments.length) {
    return 'paid';
  }

  if (overdueInstallments > 0) {
    return 'overdue';
  }

  return 'pending';
}

export function deriveLoanStatus(installments, previousStatus = 'active') {
  if (previousStatus === 'cancelled') {
    return 'cancelled';
  }

  const paymentStatus = calculatePaymentStatusFromInstallments(installments);
  return paymentStatus === 'paid' ? 'completed' : 'active';
}

export function buildProfitTrendSeries(loans) {
  if (!Array.isArray(loans) || loans.length === 0) {
    return [];
  }

  const dailyProfitByDate = new Map();

  for (const loan of loans) {
    const sourceDate = loan.loanDate || loan.createdAt || new Date().toISOString();
    const dateKey = toDateKey(sourceDate);
    const profit = Number.parseFloat(loan.profit || 0);

    dailyProfitByDate.set(dateKey, (dailyProfitByDate.get(dateKey) || 0) + (Number.isNaN(profit) ? 0 : profit));
  }

  const sortedDates = [...dailyProfitByDate.keys()].sort();
  let cumulativeProfit = 0;

  return sortedDates.map((date) => {
    const dailyProfit = dailyProfitByDate.get(date) || 0;
    cumulativeProfit += dailyProfit;

    return {
      date,
      dailyProfit,
      cumulativeProfit,
    };
  });
}

export function normalizeLoanStatus(status) {
  const validStatuses = new Set(['active', 'completed', 'cancelled']);
  return validStatuses.has(status) ? status : 'active';
}
