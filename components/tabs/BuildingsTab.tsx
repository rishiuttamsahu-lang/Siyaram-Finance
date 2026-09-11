'use client';

import React, { useState, useMemo } from 'react';
import { Building, Flat } from '../../lib/types';
import { formatINR } from '../../lib/finance';
import { CheckCircle2, Layers, Building2 } from 'lucide-react';

interface BuildingsTabProps {
  buildings: Building[];
  onOpenFlatModal: (building: Building, flat: Flat) => void;
  isAdmin: boolean;
}

export const BuildingsTab: React.FC<BuildingsTabProps> = ({
  buildings,
  onOpenFlatModal,
  isAdmin,
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || '');

  // Calculate overall aggregates
  const aggregates = useMemo(() => {
    let totalCollection = 0;
    let paidFlats = 0;
    let pendingFlats = 0;

    buildings.forEach(b => {
      b.floors.forEach(f => {
        f.flats.forEach(fl => {
          if (fl.isPaid) {
            paidFlats += 1;
            totalCollection += fl.amountPaid;
          } else {
            pendingFlats += 1;
          }
        });
      });
    });

    return { totalCollection, paidFlats, pendingFlats, totalFlats: paidFlats + pendingFlats };
  }, [buildings]);

  const currentBuilding = useMemo(() => {
    return buildings.find(b => b.id === selectedBuildingId) || buildings[0];
  }, [buildings, selectedBuildingId]);

  // Current building specific stats
  const currentBuildingStats = useMemo(() => {
    if (!currentBuilding) return { total: 0, paid: 0, pending: 0, amount: 0 };
    let total = 0;
    let paid = 0;
    let amount = 0;

    currentBuilding.floors.forEach(f => {
      f.flats.forEach(fl => {
        total += 1;
        if (fl.isPaid) {
          paid += 1;
          amount += fl.amountPaid;
        }
      });
    });

    return { total, paid, pending: total - paid, amount };
  }, [currentBuilding]);

  return (
    <div className="space-y-3 sm:space-y-4 pb-24">
      {buildings.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white border border-slate-100 space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Building2 size={20} />
          </div>
          <h4 className="text-xs font-bold text-slate-700">No Wings Added Yet</h4>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Sign in as Admin to configure wings and buildings.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Top 3 Summary Gauges - Concise & Compact on Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Total Collection */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                COLLECTION
              </span>

          <div className="text-base sm:text-2xl font-bold text-emerald-600 tabular-numbers mt-0.5 sm:mt-1">
            {formatINR(aggregates.totalCollection)}
          </div>
          <span className="text-[10px] sm:text-xs text-emerald-700 font-medium">
            All wings
          </span>
        </div>

        {/* Paid Flats */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            PAID FLATS
          </span>
          <div className="text-base sm:text-2xl font-bold text-slate-800 tabular-numbers mt-0.5 sm:mt-1">
            {aggregates.paidFlats} <span className="text-xs font-normal text-slate-400">/ {aggregates.totalFlats}</span>
          </div>
          <span className="text-[10px] sm:text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Flats paid
          </span>
        </div>

        {/* Pending Flats (Sleek horizontal card on mobile, vertical on sm) */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex sm:flex-col justify-between items-center sm:items-stretch border-amber-100 bg-amber-50/25 col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider block">
              PENDING FLATS
            </span>
            <span className="text-[10px] sm:text-xs text-amber-600 font-medium">
              Need collection
            </span>
          </div>
          <div className="text-base sm:text-2xl font-bold text-amber-600 tabular-numbers">
            {aggregates.pendingFlats}
          </div>
        </div>
      </div>

      {/* 2. Wing Selector: 3-Column Compact Grid on Mobile (No vertical stack, no duplicate text) */}
      <div className="space-y-1.5 sm:space-y-2">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Select Wing / Building
        </span>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {buildings.map(building => {
            const isSelected = building.id === currentBuilding?.id;
            
            // Wing stats
            let bPaid = 0;
            let bTotal = 0;
            let bAmount = 0;
            building.floors.forEach(f => {
              f.flats.forEach(fl => {
                bTotal += 1;
                if (fl.isPaid) {
                  bPaid += 1;
                  bAmount += fl.amountPaid;
                }
              });
            });
            const percent = bTotal > 0 ? Math.round((bPaid / bTotal) * 100) : 0;

            return (
              <button
                key={building.id}
                type="button"
                onClick={() => setSelectedBuildingId(building.id)}
                className={`text-left p-2.5 sm:p-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white shadow-md border-2 border-emerald-500/80 ring-2 sm:ring-4 ring-emerald-500/10'
                    : 'glass-card hover:bg-white/90 border border-slate-200/70'
                }`}
              >
                {/* Header: Wing Name & Percentage Badge */}
                <div className="flex items-center justify-between gap-1">
                  <h4 className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-emerald-800' : 'text-slate-900'}`}>
                    {building.name}
                  </h4>
                  <span className={`text-[10px] sm:text-[11px] font-semibold tabular-numbers px-1.5 py-0.5 rounded-md shrink-0 ${
                    isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {percent}%
                  </span>
                </div>

                {/* Amount & Clean Stats */}
                <div className="my-1.5 sm:my-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-numbers block">
                    {formatINR(bAmount)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
                    {bPaid}/{bTotal} paid
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1 sm:h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Floor Elevation Matrix */}
      {currentBuilding && (
        <div className="glass-card rounded-[24px] sm:rounded-[32px] p-3 sm:p-5">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-900 text-white">
                <Layers size={15} />
              </div>
              <div>
                <h3 className="text-xs sm:text-base font-bold text-slate-900">
                  {currentBuilding.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  {currentBuildingStats.total} Flats · <span className="text-emerald-700 font-semibold">{currentBuildingStats.paid} Paid</span> · <span className="text-amber-700 font-semibold">{currentBuildingStats.pending} Pending</span>
                </p>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-500 font-medium hidden sm:block">
              Telegram Format: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">Name {currentBuilding.code} FlatNo Amount [O]</code>
            </div>
          </div>

          {/* Elevation Floors (3F, 2F, 1F, GR) */}
          <div className="space-y-2 sm:space-y-3">
            {currentBuilding.floors.map(floor => (
              <div key={floor.floorName} className="flex items-center gap-1.5 sm:gap-3">
                {/* Floor Label Badge */}
                <div className="w-9 sm:w-12 h-[60px] sm:h-[64px] rounded-xl sm:rounded-2xl bg-white/90 border border-slate-200/80 flex items-center justify-center font-bold text-xs sm:text-sm text-slate-700 shadow-xs shrink-0">
                  {floor.floorName}
                </div>

                {/* Flats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 flex-1">
                  {floor.flats.map(flat => {
                    const cleanName = flat.residentName && flat.residentName.trim() !== 'None' ? flat.residentName.trim() : '';

                    if (flat.isPaid) {
                      return (
                        <button
                          key={flat.flatNo}
                          type="button"
                          onClick={() => onOpenFlatModal(currentBuilding, flat)}
                          className="h-[60px] sm:h-[64px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-left border transition-all active:scale-95 flex flex-col justify-between bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-xs hover:bg-emerald-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              {flat.flatNo}
                            </span>
                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              flat.paymentMode === 'ONLINE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : flat.paymentMode === 'SPLIT'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/60'
                            }`}>
                              {flat.paymentMode === 'ONLINE' ? 'UPI' : flat.paymentMode === 'SPLIT' ? 'Split' : 'Cash'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 text-xs truncate">
                            <span className="truncate text-[10px] sm:text-xs font-medium text-slate-700">
                              {cleanName || 'Paid'}
                            </span>
                            <span className="font-bold text-xs sm:text-sm tabular-numbers text-emerald-700 shrink-0">
                              {formatINR(flat.amountPaid)}
                            </span>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={flat.flatNo}
                        type="button"
                        onClick={() => onOpenFlatModal(currentBuilding, flat)}
                        className="group h-[60px] sm:h-[64px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-left border transition-all active:scale-95 flex flex-col justify-between bg-white/90 border-slate-200/80 text-slate-500 hover:border-emerald-300 hover:bg-white shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            {flat.flatNo}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                            Due
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium group-hover:text-emerald-700 transition">
                            Tap to record
                          </span>
                          <span className="text-[10px] text-slate-300 font-medium">
                            —
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

