'use client';

import React, { useState } from 'react';
import { Season, Member } from '../../../lib/types';
import { formatINR } from '../../../lib/finance';
import {
  Info,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Calendar,
  Check,
  RotateCcw,
  Search
} from 'lucide-react';

interface AdminMonthlyDuesProps {
  season: Season;
  members: Member[];
  onToggleBlockMonth: (month: string) => void;
  onAddMonth?: (month: string, amount?: number) => void;
  onDeleteMonth?: (month: string) => void;
  onUpdateDefaultQuota?: (newQuota: number) => void;
  onUpdateMonthQuota?: (month: string, amount: number) => void;
  onSetMemberMonthOverride?: (memberId: string, month: string, amount: number | null) => void;
}

export const AdminMonthlyDues: React.FC<AdminMonthlyDuesProps> = ({
  season,
  members,
  onToggleBlockMonth,
  onAddMonth,
  onDeleteMonth,
  onUpdateDefaultQuota,
  onUpdateMonthQuota,
  onSetMemberMonthOverride,
}) => {
  const [globalQuota, setGlobalQuota] = useState(String(season.defaultMonthlyQuota || 200));
  const [isSavedGlobal, setIsSavedGlobal] = useState(false);

  // Expanded member ID for the member dropdown
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Search filter for members
  const [memberSearch, setMemberSearch] = useState('');

  // Add Month Modal state
  const [isAddMonthModalOpen, setIsAddMonthModalOpen] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState('');
  const [newMonthAmount, setNewMonthAmount] = useState(String(season.defaultMonthlyQuota || 200));

  // Edit Month Quota Modal state (for any month in schedule)
  const [editingMonthQuota, setEditingMonthQuota] = useState<{
    month: string;
    amount: string;
  } | null>(null);

  // Delete Month Confirmation state
  const [monthToDelete, setMonthToDelete] = useState<string | null>(null);

  // Edit Member Month Due Modal state
  const [editingTarget, setEditingTarget] = useState<{
    member: Member;
    month: string;
  } | null>(null);
  const [overrideInput, setOverrideInput] = useState<string>('200');

  // Helper to format YYYY-MM to readable labels
  const formatMonthLabel = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return {
        short: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        year: y,
        full: `${date.toLocaleString('en-US', { month: 'short' })} ${y}`,
        monthLong: date.toLocaleString('en-US', { month: 'long' }),
      };
    } catch {
      return { short: mStr, year: '', full: mStr, monthLong: mStr };
    }
  };

  // Compute default next month string for Add Month dialog
  const getSuggestedNextMonth = () => {
    if (!season.months || season.months.length === 0) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const sorted = [...season.months].sort();
    const lastMonth = sorted[sorted.length - 1];
    const [y, m] = lastMonth.split('-').map(v => parseInt(v, 10));
    const nextDate = new Date(y, m, 1); // m is 1-indexed, so Date(y, m, 1) gives next month
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
    return `${nextY}-${nextM}`;
  };

  const handleOpenAddMonth = () => {
    setNewMonthInput(getSuggestedNextMonth());
    setNewMonthAmount(String(season.defaultMonthlyQuota || 200));
    setIsAddMonthModalOpen(true);
  };

  const handleConfirmAddMonth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthInput) return;
    const amt = parseInt(newMonthAmount, 10) || season.defaultMonthlyQuota || 200;
    if (onAddMonth) {
      onAddMonth(newMonthInput, amt);
    }
    setIsAddMonthModalOpen(false);
  };

  const handleSaveMonthQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonthQuota) return;
    const amt = parseInt(editingMonthQuota.amount, 10);
    if (isNaN(amt) || amt < 0) return;
    if (onUpdateMonthQuota) {
      onUpdateMonthQuota(editingMonthQuota.month, amt);
    }
    setEditingMonthQuota(null);
  };

  const handleConfirmDeleteMonth = () => {
    if (monthToDelete && onDeleteMonth) {
      onDeleteMonth(monthToDelete);
    }
    setMonthToDelete(null);
  };

  const handleSaveGlobalQuota = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(globalQuota, 10) || 200;
    if (onUpdateDefaultQuota) {
      onUpdateDefaultQuota(val);
    }
    setIsSavedGlobal(true);
    setTimeout(() => setIsSavedGlobal(false), 2000);
  };

  const handleOpenEditMemberDue = (member: Member, month: string) => {
    const hasOverride = member.monthlyOverrides && member.monthlyOverrides[month] !== undefined;
    const currentVal = hasOverride
      ? member.monthlyOverrides[month]
      : member.isHonorary || season.blockedMonths.includes(month)
      ? 0
      : season.defaultMonthlyQuota;

    setEditingTarget({ member, month });
    setOverrideInput(String(currentVal));
  };

  const handleSaveMemberDue = (amount: number | null) => {
    if (!editingTarget || !onSetMemberMonthOverride) return;
    onSetMemberMonthOverride(editingTarget.member.id, editingTarget.month, amount);
    setEditingTarget(null);
  };

  // Filter members by search
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase().trim())
  );

  return (
    <div className="space-y-3">
      {/* 1. Rule strip */}
      <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
        <Info size={13} className="text-slate-500 shrink-0" />
        <span>Due calculated up to current month ({formatMonthLabel(season.liveMonth).full})</span>
      </div>

      {/* 2. Default Monthly Amount */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs font-semibold text-slate-900 block">
              Default Monthly Amount
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Base quota applied to all regular members
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveGlobalQuota} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[150px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
            <input
              type="number"
              value={globalQuota}
              onChange={(e) => setGlobalQuota(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 tabular-numbers focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          >
            {isSavedGlobal ? 'Saved ✓' : 'Save'}
          </button>
        </form>
      </div>

      {/* 3. Months Schedule (With Add Month & Delete Month) */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-900 block">
              Months Schedule
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {season.months.length} Months configured
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddMonth}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-medium shadow-2xs hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          >
            <Plus size={12} />
            <span>Add Month</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {season.months.map((m) => {
            const isBlocked = season.blockedMonths.includes(m);
            const isLive = m === season.liveMonth;
            const { short, year } = formatMonthLabel(m);
            const monthAmount = season.monthQuotas?.[m] !== undefined
              ? season.monthQuotas[m]
              : (season.defaultMonthlyQuota || 200);

            return (
              <div
                key={m}
                className="py-2 px-1 flex items-center justify-between text-xs hover:bg-slate-50/60 rounded-xl transition"
              >
                {/* Left: Month Label & Live indicator */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 w-9">
                    {short}
                  </span>
                  <span className="text-[11px] text-slate-400 w-10">
                    {year}
                  </span>
                  {isLive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>

                {/* Right: Target (Click to Edit), Block toggle & Delete */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMonthQuota({ month: m, amount: String(monthAmount) })}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-semibold tabular-numbers transition cursor-pointer active:scale-95 group ${
                      isBlocked
                        ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200/70'
                        : 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                    }`}
                    title={`Click to edit quota for ${short} ${year}`}
                  >
                    <span>{isBlocked ? '₹0' : `₹${monthAmount}`}</span>
                    <Edit2 size={10} className="text-emerald-600 group-hover:text-emerald-800 transition" />
                  </button>

                  {/* Block / Unblock Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleBlockMonth(m)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 cursor-pointer transition ${
                      isBlocked
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/80'
                    }`}
                    title={isBlocked ? 'Click to unblock' : 'Click to block'}
                  >
                    {isBlocked ? <Lock size={10} /> : <Unlock size={10} />}
                    <span>{isBlocked ? 'Blocked' : 'Active'}</span>
                  </button>

                  {/* Delete Month Button */}
                  <button
                    type="button"
                    onClick={() => setMonthToDelete(m)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition cursor-pointer active:scale-90"
                    title={`Delete ${short} ${year}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {season.months.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400">
              No months added yet. Tap "+ Add Month" to configure schedule.
            </div>
          )}
        </div>
      </div>

      {/* 4. Member Monthly Quotas & Dropdown Workflow */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-900 block">
              Member Monthly Quotas
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Tap any member to view & customize their monthly dues
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 tabular-numbers">
            {members.length} Members
          </span>
        </div>

        {/* Quick Search Member */}
        <div className="relative pt-0.5">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        {/* Members Accordion List */}
        <div className="space-y-1.5 pt-1">
          {filteredMembers.map((member) => {
            const isExpanded = expandedMemberId === member.id;
            const overridesCount = Object.keys(member.monthlyOverrides || {}).length;

            return (
              <div
                key={member.id}
                className={`rounded-xl border transition ${
                  isExpanded
                    ? 'border-slate-300 bg-slate-50/50 shadow-xs'
                    : 'border-slate-100/90 bg-white hover:bg-slate-50/70'
                }`}
              >
                {/* Member Header (Tappable Row) */}
                <div
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  className="p-2.5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div>
                    <span className="font-medium text-xs text-slate-900 block">
                      {member.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {member.isHonorary ? (
                        <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                          Honorary (₹0)
                        </span>
                      ) : overridesCount > 0 ? (
                        <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                          {overridesCount} Custom {overridesCount === 1 ? 'Month' : 'Months'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-normal text-slate-400">
                          Default (₹{globalQuota}/mo)
                        </span>
                      )}
                      {member.isPaused && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          Paused
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-700">
                      {member.isHonorary
                        ? '₹0'
                        : `₹${
                            member.monthlyOverrides?.[season.liveMonth] ??
                            (season.monthQuotas?.[season.liveMonth] !== undefined
                              ? season.monthQuotas[season.liveMonth]
                              : season.defaultMonthlyQuota)
                          }`}
                    </span>
                    <div
                      className={`p-1 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* Dropdown Content: Months for this Member */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-1 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider px-1">
                      <span>Month</span>
                      <span>Due Amount</span>
                    </div>

                    <div className="space-y-1">
                      {season.months.map((m) => {
                        const hasOverride = member.monthlyOverrides && member.monthlyOverrides[m] !== undefined;
                        const customVal = hasOverride ? member.monthlyOverrides[m] : null;
                        const isBlocked = season.blockedMonths.includes(m);
                        const isLive = m === season.liveMonth;
                        const { short, year } = formatMonthLabel(m);

                        // Per-month quota from Months Schedule (falls back to default)
                        const monthScheduleQuota =
                          season.monthQuotas?.[m] !== undefined
                            ? season.monthQuotas[m]
                            : season.defaultMonthlyQuota;

                        // Effective due for this member in month m
                        let effectiveDue = monthScheduleQuota;
                        let statusTag = 'Default';
                        let tagColor = 'text-slate-400 bg-slate-100';

                        if (member.isHonorary) {
                          effectiveDue = 0;
                          statusTag = 'Honorary';
                          tagColor = 'text-indigo-700 bg-indigo-50';
                        } else if (isBlocked) {
                          effectiveDue = 0;
                          statusTag = 'Blocked';
                          tagColor = 'text-amber-800 bg-amber-50';
                        } else if (customVal !== null) {
                          // Member has an explicit personal override for this month
                          effectiveDue = customVal;
                          statusTag = customVal === 0 ? 'Exempt (₹0)' : 'Custom';
                          tagColor = customVal === 0 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-800 bg-amber-50';
                        }

                        return (
                          <div
                            key={m}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100/90 text-xs hover:border-slate-200 transition"
                          >
                            {/* Month & Tag */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 w-8">
                                {short}
                              </span>
                              <span className="text-[10px] text-slate-400 mr-1">
                                {year}
                              </span>
                              {isLive && (
                                <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                                  Live
                                </span>
                              )}
                              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${tagColor}`}>
                                {statusTag}
                              </span>
                            </div>

                            {/* Amount & Edit Button */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 tabular-numbers">
                                {formatINR(effectiveDue)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleOpenEditMemberDue(member, m)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer active:scale-95 transition"
                              >
                                <Edit2 size={11} />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {season.months.length === 0 && (
                        <div className="p-3 text-center text-[11px] text-slate-400">
                          No months configured above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              {members.length === 0 ? 'No members enrolled yet. Tap "+ Add" in Members tab or deploy Snapshot.' : `No members found matching "${memberSearch}".`}
            </div>
          )}
        </div>
      </div>

      {/* 5. ADD MONTH MODAL */}
      {isAddMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-700" />
                <h4 className="font-semibold text-sm text-slate-900">Add Month to Season</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMonthModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmAddMonth} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Select Month (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={newMonthInput}
                  onChange={(e) => setNewMonthInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Suggested next: {getSuggestedNextMonth()}
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Monthly Quota Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={newMonthAmount}
                    onChange={(e) => setNewMonthAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 tabular-numbers focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="200"
                    min="0"
                    step="10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMonthModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                >
                  Add Month
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE MONTH CONFIRMATION MODAL */}
      {monthToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-rose-600">
                <Trash2 size={15} />
                <h4 className="font-semibold text-sm">Delete Month</h4>
              </div>
              <button
                type="button"
                onClick={() => setMonthToDelete(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Are you sure you want to remove{' '}
                <strong className="text-slate-900">
                  {formatMonthLabel(monthToDelete).full}
                </strong>{' '}
                from the schedule?
              </p>
              <p className="text-[11px] text-slate-400">
                This will remove this month from all member dues calculations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setMonthToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMonth}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 active:scale-95 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. EDIT MEMBER MONTH DUE MODAL */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-semibold text-sm text-slate-900">
                  {editingTarget.member.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {formatMonthLabel(editingTarget.month).full} Due
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[10px] font-medium text-slate-400 block mb-1.5">
                  Quick Presets:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOverrideInput('0')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                      overrideInput === '0'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                    }`}
                  >
                    ₹0 (Exempt)
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideInput('100')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                      overrideInput === '100'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ₹100
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideInput(String(season.defaultMonthlyQuota))}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                      overrideInput === String(season.defaultMonthlyQuota)
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ₹{season.defaultMonthlyQuota} (Default)
                  </button>
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Custom Quota Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={overrideInput}
                    onChange={(e) => setOverrideInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 tabular-numbers focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Setting <strong className="text-slate-700">₹0</strong> exempts this member for this month. Any payments made will carry forward to other dues.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const val = parseInt(overrideInput, 10);
                    handleSaveMemberDue(isNaN(val) ? 0 : val);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 active:scale-98 transition cursor-pointer"
                >
                  Save Quota
                </button>

                {editingTarget.member.monthlyOverrides?.[editingTarget.month] !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleSaveMemberDue(null)}
                    className="w-full py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium flex items-center justify-center gap-1 cursor-pointer transition text-[11px]"
                  >
                    <RotateCcw size={12} />
                    <span>Reset to Default (₹{season.defaultMonthlyQuota})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. EDIT MONTH SCHEDULE QUOTA MODAL */}
      {editingMonthQuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-semibold text-sm text-slate-900">
                  Edit Month Quota
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {formatMonthLabel(editingMonthQuota.month).full} Target Dues
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMonthQuota(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMonthQuota} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Monthly Quota (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={editingMonthQuota.amount}
                    onChange={(e) =>
                      setEditingMonthQuota(prev =>
                        prev ? { ...prev, amount: e.target.value } : null
                      )
                    }
                    min="0"
                    step="10"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  This quota applies to all active members for {formatMonthLabel(editingMonthQuota.month).short}.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[10px] font-medium text-slate-400 block mb-1.5">
                  Quick Presets
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 150, 200, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setEditingMonthQuota(prev =>
                          prev ? { ...prev, amount: String(preset) } : null
                        )
                      }
                      className={`py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        editingMonthQuota.amount === String(preset)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setEditingMonthQuota(prev =>
                      prev ? { ...prev, amount: String(season.defaultMonthlyQuota || 200) } : null
                    )
                  }
                  className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Reset ({season.defaultMonthlyQuota})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMonthQuota(null)}
                    className="px-3 py-1.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
