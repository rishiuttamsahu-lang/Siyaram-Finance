'use client';

import React, { useState, useEffect } from 'react';
import { Building, Floor, Flat } from '../../../lib/types';
import { formatINR } from '../../../lib/finance';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2
} from 'lucide-react';

interface AdminBuildingsProps {
  buildings: Building[];
  onAddBuilding?: (name: string, code: string) => void;
  onUpdateBuilding?: (updatedBuilding: Building) => void;
  onDeleteBuilding?: (buildingId: string) => void;
  onAddFloor?: (buildingId: string, floorName: string) => void;
  onAddFlat?: (buildingId: string, floorName: string, flatNo: string, residentName: string) => void;
  onUpdateFlat?: (buildingId: string, flatNo: string, residentName: string, amount: number, isPaid: boolean) => void;
  onDeleteFlat?: (buildingId: string, floorName: string, flatNo: string) => void;
  isAddWingModalOpen?: boolean;
  setIsAddWingModalOpen?: (open: boolean) => void;
}

export const AdminBuildings: React.FC<AdminBuildingsProps> = ({
  buildings: initialBuildings,
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
  onAddFloor,
  onAddFlat,
  onUpdateFlat,
  onDeleteFlat,
  isAddWingModalOpen: externalIsAddWingOpen,
  setIsAddWingModalOpen: externalSetIsAddWingOpen,
}) => {
  const [buildingsList, setBuildingsList] = useState<Building[]>(initialBuildings || []);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(initialBuildings[0]?.id || '');

  useEffect(() => {
    setBuildingsList(initialBuildings || []);
    if (initialBuildings && initialBuildings.length > 0) {
      setSelectedBuildingId(prev => prev && initialBuildings.some(b => b.id === prev) ? prev : initialBuildings[0].id);
    } else {
      setSelectedBuildingId('');
    }
  }, [initialBuildings]);

  // Add Wing Modal
  const [internalIsAddWingOpen, setInternalIsAddWingOpen] = useState(false);
  const isAddWingOpen = externalIsAddWingOpen !== undefined ? externalIsAddWingOpen : internalIsAddWingOpen;
  const setAddWingOpen = externalSetIsAddWingOpen !== undefined ? externalSetIsAddWingOpen : setInternalIsAddWingOpen;

  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingCode, setNewBuildingCode] = useState('');

  // Delete Wing Confirmation
  const [isDeleteWingOpen, setIsDeleteWingOpen] = useState(false);

  // Add Floor Modal
  const [isAddFloorModal, setIsAddFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState('4F');

  // Add Flat Modal
  const [isAddFlatModal, setIsAddFlatModal] = useState(false);
  const [targetFloorName, setTargetFloorName] = useState('3F');
  const [newFlatNo, setNewFlatNo] = useState('');
  const [newResident, setNewResident] = useState('');

  // Bulk Generate Flats Modal
  const [isBulkGenOpen, setIsBulkGenOpen] = useState(false);
  const [genPreset, setGenPreset] = useState<'G3' | 'G4' | 'G2' | 'CUSTOM'>('G3');
  const [customFloorsInput, setCustomFloorsInput] = useState('3F, 2F, 1F, GR');
  const [flatsPerFloorInput, setFlatsPerFloorInput] = useState('4');
  const [genMode, setGenMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');

  // Edit Flat Modal (Progressive Disclosure on Card Tap)
  const [editingFlat, setEditingFlat] = useState<{
    floorName: string;
    flatNo: string;
    residentName: string;
    isPaid: boolean;
    amountPaid: number;
    paymentMode: 'ONLINE' | 'OFFLINE';
  } | null>(null);

  // Delete Flat Confirmation Modal
  const [flatToDelete, setFlatToDelete] = useState<{ floorName: string; flatNo: string } | null>(null);

  // Selected building object
  const selectedBuilding = buildingsList.find(b => b.id === selectedBuildingId) || buildingsList[0];

  // Accordion state: floors expanded (default expands top floor)
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({
    '3F': true,
    '4F': true,
  });

  const toggleFloor = (floorName: string) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floorName]: !prev[floorName]
    }));
  };

  // Aggregates
  const totalFlatsInBuilding = selectedBuilding
    ? selectedBuilding.floors.reduce((acc, f) => acc + f.flats.length, 0)
    : 0;
  const paidFlatsInBuilding = selectedBuilding
    ? selectedBuilding.floors.reduce((acc, f) => acc + f.flats.filter(flat => flat.isPaid).length, 0)
    : 0;
  const pendingFlatsInBuilding = totalFlatsInBuilding - paidFlatsInBuilding;
  const totalCollectionInBuilding = selectedBuilding
    ? selectedBuilding.floors.reduce((acc, f) => acc + f.flats.reduce((flatAcc, flat) => flatAcc + (flat.isPaid ? flat.amountPaid : 0), 0), 0)
    : 0;

  // Save building helper
  const notifyBuildingUpdate = (updated: Building) => {
    setBuildingsList(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (onUpdateBuilding) onUpdateBuilding(updated);
  };

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim() || !newBuildingCode.trim()) return;
    const cleanCode = newBuildingCode.trim().toUpperCase();
    const newB: Building = {
      id: `bld-${cleanCode}`,
      name: newBuildingName.trim(),
      code: cleanCode,
      floors: [
        { floorName: '3F', flats: [] },
        { floorName: '2F', flats: [] },
        { floorName: '1F', flats: [] },
        { floorName: 'GR', flats: [] },
      ],
    };
    setBuildingsList(prev => [...prev, newB]);
    setSelectedBuildingId(newB.id);
    setAddWingOpen(false);
    setNewBuildingName('');
    setNewBuildingCode('');
    if (onAddBuilding) onAddBuilding(newB.name, newB.code);
    if (onUpdateBuilding) onUpdateBuilding(newB);
  };

  const handleDeleteCurrentWing = () => {
    if (!selectedBuilding) return;
    const wingId = selectedBuilding.id;
    const nextRemaining = buildingsList.filter(b => b.id !== wingId);
    setBuildingsList(nextRemaining);
    if (nextRemaining.length > 0) {
      setSelectedBuildingId(nextRemaining[0].id);
    } else {
      setSelectedBuildingId('');
    }
    setIsDeleteWingOpen(false);
    if (onDeleteBuilding) onDeleteBuilding(wingId);
  };

  const handleCreateFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim() || !selectedBuilding) return;
    const floorName = newFloorName.trim();
    const updated: Building = {
      ...selectedBuilding,
      floors: [{ floorName, flats: [] }, ...selectedBuilding.floors]
    };
    notifyBuildingUpdate(updated);
    setExpandedFloors(prev => ({ ...prev, [floorName]: true }));
    setIsAddFloorModal(false);
    setNewFloorName('');
    if (onAddFloor) onAddFloor(selectedBuilding.id, floorName);
  };

  const handleDeleteFloor = (floorName: string) => {
    if (!selectedBuilding) return;
    const updated: Building = {
      ...selectedBuilding,
      floors: selectedBuilding.floors.filter(f => f.floorName !== floorName)
    };
    notifyBuildingUpdate(updated);
  };

  const handleCreateFlat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlatNo.trim() || !selectedBuilding) return;
    const flatNo = newFlatNo.trim();
    const resident = newResident.trim() || 'Resident';

    const newFlat: Flat = {
      flatNo,
      residentName: resident,
      amountPaid: 0,
      isPaid: false,
    };

    const updated: Building = {
      ...selectedBuilding,
      floors: selectedBuilding.floors.map(f => {
        if (f.floorName !== targetFloorName) return f;
        return {
          ...f,
          flats: [...f.flats, newFlat],
        };
      })
    };

    notifyBuildingUpdate(updated);
    setIsAddFlatModal(false);
    setNewFlatNo('');
    setNewResident('');
    if (onAddFlat) onAddFlat(selectedBuilding.id, targetFloorName, flatNo, resident);
  };

  const handleSaveFlatEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlat || !selectedBuilding) return;

    const { floorName, flatNo, residentName, isPaid, amountPaid, paymentMode } = editingFlat;

    const updated: Building = {
      ...selectedBuilding,
      floors: selectedBuilding.floors.map(f => {
        if (f.floorName !== floorName) return f;
        return {
          ...f,
          flats: f.flats.map(flat => {
            if (flat.flatNo !== flatNo) return flat;
            return {
              ...flat,
              residentName: residentName.trim() || 'Resident',
              isPaid,
              amountPaid: isPaid ? amountPaid : 0,
              paymentMode: isPaid ? paymentMode : undefined,
            };
          }),
        };
      })
    };

    notifyBuildingUpdate(updated);

    if (onUpdateFlat) {
      onUpdateFlat(selectedBuilding.id, flatNo, residentName, isPaid ? amountPaid : 0, isPaid);
    }

    setEditingFlat(null);
  };

  const handleExecuteDeleteFlat = () => {
    if (!flatToDelete || !selectedBuilding) return;
    const { floorName, flatNo } = flatToDelete;

    const updated: Building = {
      ...selectedBuilding,
      floors: selectedBuilding.floors.map(f => {
        if (f.floorName !== floorName) return f;
        return {
          ...f,
          flats: f.flats.filter(flat => flat.flatNo !== flatNo)
        };
      })
    };

    notifyBuildingUpdate(updated);
    setFlatToDelete(null);
    setEditingFlat(null);
    if (onDeleteFlat) onDeleteFlat(selectedBuilding.id, floorName, flatNo);
  };

  // Bulk Flat Generator Helper
  const getFloorsForGenerator = (): string[] => {
    if (genPreset === 'G3') return ['3F', '2F', '1F', 'GR'];
    if (genPreset === 'G4') return ['4F', '3F', '2F', '1F', 'GR'];
    if (genPreset === 'G2') return ['2F', '1F', 'GR'];
    return customFloorsInput
      .split(/[,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);
  };

  const getFlatsForFloor = (floorName: string, count: number): string[] => {
    const fn = floorName.toUpperCase();
    let floorDigit = '0';
    if (fn === 'GR' || fn === 'G' || fn === 'GROUND' || fn === '0F' || fn === '0') {
      floorDigit = '0';
    } else {
      const match = fn.match(/\d+/);
      floorDigit = match ? match[0] : '1';
    }

    const flats: string[] = [];
    for (let i = 1; i <= count; i++) {
      if (floorDigit === '0') {
        // Ground floor: 001, 002, 003, 004
        flats.push(`00${i}`);
      } else {
        // 1st floor: 101, 102, 103, 104; 2nd floor: 201...
        flats.push(`${floorDigit}0${i}`);
      }
    }
    return flats;
  };

  const handleApplyBulkFlats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    const floorsList = getFloorsForGenerator();
    const count = parseInt(flatsPerFloorInput, 10) || 4;

    // Existing flats map for MERGE mode
    const existingFlatsMap: Record<string, Flat> = {};
    if (genMode === 'MERGE') {
      selectedBuilding.floors.forEach(f => {
        f.flats.forEach(fl => {
          existingFlatsMap[fl.flatNo] = fl;
        });
      });
    }

    const generatedFloors: Floor[] = floorsList.map(fName => {
      const flatNumbers = getFlatsForFloor(fName, count);
      const flats: Flat[] = flatNumbers.map(flatNo => {
        if (genMode === 'MERGE' && existingFlatsMap[flatNo]) {
          return existingFlatsMap[flatNo];
        }
        return {
          flatNo,
          residentName: 'Resident',
          amountPaid: 0,
          isPaid: false,
        };
      });
      return { floorName: fName, flats };
    });

    const updated: Building = {
      ...selectedBuilding,
      floors: generatedFloors
    };

    notifyBuildingUpdate(updated);

    // Expand top floor
    if (generatedFloors[0]) {
      setExpandedFloors({ [generatedFloors[0].floorName]: true });
    }

    setIsBulkGenOpen(false);
  };

  const previewFloors = getFloorsForGenerator();
  const previewFlatCount = parseInt(flatsPerFloorInput, 10) || 4;
  const totalPreviewFlats = previewFloors.length * previewFlatCount;

  return (
    <div className="space-y-3">
      {/* 1. Buildings Header & Wing Switcher Chips */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">Buildings / Wings</span>
          <button
            type="button"
            onClick={() => setAddWingOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 active:scale-95 transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Wing</span>
          </button>
        </div>

        {/* Compact Wing Chips: A Wing · A */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {buildingsList.map((b) => {
            const isSelected = selectedBuildingId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBuildingId(b.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition shrink-0 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <span>{b.name} · {b.code}</span>
              </button>
            );
          })}

          {buildingsList.length === 0 && (
            <span className="text-xs text-slate-400 py-1">No wings configured yet. Tap "+ Add Wing" to configure.</span>
          )}
        </div>
      </div>

      {/* 2. Selected Wing Header, Actions & 2x2 Summary */}
      {selectedBuilding && (
        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-3">
          {/* Header: A Wing · A + Buttons (+ Floor, + Flat, ⚡ Bulk Generate) */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                {selectedBuilding.name}
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {selectedBuilding.code}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsBulkGenOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/80 text-xs font-semibold active:scale-95 transition cursor-pointer shadow-2xs"
                title="Generate standard floors & flats in bulk"
              >
                <Zap size={12} className="text-violet-600" />
                <span>Bulk Generate</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddFloorModal(true)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium active:scale-95 transition cursor-pointer"
              >
                + Floor
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetFloorName(selectedBuilding.floors[0]?.floorName || '3F');
                  setIsAddFlatModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium active:scale-95 transition cursor-pointer"
              >
                + Flat
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteWingOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Delete this Wing"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* 4 Summary Cards: 2x2 Clean Mobile Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium block">Collected</span>
              <span className="text-sm font-semibold text-emerald-700 tabular-numbers mt-0.5 block">
                {formatINR(totalCollectionInBuilding)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium block">Total Flats</span>
              <span className="text-sm font-semibold text-slate-900 tabular-numbers mt-0.5 block">
                {totalFlatsInBuilding}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-medium block">Paid</span>
              <span className="text-sm font-semibold text-emerald-800 tabular-numbers mt-0.5 block">
                {paidFlatsInBuilding}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
              <span className="text-[10px] text-amber-700 font-medium block">Pending</span>
              <span className="text-sm font-semibold text-amber-800 tabular-numbers mt-0.5 block">
                {pendingFlatsInBuilding}
              </span>
            </div>
          </div>

          {/* Elevation Matrix: Collapsible Floors */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {selectedBuilding.floors.map((floor) => {
              const paidCount = floor.flats.filter(f => f.isPaid).length;
              const isExpanded = expandedFloors[floor.floorName] ?? false;

              return (
                <div
                  key={floor.floorName}
                  className="rounded-xl bg-slate-50/80 border border-slate-200/80 overflow-hidden transition"
                >
                  {/* Floor Header (Tap to Expand / Collapse) */}
                  <div
                    onClick={() => toggleFloor(floor.floorName)}
                    className="p-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100/70 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">Floor {floor.floorName}</span>
                      <span className="text-[11px] text-slate-500">
                        {paidCount}/{floor.flats.length} paid
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Delete floor button (if empty or admin wants) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete Floor ${floor.floorName} and its ${floor.flats.length} flats?`)) {
                            handleDeleteFloor(floor.floorName);
                          }
                        }}
                        className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title={`Delete floor ${floor.floorName}`}
                      >
                        <Trash2 size={12} />
                      </button>

                      <div className="text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Flat Cards Grid */}
                  {isExpanded && (
                    <div className="p-2 pt-0 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {floor.flats.map((flat) => (
                        <div
                          key={flat.flatNo}
                          onClick={() => setEditingFlat({
                            floorName: floor.floorName,
                            flatNo: flat.flatNo,
                            residentName: flat.residentName || 'Resident',
                            isPaid: flat.isPaid,
                            amountPaid: flat.amountPaid || 200,
                            paymentMode: flat.paymentMode || 'ONLINE',
                          })}
                          className={`p-2 rounded-xl border text-xs transition cursor-pointer active:scale-98 relative group ${
                            flat.isPaid
                              ? 'bg-white border-emerald-300 shadow-2xs hover:border-emerald-400'
                              : 'bg-white/90 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 font-mono text-sm">{flat.flatNo}</span>
                            {flat.isPaid ? (
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-emerald-600 tabular-numbers">
                                  {formatINR(flat.amountPaid)}
                                </span>
                                {flat.paymentMode && (
                                  <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                                    flat.paymentMode === 'ONLINE' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {flat.paymentMode === 'ONLINE' ? 'UPI' : 'Cash'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">Pending</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] text-slate-500 font-normal truncate">
                              {flat.residentName || 'Resident'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {floor.flats.length === 0 && (
                        <div className="col-span-2 sm:col-span-4 py-3 text-center text-[11px] text-slate-400">
                          No flats on this floor. Tap &quot;+ Flat&quot; or &quot;⚡ Bulk Generate&quot; to populate.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedBuilding && (
        <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200/80">
          No wings configured. Tap &quot;+ Add Wing&quot; to create a building wing.
        </div>
      )}

      {/* BULK GENERATE FLATS MODAL */}
      {isBulkGenOpen && selectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-4 space-y-3 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-violet-100 text-violet-700">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    Bulk Generate Flats — {selectedBuilding.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">Auto-number 001-004, 101-104, 201-204...</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkGenOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkFlats} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              {/* Floor Preset Selection */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Floors Preset</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGenPreset('G3')}
                    className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer ${
                      genPreset === 'G3'
                        ? 'border-violet-600 bg-violet-50/60 text-violet-900 font-semibold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">GR + 3 Floors</span>
                    <span className="text-[10px] text-slate-400 font-normal">GR, 1F, 2F, 3F</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenPreset('G4')}
                    className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer ${
                      genPreset === 'G4'
                        ? 'border-violet-600 bg-violet-50/60 text-violet-900 font-semibold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">GR + 4 Floors</span>
                    <span className="text-[10px] text-slate-400 font-normal">GR, 1F, 2F, 3F, 4F</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenPreset('G2')}
                    className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer ${
                      genPreset === 'G2'
                        ? 'border-violet-600 bg-violet-50/60 text-violet-900 font-semibold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">GR + 2 Floors</span>
                    <span className="text-[10px] text-slate-400 font-normal">GR, 1F, 2F</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenPreset('CUSTOM')}
                    className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer ${
                      genPreset === 'CUSTOM'
                        ? 'border-violet-600 bg-violet-50/60 text-violet-900 font-semibold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">Custom Floors</span>
                    <span className="text-[10px] text-slate-400 font-normal">Enter comma-separated</span>
                  </button>
                </div>
              </div>

              {genPreset === 'CUSTOM' && (
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Custom Floor List (Top to Bottom)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5F, 4F, 3F, 2F, 1F, GR"
                    value={customFloorsInput}
                    onChange={(e) => setCustomFloorsInput(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              )}

              {/* Number of Flats per Floor */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Flats per Floor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={flatsPerFloorInput}
                    onChange={(e) => setFlatsPerFloorInput(e.target.value)}
                    className="w-24 p-2 rounded-xl border border-slate-200 font-semibold text-slate-900 text-center"
                  />
                  <span className="text-slate-500 text-xs">
                    flats on each floor (e.g. 4 → 001..004, 101..104, 201..204)
                  </span>
                </div>
              </div>

              {/* Replace vs Merge Mode */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Apply Method</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGenMode('REPLACE')}
                    className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                      genMode === 'REPLACE'
                        ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>Replace All Flats</span>
                    <span className="block text-[10px] opacity-75 font-normal">Clean generate new layout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenMode('MERGE')}
                    className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                      genMode === 'MERGE'
                        ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>Merge with Existing</span>
                    <span className="block text-[10px] opacity-75 font-normal">Keep existing payments/names</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>Generation Preview</span>
                  <span className="text-violet-700">{totalPreviewFlats} Total Flats</span>
                </div>

                <div className="space-y-1 text-[11px] max-h-36 overflow-y-auto">
                  {previewFloors.map(fName => {
                    const flats = getFlatsForFloor(fName, previewFlatCount);
                    return (
                      <div key={fName} className="flex items-start gap-2 bg-white p-1.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-800 w-10 shrink-0">{fName}:</span>
                        <span className="text-slate-600 font-mono text-[10px] flex-wrap break-all">
                          {flats.join(', ')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Note: You can easily delete any specific unused flat (e.g. 104) after generating.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBulkGenOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 active:scale-95 transition cursor-pointer shadow-2xs"
                >
                  Generate {totalPreviewFlats} Flats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FLAT MODAL (WITH PERMANENT DELETE OPTION) */}
      {editingFlat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-sm text-slate-900">
                  Flat {editingFlat.flatNo}
                </h4>
                <span className="text-[10px] font-medium text-slate-400">
                  ({editingFlat.floorName})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingFlat(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFlatEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Resident Name</label>
                <input
                  type="text"
                  value={editingFlat.residentName}
                  onChange={(e) => setEditingFlat({ ...editingFlat, residentName: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                  placeholder="Resident Name"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFlat({ ...editingFlat, isPaid: true })}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                      editingFlat.isPaid
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingFlat({ ...editingFlat, isPaid: false })}
                    className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                      !editingFlat.isPaid
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>

              {editingFlat.isPaid && (
                <>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingFlat.amountPaid}
                      onChange={(e) => setEditingFlat({ ...editingFlat, amountPaid: Number(e.target.value) || 0 })}
                      className="w-full p-2 rounded-xl border border-slate-200 font-medium tabular-numbers"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Payment Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingFlat({ ...editingFlat, paymentMode: 'ONLINE' })}
                        className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                          editingFlat.paymentMode === 'ONLINE'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFlat({ ...editingFlat, paymentMode: 'OFFLINE' })}
                        className={`py-1.5 rounded-xl font-medium transition cursor-pointer ${
                          editingFlat.paymentMode === 'OFFLINE'
                            ? 'bg-slate-800 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Cash
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {/* Delete Flat Option */}
                <button
                  type="button"
                  onClick={() => setFlatToDelete({ floorName: editingFlat.floorName, flatNo: editingFlat.flatNo })}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  title="Delete this flat"
                >
                  <Trash2 size={13} />
                  <span>Delete Flat</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFlat(null)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE FLAT MODAL */}
      {flatToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-rose-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 size={16} />
              <h4 className="font-semibold text-sm text-slate-900">Delete Flat {flatToDelete.flatNo}?</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete Flat <strong>{flatToDelete.flatNo}</strong> from Floor {flatToDelete.floorName}?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFlatToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteFlat}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer shadow-2xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE WING MODAL */}
      {isDeleteWingOpen && selectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-rose-200 p-4 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle size={18} />
              <h4 className="font-semibold text-sm text-slate-900">Delete {selectedBuilding.name}?</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this wing and all its floors and flats?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteWingOpen(false)}
                className="px-3 py-1.5 rounded-lg text-slate-600 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentWing}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer shadow-2xs"
              >
                Yes, Delete Wing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD WING MODAL */}
      {isAddWingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Building Wing</h4>
              <button
                type="button"
                onClick={() => setAddWingOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBuilding} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Wing Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C Wing"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Telegram Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C"
                  value={newBuildingCode}
                  onChange={(e) => setNewBuildingCode(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddWingOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800"
                >
                  Create Wing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FLOOR MODAL */}
      {isAddFloorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Floor</h4>
              <button
                type="button"
                onClick={() => setIsAddFloorModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFloor} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Floor Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4F"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFloorModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800"
                >
                  Add Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FLAT MODAL */}
      {isAddFlatModal && selectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Flat</h4>
              <button
                type="button"
                onClick={() => setIsAddFlatModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFlat} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Target Floor</label>
                <select
                  value={targetFloorName}
                  onChange={(e) => setTargetFloorName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                >
                  {selectedBuilding.floors.map(f => (
                    <option key={f.floorName} value={f.floorName}>Floor {f.floorName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Flat Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 305"
                  value={newFlatNo}
                  onChange={(e) => setNewFlatNo(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Resident Name</label>
                <input
                  type="text"
                  placeholder="e.g. Deshmukh"
                  value={newResident}
                  onChange={(e) => setNewResident(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFlatModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800"
                >
                  Add Flat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
