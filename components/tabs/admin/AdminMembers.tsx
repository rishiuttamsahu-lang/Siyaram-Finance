'use client';

import React, { useState } from 'react';
import { Member, Season, Transaction } from '../../../lib/types';
import { formatINR, computeMemberDue } from '../../../lib/finance';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  History,
  MoreVertical,
  Edit2,
  PauseCircle,
  PlayCircle,
  Plus
} from 'lucide-react';

interface AdminMembersProps {
  season: Season;
  members: Member[];
  transactions: Transaction[];
  onAddMember: (name: string, quota: number, isHonorary: boolean) => void;
  onUpdateMember?: (updated: Member) => void;
  onDeleteMember?: (memberId: string) => void;
  isAddModalOpen?: boolean;
  setIsAddModalOpen?: (open: boolean) => void;
}

export const AdminMembers: React.FC<AdminMembersProps> = ({
  season,
  members,
  transactions,
  onAddMember,
  onUpdateMember,
  isAddModalOpen: externalIsAddOpen,
  setIsAddModalOpen: externalSetIsAddOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DUE' | 'HONORARY' | 'PAUSED'>('ALL');

  // Add Member Modal
  const [internalIsAddOpen, setInternalIsAddOpen] = useState(false);
  const isAddOpen = externalIsAddOpen !== undefined ? externalIsAddOpen : internalIsAddOpen;
  const setAddOpen = externalSetIsAddOpen !== undefined ? externalSetIsAddOpen : setInternalIsAddOpen;

  const [newName, setNewName] = useState('');
  const [newQuota, setNewQuota] = useState('200');
  const [newHonorary, setNewHonorary] = useState(false);

  // Edit Member Modal
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrevPending, setEditPrevPending] = useState('0');

  // Member Action Sheet (•••)
  const [actionSheetMember, setActionSheetMember] = useState<Member | null>(null);

  // Member Payment History Drawer
  const [selectedHistoryMember, setSelectedHistoryMember] = useState<Member | null>(null);

  // Compute live dues for all members
  const memberDues = members.map(m => computeMemberDue(m, season));

  // Filtered members list
  const filteredDues = memberDues.filter((due) => {
    const member = members.find(m => m.id === due.memberId);
    if (!member) return false;

    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return !member.isHonorary && !member.isPaused;
    if (statusFilter === 'DUE') return due.totalPending > 0;
    if (statusFilter === 'HONORARY') return member.isHonorary;
    if (statusFilter === 'PAUSED') return member.isPaused;
    return true;
  });

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const quota = parseInt(newQuota, 10) || 200;
    onAddMember(newName.trim(), quota, newHonorary);
    setAddOpen(false);
    setNewName('');
    setNewHonorary(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !onUpdateMember) return;
    const updated: Member = {
      ...editingMember,
      name: editName.trim() || editingMember.name,
      previousYearPending: parseInt(editPrevPending, 10) || 0,
    };
    onUpdateMember(updated);
    setEditingMember(null);
  };

  const handleTogglePause = (member: Member) => {
    if (!onUpdateMember) return;
    onUpdateMember({
      ...member,
      isPaused: !member.isPaused,
    });
    setActionSheetMember(null);
  };

  return (
    <div className="space-y-3">
      {/* 1. Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search member..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* 2. Horizontal Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {(['ALL', 'ACTIVE', 'DUE', 'HONORARY', 'PAUSED'] as const).map((filter) => {
          const count = filter === 'ALL' ? members.length :
            filter === 'ACTIVE' ? members.filter(m => !m.isHonorary && !m.isPaused).length :
            filter === 'DUE' ? memberDues.filter(d => d.totalPending > 0).length :
            filter === 'HONORARY' ? members.filter(m => m.isHonorary).length :
            members.filter(m => m.isPaused).length;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition shrink-0 active:scale-95 ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>{filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : filter === 'DUE' ? 'Due' : filter === 'HONORARY' ? 'Honorary' : 'Paused'}</span>
              <span className="text-[10px] opacity-70 ml-1">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Compact Member List (Mobile-First) */}
      <div className="space-y-2">
        {filteredDues.map((due) => {
          const member = members.find(m => m.id === due.memberId);
          if (!member) return null;

          const isCleared = due.totalPending === 0 && !member.isHonorary;

          return (
            <div
              key={member.id}
              className="glass-card rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between transition hover:border-slate-300"
            >
              {/* Left: Avatar + Name + Status + Compact Metrics */}
              <div
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedHistoryMember(member)}
              >
                {/* 2-Letter Avatar */}
                <div className="w-8 h-8 rounded-xl bg-slate-100 font-semibold text-xs text-slate-700 flex items-center justify-center shrink-0">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Name & Subtitle */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                      {member.name}
                    </span>
                    {member.isHonorary && (
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                        Honorary
                      </span>
                    )}
                    {member.isPaused && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                        Paused
                      </span>
                    )}
                  </div>

                  {/* Single Clean Sub-line */}
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">
                    {member.isHonorary ? (
                      <span className="text-emerald-700 font-medium">✓ No dues</span>
                    ) : (
                      <span>
                        Prev ₹{due.previousYearPending.toLocaleString()} · Paid ₹{due.currentSeasonPaid.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Due Status + ••• Menu */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="text-right">
                  {member.isHonorary ? (
                    <span className="text-xs font-semibold text-slate-400">—</span>
                  ) : isCleared ? (
                    <span className="text-xs font-semibold text-emerald-700">✓ Cleared</span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-800 tabular-numbers">
                      {formatINR(due.totalPending)} due
                    </span>
                  )}
                </div>

                {/* Single ••• Action Button */}
                <button
                  type="button"
                  onClick={() => setActionSheetMember(member)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                  title="Member options"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredDues.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 glass-card rounded-2xl border border-slate-200/80 space-y-1">
            <p className="font-semibold text-slate-700">
              {members.length === 0 ? 'No members added yet' : `No members found matching "${searchQuery}"`}
            </p>
            <p className="text-[11px] text-slate-400">
              {members.length === 0 ? 'Tap "+ Add" or deploy Mandal Snapshot to enroll members.' : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        )}
      </div>

      {/* ACTION SHEET (••• Tap Modal) */}
      {actionSheetMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-semibold text-sm text-slate-900">{actionSheetMember.name}</h4>
                <p className="text-[11px] text-slate-400">
                  {actionSheetMember.isHonorary ? 'Honorary Member' : actionSheetMember.isPaused ? 'Collection Paused' : 'Active Member'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionSheetMember(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  const m = actionSheetMember;
                  setActionSheetMember(null);
                  setSelectedHistoryMember(m);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <History size={14} className="text-slate-500" />
                  <span>View Ledger</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const m = actionSheetMember;
                  setActionSheetMember(null);
                  setEditingMember(m);
                  setEditName(m.name);
                  setEditPrevPending(String(m.previousYearPending || 0));
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Edit2 size={14} className="text-slate-500" />
                  <span>Edit Name / Previous Pending</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleTogglePause(actionSheetMember)}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {actionSheetMember.isPaused ? (
                    <PlayCircle size={14} className="text-emerald-600" />
                  ) : (
                    <PauseCircle size={14} className="text-amber-600" />
                  )}
                  <span>{actionSheetMember.isPaused ? 'Resume Collection' : 'Pause Collection'}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {actionSheetMember.isPaused ? 'Currently Paused' : 'Active'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Member</h4>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Default Quota (₹/month)</label>
                <input
                  type="number"
                  required
                  value={newQuota}
                  onChange={(e) => setNewQuota(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newHonoraryCheck"
                  checked={newHonorary}
                  onChange={(e) => setNewHonorary(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900"
                />
                <label htmlFor="newHonoraryCheck" className="text-slate-700 font-medium">
                  Honorary member (no regular dues)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Edit Member</h4>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Member Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Previous Year Pending (₹)</label>
                <input
                  type="number"
                  value={editPrevPending}
                  onChange={(e) => setEditPrevPending(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER PAYMENT LEDGER DRAWER */}
      {selectedHistoryMember && (() => {
        const memberTxns = transactions.filter(
          t => t.type === 'MEMBER' && t.metadata?.memberId === selectedHistoryMember.id
        );
        const dueInfo = computeMemberDue(selectedHistoryMember, season);

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">{selectedHistoryMember.name}</h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    {dueInfo.totalPending > 0 ? `₹${dueInfo.totalPending.toLocaleString()} due` : '✓ All Cleared'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryMember(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 text-xs">
                {memberTxns.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    No payment transactions recorded for this member yet.
                  </div>
                ) : (
                  memberTxns.map((t) => (
                    <div key={t.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">#{t.sequenceNumber} {t.description}</span>
                        <span className="block text-[10px] text-slate-400">{t.timestamp.slice(0, 10)} • {t.mode}</span>
                      </div>
                      <span className="font-semibold text-emerald-700 tabular-numbers">
                        +{formatINR(t.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
