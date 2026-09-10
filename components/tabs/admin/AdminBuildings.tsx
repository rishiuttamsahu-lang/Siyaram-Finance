'use client';

import React, { useState } from 'react';
import { Building, Floor, Flat } from '../../../lib/types';
import { formatINR } from '../../../lib/finance';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface AdminBuildingsProps {
  buildings: Building[];
  onAddBuilding?: (name: string, code: string) => void;
  onAddFloor?: (buildingId: string, floorName: string) => void;
  onAddFlat?: (buildingId: string, floorName: string, flatNo: string, residentName: string) => void;
  onUpdateFlat?: (buildingId: string, flatNo: string, residentName: string, amount: number, isPaid: boolean) => void;
  isAddWingModalOpen?: boolean;
  setIsAddWingModalOpen?: (open: boolean) => void;
}

export const AdminBuildings: React.FC<AdminBuildingsProps> = ({
  buildings: initialBuildings,
  onAddBuilding,
  onAddFloor,
  onAddFlat,
  onUpdateFlat,
  isAddWingModalOpen: externalIsAddWingOpen,
  setIsAddWingModalOpen: externalSetIsAddWingOpen,
}) => {
  const [buildingsList, setBuildingsList] = useState<Building[]>(initialBuildings);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(initialBuildings[0]?.id || '');

  // Add Wing Modal
  const [internalIsAddWingOpen, setInternalIsAddWingOpen] = useState(false);
  const isAddWingOpen = externalIsAddWingOpen !== undefined ? externalIsAddWingOpen : internalIsAddWingOpen;
  const setAddWingOpen = externalSetIsAddWingOpen !== undefined ? externalSetIsAddWingOpen : setInternalIsAddWingOpen;

  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingCode, setNewBuildingCode] = useState('');

  // Add Floor Modal
  const [isAddFloorModal, setIsAddFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState('4F');

  // Add Flat Modal
  const [isAddFlatModal, setIsAddFlatModal] = useState(false);
  const [targetFloorName, setTargetFloorName] = useState('3F');
  const [newFlatNo, setNewFlatNo] = useState('');
  const [newResident, setNewResident] = useState('');

  // Edit Flat Modal (Progressive Disclosure on Card Tap)
  const [editingFlat, setEditingFlat] = useState<{
    floorName: string;
    flatNo: string;
    residentName: string;
    isPaid: boolean;
    amountPaid: number;
    paymentMode: 'ONLINE' | 'OFFLINE';
  } | null>(null);

  // Selected building object
  const selectedBuilding = buildingsList.find(b => b.id === selectedBuildingId) || buildingsList[0];

  // Accordion state: only one floor expanded at a time on mobile (default: 3F)
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({
    '3F': true,
  });

  const toggleFloor = (floorName: string) => {
    setExpandedFloors(prev => {
      // If already open, collapse it
      if (prev[floorName]) {
        return {};
      }
      // Only the tapped floor expands, others collapse
      return { [floorName]: true };
    });
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
  };

  const handleCreateFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim() || !selectedBuilding) return;
    const floorName = newFloorName.trim();
    setBuildingsList(prev =>
      prev.map(b =>
        b.id === selectedBuilding.id
          ? { ...b, floors: [{ floorName, flats: [] }, ...b.floors] }
          : b
      )
    );
    setExpandedFloors({ [floorName]: true });
    setIsAddFloorModal(false);
    setNewFloorName('');
    if (onAddFloor) onAddFloor(selectedBuilding.id, floorName);
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

    setBuildingsList(prev =>
      prev.map(b => {
        if (b.id !== selectedBuilding.id) return b;
        return {
          ...b,
          floors: b.floors.map(f => {
            if (f.floorName !== targetFloorName) return f;
            return {
              ...f,
              flats: [...f.flats, newFlat],
            };
          }),
        };
      })
    );

    setIsAddFlatModal(false);
    setNewFlatNo('');
    setNewResident('');
    if (onAddFlat) onAddFlat(selectedBuilding.id, targetFloorName, flatNo, resident);
  };

  const handleSaveFlatEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlat || !selectedBuilding) return;

    const { floorName, flatNo, residentName, isPaid, amountPaid, paymentMode } = editingFlat;

    setBuildingsList(prev =>
      prev.map(b => {
        if (b.id !== selectedBuilding.id) return b;
        return {
          ...b,
          floors: b.floors.map(f => {
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
          }),
        };
      })
    );

    if (onUpdateFlat) {
      onUpdateFlat(selectedBuilding.id, flatNo, residentName, isPaid ? amountPaid : 0, isPaid);
    }

    setEditingFlat(null);
  };

  return (
    <div className="space-y-3">
      {/* 1. Buildings Header & Wing Switcher Chips */}
      <div className="glass-card rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">Buildings</span>
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
        </div>
      </div>

      {/* 2. Selected Wing Header, Actions & 2x2 Summary */}
      {selectedBuilding && (
        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 space-y-3">
          {/* Header: A Wing · A + Buttons (+ Floor, + Flat) */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                {selectedBuilding.name}
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {selectedBuilding.code}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
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
              <span className="text-[10px] text-slate-400 font-medium block">Flats</span>
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

          {/* Elevation Matrix: Accordion Collapsible Floors */}
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
                      <span className="font-semibold text-slate-900">{floor.floorName}</span>
                      <span className="text-[11px] text-slate-500">
                        {paidCount}/{floor.flats.length} paid
                      </span>
                    </div>

                    <div className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {/* Expanded Flat Cards Grid */}
                  {isExpanded && (
                    <div className="p-2 pt-0 border-t border-slate-200/60 grid grid-cols-2 gap-2 mt-2">
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
                          className={`p-2 rounded-xl border text-xs transition cursor-pointer active:scale-98 ${
                            flat.isPaid
                              ? 'bg-white border-emerald-300 shadow-2xs hover:border-emerald-400'
                              : 'bg-white/90 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{flat.flatNo}</span>
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

                          <div className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">
                            {flat.residentName || 'Resident'}
                          </div>
                        </div>
                      ))}

                      {floor.flats.length === 0 && (
                        <div className="col-span-2 py-3 text-center text-[11px] text-slate-400">
                          No flats added to this floor yet. Tap + Flat to add.
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

      {/* QUICK EDIT / VIEW FLAT DETAILS MODAL (PROGRESSIVE DISCLOSURE) */}
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
            </form>
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
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
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
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
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
      {isAddFlatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">Add Flat</h4>
              <button
                type="button"
                onClick={() => setIsAddFlatModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
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
