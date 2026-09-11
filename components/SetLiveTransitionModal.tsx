'use client';

import React from 'react';
import { Season, Member, Building, Transaction } from '../lib/types';
import { formatINR, calculateMandalTotals, computeMemberDue } from '../lib/finance';
import { X } from 'lucide-react';

interface SetLiveTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeason: Season;
  draftSeason: Season;
  members: Member[];
  buildings: Building[];
  transactions: Transaction[];
  onConfirmSetLive: (draftSeasonId: string) => void;
  isProcessing?: boolean;
}

export const SetLiveTransitionModal: React.FC<SetLiveTransitionModalProps> = ({
  isOpen,
  onClose,
  currentSeason,
  draftSeason,
  members,
  buildings,
  transactions,
  onConfirmSetLive,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  // 1. Concluding season financial metrics
  const mandalSummary = calculateMandalTotals(transactions, currentSeason.openingBalance || 0);
  const totalInflows = mandalSummary.totalInflows;
  const totalExpenses = mandalSummary.totalExpenses;
  const netOnline = mandalSummary.netOnlineBalance;
  const cashInHand = mandalSummary.netOfflineBalance;
  const closingSurplus = mandalSummary.netBalance;

  // 2. Member pending dues rollover calculation
  const memberDues = members.map((m) => {
    const d = computeMemberDue(m, currentSeason);
    return {
      member: m,
      totalPending: d.totalPending,
      currentSeasonPaid: d.currentSeasonPaid,
      currentSeasonTarget: d.currentSeasonTarget,
      previousYearPending: d.previousYearPending,
    };
  });

  const membersWithPending = memberDues.filter((d) => d.totalPending > 0);
  const totalPendingDues = memberDues.reduce((sum, d) => sum + d.totalPending, 0);

  // 3. Buildings summary
  const totalFlats = buildings.reduce(
    (acc, b) => acc + (b.floors || []).reduce((fAcc, fl) => fAcc + (fl.flats || []).length, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Season Handover and Activation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Archiving: {currentSeason.name || currentSeason.id} &rarr; Activating:{' '}
              {draftSeason.name || draftSeason.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-800">
          {/* Section 1: Financial Balance Carry-Forward */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Financial Balances to Carry Forward
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] text-slate-500 block">Cash in Hand</span>
                <span className="text-lg font-bold text-slate-900 mt-1 block">
                  {formatINR(cashInHand)}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Transfers to Opening Cash
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] text-slate-500 block">Bank / UPI Pool</span>
                <span className="text-lg font-bold text-slate-900 mt-1 block">
                  {formatINR(netOnline)}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Bank account balance
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <span className="text-[11px] text-emerald-700 block font-medium">
                  Total Opening Balance
                </span>
                <span className="text-lg font-bold text-emerald-800 mt-1 block">
                  {formatINR(closingSurplus)}
                </span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">
                  New season baseline
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
              <span>Concluding Inflows: {formatINR(totalInflows)}</span>
              <span>Concluding Expenses: {formatINR(totalExpenses)}</span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Member Outstanding Dues Rollover */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                2. Member Dues Rollover
              </h3>
              <span className="text-xs font-bold text-rose-700">
                Total Pending: {formatINR(totalPendingDues)} ({membersWithPending.length} Members)
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Each member&apos;s pending balance below will be carried forward as their new season
              &quot;Previous Year Pending&quot; quota. Current season payments will be reset to zero.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 px-3 font-medium">Member</th>
                      <th className="py-2 px-3 font-medium text-right">Target</th>
                      <th className="py-2 px-3 font-medium text-right">Paid</th>
                      <th className="py-2 px-3 font-medium text-right">Carry Forward Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {membersWithPending.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          All members have cleared their dues. No pending carry forward.
                        </td>
                      </tr>
                    ) : (
                      membersWithPending.map(({ member, totalPending, currentSeasonTarget, currentSeasonPaid }) => (
                        <tr key={member.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {member.name}
                            {member.isPaused && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                                Paused
                              </span>
                            )}
                            {member.isHonorary && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                                Honorary
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {formatINR(currentSeasonTarget)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {formatINR(currentSeasonPaid)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-rose-700">
                            {formatINR(totalPending)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Action Summary */}
          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-800">
              Action Summary upon Confirmation
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong>{currentSeason.name || currentSeason.id}</strong> will be archived.
              </li>
              <li>
                <strong>{draftSeason.name || draftSeason.id}</strong> ({draftSeason.startDate} to{' '}
                {draftSeason.endDate}) will become the live active season.
              </li>
              <li>
                Opening cash balance will be set to <strong>{formatINR(closingSurplus)}</strong>.
              </li>
              <li>
                All {totalFlats} building flats collection amounts will be reset to ₹0 for the new season.
              </li>
              <li>
                Telegram bot and dashboard will automatically link to the new active season.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmSetLive(draftSeason.id)}
            disabled={isProcessing}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Activating Season...' : 'Confirm and Set Live'}
          </button>
        </div>
      </div>
    </div>
  );
};
