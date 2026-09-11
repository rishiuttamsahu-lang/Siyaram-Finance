'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMode } from '../../lib/types';
import { formatINR } from '../../lib/finance';
import { ArrowDownLeft, Plus, Smartphone, Banknote, RotateCcw, Split, Check } from 'lucide-react';
import { TransactionsSkeleton } from '../skeletons/TransactionsSkeleton';

interface IncomeTabProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onUndoTransaction: (txn: Transaction) => void;
  isAdmin: boolean;
  isLoading?: boolean;
}

export const IncomeTab: React.FC<IncomeTabProps> = ({
  transactions,
  onOpenAddModal,
  onUndoTransaction,
  isAdmin,
  isLoading = false,
}) => {
  const [splitView, setSplitView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only active income/chanda transactions
  const incomeTxns = useMemo(() => {
    return transactions.filter(t => (t.type === 'CHANDA' || t.type === 'MEMBER' || t.type === 'BUILDING') && t.status === 'ACTIVE');
  }, [transactions]);

  // Aggregates
  const stats = useMemo(() => {
    let totalOnline = 0;
    let totalOffline = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    incomeTxns.forEach(t => {
      if (t.mode === 'ONLINE') {
        totalOnline += t.amount;
        onlineCount += 1;
      } else {
        totalOffline += t.amount;
        offlineCount += 1;
      }
    });

    return {
      total: totalOnline + totalOffline,
      count: incomeTxns.length,
      totalOnline,
      totalOffline,
      onlineCount,
      offlineCount,
    };
  }, [incomeTxns]);

  // Filtered by search & sorted chronologically (most recent to oldest by timestamp/date/time, then sequenceNumber)
  const filteredTxns = useMemo(() => {
    return incomeTxns
      .filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
          return timeB - timeA;
        }
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        return seqB - seqA;
      });
  }, [incomeTxns, searchQuery]);

  // If initial Firestore data is loading, return rich skeleton layout (AFTER all hooks)
  if (isLoading) {
    return <TransactionsSkeleton type="income" />;
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Top 2 Summary Cards + Quick Add Trigger */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="glass-card rounded-3xl p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Chanda
          </span>
          <div className="text-xl sm:text-3xl font-bold text-emerald-600 tabular-numbers mt-1">
            {formatINR(stats.total)}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            {stats.count} Recorded Inflows
          </span>
        </div>

        {/* Quick Add Action Card */}
        <div className="glass-card rounded-3xl p-4 flex flex-col justify-between border-emerald-100 bg-emerald-50/20">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Entry
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
              Donor Name & Amount
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-2 w-full py-2.5 px-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
          >
            <Plus size={15} />
            <span>Add Chanda</span>
          </button>
        </div>
      </div>

      {/* Split View Toggle Bar (PRD §6.3 & conversation line 480) */}
      <div className="glass-card-subtle rounded-2xl p-2.5 flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Filter donor or shop..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500 flex-1"
        />

        {/* Split View Button */}
        <button
          type="button"
          onClick={() => setSplitView(!splitView)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
            splitView
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white/90 text-slate-700 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <Split size={14} />
          <span>{splitView ? 'Unified View' : 'Split View'}</span>
        </button>
      </div>

      {/* Content: Unified vs Split Sub-Ledgers */}
      {splitView ? (
        /* Split View: Offline Cash Sub-Ledger vs Online UPI Sub-Ledger */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Offline Cash Sub-Ledger */}
          <div className="glass-card rounded-[28px] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                  <Banknote size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">Cash in Hand</h4>
                  <span className="text-[10px] text-slate-400">{stats.offlineCount} entries</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-900 tabular-numbers">
                  {formatINR(stats.totalOffline)}
                </span>
                <span className="text-[9px] text-slate-400 block">Offline Subtotal</span>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTxns.filter(t => t.mode === 'OFFLINE').map(t => (
                <div key={t.id} className="p-2.5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">#{t.sequenceNumber}</span>
                      <span className="text-xs font-bold text-slate-900">{t.description}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 tabular-numbers">
                      +{formatINR(t.amount)}
                    </span>
                    <button
                      onClick={() => onUndoTransaction(t)}
                      title={`Undo #${t.sequenceNumber}`}
                      className="p-1 text-slate-400 hover:text-rose-600 active:scale-90 transition"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online UPI Sub-Ledger */}
          <div className="glass-card rounded-[28px] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">Digital UPI / QR</h4>
                  <span className="text-[10px] text-slate-400">{stats.onlineCount} entries</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-700 tabular-numbers">
                  {formatINR(stats.totalOnline)}
                </span>
                <span className="text-[9px] text-slate-400 block">Online Subtotal</span>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTxns.filter(t => t.mode === 'ONLINE').map(t => (
                <div key={t.id} className="p-2.5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-emerald-600">#{t.sequenceNumber}</span>
                      <span className="text-xs font-bold text-slate-900">{t.description}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 tabular-numbers">
                      +{formatINR(t.amount)}
                    </span>
                    <button
                      onClick={() => onUndoTransaction(t)}
                      title={`Undo #${t.sequenceNumber}`}
                      className="p-1 text-slate-400 hover:text-rose-600 active:scale-90 transition"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Chronological Stream (UI Preference 4 & 5 style) */
        <div className="glass-card rounded-[32px] p-4">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Recent Chanda Logs
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredTxns.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-slate-100 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <ArrowDownLeft size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No Chanda Recorded Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  All dummy data has been removed. Tap &quot;+ Add Chanda&quot; to record the first contribution.
                </p>
              </div>
            ) : (
              filteredTxns.map(t => (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-white border border-slate-100/90 shadow-xs flex items-center justify-between transition hover:border-slate-200"
                >
                  {/* Left: Sequence, Avatar, Name, Timestamp */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      t.mode === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {t.mode === 'ONLINE' ? <Smartphone size={15} /> : <Banknote size={15} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{t.description}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">
                          #{t.sequenceNumber}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span>{new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span className={t.mode === 'ONLINE' ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                          {t.mode === 'ONLINE' ? 'UPI' : 'Cash'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Non-destructive Undo Action */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-emerald-700 tabular-numbers">
                      +{formatINR(t.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onUndoTransaction(t)}
                      title={`Reversal protocol: ${t.sequenceNumber} undo`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-90"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
