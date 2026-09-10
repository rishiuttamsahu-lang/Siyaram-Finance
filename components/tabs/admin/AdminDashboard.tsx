'use client';

import React, { useState } from 'react';
import { Season, Member, Building, Transaction, AuditLog, TransactionType, PaymentMode } from '../../../lib/types';
import { formatINR, calculateMandalTotals, computeMemberDue } from '../../../lib/finance';
import {
  ChevronRight,
  ArrowRight,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  season: Season;
  members: Member[];
  buildings: Building[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  onNavigateTab: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  season,
  members,
  buildings,
  transactions,
  auditLogs,
  onNavigateTab,
}) => {
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const summary = calculateMandalTotals(transactions, season.openingBalance);
  const memberDues = members.map(m => computeMemberDue(m, season));
  const totalMemberDue = memberDues.reduce((acc, d) => acc + d.currentSeasonPending, 0);
  const totalPreviousPending = memberDues.reduce((acc, d) => acc + d.previousYearPending, 0);
  const totalOverallDue = totalMemberDue + totalPreviousPending;

  const totalFlats = buildings.reduce((acc, b) => acc + b.floors.reduce((fAcc, f) => fAcc + f.flats.length, 0), 0);
  const paidFlats = buildings.reduce((acc, b) => acc + b.floors.reduce((fAcc, f) => fAcc + f.flats.filter(flat => flat.isPaid).length, 0), 0);

  const activeMembersCount = members.filter(m => !m.isPaused && !m.isHonorary).length;

  const formatShortTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const getCategoryLabel = (type: TransactionType) => {
    switch (type) {
      case 'CHANDA': return 'Chanda';
      case 'MEMBER': return 'Member';
      case 'BUILDING': return 'Flat';
      case 'EXPENSE': return 'Expense';
      default: return type;
    }
  };

  const getModeLabel = (mode: PaymentMode) => {
    return mode === 'ONLINE' ? 'Online' : 'Offline';
  };

  const formatMonthLabel = (monthStr?: string) => {
    if (!monthStr) return 'Sep 2026';
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
    }
    return monthStr;
  };

  return (
    <div className="space-y-3">
      {/* 1. SYSTEM STATUS */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-900">System Status</span>
          <button
            type="button"
            onClick={() => onNavigateTab('sync')}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer transition"
          >
            <span>Verify</span>
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-1 pt-0.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="text-slate-700 font-medium">Firebase</span>
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Live</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="text-slate-700 font-medium">Telegram</span>
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Live</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="text-slate-700 font-medium">Sheets</span>
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Synced</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. FINANCIAL OVERVIEW */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <span className="text-xs font-medium text-slate-900 block">Financial Overview</span>

        <div className="space-y-1.5 pt-0.5 text-xs">
          {/* Total Balance */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
            <span className="font-medium text-emerald-950">Total Balance</span>
            <span className="font-semibold text-emerald-700 text-sm sm:text-base tabular-numbers">
              {formatINR(summary.netBalance)}
            </span>
          </div>

          {/* Online */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="font-medium text-slate-700">Online</span>
            <span className={`font-semibold tabular-numbers ${summary.netOnlineBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatINR(summary.netOnlineBalance)}
            </span>
          </div>

          {/* Cash */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="font-medium text-slate-700">Cash</span>
            <span className="font-semibold text-slate-900 tabular-numbers">
              {formatINR(summary.netOfflineBalance)}
            </span>
          </div>

          {/* Total Due */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/50 border border-amber-100/80">
            <div>
              <span className="font-medium text-amber-950 block">Total Due</span>
              <span className="text-[10px] font-normal text-amber-700 block mt-0.5">
                Prev {formatINR(totalPreviousPending)} · Cur {formatINR(totalMemberDue)}
              </span>
            </div>
            <span className="font-semibold text-amber-800 text-xs sm:text-sm tabular-numbers">
              {formatINR(totalOverallDue)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. INCOME & EXPENSE */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-900">Income & Expense</span>
          <button
            type="button"
            onClick={() => onNavigateTab('transactions')}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer transition"
          >
            <span>View</span>
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-1.5 pt-0.5 text-xs">
          {/* Income */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="font-medium text-slate-700">Income</span>
            <span className="font-semibold text-emerald-600 tabular-numbers">
              +{formatINR(summary.totalInflows)}
            </span>
          </div>

          {/* Expense */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="font-medium text-slate-700">Expense</span>
            <span className="font-semibold text-rose-600 tabular-numbers">
              -{formatINR(summary.totalExpenses)}
            </span>
          </div>

          {/* Opening Balance */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100/80">
            <span className="font-medium text-slate-700">Opening Balance</span>
            <span className="font-semibold text-slate-800 tabular-numbers">
              {formatINR(season.openingBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. MANDAL DIRECTORY */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <span className="text-xs font-medium text-slate-900 block">Mandal Directory</span>

        <div className="space-y-1.5 pt-0.5 text-xs">
          {/* Members */}
          <div
            onClick={() => onNavigateTab('members')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100/80 cursor-pointer hover:bg-slate-100/60 active:scale-98 transition"
          >
            <div>
              <span className="font-medium text-slate-900 block">Members</span>
              <span className="text-[11px] font-normal text-slate-500 block mt-0.5">
                {activeMembersCount} Active
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 text-sm tabular-numbers">
                {members.length}
              </span>
              <ChevronRight size={13} className="text-slate-400" />
            </div>
          </div>

          {/* Buildings */}
          <div
            onClick={() => onNavigateTab('buildings')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100/80 cursor-pointer hover:bg-slate-100/60 active:scale-98 transition"
          >
            <div>
              <span className="font-medium text-slate-900 block">Buildings</span>
              <span className="text-[11px] font-normal text-slate-500 block mt-0.5">
                {totalFlats} Flats · {paidFlats} Paid
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 text-sm tabular-numbers">
                {buildings.length}
              </span>
              <ChevronRight size={13} className="text-slate-400" />
            </div>
          </div>

          {/* Monthly Dues */}
          <div
            onClick={() => onNavigateTab('dues')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100/80 cursor-pointer hover:bg-slate-100/60 active:scale-98 transition"
          >
            <div>
              <span className="font-medium text-slate-900 block">Monthly Dues</span>
              <span className="text-[11px] font-normal text-slate-500 block mt-0.5">
                {formatMonthLabel(season.liveMonth)} · ₹{season.defaultMonthlyQuota || 200}
              </span>
            </div>

            <ChevronRight size={13} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* 5. RECENT ACTIVITY */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-900">Recent Activity</span>
          <button
            type="button"
            onClick={() => onNavigateTab('transactions')}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer transition"
          >
            <span>View All</span>
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {transactions.slice(0, 5).map((txn) => {
            const isExpense = txn.type === 'EXPENSE';

            return (
              <div
                key={txn.id}
                onClick={() => setSelectedTxn(txn)}
                className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100/80 hover:bg-slate-100/60 transition active:scale-98 cursor-pointer space-y-0.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 truncate pr-2">
                    {txn.description}
                  </span>
                  <span
                    className={`font-semibold tabular-numbers shrink-0 ${
                      isExpense ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {isExpense ? '-' : '+'}{formatINR(txn.amount)}
                  </span>
                </div>

                <div className="text-[11px] font-normal text-slate-400 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wide ${
                      (txn.source || 'TEL') === 'TEL'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200/70'
                        : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                    }`}
                  >
                    {txn.source || 'TEL'}
                  </span>
                  <span>{getCategoryLabel(txn.type)}</span>
                  <span>·</span>
                  <span>{getModeLabel(txn.mode)}</span>
                  <span>·</span>
                  <span>{formatShortTime(txn.timestamp)}</span>
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="p-4 text-center text-slate-400 text-xs">
              No transactions recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION DETAIL BOTTOM SHEET */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-700 truncate pr-2">
                #{selectedTxn.sequenceNumber} · {selectedTxn.description}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-0.5">
              <span
                className={`text-xl font-semibold tabular-numbers block ${
                  selectedTxn.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {selectedTxn.type === 'EXPENSE' ? '-' : '+'}{formatINR(selectedTxn.amount)}
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                {getCategoryLabel(selectedTxn.type)} · {getModeLabel(selectedTxn.mode)}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Channel / Source</span>
                <span className="text-slate-700 font-medium flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wide ${
                      (selectedTxn.source || 'TEL') === 'TEL'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200/70'
                        : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                    }`}
                  >
                    {selectedTxn.source || 'TEL'}
                  </span>
                  <span>{(selectedTxn.source || 'TEL') === 'TEL' ? 'Telegram' : 'Website'}</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Time</span>
                <span className="text-slate-700 font-medium">{formatShortTime(selectedTxn.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Status</span>
                <span className="text-emerald-700 font-medium capitalize">{selectedTxn.status.toLowerCase()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTxn(null);
                onNavigateTab('transactions');
              }}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>View in Ledger</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
