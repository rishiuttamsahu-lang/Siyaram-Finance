import { 
  Season, 
  Member, 
  Building, 
  Transaction, 
  AuditLog, 
  PaymentMode, 
  TransactionType,
  TransactionStatus 
} from './types';
import { formatINR } from './finance';

export type TransactionSource = 'WEBSITE' | 'TELEGRAM';

export interface AllocationResult {
  previousYearPaid: number;
  remainingPreviousPending: number;
  monthAllocations: Record<string, number>;
  totalSeasonAllocated: number;
  newMemberPayments: Record<string, number>;
}

export interface SheetsMirrorRow {
  date: string;
  time: string;
  type: string;
  entityName: string;
  flat: string;
  amount: number;
  mode: PaymentMode | 'SPLIT';
  source: TransactionSource;
  status: TransactionStatus;
  txnId: string;
  sequenceNumber: number;
}

/**
 * Returns the effective target quota for a member in a specific month.
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
  return season.defaultMonthlyQuota || 200;
}

/**
 * Calculates member dues strictly up to the live month.
 * Invariant: Future months beyond season.liveMonth NEVER accrue dues.
 */
export function calculateMemberDues(member: Member, season: Season): {
  previousYearPending: number;
  currentSeasonPaid: number;
  currentSeasonTarget: number;
  currentSeasonDue: number;
  totalDue: number;
} {
  if (member.isHonorary) {
    return {
      previousYearPending: 0,
      currentSeasonPaid: 0,
      currentSeasonTarget: 0,
      currentSeasonDue: 0,
      totalDue: 0,
    };
  }

  if (member.isPaused) {
    let currentSeasonPaid = 0;
    if (member.payments) {
      for (const val of Object.values(member.payments)) {
        currentSeasonPaid += val || 0;
      }
    }
    const previousYearPending = member.previousYearPending || 0;
    return {
      previousYearPending,
      currentSeasonPaid,
      currentSeasonTarget: currentSeasonPaid,
      currentSeasonDue: 0,
      totalDue: previousYearPending,
    };
  }

  const liveMonth = season.liveMonth || (season.months && season.months[0]) || '';
  const monthsUpToLive = season.months.filter((m) => m <= liveMonth);

  let currentSeasonTarget = 0;
  for (const m of monthsUpToLive) {
    currentSeasonTarget += getEffectiveMonthTarget(member, season, m);
  }

  let currentSeasonPaid = 0;
  if (member.payments) {
    for (const val of Object.values(member.payments)) {
      currentSeasonPaid += val || 0;
    }
  }

  const currentSeasonDue = Math.max(0, currentSeasonTarget - currentSeasonPaid);
  const previousYearPending = member.previousYearPending || 0;
  const totalDue = previousYearPending + currentSeasonDue;

  return {
    previousYearPending,
    currentSeasonPaid,
    currentSeasonTarget,
    currentSeasonDue,
    totalDue,
  };
}

/**
 * Strict Payment Allocation Waterfall (PRD §5.4):
 * 1. Previous Year Pending (cleared first)
 * 2. Current Season Live Due (up to live month)
 * 3. Future unblocked months carry-forward
 * 4. Remaining surplus credited to active live month buffer
 */
export function allocateMemberPayment(
  member: Member,
  season: Season,
  paymentAmount: number
): AllocationResult {
  let remaining = paymentAmount;
  let prevPaid = 0;
  let newPrevPending = member.previousYearPending || 0;

  // Step 1: Clear Previous Year Pending
  if (newPrevPending > 0) {
    const deduction = Math.min(remaining, newPrevPending);
    prevPaid = deduction;
    newPrevPending -= deduction;
    remaining -= deduction;
  }

  // Step 2 & 3: Allocate to chronological unblocked months
  const newPayments: Record<string, number> = { ...(member.payments || {}) };
  const monthAllocations: Record<string, number> = {};
  let totalSeasonAllocated = 0;

  if (remaining > 0 && season.months && season.months.length > 0) {
    const allMonths = [...season.months].sort();

    for (const m of allMonths) {
      if (remaining <= 0) break;
      if (season.blockedMonths.includes(m)) continue;

      const target = getEffectiveMonthTarget(member, season, m);
      const alreadyPaid = newPayments[m] || 0;
      const deficit = Math.max(0, target - alreadyPaid);

      if (deficit > 0) {
        const allocated = Math.min(remaining, deficit);
        newPayments[m] = alreadyPaid + allocated;
        monthAllocations[m] = (monthAllocations[m] || 0) + allocated;
        totalSeasonAllocated += allocated;
        remaining -= allocated;
      }
    }

    // Step 4: Surplus to live month buffer
    if (remaining > 0) {
      const live = season.liveMonth || allMonths[0];
      newPayments[live] = (newPayments[live] || 0) + remaining;
      monthAllocations[live] = (monthAllocations[live] || 0) + remaining;
      totalSeasonAllocated += remaining;
      remaining = 0;
    }
  }

  return {
    previousYearPaid: prevPaid,
    remainingPreviousPending: newPrevPending,
    monthAllocations,
    totalSeasonAllocated,
    newMemberPayments: newPayments,
  };
}

/**
 * Format a canonical transaction record for Google Sheets Mirror append.
 */
export function formatSheetsMirrorRow(
  txn: Transaction,
  flatString = '-'
): SheetsMirrorRow {
  const dt = new Date(txn.timestamp);
  const dateStr = dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const timeStr = dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

  return {
    date: dateStr,
    time: timeStr,
    type: txn.type,
    entityName: txn.description,
    flat: flatString,
    amount: txn.type === 'EXPENSE' ? -txn.amount : txn.amount,
    mode: txn.mode,
    source: (txn.source as TransactionSource) || 'WEBSITE',
    status: txn.status,
    txnId: txn.id,
    sequenceNumber: txn.sequenceNumber,
  };
}

/**
 * Non-destructive soft-reversal for transactions.
 * Never deletes records from database; flips status to REVERSED and produces permanent audit event.
 */
export function createSoftReversal(
  txn: Transaction,
  reason: string,
  performedBy: string,
  source: TransactionSource = 'WEBSITE'
): {
  reversedTransaction: Transaction;
  auditLog: AuditLog;
} {
  const now = new Date().toISOString();

  const reversedTransaction: Transaction = {
    ...txn,
    status: 'REVERSED',
  };

  const auditLog: AuditLog = {
    id: `log-rev-${Date.now()}-${txn.sequenceNumber}`,
    txnId: txn.id,
    action: 'UNDO',
    previousValue: { status: 'ACTIVE', amount: txn.amount, mode: txn.mode },
    newValue: { status: 'REVERSED', amount: 0 },
    performedBy,
    timestamp: now,
    source,
    notes: `Reversed transaction #${txn.sequenceNumber}: ${txn.description}. Reason: ${reason}`,
  };

  return { reversedTransaction, auditLog };
}
