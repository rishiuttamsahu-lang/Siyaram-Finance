'use client';

import React, { useState } from 'react';
import { Transaction, Season, Member, Building, PaymentMode, TransactionType } from '../../../lib/types';
import { formatINR } from '../../../lib/finance';
import {
  Search,
  SlidersHorizontal,
  MoreVertical,
  Plus,
  Edit2,
  RotateCcw,
  X,
  Check,
  Smartphone,
  Banknote
} from 'lucide-react';

interface AdminTransactionsProps {
  season: Season;
  members: Member[];
  buildings: Building[];
  transactions: Transaction[];
  onAddTransaction?: (txn: Omit<Transaction, 'id' | 'sequenceNumber'>) => void;
  onEditTransaction?: (txnId: string, updatedFields: Partial<Transaction>) => void;
  onUndoTransaction?: (txn: Transaction) => void;
  isAddModalOpen?: boolean;
  setIsAddModalOpen?: (open: boolean) => void;
}

type FilterCategory = 'ALL' | 'INCOME' | 'EXPENSE' | 'MEMBERS' | 'FLATS';

export const AdminTransactions: React.FC<AdminTransactionsProps> = ({
  season,
  members,
  buildings,
  transactions,
  onAddTransaction,
  onEditTransaction,
  onUndoTransaction,
  isAddModalOpen: externalIsAddOpen,
  setIsAddModalOpen: externalSetIsAddOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'TEL' | 'WEB'>('ALL');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // New Transaction Form Modal
  const [internalIsAddOpen, setInternalIsAddOpen] = useState(false);
  const isEntryModalOpen = externalIsAddOpen !== undefined ? externalIsAddOpen : internalIsAddOpen;
  const setIsEntryModalOpen = externalSetIsAddOpen !== undefined ? externalSetIsAddOpen : setInternalIsAddOpen;

  const [entryType, setEntryType] = useState<TransactionType>('MEMBER');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryMode, setEntryMode] = useState<PaymentMode>('ONLINE');
  const [entrySource, setEntrySource] = useState<'TEL' | 'WEB'>('WEB');
  const [entryDescription, setEntryDescription] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [selectedWingCode, setSelectedWingCode] = useState(buildings[0]?.code || 'A');
  const [selectedFlatNo, setSelectedFlatNo] = useState('101');

  // Action Menu Sheet (Three Dots)
  const [actionMenuTxn, setActionMenuTxn] = useState<Transaction | null>(null);

  // Detail View Sheet (Tap on Card)
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);

  // Edit Transaction Modal
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMode, setEditMode] = useState<PaymentMode>('ONLINE');

  // Shorter date formatting: "09 Sep, 1:10 AM"
  const formatShortDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-IN', { month: 'short' });
      const time = d.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${day} ${month}, ${time}`;
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
    return mode === 'ONLINE' ? 'UPI' : 'Cash';
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.sequenceNumber).includes(searchQuery);
    if (!matchesSearch) return false;

    // Category filter: All / Income / Expense / Members / Flats
    if (categoryFilter === 'INCOME' && t.type === 'EXPENSE') return false;
    if (categoryFilter === 'EXPENSE' && t.type !== 'EXPENSE') return false;
    if (categoryFilter === 'MEMBERS' && t.type !== 'MEMBER') return false;
    if (categoryFilter === 'FLATS' && t.type !== 'BUILDING') return false;

    // Payment mode filter
    if (modeFilter !== 'ALL' && t.mode !== modeFilter) return false;

    // Origin source filter (TEL vs WEB)
    if (sourceFilter !== 'ALL') {
      const isTel = t.source === 'TELEGRAM' || t.source === 'TEL' || !t.source;
      const isWeb = t.source === 'WEBSITE' || t.source === 'WEB';
      if (sourceFilter === 'TEL' && !isTel) return false;
      if (sourceFilter === 'WEB' && !isWeb) return false;
    }

    return true;
  });

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(entryAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    let desc = entryDescription.trim();
    const metadata: any = {};

    if (entryType === 'MEMBER') {
      const member = members.find(m => m.id === selectedMemberId);
      desc = desc || `${member?.name || 'Member'} Contribution`;
      metadata.memberId = selectedMemberId;
      metadata.memberName = member?.name;
    } else if (entryType === 'BUILDING') {
      desc = desc || `Flat ${selectedWingCode}-${selectedFlatNo}`;
      metadata.buildingCode = selectedWingCode;
      metadata.flatNo = selectedFlatNo;
    } else if (entryType === 'CHANDA') {
      desc = desc || 'General Chanda Donation';
    } else if (entryType === 'EXPENSE') {
      desc = desc || 'Mandal Kharcha Item';
    }

    if (onAddTransaction) {
      onAddTransaction({
        timestamp: new Date().toISOString(),
        type: entryType,
        amount,
        mode: entryMode,
        status: 'ACTIVE',
        description: desc,
        source: entrySource,
        metadata,
      });
    }

    setIsEntryModalOpen(false);
    setEntryAmount('');
    setEntryDescription('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn || !onEditTransaction) return;
    const amount = parseInt(editAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    onEditTransaction(editingTxn.id, {
      amount,
      description: editDesc.trim() || editingTxn.description,
      mode: editMode,
    });

    setEditingTxn(null);
  };

  const handleTriggerUndo = (txn: Transaction) => {
    if (onUndoTransaction) {
      onUndoTransaction(txn);
    }
    setActionMenuTxn(null);
    setDetailTxn(null);
  };

  const filterTabs: { id: FilterCategory; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'INCOME', label: 'Income' },
    { id: 'EXPENSE', label: 'Expense' },
    { id: 'MEMBERS', label: 'Members' },
    { id: 'FLATS', label: 'Flats' },
  ];

  return (
    <div className="space-y-2.5">
      {/* 1. Search + Horizontal Filter Dock */}
      <div className="glass-card rounded-2xl p-2.5 border border-slate-200/80 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Single Horizontal Filter Row: All, Income, Expense, Members, Flats + Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {filterTabs.map((tab) => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Payment Mode Filter Button */}
          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition active:scale-95 cursor-pointer ${
              modeFilter !== 'ALL'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={11} />
            <span>{modeFilter === 'ALL' ? 'Filters' : modeFilter === 'ONLINE' ? 'UPI' : 'Cash'}</span>
          </button>
        </div>
      </div>

      {/* 2. Transaction Stream List (Mobile Benchmark: Minimal, Clean, 12px Spacing) */}
      <div className="space-y-1.5">
        {filteredTransactions.map((t) => {
          const isExpense = t.type === 'EXPENSE';
          const isReversed = t.status === 'REVERSED';
          const metadataStr = `${getCategoryLabel(t.type)} · ${getModeLabel(t.mode)} · ${formatShortDateTime(t.timestamp)}`;

          return (
            <div
              key={t.id}
              className={`rounded-xl p-3 border transition active:scale-98 ${
                isReversed
                  ? 'bg-slate-50/60 border-slate-200 opacity-60'
                  : 'bg-white/90 border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Row 1: [#1 Name] [Amount] */}
              <div
                onClick={() => setDetailTxn(t)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-xs font-normal text-slate-400 tabular-numbers shrink-0">
                    #{t.sequenceNumber}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-medium truncate ${
                      isReversed ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {t.description}
                  </span>
                </div>

                <div className="shrink-0">
                  <span
                    className={`text-xs sm:text-sm font-semibold tabular-numbers ${
                      isReversed
                        ? 'line-through text-slate-400'
                        : isExpense
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {isExpense ? '-' : '+'}{formatINR(t.amount)}
                  </span>
                </div>
              </div>

              {/* Row 2: [Metadata] [⋯ Action] */}
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-normal">
                <div
                  onClick={() => setDetailTxn(t)}
                  className="truncate pr-2 cursor-pointer"
                >
                  {isReversed ? (
                    <span className="text-purple-600 font-medium">Reversed / Undone</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wide ${
                          (t.source === 'TELEGRAM' || t.source === 'TEL' || !t.source)
                            ? 'bg-sky-50 text-sky-700 border border-sky-200/70'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                        }`}
                      >
                        {t.source === 'WEBSITE' || t.source === 'WEB' ? 'Website' : 'Telegram'}
                      </span>
                      <span>{getCategoryLabel(t.type)}</span>
                      <span>·</span>
                      <span>{getModeLabel(t.mode)}</span>
                      <span>·</span>
                      <span>{formatShortDateTime(t.timestamp)}</span>
                      <span className="text-[10px] text-emerald-600 font-medium ml-1">✓</span>
                    </div>
                  )}
                </div>

                {!isReversed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuTxn(t);
                    }}
                    className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg active:scale-95 transition cursor-pointer"
                    title="Actions"
                  >
                    <MoreVertical size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs">
            No transactions found matching criteria.
          </div>
        )}
      </div>

      {/* 3. TRANSACTION DETAIL BOTTOM SHEET (TAP ON CARD) */}
      {detailTxn && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span className="text-xs font-normal text-slate-400 tabular-numbers">
                  #{detailTxn.sequenceNumber}
                </span>
                <h4 className="font-semibold text-sm text-slate-900 truncate">
                  {detailTxn.description}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDetailTxn(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Amount & Classification */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <span
                className={`text-xl sm:text-2xl font-semibold tabular-numbers block ${
                  detailTxn.status === 'REVERSED'
                    ? 'text-slate-400 line-through'
                    : detailTxn.type === 'EXPENSE'
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              >
                {detailTxn.type === 'EXPENSE' ? '-' : '+'}{formatINR(detailTxn.amount)}
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                {getCategoryLabel(detailTxn.type)} · {getModeLabel(detailTxn.mode)}
              </span>
            </div>

            {/* Details List */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Timestamp</span>
                <span className="text-slate-700 font-medium">
                  {formatShortDateTime(detailTxn.timestamp)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Status</span>
                <span className={`font-medium ${detailTxn.status === 'REVERSED' ? 'text-purple-600' : 'text-emerald-600'}`}>
                  {detailTxn.status === 'REVERSED' ? 'Reversed / Undone' : 'Active Ledger Entry'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Source</span>
                <span className="text-slate-700 font-medium flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wide ${
                      (detailTxn.source || 'TEL') === 'TEL'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200/70'
                        : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                    }`}
                  >
                    {detailTxn.source || 'TEL'}
                  </span>
                  <span>{(detailTxn.source || 'TEL') === 'TEL' ? 'Telegram Webhook' : 'Web Admin'}</span>
                </span>
              </div>

              {detailTxn.metadata?.memberName && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-normal">Member</span>
                  <span className="text-slate-700 font-medium">{detailTxn.metadata.memberName}</span>
                </div>
              )}

              {detailTxn.metadata?.buildingCode && detailTxn.metadata?.flatNo && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-normal">Flat</span>
                  <span className="text-slate-700 font-medium">
                    {detailTxn.metadata.buildingCode}-{detailTxn.metadata.flatNo}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {detailTxn.status !== 'REVERSED' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailTxn;
                    setDetailTxn(null);
                    setEditingTxn(target);
                    setEditAmount(String(target.amount));
                    setEditDesc(target.description);
                    setEditMode(target.mode);
                  }}
                  className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerUndo(detailTxn)}
                  className="py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-medium active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Undo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. THREE-DOTS ACTION SHEET (⋯ TAP) */}
      {actionMenuTxn && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-2 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-700 truncate pr-2">
                #{actionMenuTxn.sequenceNumber} · {actionMenuTxn.description}
              </span>
              <button
                type="button"
                onClick={() => setActionMenuTxn(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = actionMenuTxn;
                  setActionMenuTxn(null);
                  setEditingTxn(target);
                  setEditAmount(String(target.amount));
                  setEditDesc(target.description);
                  setEditMode(target.mode);
                }}
                className="w-full p-2.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition cursor-pointer"
              >
                <Edit2 size={14} className="text-slate-500" />
                <span>Edit Transaction</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerUndo(actionMenuTxn)}
                className="w-full p-2.5 rounded-xl text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Undo / Reverse (#{actionMenuTxn.sequenceNumber} undo)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FILTER BOTTOM SHEET */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Filter Transactions</h4>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Payment Mode Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Payment Mode
              </span>
              <div className="space-y-1 text-xs">
                {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModeFilter(m);
                    }}
                    className={`w-full p-2 rounded-xl text-left font-medium flex items-center justify-between transition cursor-pointer ${
                      modeFilter === m
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{m === 'ALL' ? 'All Modes (UPI & Cash)' : m === 'ONLINE' ? 'UPI Only (Online)' : 'Cash Only (Offline)'}</span>
                    {modeFilter === m && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Origin Channel / Source Filter (TEL vs WEB) */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Origin / Channel
              </span>
              <div className="space-y-1 text-xs">
                {(['ALL', 'TEL', 'WEB'] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setSourceFilter(src);
                    }}
                    className={`w-full p-2 rounded-xl text-left font-medium flex items-center justify-between transition cursor-pointer ${
                      sourceFilter === src
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{src === 'ALL' ? 'All Channels (Telegram & Web)' : src === 'TEL' ? 'TEL (Telegram Bot)' : 'WEB (Website Admin)'}</span>
                    {sourceFilter === src && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL: New Transaction */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">New Transaction</h4>
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Category</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['MEMBER', 'BUILDING', 'CHANDA', 'EXPENSE'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEntryType(type)}
                      className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                        entryType === type ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {type === 'MEMBER' && 'Member'}
                      {type === 'BUILDING' && 'Flat'}
                      {type === 'CHANDA' && 'Chanda'}
                      {type === 'EXPENSE' && 'Expense'}
                    </button>
                  ))}
                </div>
              </div>

              {entryType === 'MEMBER' && (
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Member</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {entryType === 'BUILDING' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Wing</label>
                    <select
                      value={selectedWingCode}
                      onChange={(e) => setSelectedWingCode(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    >
                      {buildings.map(b => (
                        <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Flat No</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 101"
                      value={selectedFlatNo}
                      onChange={(e) => setSelectedFlatNo(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-600 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold tabular-numbers text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryMode('ONLINE')}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      entryMode === 'ONLINE' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Smartphone size={13} />
                    <span>UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode('OFFLINE')}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      entryMode === 'OFFLINE' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Banknote size={13} />
                    <span>Cash</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Entry Channel / Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntrySource('WEB')}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      entrySource === 'WEB' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span>WEB (Website)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntrySource('TEL')}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      entrySource === 'TEL' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span>TEL (Telegram)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Donor name or expense item"
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Edit Transaction */}
      {editingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">
                Edit #{editingTxn.sequenceNumber}
              </h4>
              <button
                type="button"
                onClick={() => setEditingTxn(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold tabular-numbers text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode('ONLINE')}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                      editMode === 'ONLINE' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode('OFFLINE')}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                      editMode === 'OFFLINE' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Cash
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTxn(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Save In-Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
