'use client';

import React, { useState } from 'react';
import { Season, Member, Building, Transaction, AuditLog } from '../../lib/types';
import {
  Users,
  Building2,
  Calendar,
  CalendarRange,
  Receipt,
  RefreshCw,
  ShieldCheck,
  History,
  LayoutDashboard,
  Plus
} from 'lucide-react';
import { SeasonsManager } from './SeasonsManager';
import { AdminDashboard } from './admin/AdminDashboard';
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
  onAddMember: (name: string, isHonorary: boolean) => void;
  onBulkAddMembers?: (members: { name: string; isHonorary: boolean }[]) => void;
  onUpdateMember?: (updated: Member) => void;
  onDeleteMember?: (memberId: string) => void;
  onAddBuilding?: (name: string, code: string) => void;
  onUpdateBuilding?: (updatedBuilding: Building) => void;
  onDeleteBuilding?: (buildingId: string) => void;
  onAddFloor?: (buildingId: string, floorName: string) => void;
  onAddFlat?: (buildingId: string, floorName: string, flatNo: string, residentName: string) => void;
  onUpdateFlat?: (buildingId: string, flatNo: string, residentName: string, amount: number, isPaid: boolean) => void;
  onDeleteFlat?: (buildingId: string, floorName: string, flatNo: string) => void;
  onToggleBlockMonth: (month: string) => void;
  onRolloverSeason: (newSeasonId: string, startDate: string, endDate: string) => void;
  onUndoTransaction?: (txn: Transaction) => void;
  onAddTransaction?: (txn: Omit<Transaction, 'id' | 'sequenceNumber'>) => void;
  onEditTransaction?: (txnId: string, updatedFields: Partial<Transaction>) => void;
  onAddMonth?: (month: string, amount?: number) => void;
  onDeleteMonth?: (month: string) => void;
  onUpdateDefaultQuota?: (newQuota: number) => void;
  onUpdateMonthQuota?: (month: string, amount: number) => void;
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
  onBulkAddMembers,
  onUpdateMember,
  onDeleteMember,
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
  onAddFloor,
  onAddFlat,
  onUpdateFlat,
  onDeleteFlat,
  onToggleBlockMonth,
  onRolloverSeason,
  onUndoTransaction,
  onAddTransaction,
  onEditTransaction,
  onAddMonth,
  onDeleteMonth,
  onUpdateDefaultQuota,
  onUpdateMonthQuota,
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* 1. Admin Dashboard (Summary & Analytics) */}
      {activeSubTab === 'dashboard' && (
        <AdminDashboard
          season={season}
          members={members}
          buildings={buildings}
          transactions={transactions}
          auditLogs={auditLogs}
          onNavigateTab={(tabId: string) => setActiveSubTab(tabId as AdminSubTab)}
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
          onNavigateTab={(tabId: string) => setActiveSubTab(tabId as AdminSubTab)}
        />
      )}

      {/* 3. Members Tab */}
      {activeSubTab === 'members' && (
        <AdminMembers
          season={season}
          members={members}
          transactions={transactions}
          onAddMember={onAddMember}
          onBulkAddMembers={onBulkAddMembers}
          onUpdateMember={onUpdateMember}
          onDeleteMember={onDeleteMember}
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
          onUpdateMonthQuota={onUpdateMonthQuota}
          onSetMemberMonthOverride={onSetMemberMonthOverride}
        />
      )}

      {/* 5. Buildings Tab */}
      {activeSubTab === 'buildings' && (
        <AdminBuildings
          buildings={buildings}
          onAddBuilding={onAddBuilding}
          onUpdateBuilding={onUpdateBuilding}
          onDeleteBuilding={onDeleteBuilding}
          onAddFloor={onAddFloor}
          onAddFlat={onAddFlat}
          onUpdateFlat={onUpdateFlat}
          onDeleteFlat={onDeleteFlat}
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
