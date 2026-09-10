'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMode } from '../../lib/types';
import { formatINR } from '../../lib/finance';
import { ArrowUpRight, Plus, Smartphone, Banknote, RotateCcw, Split, Tag } from 'lucide-react';

interface ExpenseTabProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onUndoTransaction: (txn: Transaction) => void;
  isAdmin: boolean;
}

export const ExpenseTab: React.FC<ExpenseTabProps> = ({
  transactions,
  onOpenAddModal,
  onUndoTransaction,
  isAdmin,
}) => {
  const [splitView, setSplitView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter active expenses only
  const expenseTxns = useMemo(() => {
    return transactions.filter(t => t.type === 'EXPENSE' && t.status === 'ACTIVE');
  }, [transactions]);

  // Outflow aggregates
  const stats = useMemo(() => {
    let totalOnline = 0;
    let totalOffline = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    expenseTxns.forEach(t => {
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
      count: expenseTxns.length,
      totalOnline,
      totalOffline,
      onlineCount,
      offlineCount,
    };
  }, [expenseTxns]);

  // Filtered by item search
  const filteredTxns = useMemo(() => {
    return expenseTxns
      .filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.sequenceNumber - a.sequenceNumber); // Latest first
  }, [expenseTxns, searchQuery]);

  return (
    <div className="space-y-4 pb-24">
      {/* Top 2 Summary Cards + Quick Add Trigger */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="glass-card rounded-3xl p-4 flex flex-col justify-between border-rose-100 bg-rose-50/20">
          <span className="text-[10px] sm:text-xs font-bold text-rose-700 uppercase tracking-wider">
            Total Kharcha
          </span>
          <div className="text-xl sm:text-3xl font-bold text-rose-600 tabular-numbers mt-1">
            -{formatINR(stats.total)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {stats.count} Recorded Outflows
          </span>
        </div>

        {/* Quick Add Expense Action Card */}
        <div className="glass-card rounded-3xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Entry
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
              Item Name & Amount
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-2 w-full py-2.5 px-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Split View Bar */}
      <div className="glass-card-subtle rounded-2xl p-2.5 flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Filter item name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500 flex-1"
        />

        {/* Split View Toggle */}
        <button
          type="button"
          onClick={() => setSplitView(!splitView)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
            splitView
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white/90 text-slate-700 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <Split size={14} />
          <span>{splitView ? 'Unified Stream' : 'Split View'}</span>
        </button>
      </div>

      {/* Content: Split Sub-Ledgers vs Unified Stream */}
      {splitView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Offline Cash Expenses */}
          <div className="glass-card rounded-[28px] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                  <Banknote size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">Cash Outflows</h4>
                  <span className="text-[10px] text-slate-400">{stats.offlineCount} items</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-900 tabular-numbers">
                  -{formatINR(stats.totalOffline)}
                </span>
                <span className="text-[9px] text-slate-400 block">Cash Subtotal</span>
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
                      {new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 tabular-numbers">
                      -{formatINR(t.amount)}
                    </span>
                    <button
                      onClick={() => onUndoTransaction(t)}
                      title={`Return / Refund #${t.sequenceNumber}`}
                      className="p-1 text-slate-400 hover:text-rose-600 active:scale-90 transition"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online UPI Expenses */}
          <div className="glass-card rounded-[28px] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">Online UPI Outflows</h4>
                  <span className="text-[10px] text-slate-400">{stats.onlineCount} items</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-rose-600 tabular-numbers">
                  -{formatINR(stats.totalOnline)}
                </span>
                <span className="text-[9px] text-slate-400 block">Online Subtotal</span>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTxns.filter(t => t.mode === 'ONLINE').map(t => (
                <div key={t.id} className="p-2.5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-rose-600">#{t.sequenceNumber}</span>
                      <span className="text-xs font-bold text-slate-900">{t.description}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 tabular-numbers">
                      -{formatINR(t.amount)}
                    </span>
                    <button
                      onClick={() => onUndoTransaction(t)}
                      title={`Return / Refund #${t.sequenceNumber}`}
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
        /* Unified Chronological Outflow Stream */
        <div className="glass-card rounded-[32px] p-4">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Recent Expense Logs
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredTxns.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-slate-100 space-y-2">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <ArrowUpRight size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No Expenses Recorded Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  All dummy data has been removed. Tap &quot;+ Add Expense&quot; to record the first outflow.
                </p>
              </div>
            ) : (
              filteredTxns.map(t => (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-white border border-slate-100/90 shadow-xs flex items-center justify-between transition hover:border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                      <Tag size={15} />
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
                        <span className={t.mode === 'ONLINE' ? 'text-rose-600 font-medium' : 'text-slate-500'}>
                          {t.mode === 'ONLINE' ? 'UPI' : 'Cash'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-rose-600 tabular-numbers">
                      -{formatINR(t.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onUndoTransaction(t)}
                      title={`Vendor return: ${t.sequenceNumber} undo restores funds`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition active:scale-90"
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
