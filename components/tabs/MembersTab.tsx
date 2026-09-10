'use client';

import React, { useState, useMemo } from 'react';
import { Member, Season, PaymentMode } from '../../lib/types';
import { formatINR, computeMemberDue, getEffectiveMonthTarget } from '../../lib/finance';
import { MicroChart } from '../MicroChart';
import { Search, ChevronDown, ChevronUp, PlusCircle, ArrowUpDown, Table, LayoutList, CheckCircle2, AlertCircle, Ban, Users } from 'lucide-react';

interface MembersTabProps {
  season: Season;
  members: Member[];
  onOpenPaymentModal: (member: Member) => void;
  isAdmin: boolean;
}

const formatMonthName = (m: string) => {
  const parts = m.split('-');
  const monthNum = parts[1];
  const monthNames: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
  };
  return monthNames[monthNum] || monthNum;
};

export const MembersTab: React.FC<MembersTabProps> = ({
  season,
  members,
  onOpenPaymentModal,
  isAdmin,
}) => {
  const [trackMonth, setTrackMonth] = useState<string>(season.liveMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'due-desc' | 'name' | 'default'>('due-desc');
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Compute dues for all members up to the tracked month
  const memberDues = useMemo(() => {
    return members.map(m => ({
      member: m,
      dueSummary: computeMemberDue(m, season, trackMonth),
    }));
  }, [members, season, trackMonth]);

  // Aggregated figures
  const totals = useMemo(() => {
    let totalCollected = 0;
    let totalCurrentDue = 0;
    let totalPrevDue = 0;

    for (const { dueSummary } of memberDues) {
      totalCollected += dueSummary.currentSeasonPaid;
      totalCurrentDue += dueSummary.currentSeasonPending;
      totalPrevDue += dueSummary.previousYearPending;
    }

    return {
      collected: totalCollected,
      currentDue: totalCurrentDue,
      prevDue: totalPrevDue,
      totalDue: totalCurrentDue + totalPrevDue,
    };
  }, [memberDues]);

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    return memberDues
      .filter(({ member }) =>
        member.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'due-desc') {
          return b.dueSummary.totalPending - a.dueSummary.totalPending;
        }
        if (sortBy === 'name') {
          return a.member.name.localeCompare(b.member.name);
        }
        return 0;
      });
  }, [memberDues, searchQuery, sortBy]);

  // Month options for the track selector
  const availableMonths = season.months;

  return (
    <div className="space-y-4 pb-24">
      {/* 3 Top Summary Cards (PRD §6.1) - 2 cols on mobile, 3 cols on sm */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* 1. Collected YTD */}
        <div className="glass-card rounded-3xl p-3.5 sm:p-4.5 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Collected (YTD)
          </span>
          <div className="text-lg sm:text-2xl font-medium text-emerald-600 tabular-numbers mt-1">
            {formatINR(totals.collected)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-emerald-700 font-medium">
            Active Season Inflows
          </span>
        </div>

        {/* 2. Total Dues (PRD §5.5: Prev + Current = Total) */}
        <div className="glass-card rounded-3xl p-3.5 sm:p-4.5 flex flex-col justify-between border-amber-100 bg-amber-50/20">
          <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">
            Total Dues
          </span>
          <div className="text-lg sm:text-2xl font-medium text-amber-600 tabular-numbers mt-1">
            {formatINR(totals.totalDue)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate" title={`Prev: ${formatINR(totals.prevDue)} + Curr: ${formatINR(totals.currentDue)}`}>
            Prev {formatINR(totals.prevDue)} + Curr {formatINR(totals.currentDue)}
          </span>
        </div>

        {/* 3. Previous Surplus */}
        <div className="glass-card rounded-3xl p-3.5 sm:p-4.5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Prev Balance
          </span>
          <div className="text-lg sm:text-2xl font-medium text-slate-800 tabular-numbers mt-1">
            {formatINR(season.openingBalance)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
            Opening Surplus
          </span>
        </div>
      </div>

      {/* Micro-Trend Chart Card */}
      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              Contribution Velocity
            </h2>
            <p className="text-[10px] text-slate-400">
              Monthly accumulation pace across active members
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            +₹850 / month
          </span>
        </div>
        <MicroChart
          data={[300, 450, 700, 950, 1100, 1391]}
          labels={['Sep', 'Oct', 'Nov', 'Jun', 'Jul', 'Aug']}
          height={85}
          color="#10b981"
          activeValue={formatINR(totals.collected)}
          activeLabel="Tracked"
        />
      </div>

      {/* Control Bar: Track Up To Month + Sort + View Mode */}
      <div className="glass-card-subtle rounded-2xl p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
          />
        </div>


        {/* Sort and View Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setSortBy(sortBy === 'due-desc' ? 'name' : sortBy === 'name' ? 'default' : 'due-desc')
            }
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs font-semibold text-slate-700 hover:bg-white active:scale-95 transition"
            title="Toggle sort order"
          >
            <ArrowUpDown size={12} className="text-slate-500" />
            <span className="text-[11px]">
              {sortBy === 'due-desc' ? 'Highest Due' : sortBy === 'name' ? 'A-Z' : 'Default'}
            </span>
          </button>

          {/* Desktop/Tablet Grid vs Cards toggle */}
          <div className="hidden sm:flex items-center p-0.5 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              <Table size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Member Items Presentation */}
      {viewMode === 'cards' ? (
        /* Mobile-First Expandable Card List (UI Preference 1, 2, 4, 5 style) */
        <div className="space-y-2.5">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-100 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Users size={20} />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Members Added Yet</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                All dummy data has been removed. Sign in as Admin to deploy the Mandal Snapshot or add members.
              </p>
            </div>
          ) : (
            filteredMembers.map(({ member, dueSummary }) => {
              const isExpanded = expandedMemberId === member.id;
              const hasDue = dueSummary.totalPending > 0;

              return (
                <div
                  key={member.id}
                  className="glass-card rounded-[24px] p-3.5 sm:p-4 transition-all duration-200 border border-white/80"
                >

                {/* Main Row */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Avatar & Name */}
                  <div
                    onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm select-none ${
                        member.isHonorary
                          ? 'bg-purple-100 text-purple-700'
                          : hasDue
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {member.name.charAt(0)}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm sm:text-base text-slate-900">
                          {member.name}
                        </span>
                        {member.isHonorary && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                            Honorary
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Paid: <span className="text-emerald-700 font-bold">{formatINR(dueSummary.currentSeasonPaid)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Due Badge & Quick Pay Action */}
                  <div className="flex items-center gap-2">
                    {member.isHonorary ? (
                      <span className="text-xs font-semibold text-slate-400">
                        --
                      </span>
                    ) : hasDue ? (
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 tabular-numbers">
                          {formatINR(dueSummary.totalPending)} Due
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Paid
                      </span>
                    )}

                    {/* Quick Pay Action Button */}
                    <button
                      type="button"
                      onClick={() => onOpenPaymentModal(member)}
                      className="p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition active:scale-90"
                      title={`Record payment for ${member.name}`}
                    >
                      <PlusCircle size={16} />
                    </button>

                    {/* Expand Arrow */}
                    <button
                      type="button"
                      onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Month-by-Month Breakdown (PRD §6.1 & Golden Rule) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Monthly Breakdown
                      </span>
                      {member.previousYearPending > 0 && (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          Prev Due: {formatINR(member.previousYearPending)}
                        </span>
                      )}
                    </div>

                    {/* Mobile-Optimized Compact Grid (4 cols on mobile, 6 on desktop) */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 text-center">
                      {season.months.map((m) => {
                        const isBlocked = season.blockedMonths.includes(m);
                        const isFuture = m > trackMonth;
                        const target = getEffectiveMonthTarget(member, season, m);
                        const paid = member.payments[m] || 0;
                        const monthDue = Math.max(0, target - paid);
                        const monthName = formatMonthName(m);

                        return (
                          <div
                            key={m}
                            className={`p-1.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                              isBlocked
                                ? 'bg-slate-50/70 border-slate-200/60 text-slate-400'
                                : isFuture
                                ? 'bg-slate-50/40 border-dashed border-slate-200 text-slate-400'
                                : monthDue === 0
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-amber-50/70 border-amber-200 text-amber-900'
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-slate-500">
                              {monthName}
                            </span>
                            
                            <div className="my-0.5 font-medium tabular-numbers text-xs">
                              {isBlocked ? (
                                <span className="inline-flex items-center gap-0.5 text-slate-400 text-[11px]">
                                  🚫
                                </span>
                              ) : member.isHonorary ? (
                                '--'
                              ) : (
                                formatINR(paid)
                              )}
                            </div>

                            <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 leading-tight">
                              {isBlocked
                                ? 'Blocked'
                                : isFuture
                                ? 'Target ' + formatINR(target)
                                : monthDue > 0
                                ? 'Due ' + formatINR(monthDue)
                                : 'Cleared ✓'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      ) : (
        /* Desktop Excel-Style Dense Grid (PRD §6.1 & conversation table) */
        <div className="glass-card rounded-3xl p-4 overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 sticky left-0 bg-white/90 backdrop-blur-sm z-10">Member Name</th>
                <th className="py-2.5 px-3 text-right">Prev Pending</th>
                {season.months.map((m) => (
                  <th key={m} className="py-2.5 px-3 text-center whitespace-nowrap">
                    {m} {season.blockedMonths.includes(m) ? '🚫' : ''}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Total Due</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map(({ member, dueSummary }) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-2.5 px-3 font-bold text-slate-900 sticky left-0 bg-white/90 backdrop-blur-sm">
                    {member.name}
                    {member.isHonorary && (
                      <span className="ml-1.5 text-[9px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                        Honorary
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-amber-700 tabular-numbers">
                    {member.previousYearPending > 0 ? formatINR(member.previousYearPending) : '—'}
                  </td>
                  {season.months.map((m) => {
                    const isBlocked = season.blockedMonths.includes(m);
                    const paid = member.payments[m] || 0;
                    return (
                      <td key={m} className="py-2.5 px-3 text-center tabular-numbers">
                        {isBlocked ? (
                          <span className="text-slate-300 font-mono">🚫</span>
                        ) : member.isHonorary ? (
                          <span className="text-slate-300 font-mono">--</span>
                        ) : (
                          <span className={paid > 0 ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                            {formatINR(paid)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-numbers">
                    {formatINR(dueSummary.currentSeasonPaid)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-numbers">
                    {member.isHonorary ? (
                      <span className="text-slate-400">--</span>
                    ) : dueSummary.totalPending > 0 ? (
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {formatINR(dueSummary.totalPending)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">₹0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onOpenPaymentModal(member)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition active:scale-95"
                    >
                      + Pay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
