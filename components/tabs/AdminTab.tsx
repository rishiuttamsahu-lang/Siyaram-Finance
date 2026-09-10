'use client';

import React, { useState } from 'react';
import { Season, Member, Building, Transaction, AuditLog } from '../../lib/types';
import { 
  LayoutDashboard,
  Calendar, 
  Users, 
  CalendarRange,
  Building2, 
  Receipt,
  RefreshCw,
  ShieldCheck,
  History,
  Plus,
  Sparkles
} from 'lucide-react';


import { AdminDashboard } from './admin/AdminDashboard';
import { SeasonsManager } from './SeasonsManager';
import { AdminMembers } from './admin/AdminMembers';
import { AdminMonthlyDues } from './admin/AdminMonthlyDues';
import { AdminBuildings } from './admin/AdminBuildings';
import { AdminTransactions } from './admin/AdminTransactions';
import { AdminSyncData } from './admin/AdminSyncData';
import { AdminUsersAudit } from './admin/AdminUsersAudit';
import { AdminLogs } from './admin/AdminLogs';

interface AdminTabProps {
  season: Season;
  members: Member[];
  buildings: Building[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onAddMember: (name: string, quota: number, isHonorary: boolean) => void;
  onToggleBlockMonth: (month: string) => void;
  onRolloverSeason: (newSeasonId: string, startDate: string, endDate: string) => void;
  onUndoTransaction?: (txn: Transaction) => void;
  onAddTransaction?: (txn: Omit<Transaction, 'id' | 'sequenceNumber'>) => void;
  onEditTransaction?: (txnId: string, updatedFields: Partial<Transaction>) => void;
  onAddMonth?: (month: string) => void;
  onDeleteMonth?: (month: string) => void;
  onUpdateDefaultQuota?: (newQuota: number) => void;
  onSetMemberMonthOverride?: (memberId: string, month: string, amount: number | null) => void;
  onOpenSnapshotModal?: () => void;
}

export type AdminSubTab = 
  | 'dashboard' 
  | 'seasons' 
  | 'members' 
  | 'dues' 
  | 'buildings' 
  | 'transactions' 
  | 'sync' 
  | 'users' 
  | 'logs';

export const AdminTab: React.FC<AdminTabProps> = ({
  season,
  members,
  buildings,
  transactions,
  auditLogs,
  isAdmin,
  onToggleAdmin,
  onAddMember,
  onToggleBlockMonth,
  onRolloverSeason,
  onUndoTransaction,
  onAddTransaction,
  onEditTransaction,
  onAddMonth,
  onDeleteMonth,
  onUpdateDefaultQuota,
  onSetMemberMonthOverride,
  onOpenSnapshotModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('dashboard');

  // Trigger modal flags for contextual header plus button
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddWingModalOpen, setIsAddWingModalOpen] = useState(false);
  const [isAddTxnModalOpen, setIsAddTxnModalOpen] = useState(false);
  const [syncTriggerTime, setSyncTriggerTime] = useState<number>(0);

  const adminTabs: { id: AdminSubTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'seasons', label: 'Seasons', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'dues', label: 'Dues', icon: CalendarRange },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'sync', label: 'Sync & Data', icon: RefreshCw },
    { id: 'users', label: 'Users & Access', icon: ShieldCheck },
    { id: 'logs', label: 'Logs & Activity', icon: History },
  ];

  // Contextual titles and subtitles for each tab
  const getTabHeader = () => {
    switch (activeSubTab) {
      case 'seasons':
        return { title: 'Seasons', subtitle: '' };
      case 'members':
        return { title: 'Members', subtitle: `${members.length} members` };
      case 'dashboard':
        return { title: 'Dashboard', subtitle: '' };
      case 'dues':
        return { title: 'Monthly Dues', subtitle: '' };
      case 'buildings':
        return { title: 'Buildings', subtitle: '' };
      case 'transactions':
        return { title: 'Transactions', subtitle: '' };
      case 'sync':
        return { title: 'Sync & Data', subtitle: '' };
      case 'users':
        return { title: 'Users & Access', subtitle: '' };
      case 'logs':
        return { title: 'Logs & Activity', subtitle: '' };
      default:
        return { title: 'Admin', subtitle: '' };
    }
  };

  const headerInfo = getTabHeader();

  return (
    <div className="space-y-3 pb-28">
      {/* Database Empty Banner / Snapshot Deploy CTA */}
      {(!season.id || members.length === 0) && onOpenSnapshotModal && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">Firestore is Empty</h4>
              <p className="text-[11px] text-slate-600">Deploy Mandal Snapshot with Previous Balance & Entities in 1 click.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSnapshotModal}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Deploy Snapshot</span>
          </button>
        </div>
      )}

      {/* Clean Mobile-First Header */}
      <div className="rounded-2xl p-3 sm:p-4 border transition-all glass-card border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base sm:text-lg text-slate-900">
              {headerInfo.title}
            </h3>
            {headerInfo.subtitle && (
              <span className="text-xs text-slate-500 font-normal">
                · {headerInfo.subtitle}
              </span>
            )}
          </div>

          {/* Contextual Action Button */}
          {activeSubTab === 'dashboard' && onOpenSnapshotModal && (
            <button
              type="button"
              onClick={onOpenSnapshotModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Snapshot</span>
            </button>
          )}

          {activeSubTab === 'seasons' && (
            <button
              type="button"
              onClick={() => setIsNewSeasonModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>New</span>
            </button>
          )}

          {activeSubTab === 'members' && (
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          )}

          {activeSubTab === 'buildings' && (
            <button
              type="button"
              onClick={() => setIsAddWingModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          )}

          {activeSubTab === 'transactions' && (
            <button
              type="button"
              onClick={() => setIsAddTxnModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>New</span>
            </button>
          )}

          {activeSubTab === 'sync' && (
            <button
              type="button"
              onClick={() => setSyncTriggerTime(Date.now())}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Sync All</span>
            </button>
          )}

          {activeSubTab === 'dashboard' && (
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('transactions');
                setIsAddTxnModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>Record</span>
            </button>
          )}
        </div>
      </div>

      {/* 9-Tab Navigation Bar (Compact & Mobile-First) */}
      <div className="glass-card-subtle p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar shadow-xs">
        <div className="flex items-center gap-1 min-w-max">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition whitespace-nowrap active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Dashboard Tab */}
      {activeSubTab === 'dashboard' && (
        <AdminDashboard
          season={season}
          members={members}
          buildings={buildings}
          transactions={transactions}
          auditLogs={auditLogs}
          onNavigateTab={(tabId) => setActiveSubTab(tabId as AdminSubTab)}
        />
      )}

      {/* 2. Seasons Tab */}
      {activeSubTab === 'seasons' && (
        <SeasonsManager
          season={season}
          members={members}
          buildings={buildings}
          transactions={transactions}
          auditLogs={auditLogs}
          isAdmin={isAdmin}
          onRolloverSeason={onRolloverSeason}
          isCreateModalOpen={isNewSeasonModalOpen}
          setIsCreateModalOpen={setIsNewSeasonModalOpen}
          onNavigateTab={(tabId) => setActiveSubTab(tabId as AdminSubTab)}
        />
      )}

      {/* 3. Members Tab */}
      {activeSubTab === 'members' && (
        <AdminMembers
          season={season}
          members={members}
          transactions={transactions}
          onAddMember={onAddMember}
          isAddModalOpen={isAddMemberModalOpen}
          setIsAddModalOpen={setIsAddMemberModalOpen}
        />
      )}

      {/* 4. Monthly Dues Tab */}
      {activeSubTab === 'dues' && (
        <AdminMonthlyDues
          season={season}
          members={members}
          onToggleBlockMonth={onToggleBlockMonth}
          onAddMonth={onAddMonth}
          onDeleteMonth={onDeleteMonth}
          onUpdateDefaultQuota={onUpdateDefaultQuota}
          onSetMemberMonthOverride={onSetMemberMonthOverride}
        />
      )}

      {/* 5. Buildings Tab */}
      {activeSubTab === 'buildings' && (
        <AdminBuildings
          buildings={buildings}
          isAddWingModalOpen={isAddWingModalOpen}
          setIsAddWingModalOpen={setIsAddWingModalOpen}
        />
      )}

      {/* 6. Transactions Tab */}
      {activeSubTab === 'transactions' && (
        <AdminTransactions
          season={season}
          members={members}
          buildings={buildings}
          transactions={transactions}
          onAddTransaction={onAddTransaction}
          onEditTransaction={onEditTransaction}
          onUndoTransaction={onUndoTransaction}
          isAddModalOpen={isAddTxnModalOpen}
          setIsAddModalOpen={setIsAddTxnModalOpen}
        />
      )}

      {/* 7. Sync & Data Tab */}
      {activeSubTab === 'sync' && (
        <AdminSyncData
          season={season}
          members={members}
          buildings={buildings}
          transactions={transactions}
          auditLogs={auditLogs}
          syncTriggerTime={syncTriggerTime}
        />
      )}

      {/* 8. Users & Access Tab */}
      {activeSubTab === 'users' && (
        <AdminUsersAudit />
      )}

      {/* 9. System Logs / Activity Tab */}
      {activeSubTab === 'logs' && (
        <AdminLogs
          auditLogs={auditLogs}
          transactions={transactions}
        />
      )}
    </div>
  );
};
