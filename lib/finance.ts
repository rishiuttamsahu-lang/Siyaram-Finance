import { Member, Season, MemberDueSummary, Transaction, FinanceSummary, AuditLog, PaymentMode } from './types';

/**
 * Format currency with Indian digit grouping and the ₹ symbol.
 * Example: 123456 -> "₹1,23,456"
 * Negative: -500 -> "-₹500"
 */
export function formatINR(amount: number, showSign = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  // Format with en-IN locale
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(absVal);

  if (isNegative) {
    return `-₹${formatted}`;
  }
  if (showSign && amount > 0) {
    return `+₹${formatted}`;
  }
  return `₹${formatted}`;
}

/**
 * Get effective expected target quota for a member in a specific month.
 * Accounts for:
 * 1. Honorary members (₹0 quota always)
 * 2. Blocked months (₹0 quota)
 * 3. Member monthly custom overrides
 * 4. Default season quota
 */
export function getEffectiveMonthTarget(
  member: Member,
  season: Season,
  month: string
): number {
  if (member.isHonorary) return 0;
  if (season.blockedMonths.includes(month)) return 0;
  if (member.monthlyOverrides && member.monthlyOverrides[month] !== undefined) {
    return member.monthlyOverrides[month];
  }
  if (season.monthQuotas && season.monthQuotas[month] !== undefined) {
    return season.monthQuotas[month];
  }
  return season.defaultMonthlyQuota;
}

/**
 * Calculate member dues strictly according to:
 * 1. The Live Month Due Rule (PRD §5.2):
 *    Future months beyond trackUpToMonth are NEVER added to dues.
 * 2. Total Dues Display Rule (PRD §5.5):
 *    Previous Year Pending + Current Season Pending = Total Pending.
 */
export function computeMemberDue(
  member: Member,
  season: Season,
  trackUpToMonth?: string
): MemberDueSummary {
  if (member.isHonorary) {
    return {
      memberId: member.id,
      memberName: member.name,
      previousYearPending: 0,
      currentSeasonPaid: 0,
      currentSeasonTarget: 0,
      currentSeasonPending: 0,
      totalPending: 0,
      isHonorary: true,
      isPaused: member.isPaused,
    };
  }

  // Active tracked months: fallback gracefully if trackUpToMonth is empty or uninitialized
  const targetMonth = (trackUpToMonth && trackUpToMonth.trim() !== '')
    ? trackUpToMonth
    : (season.liveMonth || (season.months && season.months.length > 0 ? season.months[season.months.length - 1] : ''));

  const trackedMonths = targetMonth
    ? season.months.filter(m => m <= targetMonth)
    : season.months;

  let currentSeasonTarget = 0;
  let currentSeasonPaid = 0;

  for (const m of trackedMonths) {
    const target = getEffectiveMonthTarget(member, season, m);
    currentSeasonTarget += target;
    currentSeasonPaid += (member.payments?.[m] || 0);
  }

  const currentSeasonPending = Math.max(0, currentSeasonTarget - currentSeasonPaid);
  const previousYearPending = member.previousYearPending || 0;
  const totalPending = previousYearPending + currentSeasonPending;

  return {
    memberId: member.id,
    memberName: member.name,
    previousYearPending,
    currentSeasonPaid,
    currentSeasonTarget,
    currentSeasonPending,
    totalPending,
    isHonorary: false,
    isPaused: member.isPaused,
  };
}

/**
 * Payment Allocation Waterfall (PRD §5.4, conversation locked rule):
 * Step 1: Previous Year Pending (oldest unpaid season balance) — cleared first.
 * Step 2: Current Season Live Due (up to live month) — cleared next.
 * Step 3: Remaining surplus — carried forward into the next active, unblocked month's target.
 */
