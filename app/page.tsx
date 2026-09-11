'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Season, 
  Member, 
  Building, 
  Flat, 
  Transaction, 
  AuditLog, 
  PaymentMode 
} from '../lib/types';
import { 
  initialSeason, 
  initialMembers, 
  initialBuildings, 
  initialTransactions, 
  initialAuditLogs 
} from '../lib/initialData';
import { 
  calculateMandalTotals, 
  allocatePayment, 
  createReversalAuditLog 
} from '../lib/finance';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  isAdminEmail, 
  onAuthStateChanged 
} from '../lib/firebase';
import { User } from 'firebase/auth';
import dynamic from 'next/dynamic';
import { IOSHeader } from '../components/iOSHeader';
import { BottomNav, TabType } from '../components/BottomNav';
import { MembersSkeleton } from '../components/skeletons/MembersSkeleton';
import { BuildingsSkeleton } from '../components/skeletons/BuildingsSkeleton';
import { TransactionsSkeleton } from '../components/skeletons/TransactionsSkeleton';

// Next.js Dynamic Component Lazy Loading with Skeleton Fallbacks
const MembersTab = dynamic(() => import('../components/tabs/MembersTab').then(mod => mod.MembersTab), {
  ssr: false,
  loading: () => <MembersSkeleton />,
});

const BuildingsTab = dynamic(() => import('../components/tabs/BuildingsTab').then(mod => mod.BuildingsTab), {
  ssr: false,
  loading: () => <BuildingsSkeleton />,
});

const IncomeTab = dynamic(() => import('../components/tabs/IncomeTab').then(mod => mod.IncomeTab), {
  ssr: false,
  loading: () => <TransactionsSkeleton type="income" />,
});

const ExpenseTab = dynamic(() => import('../components/tabs/ExpenseTab').then(mod => mod.ExpenseTab), {
  ssr: false,
  loading: () => <TransactionsSkeleton type="expense" />,
});

const AdminTab = dynamic(() => import('../components/tabs/AdminTab').then(mod => mod.AdminTab), {
  ssr: false,
  loading: () => <MembersSkeleton />,
});

const NumericKeypadModal = dynamic(() => import('../components/NumericKeypadModal').then(mod => mod.NumericKeypadModal), {
  ssr: false,
});

const AuthModal = dynamic(() => import('../components/AuthModal').then(mod => mod.AuthModal), {
  ssr: false,
});

const SnapshotDeployModal = dynamic(() => import('../components/SnapshotDeployModal').then(mod => mod.SnapshotDeployModal), {
  ssr: false,
});

import {
  subscribeToActiveSeason,
  subscribeToSeason,
  subscribeToMembers,
  subscribeToBuildings,
  subscribeToTransactions,
  subscribeToAuditLogs,
  saveTransactionToFirestore,
  updateTransactionInFirestore,
  saveMemberToFirestore,
  deleteMemberFromFirestore,
  saveBuildingToFirestore,
  deleteBuildingFromFirestore,
  saveSeasonToFirestore,
  saveAuditLogToFirestore,
} from '../lib/firestoreService';

