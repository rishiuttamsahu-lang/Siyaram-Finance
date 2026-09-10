'use client';

import React, { useState, useEffect } from 'react';
import { Season, Member, Transaction, AuditLog, Building } from '../../lib/types';
import { formatINR, calculateMandalTotals, computeMemberDue } from '../../lib/finance';
import {
  Calendar,
  Info,
  Edit2,
  Lock,
  Unlock,
  Archive,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Clock,
  ChevronRight,
  X,
  Search,
  Settings,
  ArrowRight
} from 'lucide-react';

export interface SeasonHistoryRecord {
  id: string;
  name: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Closed' | 'Archived' | 'Draft';
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  totalPending: number;
  pendingMembersCount: number;
  isLive: boolean;
}

interface SeasonsManagerProps {
  season: Season;
  members: Member[];
  buildings: Building[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  isAdmin: boolean;
  onRolloverSeason: (newSeasonId: string, startDate: string, endDate: string) => void;
  isCreateModalOpen?: boolean;
  setIsCreateModalOpen?: (open: boolean) => void;
  onNavigateTab?: (tabId: string) => void;
}

export const SeasonsManager: React.FC<SeasonsManagerProps> = ({
  season,
  members,
  transactions,
  isAdmin,
  onRolloverSeason,
  isCreateModalOpen,
  setIsCreateModalOpen,
  onNavigateTab,
}) => {
  // Live financial metrics
  const mandalSummary = calculateMandalTotals(transactions, season.openingBalance);
  const currentTotalIncome = mandalSummary.totalInflows;
  const currentTotalExpense = mandalSummary.totalExpenses;
  const currentBalance = mandalSummary.netBalance;

  // Member dues
  const memberDues = members.map(m => computeMemberDue(m, season));
  const totalPreviousPending = memberDues.reduce((acc, d) => acc + d.previousYearPending, 0);
  const totalCurrentPending = memberDues.reduce((acc, d) => acc + d.currentSeasonPending, 0);
  const totalOverallPending = totalPreviousPending + totalCurrentPending;

  // Real seasons list derived solely from props
  const [seasons, setSeasons] = useState<SeasonHistoryRecord[]>(() => {
    if (!season.id) return [];
    return [{
      id: season.id,
      name: season.name || season.id,
      label: season.id,
      startDate: season.startDate || '',
      endDate: season.endDate || '',
      status: season.isActive ? 'Active' : 'Closed',
      openingBalance: season.openingBalance || 0,
      totalIncome: currentTotalIncome,
      totalExpense: currentTotalExpense,
      closingBalance: currentBalance,
      totalPending: totalOverallPending,
      pendingMembersCount: memberDues.filter(d => d.totalPending > 0).length,
      isLive: season.isActive,
    }];
  });

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(season.id || '');

  useEffect(() => {
    if (!season.id) {
      setSeasons([]);
      setSelectedSeasonId('');
      return;
    }
    const currentRec: SeasonHistoryRecord = {
      id: season.id,
      name: season.name || season.id,
      label: season.id,
      startDate: season.startDate || '',
      endDate: season.endDate || '',
      status: season.isActive ? 'Active' : 'Closed',
      openingBalance: season.openingBalance || 0,
      totalIncome: currentTotalIncome,
      totalExpense: currentTotalExpense,
      closingBalance: currentBalance,
      totalPending: totalOverallPending,
      pendingMembersCount: memberDues.filter(d => d.totalPending > 0).length,
      isLive: season.isActive,
    };
    setSeasons([currentRec]);
    setSelectedSeasonId(season.id);
  }, [season.id, season.name, season.openingBalance, season.startDate, season.endDate, season.isActive, currentTotalIncome, currentTotalExpense, currentBalance, totalOverallPending]);

  // Sheet / Modal triggers
  const [internalCreateModal, setInternalCreateModal] = useState(false);
  const isCreateOpen = isCreateModalOpen !== undefined ? isCreateModalOpen : internalCreateModal;
  const setCreateOpen = setIsCreateModalOpen !== undefined ? setIsCreateModalOpen : setInternalCreateModal;

  const [isRecordsSheetOpen, setIsRecordsSheetOpen] = useState(false);
  const [isManageSheetOpen, setIsManageSheetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [activeRecordModal, setActiveRecordModal] = useState<'INCOME' | 'EXPENSE' | 'ALL' | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Form states for creating a new season
  const [newSeasonName, setNewSeasonName] = useState('Ganesh Utsav 2026–27');
  const [newSeasonStart, setNewSeasonStart] = useState('2026-09');
  const [newSeasonEnd, setNewSeasonEnd] = useState('2027-08');
  const [newSeasonStatus, setNewSeasonStatus] = useState<'Active' | 'Draft'>('Active');

  // Selected record safely guarded
  const selectedRecord = seasons.find(s => s.id === selectedSeasonId) || seasons[0] || null;
  const activeSeasonRecord = seasons.find(s => s.isLive) || seasons[0] || null;
  const prevSeasonRecord = seasons.length > 1 ? seasons[1] : null;

  const [editName, setEditName] = useState(selectedRecord?.name || '');
  const [editStart, setEditStart] = useState(selectedRecord?.startDate || '');
  const [editEnd, setEditEnd] = useState(selectedRecord?.endDate || '');

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSeasonName.trim() || 'New Season';
    const labelMatch = cleanName.match(/\d{4}[–-]\d{2,4}/);
    const label = labelMatch ? labelMatch[0] : `Season ${seasons.length + 1}`;
    const id = label.replace(/[–—\s]/g, '-') || `season-${Date.now()}`;

    const newRecord: SeasonHistoryRecord = {
      id,
      name: cleanName,
      label,
      startDate: newSeasonStart,
      endDate: newSeasonEnd,
      status: newSeasonStatus,
      openingBalance: currentBalance,
      totalIncome: 0,
      totalExpense: 0,
      closingBalance: currentBalance,
      totalPending: totalOverallPending,
      pendingMembersCount: memberDues.filter(d => d.totalPending > 0).length,
      isLive: newSeasonStatus === 'Active',
    };

    setSeasons(prev => [newRecord, ...prev]);
    setSelectedSeasonId(newRecord.id);
    setCreateOpen(false);

    if (onRolloverSeason) {
      onRolloverSeason(id, newSeasonStart, newSeasonEnd);
    }
  };

  const handleEditSeason = (e: React.FormEvent) => {
    e.preventDefault();
    setSeasons(prev =>
      prev.map(s =>
        s.id === selectedSeasonId
          ? { ...s, name: editName, startDate: editStart, endDate: editEnd }
          : s
      )
    );
    setIsEditModalOpen(false);
  };

  const handleSetStatus = (newStatus: 'Active' | 'Closed' | 'Archived') => {
    if (newStatus === 'Active') {
      setSeasons(prev =>
        prev.map(s => ({
          ...s,
          status: s.id === selectedSeasonId ? 'Active' : s.status === 'Active' ? 'Closed' : s.status,
          isLive: s.id === selectedSeasonId,
        }))
      );
    } else {
      setSeasons(prev =>
        prev.map(s => (s.id === selectedSeasonId ? { ...s, status: newStatus, isLive: false } : s))
      );
    }
    setIsManageSheetOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* 1. Subtle Info Strip */}
      <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
        <Info size={13} className="text-slate-500 shrink-0" />
        <span>{seasons.length === 0 ? 'No Active Season Configured' : 'Previous pending carries forward automatically'}</span>
      </div>

      {seasons.length === 0 || !activeSeasonRecord ? (
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center border border-slate-200/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Calendar size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">No Seasons Created Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              All dummy seasons have been cleared. Tap &quot;+ New&quot; or deploy the Mandal Snapshot to initialize a season.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          >
            + Create New Season
          </button>
        </div>
      ) : (
        <>
          {/* Horizontal Season Switcher (Compact text buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {seasons.map((s) => {
              const isSelected = selectedSeasonId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSeasonId(s.id);
                    setEditName(s.name);
                    setEditStart(s.startDate);
                    setEditEnd(s.endDate);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <span>{s.label}</span>
                  {s.isLive && (
                    <span className="text-[10px] text-emerald-400 font-medium">• Active</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Season Card (Mobile Optimized) */}
          <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-3">
            {/* Title & Status */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                  {activeSeasonRecord.name}
                </h3>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              Active · {activeSeasonRecord.startDate} → {activeSeasonRecord.endDate}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsManageSheetOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 transition"
            title="Manage Season"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* 4 Compact Stats: 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium block">Opening</span>
            <span className="text-sm font-semibold text-slate-900 tabular-numbers mt-0.5 block">
              {formatINR(activeSeasonRecord.openingBalance)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium block">Income</span>
            <span className="text-sm font-semibold text-emerald-600 tabular-numbers mt-0.5 block">
              +{formatINR(currentTotalIncome)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium block">Expense</span>
            <span className="text-sm font-semibold text-rose-600 tabular-numbers mt-0.5 block">
              -{formatINR(currentTotalExpense)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium block">Balance</span>
            <span className="text-sm font-semibold text-slate-900 tabular-numbers mt-0.5 block">
              {formatINR(currentBalance)}
            </span>
          </div>
        </div>

        {/* Single Prominent Total Due Line */}
        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-amber-900 block tabular-numbers">
              {formatINR(totalOverallPending)} Total Due
            </span>
            <span className="text-[11px] text-amber-700 font-normal mt-0.5 block">
              {formatINR(totalPreviousPending)} previous · {formatINR(totalCurrentPending)} current
            </span>
          </div>
        </div>

        {/* Single Clean Action: View Records → */}
        <button
          type="button"
          onClick={() => setIsRecordsSheetOpen(true)}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <span>View Records</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 4. Single Combined Pending Card */}
      <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
        <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
          Pending
        </span>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Previous year</span>
            <span className="font-semibold text-slate-900 tabular-numbers">{formatINR(totalPreviousPending)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Current season</span>
            <span className="font-semibold text-slate-900 tabular-numbers">{formatINR(totalCurrentPending)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-100 font-semibold text-amber-900">
            <span>Total</span>
            <span className="tabular-numbers">{formatINR(totalOverallPending)}</span>
          </div>
        </div>
      </div>

      {/* 5. Previous Season Summary (only if real previous season exists) */}
      {prevSeasonRecord && (
        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              {prevSeasonRecord.label} · Closed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Income</span>
              <span className="font-semibold text-emerald-600">₹{(prevSeasonRecord.totalIncome / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Expense</span>
              <span className="font-semibold text-rose-600">₹{(prevSeasonRecord.totalExpense / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Balance</span>
              <span className="font-semibold text-slate-900">₹{(prevSeasonRecord.closingBalance / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Pending</span>
              <span className="font-semibold text-amber-800">₹{(prevSeasonRecord.totalPending / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Season History (Simple Rows) */}
      <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
        <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
          Season History
        </span>

        <div className="space-y-1 divide-y divide-slate-100">
          {seasons.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setSelectedSeasonId(s.id);
                setEditName(s.name);
                setEditStart(s.startDate);
                setEditEnd(s.endDate);
              }}
              className="pt-1.5 first:pt-0 flex items-center justify-between text-xs cursor-pointer hover:text-slate-900 py-1"
            >
              <span className="font-semibold text-slate-800">{s.label}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                s.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                s.status === 'Closed' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
              }`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Minimal Recent Activity (Audit Trail) */}
      <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Recent Activity
          </span>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('logs')}
              className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-0.5"
            >
              <span>View all</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Season active</span>
            <span className="text-[10px] text-slate-400">Live</span>
          </div>
        </div>
      </div>
    </>
  )}

      {/* BOTTOM SHEET 1: View Records Modal */}
      {isRecordsSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Season Records</h4>
              <button
                type="button"
                onClick={() => setIsRecordsSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsRecordsSheetOpen(false);
                  setIsMembersModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-500" />
                  <span>Members Directory ({members.length})</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRecordsSheetOpen(false);
                  setActiveRecordModal('INCOME');
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownLeft size={14} className="text-emerald-600" />
                  <span>Income Records</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRecordsSheetOpen(false);
                  setActiveRecordModal('EXPENSE');
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-rose-600" />
                  <span>Expense Records</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRecordsSheetOpen(false);
                  setActiveRecordModal('ALL');
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-500" />
                  <span>All Transactions</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET 2: Manage Season Sheet */}
      {isManageSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Manage Season ({selectedRecord?.label || ''})</h4>
              <button
                type="button"
                onClick={() => setIsManageSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsManageSheetOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Edit2 size={14} className="text-slate-600" />
                  <span>Edit Season Name</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsManageSheetOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-600" />
                  <span>Change Dates</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              {selectedRecord?.status === 'Active' ? (
                <button
                  type="button"
                  onClick={() => handleSetStatus('Closed')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-slate-600" />
                    <span>Close Season</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetStatus('Active')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-emerald-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Unlock size={14} className="text-emerald-600" />
                    <span>Reopen Season</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSetStatus('Archived')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-amber-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Archive size={14} className="text-amber-700" />
                  <span>Archive Season</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SEASON MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">New Season</h4>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Season Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ganesh Utsav 2027–28"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Start</label>
                  <input
                    type="month"
                    required
                    value={newSeasonStart}
                    onChange={(e) => setNewSeasonStart(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">End</label>
                  <input
                    type="month"
                    required
                    value={newSeasonEnd}
                    onChange={(e) => setNewSeasonEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                Opening Balance: <strong>{formatINR(currentBalance)}</strong> (Carried from closing)
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Edit Season</h4>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSeason} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Start</label>
                  <input
                    type="text"
                    required
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">End</label>
                  <input
                    type="text"
                    required
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBERS DIRECTORY MODAL */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-4 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h4 className="font-semibold text-sm text-slate-900">Members Directory ({members.length})</h4>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search member..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="overflow-y-auto space-y-1 flex-1 pr-1 text-xs">
              {members
                .filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                .map(m => {
                  const dueInfo = computeMemberDue(m, season);
                  return (
                    <div key={m.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{m.name}</span>
                      <span className={`font-semibold tabular-numbers ${dueInfo.totalPending > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                        {dueInfo.totalPending > 0 ? formatINR(dueInfo.totalPending) : '✓ Cleared'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL RECORDS MODAL */}
      {activeRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-4 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h4 className="font-semibold text-sm text-slate-900">
                {activeRecordModal === 'INCOME' ? 'Income Records' : activeRecordModal === 'EXPENSE' ? 'Expense Records' : 'All Transactions'}
              </h4>
              <button
                type="button"
                onClick={() => setActiveRecordModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1 flex-1 pr-1 text-xs">
              {transactions
                .filter(t => {
                  if (activeRecordModal === 'INCOME') return t.type !== 'EXPENSE';
                  if (activeRecordModal === 'EXPENSE') return t.type === 'EXPENSE';
                  return true;
                })
                .map(t => (
                  <div key={t.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">#{t.sequenceNumber} {t.description}</span>
                      <span className="block text-[10px] text-slate-400">{t.timestamp.slice(0, 10)}</span>
                    </div>
                    <span className={`font-semibold tabular-numbers ${t.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {t.type === 'EXPENSE' ? '-' : '+'}{formatINR(t.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
