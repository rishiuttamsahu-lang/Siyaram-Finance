'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, ShieldCheck, User as UserIcon } from 'lucide-react';
import { formatINR } from '../lib/finance';
import { FinanceSummary, Season } from '../lib/types';
import { User } from 'firebase/auth';

interface IOSHeaderProps {
  season: Season;
  summary: FinanceSummary;
  isAdmin: boolean;
  user: User | null;
  isLoading?: boolean;
  onOpenAuth: () => void;
}

export const IOSHeader: React.FC<IOSHeaderProps> = ({
  season,
  summary,
  isAdmin,
  user,
  isLoading = false,
  onOpenAuth,
}) => {
  const [showBalanceDrawer, setShowBalanceDrawer] = useState(false);

  return (
    <header className="w-full pt-2 pb-3 px-4 sm:px-6">
      {/* Main Bar: Brand Title (Auth Clickable), Season Badge, Total Balance Drawer Pill */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAuth}
            className="group flex items-center gap-1.5 p-1 -m-1 rounded-xl hover:bg-slate-100/80 active:scale-95 transition text-left cursor-pointer"
            title={user ? `Signed in as ${user.email} (${isAdmin ? 'Admin' : 'Viewer'})` : 'Click to Sign In with Google'}
          >
            <h1 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight leading-tight group-hover:text-emerald-700 transition">
              Siyaram Mandal
            </h1>
            {isAdmin ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                <ShieldCheck size={11} />
                <span className="hidden xs:inline">Admin</span>
              </span>
            ) : user ? (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                <UserIcon size={10} />
              </span>
            ) : null}
          </button>
          {isLoading ? (
            <div className="w-16 h-5 rounded-full skeleton-emerald-shimmer" />
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              {season.id || '2025-26'}
            </span>
          )}

        </div>

        {/* Right side control: Total Net Balance Badge */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="w-24 sm:w-28 h-8 rounded-full skeleton-shimmer" />
          ) : (
            <button
              onClick={() => setShowBalanceDrawer(!showBalanceDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                showBalanceDrawer
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white/90 text-slate-800 border-slate-200/80 hover:bg-white shadow-2xs'
              }`}
              title="Total Mandal Balance (Pichla Surplus + Inflows - Expenses)"
            >
              <Wallet size={13} className="text-emerald-500" />
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Total:</span>
              <span className="font-semibold tabular-numbers text-emerald-700">
                {formatINR(summary.netBalance)}
              </span>
              {showBalanceDrawer ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Total Balance Breakdown Drawer */}
      {showBalanceDrawer && (
        <div className="mt-3 p-3.5 sm:p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xl animate-in slide-in-from-top-2 duration-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Wallet size={14} className="text-emerald-600" />
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Total Net Balance</span>
                <span className="text-[10px] text-slate-400 block font-normal">Kul bacha hua paisa (In Hand & Bank)</span>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-700 tabular-numbers">
              {formatINR(summary.netBalance)}
            </span>
          </div>

          {/* Equation Breakdown: Opening + Inflows - Expenses */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {/* Opening / Previous */}
            <div className="p-2 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium block">
                Opening
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 tabular-numbers block mt-0.5">
                {formatINR(season.openingBalance)}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Prev Surplus
              </span>
            </div>

            {/* Total Inflows */}
            <div className="p-2 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-medium block">
                Inflows (+)
              </span>
              <span className="text-xs sm:text-sm font-semibold text-emerald-700 tabular-numbers block mt-0.5">
                +{formatINR(summary.totalInflows)}
              </span>
              <span className="text-[9px] text-emerald-600 block mt-0.5">
                Chanda & Dues
              </span>
            </div>

            {/* Total Expenses */}
            <div className="p-2 rounded-2xl bg-rose-50/70 border border-rose-100">
              <span className="text-[10px] text-rose-700 font-medium block">
                Expenses (-)
              </span>
              <span className="text-xs sm:text-sm font-semibold text-rose-600 tabular-numbers block mt-0.5">
                -{formatINR(summary.totalExpenses)}
              </span>
              <span className="text-[9px] text-rose-600 block mt-0.5">
                Kul Kharcha
              </span>
            </div>
          </div>

          {/* Physical Cash vs Digital Holding */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Cash in Hand</span>
                <span className="text-xs font-semibold text-slate-900 tabular-numbers">
                  {formatINR(summary.netOfflineBalance)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">Physical Cash</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Online Pool</span>
                <span className={`text-xs font-semibold tabular-numbers ${summary.netOnlineBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatINR(summary.netOnlineBalance)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">UPI Digital</span>
            </div>
          </div>

          {/* Formula summary footer */}
          <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Formula: Opening + Inflows - Expenses</span>
            <span className="font-semibold text-slate-700">
              {formatINR(season.openingBalance)} + {formatINR(summary.totalInflows)} - {formatINR(summary.totalExpenses)} = {formatINR(summary.netBalance)}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
