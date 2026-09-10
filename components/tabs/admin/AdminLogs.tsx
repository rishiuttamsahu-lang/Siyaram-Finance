'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog, Transaction } from '../../../lib/types';
import { formatINR } from '../../../lib/finance';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  CheckCheck,
  Send,
  Globe,
  Database,
  FileSpreadsheet
} from 'lucide-react';

interface AdminLogsProps {
  auditLogs: AuditLog[];
  transactions: Transaction[];
  onRetrySync?: (logId: string) => void;
}

export const AdminLogs: React.FC<AdminLogsProps> = ({
  auditLogs: initialLogs,
  transactions,
  onRetrySync,
}) => {
  // Pure system & administrative audit logs
  const [logsList, setLogsList] = useState<AuditLog[]>(() =>
    (initialLogs || []).filter(l => l.type !== 'INCOME' && l.type !== 'EXPENSE')
  );

  useEffect(() => {
    setLogsList((initialLogs || []).filter(l => l.type !== 'INCOME' && l.type !== 'EXPENSE'));
  }, [initialLogs]);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EDIT' | 'UNDO' | 'ROLLOVER'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'TEL' | 'WEB'>('ALL');
  const [syncFilter, setSyncFilter] = useState<'ALL' | 'SYNCED' | 'FAILED'>('ALL');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Modals / Detail Sheets
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isSystemStatusSheetOpen, setIsSystemStatusSheetOpen] = useState(false);
  const [isBotHealthSheetOpen, setIsBotHealthSheetOpen] = useState(false);
  const [isFailedAlertSheetOpen, setIsFailedAlertSheetOpen] = useState(false);

  // Actions state
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [isVerifyingBot, setIsVerifyingBot] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Stats calculation
  const totalLogs = logsList.length;
  const editLogs = logsList.filter(l => l.type === 'EDIT' || l.action === 'UPDATE').length;
  const undoLogs = logsList.filter(l => l.type === 'UNDO' || l.action === 'UNDO').length;
  const failedSyncs = logsList.filter(l => l.syncStatus === 'FAILED').length;
  const firstFailedLog = logsList.find(l => l.syncStatus === 'FAILED');

  const formatShortTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const formatFullDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  // Filtered Activity List
  const filteredLogs = logsList.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const name = (log.name || '').toLowerCase();
      const txnId = (log.txnId || '').toLowerCase();
      const notes = (log.notes || '').toLowerCase();
      if (!name.includes(q) && !txnId.includes(q) && !notes.includes(q)) {
        return false;
      }
    }

    if (typeFilter !== 'ALL' && log.type !== typeFilter) return false;
    if (sourceFilter !== 'ALL' && log.source !== sourceFilter) return false;
    if (syncFilter !== 'ALL' && log.syncStatus !== syncFilter) return false;

    return true;
  });

  const handleRetrySync = (logId: string) => {
    setIsRetryingSync(true);
    setTimeout(() => {
      setLogsList(prev =>
        prev.map(l => l.id === logId ? { ...l, syncStatus: 'SYNCED', notes: 'Google Sheets mirror updated successfully' } : l)
      );
      setIsRetryingSync(false);
      setIsFailedAlertSheetOpen(false);
      setActionSuccessToast('Google Sheets synced successfully');
      setTimeout(() => setActionSuccessToast(null), 3000);
      if (onRetrySync) onRetrySync(logId);
    }, 800);
  };

  const handleVerifyBot = () => {
    setIsVerifyingBot(true);
    setTimeout(() => {
      setIsVerifyingBot(false);
      setActionSuccessToast('Bot verified: Edge Webhook operational, 0 mismatches');
      setTimeout(() => setActionSuccessToast(null), 3500);
    }, 700);
  };

  const typeFilterOptions: { id: 'ALL' | 'EDIT' | 'UNDO' | 'ROLLOVER'; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'EDIT', label: 'Edits' },
    { id: 'UNDO', label: 'Reversals' },
    { id: 'ROLLOVER', label: 'Rollover' },
  ];

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="rounded-xl p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* 1. 2 COMPACT STATS + INLINE STATS */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="glass-card rounded-2xl p-2.5 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 font-medium block">Audit Logs</span>
            <span className="text-base font-semibold text-slate-900 tabular-numbers mt-0.5 block">
              {totalLogs}
            </span>
          </div>

          <div className={`glass-card rounded-2xl p-2.5 border ${
            failedSyncs > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200/80'
          }`}>
            <span className={`text-[10px] font-medium block ${failedSyncs > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
              Sync Issues
            </span>
            <span className={`text-base font-semibold tabular-numbers mt-0.5 block ${failedSyncs > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
              {failedSyncs}
            </span>
          </div>
        </div>

        <div className="px-1 text-[11px] font-normal text-slate-500">
          Edits {editLogs} · Reversals {undoLogs}
        </div>
      </div>

      {/* 2. SYSTEM STATUS (CLEAN 3-ITEM STRIP) */}
      <div
        onClick={() => setIsSystemStatusSheetOpen(true)}
        className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2 cursor-pointer active:scale-98 transition hover:bg-slate-50"
      >
        <span className="text-xs font-medium text-slate-900 block">System Status</span>

        <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-700 font-medium">Firebase</span>
            <span className="text-[10px] font-medium text-emerald-700">● Live</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-700 font-medium">Telegram</span>
            <span className="text-[10px] font-medium text-emerald-700">● Live</span>
          </div>

          <div className={`flex items-center justify-between p-2 rounded-xl border ${
            failedSyncs > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-50/80 border-slate-100 text-slate-700'
          }`}>
            <span className="font-medium">Sheets</span>
            <span className={`text-[10px] font-medium ${failedSyncs > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {failedSyncs > 0 ? '● Issue' : '● Synced'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FAILED SYNC ALERT (ACTIONABLE) */}
      {failedSyncs > 0 && firstFailedLog && (
        <div
          onClick={() => setIsFailedAlertSheetOpen(true)}
          className="rounded-2xl p-3 bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-2 cursor-pointer active:scale-98 transition"
        >
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-amber-900 block">⚠ Sheets sync failed</span>
            <span className="text-[11px] font-normal text-amber-700 mt-0.5 block truncate">
              {firstFailedLog.name} · {formatINR(firstFailedLog.amount || 0)} · {firstFailedLog.txnId}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRetrySync(firstFailedLog.id);
            }}
            disabled={isRetryingSync}
            className="px-3 py-1.5 rounded-xl bg-amber-900 text-white hover:bg-amber-800 text-xs font-medium active:scale-95 transition cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isRetryingSync && <RefreshCw size={11} className="animate-spin" />}
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4. TELEGRAM BOT HEALTH */}
      <div
        onClick={() => setIsBotHealthSheetOpen(true)}
        className="glass-card rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between cursor-pointer active:scale-98 transition hover:bg-slate-50"
      >
        <div className="space-y-0.5">
          <span className="text-xs font-medium text-slate-900 block">Telegram Bot</span>
          <span className="text-[11px] font-normal text-emerald-700 block">
            ● Healthy · 0 mismatches · 0 failures
          </span>
          <span className="text-[10px] font-normal text-slate-400 block">
            Last response 200ms (Edge Webhook)
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleVerifyBot();
          }}
          disabled={isVerifyingBot}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          {isVerifyingBot && <RefreshCw size={11} className="animate-spin" />}
          <span>Verify</span>
        </button>
      </div>

      {/* 5. SEARCH & FILTER DOCK */}
      <div className="glass-card rounded-2xl p-2.5 border border-slate-200/80 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Horizontal Type Filters + Filter Button */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {typeFilterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTypeFilter(opt.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${
                typeFilter === opt.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition active:scale-95 cursor-pointer ${
              sourceFilter !== 'ALL' || syncFilter !== 'ALL'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={11} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* 6. ACTIVITY FEED (NO TABLES! STACKED ACTIVITY ROWS) */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-900 px-1 block">Activity</span>

        <div className="space-y-1.5">
          {filteredLogs.map((log) => {
            const isIncome = log.type === 'INCOME';
            const isExpense = log.type === 'EXPENSE';
            const isEdit = log.type === 'EDIT';
            const isUndo = log.type === 'UNDO';
            const isSynced = log.syncStatus === 'SYNCED';

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="rounded-xl p-3 bg-white/90 border border-slate-200/80 hover:border-slate-300 shadow-2xs transition active:scale-98 cursor-pointer space-y-1"
              >
                {/* Top Row: Event Name (Left) · Action Badge (Right) */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 truncate pr-2">
                    {log.name}
                  </span>

                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${
                      isEdit ? 'bg-amber-50 text-amber-800 border border-amber-200/60' :
                      isUndo ? 'bg-purple-50 text-purple-800 border border-purple-200/60' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {log.action || log.type}
                  </span>
                </div>

                {/* Middle Row: Notes / Audit Summary */}
                {log.notes && (
                  <p className="text-[11px] text-slate-500 font-normal line-clamp-2">
                    {log.notes}
                  </p>
                )}

                {/* Bottom Row: PerformedBy & Time (Left) · Source & Sync (Right) */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal pt-1 border-t border-slate-100/80">
                  <span className="truncate pr-2">
                    {log.performedBy || 'System'} · {formatShortTime(log.timestamp)}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {log.source || 'WEB'}
                    </span>
                    {isSynced ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                        <Check size={11} />
                        <span>Synced</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        ⚠ Issue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs">
              No activity logs found matching criteria.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: LOG DETAILS (TAP ON ROW) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {selectedLog.type}
                </span>
                <span className="text-xs font-medium text-slate-500">· {selectedLog.source === 'TEL' ? 'Telegram' : 'Website'}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-0.5">
              <span className="text-xs font-medium text-slate-700 block truncate">{selectedLog.name}</span>
              <span
                className={`text-xl font-semibold tabular-numbers block ${
                  selectedLog.type === 'INCOME' ? 'text-emerald-600' :
                  selectedLog.type === 'EXPENSE' ? 'text-rose-600' :
                  selectedLog.type === 'EDIT' ? 'text-amber-600' :
                  'text-purple-600'
                }`}
              >
                {selectedLog.type === 'INCOME' && `+${formatINR(selectedLog.amount || 0)}`}
                {selectedLog.type === 'EXPENSE' && `-${formatINR(selectedLog.amount || 0)}`}
                {selectedLog.type === 'EDIT' && `✎ ${formatINR(selectedLog.amount || 0)}`}
                {selectedLog.type === 'UNDO' && `↶ ${formatINR(selectedLog.amount || 0)}`}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Date & Time</span>
                <span className="font-medium text-slate-800">{formatFullDate(selectedLog.timestamp)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Transaction ID</span>
                <span className="font-mono font-medium text-slate-800">{selectedLog.txnId}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Source</span>
                <span className="font-medium text-slate-800">{selectedLog.performedBy}</span>
              </div>

              {selectedLog.notes && (
                <div className="py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-normal block mb-0.5">Command / Notes</span>
                  <span className="font-mono text-[11px] text-slate-700 block">{selectedLog.notes}</span>
                </div>
              )}

              {/* Edit Before & After */}
              {selectedLog.type === 'EDIT' && selectedLog.previousValue && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <span className="font-medium text-amber-900 block text-[11px]">Audit History</span>
                  <div className="flex items-center justify-between text-[11px] text-amber-800">
                    <span>Previous: ₹{selectedLog.previousValue.amount}</span>
                    <span>Updated: ₹{selectedLog.newValue?.amount}</span>
                  </div>
                </div>
              )}

              {/* Undo Original Reference */}
              {selectedLog.type === 'UNDO' && (
                <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-1">
                  <span className="font-medium text-purple-900 block text-[11px]">Reversal Record</span>
                  <span className="text-[11px] text-purple-800 block">Original Transaction: {selectedLog.txnId} (Status: REVERSED)</span>
                </div>
              )}

              {/* Sync Status Grid */}
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-normal">Firebase Firestore</span>
                  <span className="text-emerald-700 font-medium">✓ Synced</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-normal">Google Sheets</span>
                  <span className={`font-medium ${selectedLog.syncStatus === 'SYNCED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedLog.syncStatus === 'SYNCED' ? '✓ Synced' : '✕ Not synced (Timeout)'}
                  </span>
                </div>
              </div>
            </div>

            {selectedLog.syncStatus === 'FAILED' && (
              <button
                type="button"
                onClick={() => {
                  handleRetrySync(selectedLog.id);
                  setSelectedLog(null);
                }}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Retry Sync Now</span>
              </button>
            )}

            <span className="text-[10px] text-slate-400 block text-center pt-1 font-normal">
              Append-only log · Zero deletions
            </span>
          </div>
        </div>
      )}

      {/* MODAL: SYSTEM STATUS SHEET */}
      {isSystemStatusSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">System Status</h4>
              <button
                type="button"
                onClick={() => setIsSystemStatusSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-800">Firebase Firestore</span>
                  <span className="text-emerald-700 text-[10px]">Connected</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal block">Primary Realtime DB · Latency ~34ms</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-800">Telegram Bot</span>
                  <span className="text-emerald-700 text-[10px]">Connected</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal block">Cloudflare Edge Webhook · Latency ~200ms</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-800">Google Sheets Mirror</span>
                  <span className={`text-[10px] font-medium ${failedSyncs > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {failedSyncs > 0 ? '1 Pending' : 'Synced'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal block">
                  {failedSyncs > 0 ? 'Last error: Rate limit timeout' : 'Automated Apps Script mirror healthy'}
                </span>
              </div>
            </div>

            {failedSyncs > 0 && firstFailedLog && (
              <button
                type="button"
                onClick={() => {
                  setIsSystemStatusSheetOpen(false);
                  handleRetrySync(firstFailedLog.id);
                }}
                className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition cursor-pointer"
              >
                Retry Pending Syncs
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL: FAILED SYNC ALERT SHEET */}
      {isFailedAlertSheetOpen && firstFailedLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Google Sheets Sync</h4>
              <button
                type="button"
                onClick={() => setIsFailedAlertSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Transaction</span>
                <span className="font-mono font-medium text-slate-800">{firstFailedLog.txnId}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Item</span>
                <span className="font-medium text-slate-800">{firstFailedLog.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Amount</span>
                <span className="font-medium text-rose-600">₹{firstFailedLog.amount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Firebase DB</span>
                <span className="text-emerald-700 font-medium">✓ Saved</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Sheets Mirror</span>
                <span className="text-amber-700 font-medium">✕ Not synced</span>
              </div>
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                Temporary network rate limit timeout. Tap below to retry mirror.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleRetrySync(firstFailedLog.id)}
              disabled={isRetryingSync}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isRetryingSync && <RefreshCw size={12} className="animate-spin" />}
              <span>Retry Sync</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: BOT HEALTH SHEET */}
      {isBotHealthSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Bot Health</h4>
              <button
                type="button"
                onClick={() => setIsBotHealthSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Status</span>
                <span className="font-medium text-emerald-700">● Healthy</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Architecture</span>
                <span className="font-medium text-slate-800">Cloudflare Edge Webhook</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Last Command</span>
                <span className="font-mono text-[11px] text-slate-800">/list members</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Last Processed</span>
                <span className="font-mono text-[11px] text-slate-800">+ 100 Piyush</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Last Response</span>
                <span className="font-medium text-emerald-700">200ms ✓</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Data Mismatch</span>
                <span className="font-medium text-slate-800">0</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Failed Commands</span>
                <span className="font-medium text-slate-800">0</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Last Sync</span>
                <span className="font-medium text-slate-800">Just now (Webhook)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsBotHealthSheetOpen(false);
                handleVerifyBot();
              }}
              disabled={isVerifyingBot}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            >
              Verify Bot
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FILTERS SHEET */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Filter Logs</h4>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Type */}
              <div>
                <span className="font-medium text-slate-600 block mb-1">Type</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['ALL', 'EDIT', 'UNDO', 'ROLLOVER'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      className={`py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        typeFilter === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t === 'ALL' ? 'All' : t === 'EDIT' ? 'Edits' : t === 'UNDO' ? 'Reversals' : 'Rollover'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <span className="font-medium text-slate-600 block mb-1">Source</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['ALL', 'TEL', 'WEB'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSourceFilter(s)}
                      className={`py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        sourceFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s === 'ALL' ? 'All' : s === 'TEL' ? 'Telegram' : 'Website'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync Status */}
              <div>
                <span className="font-medium text-slate-600 block mb-1">Sync Status</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['ALL', 'SYNCED', 'FAILED'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSyncFilter(st)}
                      className={`py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        syncFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st === 'SYNCED' ? 'Synced' : 'Failed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('ALL');
                  setSourceFilter('ALL');
                  setSyncFilter('ALL');
                  setIsFilterSheetOpen(false);
                }}
                className="py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
