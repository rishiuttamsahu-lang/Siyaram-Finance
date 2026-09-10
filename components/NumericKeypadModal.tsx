'use client';

import React, { useState, useEffect } from 'react';
import { Delete, X, Smartphone, Banknote, ArrowRight } from 'lucide-react';
import { formatINR } from '../lib/finance';
import { PaymentMode } from '../lib/types';

interface NumericKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  defaultAmount?: number;
  onConfirm: (amount: number, mode: PaymentMode, note?: string) => void;
  entityName?: string;
  categoryLabel?: string;
  actionType?: 'MEMBER' | 'BUILDING' | 'CHANDA' | 'EXPENSE';
  initialNote?: string;
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  defaultAmount = 0,
  onConfirm,
  entityName,
  categoryLabel,
  actionType = 'CHANDA',
  initialNote = '',
}) => {
  const [amountStr, setAmountStr] = useState<string>(defaultAmount > 0 ? String(defaultAmount) : '');
  const [mode, setMode] = useState<PaymentMode>('ONLINE');
  const [note, setNote] = useState<string>(initialNote || '');

  // Reset inputs cleanly whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountStr(defaultAmount > 0 ? String(defaultAmount) : '');
      setMode('ONLINE');
      setNote(initialNote || '');
    }
  }, [isOpen, defaultAmount, initialNote]);

  if (!isOpen) return null;

  const currentAmount = parseInt(amountStr, 10) || 0;

  const handleKeyPress = (char: string) => {
    if (amountStr.length >= 7) return; // Prevent excessive numbers
    if (char === '0' && amountStr === '') return;
    setAmountStr(prev => prev + char);
  };

  const handleBackspace = () => {
    setAmountStr(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAmountStr('');
  };

  const handlePreset = (preset: number) => {
    setAmountStr(String(preset));
  };

  const handleConfirm = () => {
    if (currentAmount <= 0) return;
    onConfirm(currentAmount, mode, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl border border-white/60 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Top Handle / Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {categoryLabel || 'Payment Entry'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Name Entry Section (Donor / Shop / Item / Resident Name) */}
        <div className="mt-3.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
            {actionType === 'CHANDA' 
              ? 'Donor / Shop Name' 
              : actionType === 'EXPENSE' 
              ? 'Expense Item / Vendor' 
              : actionType === 'BUILDING'
              ? 'Resident Name'
              : 'Payment Note (Optional)'}
          </label>
          <input
            type="text"
            placeholder={
              actionType === 'CHANDA'
                ? 'e.g. Sumit Kirana, Ayush Gupta, Chawl...'
                : actionType === 'EXPENSE'
                ? 'e.g. Mandap, Sound, Flowers, Panditji...'
                : actionType === 'BUILDING'
                ? 'Resident name (or leave blank)...'
                : 'Add note...'
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Amount Display Card */}
        <div className="mt-3.5 p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 text-center flex flex-col items-center">
          {entityName && (
            <span className="text-xs font-semibold text-slate-500 mb-1">
              Target: <strong className="text-slate-800">{entityName}</strong>
            </span>
          )}
          <div className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 tabular-numbers py-0.5 sm:py-1">
            {amountStr ? formatINR(currentAmount) : <span className="text-slate-300">₹0</span>}
          </div>

          {/* Quick Amount Presets */}
          <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 flex-wrap justify-center">
            {[50, 100, 200, 500].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handlePreset(val)}
                className="text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition active:scale-95"
              >
                +₹{val}
              </button>
            ))}
            {amountStr && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold px-2.5 py-1 sm:py-1.5 rounded-full bg-rose-50 text-rose-600 active:scale-95"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Payment Mode Selector (Cash vs Online UPI) */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('ONLINE')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'ONLINE'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={15} />
            <span>Online (UPI)</span>
            {mode === 'ONLINE' && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded font-mono">O</span>}
          </button>
          <button
            type="button"
            onClick={() => setMode('OFFLINE')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'OFFLINE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Banknote size={15} />
            <span>Cash</span>
          </button>
        </div>

        {/* Numeric Keypad (3x4 grid) */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 sm:gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-12 sm:h-14 rounded-2xl bg-white border border-slate-100 text-xl font-bold text-slate-800 shadow-xs hover:bg-slate-50 active:bg-slate-100 active:scale-95 transition flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 sm:h-14 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-500 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center uppercase tracking-wider"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 sm:h-14 rounded-2xl bg-white border border-slate-100 text-xl font-bold text-slate-800 shadow-xs hover:bg-slate-50 active:bg-slate-100 active:scale-95 transition flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 sm:h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          disabled={currentAmount <= 0}
          onClick={handleConfirm}
          className={`mt-4 sm:mt-5 w-full py-3.5 sm:py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${
            currentAmount > 0
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Record {currentAmount > 0 ? formatINR(currentAmount) : 'Payment'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
