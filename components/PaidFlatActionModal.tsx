'use client';

import React, { useState, useEffect } from 'react';
import { Building, Flat, PaymentMode } from '../lib/types';
import { formatINR } from '../lib/finance';
import { X, PlusCircle, Edit3, Banknote, Smartphone, AlertCircle } from 'lucide-react';

interface PaidFlatActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building | null;
  flat: Flat | null;
  onSelectAddMore: (building: Building, flat: Flat) => void;
  onSaveCorrection: (
    building: Building,
    flat: Flat,
    newAmount: number,
    newResidentName: string,
    newMode: PaymentMode
  ) => void;
  onResetFlat: (building: Building, flat: Flat) => void;
}

export const PaidFlatActionModal: React.FC<PaidFlatActionModalProps> = ({
  isOpen,
  onClose,
  building,
  flat,
  onSelectAddMore,
  onSaveCorrection,
  onResetFlat,
}) => {
  const [view, setView] = useState<'CHOICE' | 'EDIT' | 'CONFIRM_RESET'>('CHOICE');

  // Edit form state
  const [editAmount, setEditAmount] = useState<string>('');
  const [editResident, setEditResident] = useState<string>('');
  const [editMode, setEditMode] = useState<PaymentMode>('OFFLINE');

  useEffect(() => {
    if (isOpen && flat) {
      setView('CHOICE');
      setEditAmount(String(flat.amountPaid || ''));
      setEditResident(flat.residentName && flat.residentName !== 'None' ? flat.residentName : '');
      setEditMode((flat.paymentMode === 'ONLINE' ? 'ONLINE' : 'OFFLINE') as PaymentMode);
    }
  }, [isOpen, flat]);

  if (!isOpen || !building || !flat) return null;

  const currentPaid = flat.amountPaid || 0;
  const resident = flat.residentName && flat.residentName !== 'None' ? flat.residentName : 'Resident';

  const handleExecuteCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(editAmount, 10) || 0;
    if (parsedAmount <= 0) return;

    onSaveCorrection(building, flat, parsedAmount, editResident.trim(), editMode);
    onClose();
  };

  const handleExecuteReset = () => {
    onResetFlat(building, flat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ALREADY PAID
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {building.name} • Flat {flat.flatNo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* VIEW 1: CHOICE SCREEN (Logic 1 Prompt) */}
        {view === 'CHOICE' && (
          <div className="py-4 space-y-3">
            {/* Current Flat Info Card */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Resident</span>
                <p className="text-sm font-bold text-slate-900">{resident}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Recorded Amount</span>
                <p className="text-base font-bold text-emerald-700 tabular-numbers">
                  {formatINR(currentPaid)}
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 pt-1">
              Aap kya karna chahte hain?
            </p>

            {/* Choice 1: Add More / Top-up */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectAddMore(building, flat);
              }}
              className="w-full p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-left transition cursor-pointer active:scale-[0.98] flex items-start gap-3 group"
            >
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                <PlusCircle size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center justify-between">
                  <span>Aur Chanda Jama Karein (Add More)</span>
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed font-normal">
                  Resident ne aur chanda diya (e.g. +₹100). Chanda ledger me naya transaction judega aur flat amount badh jayega.
                </p>
              </div>
            </button>

            {/* Choice 2: Correct Previous Entry */}
            <button
              type="button"
              onClick={() => setView('EDIT')}
              className="w-full p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition cursor-pointer active:scale-[0.98] flex items-start gap-3 group"
            >
              <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-xs">
                <Edit3 size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs sm:text-sm font-bold text-blue-950 flex items-center justify-between">
                  <span>Galti Sudharein (Edit / Correct)</span>
                </div>
                <p className="text-[11px] text-blue-800/80 mt-0.5 leading-relaxed font-normal">
                  Pehle galat amount ya naam daal diya tha. Purani entry update hogi, naya extra transaction nahi banega.
                </p>
              </div>
            </button>

            {/* Choice 3: Reset Flat */}
            <button
              type="button"
              onClick={() => setView('CONFIRM_RESET')}
              className="w-full py-2 px-3 rounded-xl text-[11px] font-semibold text-rose-600 hover:bg-rose-50 text-center transition cursor-pointer border border-transparent hover:border-rose-200"
            >
              Galat flat click ho gaya tha? (Mark Unpaid / Reset)
            </button>
          </div>
        )}

        {/* VIEW 2: EDIT / CORRECTION FORM */}
        {view === 'EDIT' && (
          <form onSubmit={handleExecuteCorrection} className="py-3 space-y-3 text-xs">
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px]">
              <strong>Correction Mode:</strong> Ye purani entry ko replace karega taaki Chanda Tab aur Building Tab 100% matched rahein.
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Corrected Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="e.g. 300"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Resident Name
              </label>
              <input
                type="text"
                value={editResident}
                onChange={(e) => setEditResident(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="e.g. Narayan"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditMode('OFFLINE')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    editMode === 'OFFLINE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Banknote size={14} />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('ONLINE')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    editMode === 'ONLINE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>UPI (Online)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setView('CHOICE')}
                className="px-3 py-1.5 rounded-xl text-slate-600 font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                Save Correction
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: CONFIRM RESET SCREEN */}
        {view === 'CONFIRM_RESET' && (
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>Reset Flat {building.code}-{flat.flatNo}?</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed font-normal">
                Is flat ka status Due (Unpaid) ho jayega aur iska recorded transaction Chanda ledger se reverse ho jayega.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('CHOICE')}
                className="px-3 py-1.5 rounded-xl text-slate-600 font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer text-xs shadow-xs"
              >
                Yes, Mark as Unpaid
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
