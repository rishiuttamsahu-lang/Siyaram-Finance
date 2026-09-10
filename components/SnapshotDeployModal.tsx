'use client';

import React, { useState } from 'react';
import { Database, Sparkles, X, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatINR } from '../lib/finance';
import { Season, Member, Building } from '../lib/types';
import { 
  siyaramTemplateSeason, 
  siyaramTemplateMembers, 
  siyaramTemplateBuildings 
} from '../lib/initialData';
import { deploySnapshotToFirestore } from '../lib/firestoreService';

interface SnapshotDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploySuccess: (season: Season, members: Member[], buildings: Building[]) => void;
}

export const SnapshotDeployModal: React.FC<SnapshotDeployModalProps> = ({
  isOpen,
  onClose,
  onDeploySuccess,
}) => {
  const [openingBalance, setOpeningBalance] = useState<number>(6500);
  const [seasonName, setSeasonName] = useState<string>('Ganesh Utsav 2026–27');
  const [seasonId, setSeasonId] = useState<string>('2026-2027');
  const [liveMonth, setLiveMonth] = useState<string>('2026-09');
  const [defaultQuota, setDefaultQuota] = useState<number>(200);
  const [templateType, setTemplateType] = useState<'FULL' | 'BLANK'>('FULL');
  
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setError(null);

      // Build season
      const baseSeason = siyaramTemplateSeason(openingBalance);
      const newSeason: Season = {
        ...baseSeason,
        id: seasonId.trim() || '2026-2027',
        name: seasonName.trim() || 'Ganesh Utsav 2026–27',
        liveMonth: liveMonth.trim() || '2026-09',
        defaultMonthlyQuota: defaultQuota || 200,
        openingBalance: Number(openingBalance) || 0,
      };

      const membersToDeploy: Member[] = templateType === 'FULL' ? siyaramTemplateMembers : [];
      const buildingsToDeploy: Building[] = templateType === 'FULL' ? siyaramTemplateBuildings : [];

      // Deploy to Firestore
      await deploySnapshotToFirestore(newSeason, membersToDeploy, buildingsToDeploy);

      setSuccess(true);
      setTimeout(() => {
        onDeploySuccess(newSeason, membersToDeploy, buildingsToDeploy);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Snapshot deployment error:', err);
      setError(err?.message || 'Failed to deploy snapshot to Firebase Firestore.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition active:scale-95"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <Database size={20} />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Firebase Database Snapshot Setup
          </h3>
          <p className="text-xs text-slate-500">
            Create all necessary entities in empty Firestore with 1 click.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center gap-2 font-semibold">
            <Check size={16} className="shrink-0" />
            <span>Snapshot deployed successfully to Firebase Firestore!</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Previous Month / Opening Surplus Input */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Previous Surplus / Carry-forward Balance (पिछला बचा हुआ पैसा)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                placeholder="6500"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-emerald-500 tabular-numbers"
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              This amount will be saved as the season opening surplus: <strong className="text-emerald-700">{formatINR(openingBalance)}</strong>
            </span>
          </div>

          {/* Season Details */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Season Details</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1">Season ID</label>
                <input
                  type="text"
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1">Live Month</label>
                <input
                  type="text"
                  value={liveMonth}
                  onChange={(e) => setLiveMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Season Title</label>
              <input
                type="text"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Preset Template Selection */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-slate-700 block">Entity Preset</span>
            <div className="grid grid-cols-1 gap-2">
              <label
                onClick={() => setTemplateType('FULL')}
                className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  templateType === 'FULL'
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="templateType"
                  checked={templateType === 'FULL'}
                  onChange={() => setTemplateType('FULL')}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Complete Siyaram Mandal Setup (Recommended)
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Includes 10 Mandal members (Piyush, Aryan, Rishi, etc.) and Wings A, B, B2, C, D with clean ₹0 starting balances.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setTemplateType('BLANK')}
                className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  templateType === 'BLANK'
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="templateType"
                  checked={templateType === 'BLANK'}
                  onChange={() => setTemplateType('BLANK')}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Clean Empty Season Only
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Only creates the Season entity with Opening Surplus. Members and Wings will be added from scratch.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleDeploy}
            disabled={isDeploying || success}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {isDeploying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Deploying to Firebase...</span>
              </>
            ) : success ? (
              <>
                <Check size={16} />
                <span>Deployed!</span>
              </>
            ) : (
              <>
                <Sparkles size={16} className="text-emerald-400" />
                <span>Deploy Snapshot to Firebase</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