export default function Home() {
  // Application Data States (Hydrated with authentic data)
  const [season, setSeason] = useState<Season>(initialSeason);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Loading state machine to prevent "0" flash before Firestore hydration
  const [loadedStatus, setLoadedStatus] = useState({
    season: false,
    members: false,
    buildings: false,
    transactions: false,
  });

  const isInitialLoading = !loadedStatus.season || !loadedStatus.members || !loadedStatus.transactions;

  // Fallback safety timeout so UI never remains stuck in skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedStatus({ season: true, members: true, buildings: true, transactions: true });
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<TabType>('members');

  // Khajanchi personal bank balance for fund separation (PRD §5.7)
  const [bankBalance, setBankBalance] = useState<number>(60000);

  // Smooth scroll to top on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Google Auth User & Admin Gating
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);

  // Listen for Google Auth state changes
  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const isUserAdmin = isAdminEmail(currentUser?.email);
      setIsAdmin(isUserAdmin);
      if (!isUserAdmin && activeTab === 'admin') {
        setActiveTab('members');
      }
    });
    return () => unsubAuth();
  }, [activeTab]);

  // Real-time Firestore synchronization with hydration tracking
  useEffect(() => {
    const unsubSeason = subscribeToActiveSeason((cloudSeason) => {
      if (cloudSeason) {
        setSeason(cloudSeason);
      } else {
        setSeason(initialSeason);
      }
      setLoadedStatus(prev => ({ ...prev, season: true }));
    });
    const unsubMembers = subscribeToMembers((cloudMembers) => {
      setMembers(cloudMembers || []);
      setLoadedStatus(prev => ({ ...prev, members: true }));
    });
    const unsubBuildings = subscribeToBuildings((cloudBuildings) => {
      setBuildings(cloudBuildings || []);
      setLoadedStatus(prev => ({ ...prev, buildings: true }));
    });
    const unsubTxns = subscribeToTransactions((cloudTxns) => {
      setTransactions(cloudTxns || []);
      setLoadedStatus(prev => ({ ...prev, transactions: true }));
    });
    const unsubLogs = subscribeToAuditLogs((cloudLogs) => {
      setAuditLogs(cloudLogs || []);
    });

    return () => {
      unsubSeason?.();
      unsubMembers?.();
      unsubBuildings?.();
      unsubTxns?.();
      unsubLogs?.();
    };
  }, []);

  // Keypad Modal State
  const [keypadConfig, setKeypadConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    entityName?: string;
    categoryLabel?: string;
    defaultAmount?: number;
    actionType: 'MEMBER' | 'BUILDING' | 'CHANDA' | 'EXPENSE';
    targetMember?: Member;
    targetBuilding?: Building;
    targetFlat?: Flat;
  }>({
    isOpen: false,
    title: '',
    actionType: 'CHANDA',
  });

  // Calculate live financial totals strictly from ACTIVE transactions
  const summary = useMemo(() => {
    return calculateMandalTotals(transactions, season.openingBalance, bankBalance);
  }, [transactions, season.openingBalance, bankBalance]);

  // Count pending member dues for bottom nav badge
  const pendingDuesCount = useMemo(() => {
    return members.filter(m => !m.isHonorary && (m.previousYearPending > 0 || (m.payments[season.liveMonth] || 0) < 100)).length;
  }, [members, season.liveMonth]);

  // Handlers for Member Payment
  const openMemberPaymentModal = (member: Member) => {
    const due = (member.previousYearPending || 0) + (member.monthlyOverrides?.[season.liveMonth] || season.defaultMonthlyQuota);
    setKeypadConfig({
      isOpen: true,
      title: `Contribution: ${member.name}`,
      subtitle: `Waterfall: Prev Debt → ${season.liveMonth} Due → Carry Forward`,
      entityName: member.name,
      categoryLabel: 'Member Contribution',
      defaultAmount: due > 0 ? due : 100,
      actionType: 'MEMBER',
      targetMember: member,
    });
  };

  // Handlers for Building Flat Collection
  const openFlatModal = (building: Building, flat: Flat) => {
    setKeypadConfig({
      isOpen: true,
      title: `${building.name} • Flat ${flat.flatNo}`,
      subtitle: `Door-to-door resident collection (Wing code: ${building.code})`,
      entityName: `${building.name} - Flat ${flat.flatNo}`,
      categoryLabel: 'Building Collection',
      defaultAmount: flat.isPaid ? flat.amountPaid : 200,
      actionType: 'BUILDING',
      targetBuilding: building,
      targetFlat: flat,
    });
  };

  // Handlers for Extra Chanda
  const openAddIncomeModal = () => {
    setKeypadConfig({
      isOpen: true,
      title: 'Add Chanda',
      subtitle: 'Record donor or shop contribution',
      categoryLabel: 'Chanda Entry',
      defaultAmount: 100,
      actionType: 'CHANDA',
    });
  };

  // Handlers for Expense
  const openAddExpenseModal = () => {
    setKeypadConfig({
      isOpen: true,
      title: 'Log Expense',
      subtitle: 'Record vendor or material expense',
      categoryLabel: 'Mandal Expense',
      defaultAmount: 150,
      actionType: 'EXPENSE',
    });
  };

  // Execute payment / collection confirmed via iOS Keypad
  const handleKeypadConfirm = (amount: number, mode: PaymentMode, note?: string) => {
    const now = new Date().toISOString();
    const nextSeq = Math.max(...transactions.map(t => t.sequenceNumber), 0) + 1;

    if (keypadConfig.actionType === 'MEMBER' && keypadConfig.targetMember) {
      // 1. Run the strict Payment Allocation Waterfall (PRD §5.4)
      const { updatedMember, allocationLog } = allocatePayment(
        keypadConfig.targetMember,
        amount,
        season
      );

      // Update members list
      setMembers(prev => prev.map(m => (m.id === updatedMember.id ? updatedMember : m)));

      // 2. Append immutable transaction record
      const newTxn: Transaction = {
        id: `txn-${Date.now()}`,
        sequenceNumber: nextSeq,
        timestamp: now,
        type: 'MEMBER',
        amount,
        mode,
        status: 'ACTIVE',
        description: `Member: ${updatedMember.name}`,
        source: isAdmin ? 'WEB' : 'TEL',
        metadata: {
          memberId: updatedMember.id,
          memberName: updatedMember.name,
        },
      };
      setTransactions(prev => [newTxn, ...prev]);

      // 3. Append Audit Log
      const newAudit: AuditLog = {
        id: `log-${Date.now()}`,
        txnId: newTxn.id,
        action: 'CREATE',
        previousValue: null,
        newValue: { amount, mode, member: updatedMember.name, allocationLog },
        performedBy: isAdmin ? 'Admin:Web' : 'TelegramBot',
        timestamp: now,
        notes: `Waterfall: Cleared prev ₹${allocationLog.clearedPrevPending}`,
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      // Cloud Firestore background synchronization
      saveMemberToFirestore(updatedMember).catch(e => console.warn('Firestore member notice:', e));
      saveTransactionToFirestore(newTxn).catch(e => console.warn('Firestore txn notice:', e));
      saveAuditLogToFirestore(newAudit).catch(e => console.warn('Firestore audit notice:', e));
    } else if (keypadConfig.actionType === 'BUILDING' && keypadConfig.targetBuilding && keypadConfig.targetFlat) {
      const bCode = keypadConfig.targetBuilding.code;
      const fNo = keypadConfig.targetFlat.flatNo;

      let updatedBuildingToSave: Building | null = null;
      // Update Building Flat State
      setBuildings(prev =>
        prev.map(b => {
          if (b.id !== keypadConfig.targetBuilding?.id) return b;
          const updatedBuilding = {
            ...b,
            floors: b.floors.map(f => ({
              ...f,
              flats: f.flats.map(fl => {
                if (fl.flatNo !== fNo) return fl;
                return {
                  ...fl,
                  isPaid: true,
                  amountPaid: amount,
                  paymentMode: mode,
                  residentName: note || fl.residentName || 'Resident',
                  updatedAt: now,
                };
              }),
            })),
          };
          updatedBuildingToSave = updatedBuilding;
          return updatedBuilding;
        })
      );

      const newTxn: Transaction = {
        id: `txn-${Date.now()}`,
        sequenceNumber: nextSeq,
        timestamp: now,
        type: 'BUILDING',
        amount,
        mode,
        status: 'ACTIVE',
        description: `${bCode} Wing Flat ${fNo} (${note || 'Resident'})`,
        source: isAdmin ? 'WEB' : 'TEL',
        metadata: {
          buildingCode: bCode,
          flatNo: fNo,
        },
      };
      setTransactions(prev => [newTxn, ...prev]);

      const newAudit: AuditLog = {
        id: `log-${Date.now()}`,
        txnId: newTxn.id,
        action: 'CREATE',
        previousValue: null,
        newValue: { amount, building: bCode, flat: fNo, mode },
        performedBy: isAdmin ? 'Admin:Web' : 'TelegramBot',
        timestamp: now,
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      // Cloud Firestore background synchronization
      if (updatedBuildingToSave) {
        saveBuildingToFirestore(updatedBuildingToSave).catch(e => console.warn('Firestore building notice:', e));
      }
      saveTransactionToFirestore(newTxn).catch(e => console.warn('Firestore txn notice:', e));
      saveAuditLogToFirestore(newAudit).catch(e => console.warn('Firestore audit notice:', e));
    } else if (keypadConfig.actionType === 'CHANDA') {
      const desc = note?.trim() || 'General Chanda';
      const newTxn: Transaction = {
        id: `txn-${Date.now()}`,
        sequenceNumber: nextSeq,
        timestamp: now,
        type: 'CHANDA',
        amount,
        mode,
        status: 'ACTIVE',
        description: desc,
        source: isAdmin ? 'WEB' : 'TEL',
      };
      setTransactions(prev => [newTxn, ...prev]);

      const newAudit: AuditLog = {
        id: `log-${Date.now()}`,
        txnId: newTxn.id,
        action: 'CREATE',
        previousValue: null,
        newValue: { amount, description: desc, mode },
        performedBy: isAdmin ? 'Admin:Web' : 'TelegramBot',
        timestamp: now,
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      // Cloud Firestore background synchronization
      saveTransactionToFirestore(newTxn).catch(e => console.warn('Firestore txn notice:', e));
      saveAuditLogToFirestore(newAudit).catch(e => console.warn('Firestore audit notice:', e));
    } else if (keypadConfig.actionType === 'EXPENSE') {
      const desc = note?.trim() || 'Mandal Expense Item';
      const newTxn: Transaction = {
        id: `txn-${Date.now()}`,
        sequenceNumber: nextSeq,
        timestamp: now,
        type: 'EXPENSE',
        amount,
        mode,
        status: 'ACTIVE',
        description: desc,
        source: isAdmin ? 'WEB' : 'TEL',
      };
      setTransactions(prev => [newTxn, ...prev]);

      const newAudit: AuditLog = {
        id: `log-${Date.now()}`,
        txnId: newTxn.id,
        action: 'CREATE',
        previousValue: null,
        newValue: { amount, description: desc, mode },
        performedBy: isAdmin ? 'Admin:Web' : 'TelegramBot',
        timestamp: now,
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      // Cloud Firestore background synchronization
      saveTransactionToFirestore(newTxn).catch(e => console.warn('Firestore txn notice:', e));
      saveAuditLogToFirestore(newAudit).catch(e => console.warn('Firestore audit notice:', e));
    }
  };

  // Reversal Protocol (<id> undo) - Agent-rules.md §1 & Architecture §6
  const handleUndoTransaction = (txn: Transaction) => {
    if (confirm(`Are you sure you want to reverse Transaction #${txn.sequenceNumber} (${txn.description})? This will flip status to REVERSED without deleting history.`)) {
      // 1. Flip status in-place
      setTransactions(prev =>
        prev.map(t => (t.id === txn.id ? { ...t, status: 'REVERSED' as const } : t))
      );

      // 2. Append immutable Audit Log
      const reversalLog = createReversalAuditLog(txn, isAdmin ? 'Admin:Web' : 'TelegramBot');
      setAuditLogs(prev => [reversalLog, ...prev]);

      // Cloud Firestore background synchronization
      updateTransactionInFirestore(txn.id, { status: 'REVERSED' }).catch(e => console.warn('Firestore undo notice:', e));
      saveAuditLogToFirestore(reversalLog).catch(e => console.warn('Firestore audit notice:', e));
    }
  };

  // Admin: Toggle month block
  const handleToggleBlockMonth = (month: string) => {
    setSeason(prev => {
      const isBlocked = prev.blockedMonths.includes(month);
      const newBlocked = isBlocked
        ? prev.blockedMonths.filter(m => m !== month)
        : [...prev.blockedMonths, month];
      const updated = { ...prev, blockedMonths: newBlocked };
      saveSeasonToFirestore(updated).catch(e => console.warn('Firestore season notice:', e));
      return updated;
    });
  };

  // Admin: Add month to season schedule
  const handleAddMonth = (month: string) => {
    setSeason(prev => {
      if (prev.months.includes(month)) return prev;
      const newMonths = [...prev.months, month].sort();
      const updated = { ...prev, months: newMonths };
      saveSeasonToFirestore(updated).catch(e => console.warn('Firestore season notice:', e));
      return updated;
    });
  };

  // Admin: Delete month from season schedule
  const handleDeleteMonth = (month: string) => {
    setSeason(prev => {
      const newMonths = prev.months.filter(m => m !== month);
      const newBlocked = prev.blockedMonths.filter(m => m !== month);
      const updated = { ...prev, months: newMonths, blockedMonths: newBlocked };
      saveSeasonToFirestore(updated).catch(e => console.warn('Firestore season notice:', e));
      return updated;
    });
  };

  // Admin: Update default monthly quota
  const handleUpdateDefaultQuota = (newQuota: number) => {
    setSeason(prev => {
      const updated = { ...prev, defaultMonthlyQuota: newQuota };
      saveSeasonToFirestore(updated).catch(e => console.warn('Firestore season notice:', e));
      return updated;
    });
  };

  // Admin: Set member month override
  const handleSetMemberMonthOverride = (memberId: string, month: string, amount: number | null) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== memberId) return m;
        const currentOverrides = { ...(m.monthlyOverrides || {}) };
        if (amount === null) {
          delete currentOverrides[month];
        } else {
          currentOverrides[month] = amount;
        }
        const updated = {
          ...m,
          monthlyOverrides: currentOverrides,
        };
        saveMemberToFirestore(updated).catch(e => console.warn('Firestore member notice:', e));
        return updated;
      })
    );
  };

  // Admin: Add member (automatically follows season dues schedule without quota override)
  const handleAddMember = (name: string, isHon: boolean) => {
    const newM: Member = {
      id: `m-${Date.now()}`,
      name: name.trim().toUpperCase(),
      previousYearPending: 0,
      isHonorary: isHon,
      isPaused: false,
      monthlyOverrides: {},
      payments: {},
    };
    setMembers(prev => [...prev, newM]);
    saveMemberToFirestore(newM).catch(e => console.warn('Firestore member notice:', e));
  };

  // Admin: Bulk Add members
  const handleBulkAddMembers = (membersList: { name: string; isHonorary: boolean }[]) => {
    const baseTime = Date.now();
    const createdList: Member[] = membersList.map((item, idx) => ({
      id: `m-${baseTime}-${idx}`,
      name: item.name.trim().toUpperCase(),
      previousYearPending: 0,
      isHonorary: item.isHonorary,
      isPaused: false,
      monthlyOverrides: {},
      payments: {},
    }));

    setMembers(prev => [...prev, ...createdList]);
    createdList.forEach(m => {
      saveMemberToFirestore(m).catch(e => console.warn('Firestore member notice:', e));
    });
  };

  // Admin: Update member
  const handleUpdateMember = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    saveMemberToFirestore(updated).catch(e => console.warn('Firestore member notice:', e));
  };

  // Admin: Permanently Delete member
  const handleDeleteMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    deleteMemberFromFirestore(memberId).catch(e => console.warn('Firestore delete member notice:', e));
  };

  // Admin: Update building (floors, flats, collection)
  const handleUpdateBuilding = (updatedBuilding: Building) => {
    setBuildings(prev => prev.map(b => b.id === updatedBuilding.id ? updatedBuilding : b));
    saveBuildingToFirestore(updatedBuilding).catch(e => console.warn('Firestore building notice:', e));
  };

  // Admin: Add building wing
  const handleAddBuilding = (name: string, code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const newB: Building = {
      id: `bld-${cleanCode}`,
      name: name.trim(),
      code: cleanCode,
      floors: [
        { floorName: '3F', flats: [] },
        { floorName: '2F', flats: [] },
        { floorName: '1F', flats: [] },
        { floorName: 'GR', flats: [] },
      ],
    };
    setBuildings(prev => [...prev, newB]);
    saveBuildingToFirestore(newB).catch(e => console.warn('Firestore building notice:', e));
  };

  // Admin: Delete building wing
  const handleDeleteBuilding = (buildingId: string) => {
    const toDelete = buildings.find(b => b.id === buildingId);
    setBuildings(prev => prev.filter(b => b.id !== buildingId));
    if (toDelete) {
      deleteBuildingFromFirestore(toDelete.code).catch(e => console.warn('Firestore delete building notice:', e));
    }
  };

  // Admin: Season Rollover Engine
  const handleRolloverSeason = (newSeasonId: string, start: string, end: string) => {
    const closingSurplus = summary.netBalance;
    
    // Compute new previousYearPending per member
    setMembers(prev =>
      prev.map(m => {
        const due = (m.previousYearPending || 0) + Math.max(0, 100 - (m.payments[season.liveMonth] || 0));
        const updatedM = {
          ...m,
          previousYearPending: m.isHonorary ? 0 : due,
          payments: {},
        };
        saveMemberToFirestore(updatedM).catch(e => console.warn('Firestore member notice:', e));
        return updatedM;
      })
    );

    const newSeasonData: Season = {
      id: newSeasonId,
      name: `Ganesh Utsav ${newSeasonId}`,
      startDate: start,
      endDate: end,
      openingBalance: closingSurplus,
      isActive: true,
      liveMonth: start,
      defaultMonthlyQuota: 200,
      months: [start, '2027-10', '2027-11', '2027-12', '2028-01', '2028-02', '2028-03', '2028-04', '2028-05', '2028-06', '2028-07', '2028-08'],
      blockedMonths: ['2027-12', '2028-01', '2028-02', '2028-03', '2028-04', '2028-05'],
    };
    setSeason(newSeasonData);
    saveSeasonToFirestore(newSeasonData).catch(e => console.warn('Firestore season notice:', e));

    const rolloverLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'ROLLOVER',
      previousValue: { season: season.id, surplus: closingSurplus },
      newValue: { newSeason: newSeasonId, openingBalance: closingSurplus },
      performedBy: 'Admin:RolloverWizard',
      timestamp: new Date().toISOString(),
      notes: `Rollover committed. Opening balance set to ₹${closingSurplus}`,
    };
    setAuditLogs(prev => [rolloverLog, ...prev]);
    saveAuditLogToFirestore(rolloverLog).catch(e => console.warn('Firestore audit notice:', e));
  };

  // Admin: Add Transaction
  const handleAddTransaction = (txnData: Omit<Transaction, 'id' | 'sequenceNumber'>) => {
    const nextSeq = transactions.length > 0 ? Math.max(...transactions.map(t => t.sequenceNumber)) + 1 : 1;
    const newTxn: Transaction = {
      source: 'WEB',
      ...txnData,
      id: `txn-${Date.now()}`,
      sequenceNumber: nextSeq,
    };
    setTransactions(prev => [newTxn, ...prev]);

    const newAudit: AuditLog = {
      id: `log-${Date.now()}`,
      txnId: newTxn.id,
      action: 'CREATE',
      type: newTxn.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
      source: 'WEB',
      name: newTxn.description,
      amount: newTxn.amount,
      mode: newTxn.mode,
      category: newTxn.type,
      syncStatus: 'SYNCED',
      previousValue: null,
      newValue: { ...newTxn },
      performedBy: 'Admin:Rishikesh',
      timestamp: new Date().toISOString(),
      notes: `Manual entry via Admin Control Center`,
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    // Cloud Firestore background synchronization
    saveTransactionToFirestore(newTxn).catch(e => console.warn('Firestore txn notice:', e));
    saveAuditLogToFirestore(newAudit).catch(e => console.warn('Firestore audit notice:', e));
  };

  // Admin: Edit Transaction
  const handleEditTransaction = (txnId: string, updatedFields: Partial<Transaction>) => {
    const oldTxn = transactions.find(t => t.id === txnId);
    if (!oldTxn) return;

    setTransactions(prev =>
      prev.map(t => (t.id === txnId ? { ...t, ...updatedFields } : t))
    );

    const newAudit: AuditLog = {
      id: `log-${Date.now()}`,
      txnId,
      action: 'UPDATE',
      type: 'EDIT',
      source: 'WEB',
      name: updatedFields.description || oldTxn.description,
      amount: updatedFields.amount ?? oldTxn.amount,
      mode: updatedFields.mode ?? oldTxn.mode,
      syncStatus: 'SYNCED',
      previousValue: { ...oldTxn },
      newValue: { ...oldTxn, ...updatedFields },
      performedBy: 'Admin:Rishikesh',
      timestamp: new Date().toISOString(),
      notes: `In-place edit via Admin Control Center`,
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    // Cloud Firestore background synchronization
    updateTransactionInFirestore(txnId, updatedFields).catch(e => console.warn('Firestore edit notice:', e));
    saveAuditLogToFirestore(newAudit).catch(e => console.warn('Firestore audit notice:', e));
  };


  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start">
      {/* Main Container */}
      <main className="w-full transition-all duration-300 max-w-4xl px-2 sm:px-4">
        {/* iOS Header */}
        <IOSHeader
          season={season}
          summary={summary}
          isAdmin={isAdmin}
          user={user}
          isLoading={isInitialLoading}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Tab Module Content */}
        <div className="px-3 sm:px-4 mt-2">
          {activeTab === 'members' && (
            <MembersTab
              season={season}
              members={members}
              onOpenPaymentModal={openMemberPaymentModal}
              isAdmin={isAdmin}
              isLoading={isInitialLoading}
            />
          )}

          {activeTab === 'buildings' && (
            <BuildingsTab
              buildings={buildings}
              onOpenFlatModal={openFlatModal}
              isAdmin={isAdmin}
              isLoading={isInitialLoading}
            />
          )}

          {activeTab === 'income' && (
            <IncomeTab
              transactions={transactions}
              onOpenAddModal={openAddIncomeModal}
              onUndoTransaction={handleUndoTransaction}
              isAdmin={isAdmin}
              isLoading={isInitialLoading}
            />
          )}

          {activeTab === 'expense' && (
            <ExpenseTab
              transactions={transactions}
              onOpenAddModal={openAddExpenseModal}
              onUndoTransaction={handleUndoTransaction}
              isAdmin={isAdmin}
              isLoading={isInitialLoading}
            />
          )}

          {activeTab === 'admin' && (
            <AdminTab
              season={season}
              members={members}
              buildings={buildings}
              transactions={transactions}
              auditLogs={auditLogs}
              isAdmin={isAdmin}
              onToggleAdmin={() => setIsAdmin(!isAdmin)}
              onAddMember={handleAddMember}
              onBulkAddMembers={handleBulkAddMembers}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onAddBuilding={handleAddBuilding}
              onUpdateBuilding={handleUpdateBuilding}
              onDeleteBuilding={handleDeleteBuilding}
              onToggleBlockMonth={handleToggleBlockMonth}
              onRolloverSeason={handleRolloverSeason}
              onUndoTransaction={handleUndoTransaction}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onAddMonth={handleAddMonth}
              onDeleteMonth={handleDeleteMonth}
              onUpdateDefaultQuota={handleUpdateDefaultQuota}
              onSetMemberMonthOverride={handleSetMemberMonthOverride}
              onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
            />
          )}
        </div>

        {/* Floating iOS Bottom Navigation Dock */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          pendingDuesCount={pendingDuesCount}
          isAdmin={isAdmin}
        />
      </main>

      {/* Google Authentication & Account Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        isAdmin={isAdmin}
        onSignIn={async () => {
          await signInWithGoogle();
        }}
        onSignOut={async () => {
          await signOutUser();
          setIsAdmin(false);
          setUser(null);
          if (activeTab === 'admin') {
            setActiveTab('members');
          }
        }}
      />

      {/* Firebase Database Snapshot Setup Modal */}
      <SnapshotDeployModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        onDeploySuccess={(newSeason, newMembers, newBuildings) => {
          setSeason(newSeason);
          setMembers(newMembers);
          setBuildings(newBuildings);
        }}
      />


      {/* iOS Numeric Keypad Modal for Frictionless Field Entry */}
      <NumericKeypadModal
        isOpen={keypadConfig.isOpen}
        onClose={() => setKeypadConfig(prev => ({ ...prev, isOpen: false }))}
        title={keypadConfig.title}
        subtitle={keypadConfig.subtitle}
        entityName={keypadConfig.entityName}
        categoryLabel={keypadConfig.categoryLabel}
        defaultAmount={keypadConfig.defaultAmount}
        actionType={keypadConfig.actionType}
        initialNote={keypadConfig.targetFlat?.residentName || ''}
        onConfirm={handleKeypadConfirm}
      />

    </div>
  );
}
