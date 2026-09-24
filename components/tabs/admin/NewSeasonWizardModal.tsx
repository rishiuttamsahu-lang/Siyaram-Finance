'use client';

import React, { useState, useMemo } from 'react';
import { Season, Member, Building, Transaction } from '../../../lib/types';
import { formatINR, calculateMandalTotals, computeMemberDue } from '../../../lib/finance';
import { 
  X, 
  Calendar, 
  Wallet, 
  Users, 
  Building as BuildingIcon, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Info,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface NewSeasonWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeason: Season;
  existingMembers: Member[];
  existingBuildings: Building[];
  existingTransactions: Transaction[];
  onDeployNewSeason: (
    newSeason: Season,
    newMembers: Member[],
    newBuildings: Building[],
    archiveCurrent: boolean
  ) => Promise<void>;
  isProcessing?: boolean;
}

export const NewSeasonWizardModal: React.FC<NewSeasonWizardModalProps> = ({
  isOpen,
  onClose,
  currentSeason,
  existingMembers,
  existingBuildings,
  existingTransactions,
  onDeployNewSeason,
  isProcessing = false,
}) => {
  const [step, setStep] = useState<number>(1);

  // 1. Concluding season live totals for automatic opening balance suggestions
  const prevSummary = useMemo(() => {
    return calculateMandalTotals(
      existingTransactions,
      currentSeason.openingBalance || 0,
      50000,
      currentSeason.openingCashBalance,
      currentSeason.openingOnlineBalance
    );
  }, [existingTransactions, currentSeason]);

  const prevCashInHand = prevSummary.netOfflineBalance;
  const prevOnlinePool = prevSummary.netOnlineBalance;
  const prevTotalClosing = prevSummary.netBalance;

  // Step 1 State: Season Details
  const defaultStartDate = '2026-09-01';
  const defaultEndDate = '2027-08-31';
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [seasonName, setSeasonName] = useState('Ganesh Utsav 2026–27');
  const [seasonId, setSeasonId] = useState('2026-2027');

  // Generate chronological months between startDate and endDate
  const generatedMonths = useMemo(() => {
    try {
      const startYM = startDate.slice(0, 7);
      const endYM = endDate.slice(0, 7);
      const [sYear, sMonth] = startYM.split('-').map(Number);
      const [eYear, eMonth] = endYM.split('-').map(Number);

      const months: string[] = [];
      let curYear = sYear;
      let curMonth = sMonth;

      while (curYear < eYear || (curYear === eYear && curMonth <= eMonth)) {
        months.push(`${curYear}-${String(curMonth).padStart(2, '0')}`);
        curMonth++;
        if (curMonth > 12) {
          curMonth = 1;
          curYear++;
        }
        if (months.length > 36) break; // safety guard
      }
      return months.length > 0 ? months : [startYM];
    } catch {
      return ['2026-09'];
    }
  }, [startDate, endDate]);

  // Step 2 State: Opening Money (Cash & Online split)
  const [cashOpeningInput, setCashOpeningInput] = useState<string>(String(Math.max(0, prevCashInHand)));
  const [onlineOpeningInput, setOnlineOpeningInput] = useState<string>(String(Math.max(0, prevOnlinePool)));

  const parsedCashOpening = Math.max(0, Number(cashOpeningInput) || 0);
  const parsedOnlineOpening = Math.max(0, Number(onlineOpeningInput) || 0);
  const totalOpeningBalance = parsedCashOpening + parsedOnlineOpening;

  // Step 3 State: Members Setup
  const [memberSetupMode, setMemberSetupMode] = useState<'IMPORT' | 'BLANK'>('IMPORT');

  // Compute members to import with carry-forward pending debt
  const preparedMembersToImport = useMemo(() => {
    return existingMembers.map((m) => {
      const dues = computeMemberDue(m, currentSeason);
      const totalPending = dues.totalPending;

      // Carry forward ledger: record pending under previous season key
      const prevSeasonKey = currentSeason.id || '2025-26';
      const existingCarry = m.carryForwardPending || {};
      const newCarryForward: Record<string, number> = {};

      // Preserve previous years' debts if any were already tracked
      for (const [k, v] of Object.entries(existingCarry)) {
        if (v > 0) newCarryForward[k] = v;
      }
      // Add previous season's debt
      if (totalPending > 0) {
        newCarryForward[prevSeasonKey] = totalPending;
      }

      const freshMember: Member = {
        id: m.id,
        name: m.name,
        previousYearPending: m.isHonorary ? 0 : totalPending,
        carryForwardPending: m.isHonorary ? {} : newCarryForward,
        isHonorary: m.isHonorary,
        isPaused: false, // Reset pause state
        monthlyOverrides: {}, // Reset monthly overrides
        payments: {}, // 100% fresh payments
      };
      return freshMember;
    });
  }, [existingMembers, currentSeason]);

  const totalPendingDuesToCarry = useMemo(() => {
    return preparedMembersToImport.reduce((sum, m) => sum + m.previousYearPending, 0);
  }, [preparedMembersToImport]);

  // Step 5 State: Buildings Setup
  const [buildingSetupMode, setBuildingSetupMode] = useState<'COPY' | 'BLANK'>('COPY');

  const preparedBuildingsToCopy = useMemo(() => {
    return existingBuildings.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      floors: (b.floors || []).map((fl) => ({
        floorName: fl.floorName,
        flats: (fl.flats || []).map((flat) => ({
          flatNo: flat.flatNo,
          residentName: '', // Clean resident name for fresh season
          amountPaid: 0,
          isPaid: false,
          onlinePaid: 0,
          offlinePaid: 0,
        })),
      })),
    }));
  }, [existingBuildings]);

  const totalFlatsCount = useMemo(() => {
    return preparedBuildingsToCopy.reduce(
      (sum, b) => sum + b.floors.reduce((fSum, fl) => fSum + fl.flats.length, 0),
      0
    );
  }, [preparedBuildingsToCopy]);

  // Final Action Handler
  const handleDeploy = async (activateNow: boolean) => {
    const finalSeason: Season = {
      id: seasonId.trim() || '2026-2027',
      name: seasonName.trim() || `Ganesh Utsav ${seasonId}`,
      startDate: startDate.slice(0, 7),
      endDate: endDate.slice(0, 7),
      openingBalance: totalOpeningBalance,
      openingCashBalance: parsedCashOpening,
      openingOnlineBalance: parsedOnlineOpening,
      isActive: activateNow,
      isArchived: false,
      status: activateNow ? 'ACTIVE' : 'DRAFT',
      liveMonth: generatedMonths[0] || '2026-09',
      defaultMonthlyQuota: 0, // Starts at ₹0 as required
      months: generatedMonths,
      blockedMonths: [], // Starts unblocked as required
      monthQuotas: {},
    };

    const finalMembers = memberSetupMode === 'IMPORT' ? preparedMembersToImport : [];
    const finalBuildings = buildingSetupMode === 'COPY' ? preparedBuildingsToCopy : [];

    await onDeployNewSeason(finalSeason, finalMembers, finalBuildings, activateNow);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Step {step} of 6
              </span>
              <h2 className="text-base font-bold text-slate-900">New Season Wizard</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Creating new financial season with complete data isolation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Navigation Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Details' },
            { num: 2, label: 'Opening Money' },
            { num: 3, label: 'Members' },
            { num: 4, label: 'Monthly Dues' },
            { num: 5, label: 'Buildings' },
            { num: 6, label: 'Review' },
          ].map((s) => (
            <div 
              key={s.num} 
              className={`flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
                step === s.num 
                  ? 'text-emerald-700 font-bold' 
                  : step > s.num 
                  ? 'text-slate-800' 
                  : 'text-slate-400 opacity-60'
              }`}
              onClick={() => !isProcessing && setStep(s.num)}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === s.num 
                  ? 'bg-emerald-600 text-white font-bold' 
                  : step > s.num 
                  ? 'bg-emerald-100 text-emerald-800 font-semibold' 
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Season Details */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar size={16} className="text-emerald-600" />
                  Season Timeline & Identification
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Specify start and end dates. The system will automatically generate the 12-month schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Starting Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ending Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Season Name
                  </label>
                  <input
                    type="text"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g. Ganesh Utsav 2026–27"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Season ID / Code
                  </label>
                  <input
                    type="text"
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Generated Months Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Auto-Generated Months ({generatedMonths.length} Months):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {generatedMonths.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-mono"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Opening Money */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Wallet size={16} className="text-emerald-600" />
                  Opening Cash & Online Balance
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the opening cash in hand and online/UPI pool balance. The total opening balance is computed automatically.
                </p>
              </div>

              {/* Reference from concluding season */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="font-semibold text-slate-800 block">
                  Previous Season ({currentSeason.name || currentSeason.id}) Concluding Balances:
                </span>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Closing Cash:</span>
                    <span className="font-bold text-slate-800">{formatINR(prevCashInHand)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Closing Online:</span>
                    <span className="font-bold text-slate-800">{formatINR(prevOnlinePool)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Surplus:</span>
                    <span className="font-bold text-emerald-700">{formatINR(prevTotalClosing)}</span>
                  </div>
                </div>
              </div>

              {/* New Season Opening Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Opening Cash in Hand (₹)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Physical cash available with Khajanchi at the start
                  </p>
                  <input
                    type="number"
                    value={cashOpeningInput}
                    onChange={(e) => setCashOpeningInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-base font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Opening Online / UPI Pool (₹)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Mandal funds kept in bank/UPI at the start
                  </p>
                  <input
                    type="number"
                    value={onlineOpeningInput}
                    onChange={(e) => setOnlineOpeningInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-base font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Auto Calculated Sum Display */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    Total Opening Balance (Cash + Online)
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Automatically calculated and saved independently
                  </span>
                </div>
                <span className="text-xl font-extrabold text-emerald-800 tabular-numbers">
                  {formatINR(totalOpeningBalance)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Members Setup */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users size={16} className="text-emerald-600" />
                  Members Setup — 100% Fresh Financial Slate
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Import previous members with their stable IDs. Historical payments are reset to 0, while unpaid balances roll into the multi-season carry-forward ledger.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMemberSetupMode('IMPORT')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    memberSetupMode === 'IMPORT'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Import & Link Members
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Imports {existingMembers.length} members from {currentSeason.name || currentSeason.id} with carry-forward pending debt.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberSetupMode('BLANK')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    memberSetupMode === 'BLANK'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">
                    Start with No Members
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Start with a blank member list and add members manually later.
                  </p>
                </button>
              </div>

              {memberSetupMode === 'IMPORT' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Members Preview ({preparedMembersToImport.length} members)
                    </span>
                    <span className="font-bold text-rose-700">
                      Total Carry-Forward Debt: {formatINR(totalPendingDuesToCarry)}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-medium">Member</th>
                          <th className="py-2 px-3 font-medium">Type</th>
                          <th className="py-2 px-3 font-medium text-right">Carry-Forward Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preparedMembersToImport.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-800">{m.name}</td>
                            <td className="py-2 px-3 text-slate-500">
                              {m.isHonorary ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">Honorary</span>
                              ) : 'Regular'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-rose-600">
                              {m.previousYearPending > 0 ? formatINR(m.previousYearPending) : '₹0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Monthly Due System */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <RotateCcw size={16} className="text-emerald-600" />
                  Monthly Due System — Fresh Slate
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  In the new season, old quota rules and blocked months are completely cleared. All months start unblocked at ₹0.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Initial Configuration Rules Applied:
                </div>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li><strong>Default Monthly Quota:</strong> ₹0</li>
                  <li><strong>Month-specific Quotas:</strong> Cleared ({generatedMonths.length} months at ₹0)</li>
                  <li><strong>Blocked Months:</strong> None (All months active and open)</li>
                  <li><strong>Member Monthly Overrides:</strong> Reset to empty</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>
                  You can set custom quotas for specific months or define a default monthly target whenever needed in <strong>Admin → Monthly Dues</strong>.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Buildings Setup */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BuildingIcon size={16} className="text-emerald-600" />
                  Buildings & Flats Structure
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Copy building wings, floors, and flat numbers while completely resetting collection amounts and resident names.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBuildingSetupMode('COPY')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    buildingSetupMode === 'COPY'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Copy Structure Only
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Copies {existingBuildings.length} wings ({totalFlatsCount} flats) with ₹0 collections and clean resident names.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBuildingSetupMode('BLANK')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    buildingSetupMode === 'BLANK'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">
                    Create Manually
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Start with no buildings and configure wings manually later.
                  </p>
                </button>
              </div>

              {buildingSetupMode === 'COPY' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Wings to Duplicate:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {preparedBuildingsToCopy.map((b) => (
                      <div key={b.code} className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="font-bold text-slate-800 block">{b.name}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {b.floors.reduce((acc, f) => acc + f.flats.length, 0)} Flats
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Review & Final Confirmation */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-emerald-600" />
                  Review & Confirm Deployment
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Double check the parameters for the new season before deploying to Firestore.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Season Name & ID:</span>
                  <span className="font-bold text-slate-900">{seasonName} ({seasonId})</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Schedule Duration:</span>
                  <span className="font-bold text-slate-900">{startDate} to {endDate} ({generatedMonths.length} Months)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Opening Cash / Online Split:</span>
                  <span className="font-bold text-slate-900">
                    Cash: {formatINR(parsedCashOpening)} • Online: {formatINR(parsedOnlineOpening)}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Opening Pool:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{formatINR(totalOpeningBalance)}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Members Setup:</span>
                  <span className="font-bold text-slate-900">
                    {memberSetupMode === 'IMPORT' ? `${preparedMembersToImport.length} Members (Carry-Forward: ${formatINR(totalPendingDuesToCarry)})` : 'None (Blank)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Building Structure:</span>
                  <span className="font-bold text-slate-900">
                    {buildingSetupMode === 'COPY' ? `${preparedBuildingsToCopy.length} Wings (${totalFlatsCount} Flats, Clean)` : 'None (Blank)'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Complete Isolation Guarantee:</strong> Previous season <strong>{currentSeason.name || currentSeason.id}</strong> will be safely archived with all its transactions, payments, and history preserved untouched.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 active:scale-95 transition cursor-pointer shadow-xs"
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleDeploy(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeploy(true)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:scale-95 transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Sparkles size={14} />
                  {isProcessing ? 'Activating Season...' : 'Activate Season Now'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
