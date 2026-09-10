'use client';

import React from 'react';
import { Users, Building2, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';

export type TabType = 'members' | 'buildings' | 'income' | 'expense' | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingDuesCount?: number;
  isAdmin: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingDuesCount = 0,
  isAdmin,
}) => {
  const tabs = [
    {
      id: 'members' as TabType,
      label: 'Members',
      icon: Users,
      badge: pendingDuesCount > 0 ? pendingDuesCount : undefined,
    },
    {
      id: 'buildings' as TabType,
      label: 'Buildings',
      icon: Building2,
    },
    {
      id: 'income' as TabType,
      label: 'Chanda',
      icon: ArrowDownLeft,
    },
    {
      id: 'expense' as TabType,
      label: 'Expense',
      icon: ArrowUpRight,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as TabType,
            label: 'Admin',
            icon: ShieldCheck,
          },
        ]
      : []),
  ];


  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav className="glass-dock pointer-events-auto flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-full shadow-2xl border border-white/70 max-w-md w-full justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 tracking-tight ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