export function allocatePayment(
  member: Member,
  amount: number,
  season: Season
): {
  updatedMember: Member;
  allocationLog: {
    clearedPrevPending: number;
    allocatedCurrent: Record<string, number>;
    carriedForward: Record<string, number>;
  };
} {
  const updated: Member = {
    ...member,
    payments: { ...member.payments },
  };

  let remaining = amount;
  const allocationLog = {
    clearedPrevPending: 0,
    allocatedCurrent: {} as Record<string, number>,
    carriedForward: {} as Record<string, number>,
  };

  // Step 1: Clear Previous Year Pending
  if (updated.previousYearPending > 0 && remaining > 0) {
    const prevPayment = Math.min(updated.previousYearPending, remaining);
    updated.previousYearPending -= prevPayment;
    remaining -= prevPayment;
    allocationLog.clearedPrevPending = prevPayment;
  }

  if (remaining <= 0) {
    return { updatedMember: updated, allocationLog };
  }

  // Step 2: Clear Current Season Live Due up to live month
  const liveMonths = season.months.filter(m => m <= season.liveMonth);
  for (const m of liveMonths) {
    if (season.blockedMonths.includes(m)) continue;
    const target = getEffectiveMonthTarget(updated, season, m);
    const paidSoFar = updated.payments[m] || 0;
    const due = Math.max(0, target - paidSoFar);

    if (due > 0 && remaining > 0) {
      const pay = Math.min(due, remaining);
      updated.payments[m] = paidSoFar + pay;
      remaining -= pay;
      allocationLog.allocatedCurrent[m] = (allocationLog.allocatedCurrent[m] || 0) + pay;
    }
    if (remaining <= 0) break;
  }

  if (remaining <= 0) {
    return { updatedMember: updated, allocationLog };
  }

  // Step 3: Surplus Carry-Forward to future unblocked months
  const futureMonths = season.months.filter(m => m > season.liveMonth);
  for (const m of futureMonths) {
    if (season.blockedMonths.includes(m)) continue;
    const target = getEffectiveMonthTarget(updated, season, m);
    const paidSoFar = updated.payments[m] || 0;
    const due = Math.max(0, target - paidSoFar);

    if (due > 0 && remaining > 0) {
      const pay = Math.min(due, remaining);
      updated.payments[m] = paidSoFar + pay;
      remaining -= pay;
      allocationLog.carriedForward[m] = (allocationLog.carriedForward[m] || 0) + pay;
    }
    if (remaining <= 0) break;
  }

  // If any surplus still remains after covering all future months, assign it to the last active month
  if (remaining > 0) {
    const availableMonths = season.months.filter(m => !season.blockedMonths.includes(m));
    const lastMonth = availableMonths[availableMonths.length - 1] || season.liveMonth;
    updated.payments[lastMonth] = (updated.payments[lastMonth] || 0) + remaining;
    allocationLog.carriedForward[lastMonth] = (allocationLog.carriedForward[lastMonth] || 0) + remaining;
  }

  return { updatedMember: updated, allocationLog };
}

/**
 * Calculate totals across all active transactions (status === 'ACTIVE').
 * Invariant: Totals are ALWAYS derived from active transactions.
 * Calculates Khajanchi Personal vs. Mandal split:
 * Actual Personal Savings = Bank Balance - Net Mandal Online Pool
 */
export function calculateMandalTotals(
  transactions: Transaction[],
  openingBalance: number,
  personalBankBalance = 50000
): FinanceSummary {
  const activeTxns = transactions.filter(t => t.status === 'ACTIVE');

  let onlineInflows = 0;
  let offlineInflows = 0;
  let onlineExpenses = 0;
  let offlineExpenses = 0;

  for (const t of activeTxns) {
    if (t.type === 'EXPENSE') {
      if (t.mode === 'ONLINE') {
        onlineExpenses += t.amount;
      } else {
        offlineExpenses += t.amount;
      }
    } else {
      // MEMBER, BUILDING, CHANDA inflows
      if (t.mode === 'ONLINE') {
        onlineInflows += t.amount;
      } else {
        offlineInflows += t.amount;
      }
    }
  }

  const totalInflows = onlineInflows + offlineInflows;
  const totalExpenses = onlineExpenses + offlineExpenses;
  const netBalance = openingBalance + totalInflows - totalExpenses;
  const netOnlineBalance = onlineInflows - onlineExpenses;
  const netOfflineBalance = offlineInflows - offlineExpenses;
  const actualPersonalSavings = personalBankBalance - netOnlineBalance;

  return {
    totalInflows,
    totalExpenses,
    netBalance,
    onlineInflows,
    onlineExpenses,
    netOnlineBalance,
    offlineInflows,
    offlineExpenses,
    netOfflineBalance,
    openingBalance,
    personalBankBalance,
    actualPersonalSavings,
  };
}

/**
 * Non-destructive reversal: flips status to "REVERSED" and creates audit log.
 */
export function createReversalAuditLog(
  txn: Transaction,
  performedBy = 'Admin:Web'
): AuditLog {
  return {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    txnId: txn.id,
    action: 'UNDO',
    previousValue: { status: 'ACTIVE', amount: txn.amount },
    newValue: { status: 'REVERSED', amount: 0 },
    performedBy,
    timestamp: new Date().toISOString(),
    notes: `Reversed transaction #${txn.sequenceNumber} (${txn.description})`,
  };
}
