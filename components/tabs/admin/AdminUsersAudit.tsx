'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  MoreVertical,
  X,
  Check,
  Smartphone,
  Mail,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

interface TelegramAdmin {
  id: string;
  telegramId: string;
  username: string;
  role: 'Owner' | 'Admin' | 'Collector';
  addedAt: string;
  lastCommand?: string;
}

interface WebAdmin {
  id: string;
  email: string;
  name: string;
  role: 'Super Admin' | 'Finance Admin';
  lastActive: string;
}

export const AdminUsersAudit: React.FC = () => {
  // Telegram Admin Allowlist
  const [telegramAdmins, setTelegramAdmins] = useState<TelegramAdmin[]>([]);

  // Google Web Admin Allowlist
  const [webAdmins, setWebAdmins] = useState<WebAdmin[]>([
    { id: 'wa-1', email: 'rishiuttamsahu@gmail.com', name: 'Rishi Sahu', role: 'Super Admin', lastActive: 'Active now' },
  ]);

  // Security Access Switches
  const [isPublicAccessEnabled, setIsPublicAccessEnabled] = useState(true);

  // Modals & Sheets
  const [isSessionSheetOpen, setIsSessionSheetOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<{ title: string; desc: string; status: string } | null>(null);

  // Telegram detail / actions
  const [selectedTgUser, setSelectedTgUser] = useState<TelegramAdmin | null>(null);
  const [actionMenuTgUser, setActionMenuTgUser] = useState<TelegramAdmin | null>(null);
  const [isAddTgModal, setIsAddTgModal] = useState(false);
  const [newTgId, setNewTgId] = useState('');
  const [newTgUser, setNewTgUser] = useState('');
  const [newTgRole, setNewTgRole] = useState<'Admin' | 'Collector'>('Admin');
  const [roleChangeTgUser, setRoleChangeTgUser] = useState<TelegramAdmin | null>(null);

  // Web Admin detail / actions
  const [selectedWebAdmin, setSelectedWebAdmin] = useState<WebAdmin | null>(null);
  const [actionMenuWebAdmin, setActionMenuWebAdmin] = useState<WebAdmin | null>(null);
  const [isAddWebModal, setIsAddWebModal] = useState(false);
  const [newWebEmail, setNewWebEmail] = useState('');
  const [newWebName, setNewWebName] = useState('');
  const [roleChangeWebAdmin, setRoleChangeWebAdmin] = useState<WebAdmin | null>(null);

  // Telegram Handlers
  const handleAddTgAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTgId.trim() || !newTgUser.trim()) return;
    const now = new Date();
    const month = now.toLocaleString('en-IN', { month: 'short' });
    const day = now.getDate();
    const newEntry: TelegramAdmin = {
      id: `tg-${Date.now()}`,
      telegramId: newTgId.trim(),
      username: newTgUser.startsWith('@') ? newTgUser.trim() : `@${newTgUser.trim()}`,
      role: newTgRole,
      addedAt: `${month} ${day}`,
    };
    setTelegramAdmins(prev => [...prev, newEntry]);
    setIsAddTgModal(false);
    setNewTgId('');
    setNewTgUser('');
  };

  const handleRevokeTgAdmin = (id: string) => {
    setTelegramAdmins(prev => prev.filter(a => a.id !== id));
    setActionMenuTgUser(null);
    setSelectedTgUser(null);
  };

  const handleSaveTgRoleChange = (role: 'Admin' | 'Collector') => {
    if (!roleChangeTgUser) return;
    setTelegramAdmins(prev => prev.map(a => a.id === roleChangeTgUser.id ? { ...a, role } : a));
    setRoleChangeTgUser(null);
  };

  // Web Admin Handlers
  const handleAddWebAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebEmail.trim() || !newWebName.trim()) return;
    const newEntry: WebAdmin = {
      id: `wa-${Date.now()}`,
      email: newWebEmail.trim().toLowerCase(),
      name: newWebName.trim(),
      role: 'Finance Admin',
      lastActive: 'Just added',
    };
    setWebAdmins(prev => [...prev, newEntry]);
    setIsAddWebModal(false);
    setNewWebEmail('');
    setNewWebName('');
  };

  const handleRevokeWebAdmin = (id: string) => {
    setWebAdmins(prev => prev.filter(a => a.id !== id));
    setActionMenuWebAdmin(null);
    setSelectedWebAdmin(null);
  };

  const handleSaveWebRoleChange = (role: 'Super Admin' | 'Finance Admin') => {
    if (!roleChangeWebAdmin) return;
    setWebAdmins(prev => prev.map(a => a.id === roleChangeWebAdmin.id ? { ...a, role } : a));
    setRoleChangeWebAdmin(null);
  };

  return (
    <div className="space-y-3">
      {/* 1. CURRENT SESSION (CLEAN MINIMAL CARD) */}
      <div
        onClick={() => setIsSessionSheetOpen(true)}
        className="glass-card rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between cursor-pointer active:scale-98 transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-medium text-xs shrink-0 shadow-2xs">
            RK
          </div>
          <div>
            <h4 className="font-medium text-sm text-slate-900 leading-tight">Rishikesh</h4>
            <span className="text-[11px] font-normal text-slate-500">Super Admin · Active</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            Full Access
          </span>
        </div>
      </div>

      {/* 2. ACCESS POLICIES */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <h4 className="font-medium text-xs text-slate-900">Access Policies</h4>

        <div className="space-y-1.5 pt-0.5 text-xs">
          {/* Public Ledger */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
            <div
              onClick={() => setSelectedPolicy({
                title: 'Public Ledger',
                desc: 'Members can view live balances, collections, and financial data without logging in.',
                status: isPublicAccessEnabled ? 'Enabled (ON)' : 'Disabled (OFF)',
              })}
              className="cursor-pointer"
            >
              <span className="font-medium text-slate-800">Public Ledger</span>
            </div>

            <button
              type="button"
              onClick={() => setIsPublicAccessEnabled(!isPublicAccessEnabled)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 ${
                isPublicAccessEnabled
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isPublicAccessEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Telegram Access */}
          <div
            onClick={() => setSelectedPolicy({
              title: 'Telegram Access',
              desc: 'Only approved Telegram chat IDs in the allowlist can create, modify, or reverse transactions.',
              status: 'Strict Enforcement Active',
            })}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 cursor-pointer"
          >
            <span className="font-medium text-slate-800">Telegram Access</span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              ENFORCED
            </span>
          </div>
        </div>
      </div>

      {/* 3. TELEGRAM USERS LIST */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-xs sm:text-sm text-slate-900">Telegram Users</h4>
            <span className="text-[10px] font-normal text-slate-400">@siyaram_bot</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddTgModal(true)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium active:scale-95 transition cursor-pointer"
          >
            + Add
          </button>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {telegramAdmins.map((user) => {
            const isOwner = user.role === 'Owner';

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs transition hover:bg-slate-100/60"
              >
                {/* User Info (Clickable for full details) */}
                <div
                  onClick={() => setSelectedTgUser(user)}
                  className="cursor-pointer min-w-0 pr-2 flex-1"
                >
                  <div className="font-mono font-medium text-slate-900 text-xs">
                    {user.telegramId}
                  </div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate">
                    {user.username} · {user.role} · {user.addedAt}
                  </div>
                </div>

                {/* Right Action */}
                <div className="shrink-0">
                  {isOwner ? (
                    <span className="text-[10px] text-slate-400 font-normal">Protected</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActionMenuTgUser(user)}
                      className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg active:scale-95 transition cursor-pointer"
                      title="Actions"
                    >
                      <MoreVertical size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {telegramAdmins.length === 0 && (
            <div className="p-4 text-center text-slate-400 text-xs">
              No Telegram admins registered yet. Tap &quot;+ Add&quot; to authorize users.
            </div>
          )}
        </div>
      </div>

      {/* 4. ADMIN ACCOUNTS LIST */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-xs sm:text-sm text-slate-900">Admin Accounts</h4>

          <button
            type="button"
            onClick={() => setIsAddWebModal(true)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium active:scale-95 transition cursor-pointer"
          >
            + Add
          </button>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {webAdmins.map((admin) => {
            const isProtected = admin.role === 'Super Admin';

            return (
              <div
                key={admin.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs transition hover:bg-slate-100/60"
              >
                {/* Admin Info (Clickable for full details) */}
                <div
                  onClick={() => setSelectedWebAdmin(admin)}
                  className="cursor-pointer min-w-0 pr-2 flex-1"
                >
                  <div className="font-medium text-slate-900 text-xs">
                    {admin.name}
                  </div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5 truncate">
                    {admin.email} · {admin.role} · {admin.lastActive}
                  </div>
                </div>

                {/* Right Action */}
                <div className="shrink-0">
                  {isProtected ? (
                    <span className="text-[10px] text-slate-400 font-normal">Protected</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActionMenuWebAdmin(admin)}
                      className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg active:scale-95 transition cursor-pointer"
                      title="Actions"
                    >
                      <MoreVertical size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: CURRENT SESSION DETAILS */}
      {isSessionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Current Session</h4>
              <button
                type="button"
                onClick={() => setIsSessionSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">User</span>
                <span className="font-medium text-slate-800">Rishikesh</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Role</span>
                <span className="font-medium text-emerald-700">Super Admin</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Status</span>
                <span className="font-medium text-slate-800">Active (Valid 24h)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Auth Method</span>
                <span className="font-medium text-slate-800">Google OAuth 2.0</span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-normal block mb-1">Privileges</span>
                <span className="text-slate-600 text-[11px] block">
                  Full Read-Write, In-place audit edits, undo reversal, sync triggers, and policy controls.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSessionSheetOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: POLICY DETAIL SHEET */}
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">{selectedPolicy.title}</h4>
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {selectedPolicy.desc}
              </p>
              <div className="flex items-center justify-between py-1 border-t border-slate-100">
                <span className="text-slate-400 font-normal">Status</span>
                <span className="font-medium text-emerald-700">{selectedPolicy.status}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPolicy(null)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TELEGRAM USER DETAILS (TAP ON ROW) */}
      {selectedTgUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="min-w-0 pr-2">
                <span className="text-xs font-mono font-medium text-slate-900 block">{selectedTgUser.telegramId}</span>
                <span className="text-[10px] text-slate-400 font-normal">{selectedTgUser.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTgUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Role</span>
                <span className="font-medium text-slate-800">{selectedTgUser.role}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Authorized</span>
                <span className="font-medium text-slate-800">{selectedTgUser.addedAt}</span>
              </div>
              {selectedTgUser.lastCommand && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-normal">Last Command</span>
                  <span className="font-mono text-[11px] text-slate-700">{selectedTgUser.lastCommand}</span>
                </div>
              )}
            </div>

            {selectedTgUser.role !== 'Owner' && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedTgUser;
                    setSelectedTgUser(null);
                    setRoleChangeTgUser(target);
                  }}
                  className="py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Change Role
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeTgAdmin(selectedTgUser.id)}
                  className="py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium hover:bg-rose-100 cursor-pointer"
                >
                  Revoke Access
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTION SHEET: TELEGRAM USER (⋯ TAP) */}
      {actionMenuTgUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-2 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-800 truncate pr-2">
                {actionMenuTgUser.telegramId} ({actionMenuTgUser.username})
              </span>
              <button
                type="button"
                onClick={() => setActionMenuTgUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1 pt-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  const target = actionMenuTgUser;
                  setActionMenuTgUser(null);
                  setSelectedTgUser(target);
                }}
                className="w-full p-2.5 rounded-xl text-left text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                View Details
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = actionMenuTgUser;
                  setActionMenuTgUser(null);
                  setRoleChangeTgUser(target);
                }}
                className="w-full p-2.5 rounded-xl text-left text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Change Role
              </button>

              <button
                type="button"
                onClick={() => handleRevokeTgAdmin(actionMenuTgUser.id)}
                className="w-full p-2.5 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN DETAILS (TAP ON ROW) */}
      {selectedWebAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="min-w-0 pr-2">
                <span className="text-xs font-medium text-slate-900 block">{selectedWebAdmin.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">{selectedWebAdmin.email}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWebAdmin(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Role</span>
                <span className="font-medium text-slate-800">{selectedWebAdmin.role}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-normal">Last Active</span>
                <span className="font-medium text-slate-800">{selectedWebAdmin.lastActive}</span>
              </div>
            </div>

            {selectedWebAdmin.role !== 'Super Admin' && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedWebAdmin;
                    setSelectedWebAdmin(null);
                    setRoleChangeWebAdmin(target);
                  }}
                  className="py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Change Role
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeWebAdmin(selectedWebAdmin.id)}
                  className="py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium hover:bg-rose-100 cursor-pointer"
                >
                  Remove Access
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTION SHEET: ADMIN ACCOUNT (⋯ TAP) */}
      {actionMenuWebAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-4 space-y-2 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-800 truncate pr-2">
                {actionMenuWebAdmin.name} ({actionMenuWebAdmin.email})
              </span>
              <button
                type="button"
                onClick={() => setActionMenuWebAdmin(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1 pt-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  const target = actionMenuWebAdmin;
                  setActionMenuWebAdmin(null);
                  setSelectedWebAdmin(target);
                }}
                className="w-full p-2.5 rounded-xl text-left text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                View Details
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = actionMenuWebAdmin;
                  setActionMenuWebAdmin(null);
                  setRoleChangeWebAdmin(target);
                }}
                className="w-full p-2.5 rounded-xl text-left text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Change Role
              </button>

              <button
                type="button"
                onClick={() => handleRevokeWebAdmin(actionMenuWebAdmin.id)}
                className="w-full p-2.5 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Remove Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE TELEGRAM ROLE */}
      {roleChangeTgUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Change Role</h4>
              <button
                type="button"
                onClick={() => setRoleChangeTgUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleSaveTgRoleChange('Admin')}
                className={`w-full p-2.5 rounded-xl text-left font-medium flex items-center justify-between transition cursor-pointer ${
                  roleChangeTgUser.role === 'Admin' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Admin (Record & Undo)</span>
                {roleChangeTgUser.role === 'Admin' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleSaveTgRoleChange('Collector')}
                className={`w-full p-2.5 rounded-xl text-left font-medium flex items-center justify-between transition cursor-pointer ${
                  roleChangeTgUser.role === 'Collector' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Collector (Record Only)</span>
                {roleChangeTgUser.role === 'Collector' && <Check size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE WEB ADMIN ROLE */}
      {roleChangeWebAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Change Admin Role</h4>
              <button
                type="button"
                onClick={() => setRoleChangeWebAdmin(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleSaveWebRoleChange('Finance Admin')}
                className={`w-full p-2.5 rounded-xl text-left font-medium flex items-center justify-between transition cursor-pointer ${
                  roleChangeWebAdmin.role === 'Finance Admin' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Finance Admin</span>
                {roleChangeWebAdmin.role === 'Finance Admin' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleSaveWebRoleChange('Super Admin')}
                className={`w-full p-2.5 rounded-xl text-left font-medium flex items-center justify-between transition cursor-pointer ${
                  roleChangeWebAdmin.role === 'Super Admin' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Super Admin</span>
                {roleChangeWebAdmin.role === 'Super Admin' && <Check size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TELEGRAM USER */}
      {isAddTgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Telegram User</h4>
              <button
                type="button"
                onClick={() => setIsAddTgModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddTgAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Telegram User ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 71982341"
                  value={newTgId}
                  onChange={(e) => setNewTgId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Telegram Handle</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @piyush_siyaram"
                  value={newTgUser}
                  onChange={(e) => setNewTgUser(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Role</label>
                <select
                  value={newTgRole}
                  onChange={(e) => setNewTgRole(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium"
                >
                  <option value="Admin">Admin (Record & Undo)</option>
                  <option value="Collector">Collector (Record Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTgModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD WEB ADMIN ACCOUNT */}
      {isAddWebModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Admin Account</h4>
              <button
                type="button"
                onClick={() => setIsAddWebModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddWebAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Piyush Patel"
                  value={newWebName}
                  onChange={(e) => setNewWebName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Google Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. piyush@gmail.com"
                  value={newWebEmail}
                  onChange={(e) => setNewWebEmail(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddWebModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
