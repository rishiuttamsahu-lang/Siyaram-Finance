import type { Season, Member } from './types.ts';

export interface AllocationResult {
  previousYearPaid: number;
  remainingPreviousPending: number;
  monthAllocations: Record<string, number>;
  totalSeasonAllocated: number;
  advanceCarryForward: number;
  newMemberPayments: Record<string, number>;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates the monthly quota target for a member in a specific month.
 */
export function getMonthTarget(member: Member, season: Season, month: string): number {
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
 * Calculates current outstanding dues for a member up to the live month.
 * The Live Month Due Rule: months beyond liveMonth are NOT added to dues.
 */
export function computeMemberDues(member: Member, season: Season): {
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

  const liveMonth = season.liveMonth || (season.months && season.months[0]) || '';
  const monthsUpToLive = season.months.filter((m) => m <= liveMonth);

  let targetUpToLive = 0;
  for (const m of monthsUpToLive) {
    targetUpToLive += getMonthTarget(member, season, m);
  }

  let totalSeasonPaid = 0;
  if (member.payments) {
    for (const val of Object.values(member.payments)) {
      totalSeasonPaid += val || 0;
    }
  }

  const currentSeasonDue = Math.max(0, targetUpToLive - totalSeasonPaid);
  const prevPending = member.previousYearPending || 0;
  const totalDue = prevPending + currentSeasonDue;

  return {
    previousYearPending: prevPending,
    currentSeasonPaid: totalSeasonPaid,
    currentSeasonTarget: targetUpToLive,
    currentSeasonDue,
    totalDue,
  };
}

/**
 * Performs strict Waterfall Payment Allocation according to PRD §5.4:
 * Step 1: Clear Previous Year Pending
 * Step 2: Clear Current Live Month Due
 * Step 3: Advance carry-forward to next active unblocked months
 */
export function allocateMemberPayment(
  member: Member,
  season: Season,
  paymentAmount: number
): AllocationResult {
  let remaining = paymentAmount;
  let prevPaid = 0;
  let newPrevPending = member.previousYearPending || 0;

  // Step 1: Previous Year Pending Waterfall
  if (newPrevPending > 0) {
    const deduction = Math.min(remaining, newPrevPending);
    prevPaid = deduction;
    newPrevPending -= deduction;
    remaining -= deduction;
  }

  // Step 2 & 3: Allocate to current live month and future unblocked months
  const newPayments: Record<string, number> = { ...(member.payments || {}) };
  const monthAllocations: Record<string, number> = {};
  let totalSeasonAllocated = 0;

  if (remaining > 0 && season.months && season.months.length > 0) {
    // Sort all months in chronological order
    const allMonths = [...season.months].sort();

    for (const m of allMonths) {
      if (remaining <= 0) break;
      if (season.blockedMonths.includes(m)) continue; // skip blocked months

      const target = getMonthTarget(member, season, m);
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

    // If money still remains after satisfying all configured months targets,
    // credit it directly to the active live month as a surplus buffer
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
    advanceCarryForward: remaining,
    newMemberPayments: newPayments,
  };
}
