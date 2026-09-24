import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  FirestoreError, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from './firebase';
import { Season, Member, Building, Transaction, AuditLog } from './types';

// Collection names
export const COLLECTIONS = {
  SEASONS: 'seasons',
  MEMBERS: 'members',
  BUILDINGS: 'buildings',
  TRANSACTIONS: 'transactions',
  AUDIT_LOGS: 'auditLogs',
};

const LEGACY_DEFAULT_SEASON_ID = '2025-26';

/**
 * Helper to check if a season is the legacy root season (2025-26).
 */
export function isLegacySeason(seasonId?: string): boolean {
  return !seasonId || seasonId === '2025-26' || seasonId === '2025-2026';
}

/**
 * Recursively strip undefined values so Firestore setDoc / updateDoc does not throw
 * 'Unsupported field value: undefined'.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

/**
 * Subscribe to the active Season document in real-time.
 */
export function subscribeToActiveSeason(
  onData: (season: Season | null) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const seasonsRef = collection(db, COLLECTIONS.SEASONS);
    return onSnapshot(seasonsRef, (snapshot) => {
      if (!snapshot.empty) {
        let active: Season | null = null;
        snapshot.forEach((d) => {
          const s = { ...d.data(), id: d.id } as Season;
          if (s.isActive) {
            active = s;
          } else if (!active && s.status !== 'ARCHIVED' && s.status !== 'CLOSED') {
            active = s;
          }
        });
        if (active) onData(active);
        else onData(null);
      } else {
        onData(null);
      }
    }, (error) => {
      console.warn('Firestore active season listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToActiveSeason failed:', err);
    return null;
  }
}

/**
 * Subscribe to all Season documents (Active, Draft, Archived).
 */
export function subscribeToAllSeasons(
  onData: (seasons: Season[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const seasonsRef = collection(db, COLLECTIONS.SEASONS);
    return onSnapshot(seasonsRef, (snapshot) => {
      const list: Season[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Season);
      });
      list.sort((a, b) => (b.startDate || b.id).localeCompare(a.startDate || a.id));
      onData(list);
    }, (error) => {
      console.warn('Firestore all seasons listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToAllSeasons failed:', err);
    return null;
  }
}

/**
 * Subscribe to a specific Season document by ID.
 */
export function subscribeToSeason(
  seasonId: string, 
  onData: (season: Season | null) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db || !seasonId) {
    onData(null);
    return null;
  }
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, seasonId);
    return onSnapshot(seasonRef, (snapshot) => {
      if (snapshot.exists()) {
        onData({ ...snapshot.data(), id: snapshot.id } as Season);
      } else {
        onData(null);
      }
    }, (error) => {
      console.warn('Firestore Season snapshot listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToSeason failed:', err);
    return null;
  }
}

/**
 * Subscribe to Members in real-time.
 * Scoped to subcollection `seasons/{seasonId}/members` with fallback to root `members`
 * for legacy 2025-26 data compatibility.
 */
export function subscribeToMembers(
  seasonId: string,
  onData: (members: Member[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const subColRef = collection(db, COLLECTIONS.SEASONS, seasonId, COLLECTIONS.MEMBERS);
    let fallbackUnsub: Unsubscribe | null = null;

    const mainUnsub = onSnapshot(subColRef, (snapshot) => {
      if (!snapshot.empty) {
        if (fallbackUnsub) {
          fallbackUnsub();
          fallbackUnsub = null;
        }
        const list: Member[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Member));
        onData(list);
      } else if (isLegacySeason(seasonId)) {
        // Fallback to legacy root collection if subcollection is empty
        if (!fallbackUnsub) {
          const rootRef = collection(db!, COLLECTIONS.MEMBERS);
          fallbackUnsub = onSnapshot(rootRef, (rootSnap) => {
            const list: Member[] = [];
            rootSnap.forEach((d) => list.push({ ...d.data(), id: d.id } as Member));
            onData(list);
          }, (err) => {
            console.warn('Firestore legacy root members listener notice:', err.message);
            onError?.(err);
          });
        }
      } else {
        onData([]);
      }
    }, (error) => {
      console.warn(`Firestore members listener notice for season ${seasonId}:`, error.message);
      onError?.(error);
    });

    return () => {
      mainUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err: any) {
    console.warn('Firestore subscribeToMembers failed:', err);
    return null;
  }
}

/**
 * Subscribe to Buildings & Wings in real-time.
 * Scoped to subcollection `seasons/{seasonId}/buildings` with fallback to root `buildings`
 * for legacy 2025-26 data compatibility.
 */
export function subscribeToBuildings(
  seasonId: string,
  onData: (buildings: Building[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const subColRef = collection(db, COLLECTIONS.SEASONS, seasonId, COLLECTIONS.BUILDINGS);
    let fallbackUnsub: Unsubscribe | null = null;

    const mainUnsub = onSnapshot(subColRef, (snapshot) => {
      if (!snapshot.empty) {
        if (fallbackUnsub) {
          fallbackUnsub();
          fallbackUnsub = null;
        }
        const list: Building[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Building));
        onData(list);
      } else if (isLegacySeason(seasonId)) {
        if (!fallbackUnsub) {
          const rootRef = collection(db!, COLLECTIONS.BUILDINGS);
          fallbackUnsub = onSnapshot(rootRef, (rootSnap) => {
            const list: Building[] = [];
            rootSnap.forEach((d) => list.push({ ...d.data(), id: d.id } as Building));
            onData(list);
          }, (err) => {
            console.warn('Firestore legacy root buildings listener notice:', err.message);
            onError?.(err);
          });
        }
      } else {
        onData([]);
      }
    }, (error) => {
      console.warn(`Firestore buildings listener notice for season ${seasonId}:`, error.message);
      onError?.(error);
    });

    return () => {
      mainUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err: any) {
    console.warn('Firestore subscribeToBuildings failed:', err);
    return null;
  }
}

/**
 * Subscribe to Transactions in real-time, ordered by recent date/time first.
 * Scoped to `seasons/{seasonId}/transactions` with fallback to root `transactions` for 2025-26.
 */
export function subscribeToTransactions(
  seasonId: string,
  onData: (txns: Transaction[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const subColRef = collection(db, COLLECTIONS.SEASONS, seasonId, COLLECTIONS.TRANSACTIONS);
    let fallbackUnsub: Unsubscribe | null = null;

    const sortTxns = (list: Transaction[]) => {
      return list.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
          return timeB - timeA;
        }
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        return seqB - seqA;
      });
    };

    const processSnapshot = (snapshot: any): Transaction[] => {
      const list: Transaction[] = [];
      snapshot.forEach((d: any) => {
        const raw = d.data();
        const desc = raw.description || raw.entityName || raw.details?.expensePurpose || raw.details?.notes || (raw.type === 'EXPENSE' ? 'Expense' : 'Transaction');
        list.push({
          ...raw,
          id: d.id,
          seasonId: raw.seasonId || seasonId,
          description: desc,
          amount: Number(raw.amount) || 0,
        } as Transaction);
      });
      return sortTxns(list);
    };

    const mainUnsub = onSnapshot(subColRef, (snapshot) => {
      if (!snapshot.empty) {
        if (fallbackUnsub) {
          fallbackUnsub();
          fallbackUnsub = null;
        }
        onData(processSnapshot(snapshot));
      } else if (isLegacySeason(seasonId)) {
        if (!fallbackUnsub) {
          const rootRef = collection(db!, COLLECTIONS.TRANSACTIONS);
          fallbackUnsub = onSnapshot(rootRef, (rootSnap) => {
            onData(processSnapshot(rootSnap));
          }, (err) => {
            console.warn('Firestore legacy root transactions listener notice:', err.message);
            onError?.(err);
          });
        }
      } else {
        onData([]);
      }
    }, (error) => {
      console.warn(`Firestore transactions listener notice for season ${seasonId}:`, error.message);
      onError?.(error);
    });

    return () => {
      mainUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err: any) {
    console.warn('Firestore subscribeToTransactions failed:', err);
    return null;
  }
}

/**
 * Subscribe to Audit Logs in real-time.
 */
export function subscribeToAuditLogs(
  seasonId: string,
  onData: (logs: AuditLog[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const subColRef = collection(db, COLLECTIONS.SEASONS, seasonId, COLLECTIONS.AUDIT_LOGS);
    let fallbackUnsub: Unsubscribe | null = null;

    const mainUnsub = onSnapshot(query(subColRef, orderBy('timestamp', 'desc')), (snapshot) => {
      if (!snapshot.empty) {
        if (fallbackUnsub) {
          fallbackUnsub();
          fallbackUnsub = null;
        }
        const list: AuditLog[] = [];
        snapshot.forEach((d) => list.push(d.data() as AuditLog));
        onData(list);
      } else if (isLegacySeason(seasonId)) {
        if (!fallbackUnsub) {
          const rootRef = collection(db!, COLLECTIONS.AUDIT_LOGS);
          fallbackUnsub = onSnapshot(query(rootRef, orderBy('timestamp', 'desc')), (rootSnap) => {
            const list: AuditLog[] = [];
            rootSnap.forEach((d) => list.push(d.data() as AuditLog));
            onData(list);
          }, (err) => {
            console.warn('Firestore legacy root audit logs listener notice:', err.message);
            onError?.(err);
          });
        }
      } else {
        onData([]);
      }
    }, (error) => {
      console.warn(`Firestore audit logs listener notice for season ${seasonId}:`, error.message);
      onError?.(error);
    });

    return () => {
      mainUnsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err: any) {
    console.warn('Firestore subscribeToAuditLogs failed:', err);
    return null;
  }
}

// ----------------- WRITE OPERATIONS -----------------

/**
 * Save or update a transaction in Firestore, scoped to season subcollection.
 */
export async function saveTransactionToFirestore(txn: Transaction, seasonId?: string): Promise<void> {
  if (!db) return;
  const targetSeason = seasonId || txn.seasonId || LEGACY_DEFAULT_SEASON_ID;
  const data = sanitizeForFirestore({ ...txn, seasonId: targetSeason });

  try {
    // 1. Write to season subcollection
    const seasonDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.TRANSACTIONS, txn.id);
    await setDoc(seasonDocRef, data, { merge: true });

    // 2. If legacy season, write to root for backward compatibility
    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.TRANSACTIONS, txn.id);
      await setDoc(rootDocRef, data, { merge: true });
    }
  } catch (err: any) {
    console.error('Failed to save transaction to Firestore:', err);
    throw err;
  }
}

/**
 * Update specific fields of a transaction in Firestore.
 */
export async function updateTransactionInFirestore(
  txnId: string, 
  updates: Partial<Transaction>,
  seasonId?: string
): Promise<void> {
  if (!db) return;
  const targetSeason = seasonId || updates.seasonId || LEGACY_DEFAULT_SEASON_ID;
  const cleanUpdates = sanitizeForFirestore(updates);
  try {
    const seasonDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.TRANSACTIONS, txnId);
    await updateDoc(seasonDocRef, cleanUpdates);

    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.TRANSACTIONS, txnId);
      await updateDoc(rootDocRef, cleanUpdates).catch(() => {});
    }
  } catch (err: any) {
    console.error('Failed to update transaction in Firestore:', err);
    throw err;
  }
}

/**
 * Save or update a member in Firestore, scoped to season subcollection.
 */
export async function saveMemberToFirestore(member: Member, seasonId?: string): Promise<void> {
  if (!db) return;
  const targetSeason = seasonId || LEGACY_DEFAULT_SEASON_ID;
  const cleanMember = sanitizeForFirestore(member);
  try {
    const subDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.MEMBERS, member.id);
    await setDoc(subDocRef, cleanMember, { merge: true });

    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.MEMBERS, member.id);
      await setDoc(rootDocRef, cleanMember, { merge: true });
    }
  } catch (err: any) {
    console.error('Failed to save member to Firestore:', err);
    throw err;
  }
}

/**
 * Permanently delete a member from Firestore.
 */
export async function deleteMemberFromFirestore(memberId: string, seasonId?: string): Promise<void> {
  if (!db || !memberId) return;
  const targetSeason = seasonId || LEGACY_DEFAULT_SEASON_ID;
  try {
    const subDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.MEMBERS, memberId);
    await deleteDoc(subDocRef);

    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.MEMBERS, memberId);
      await deleteDoc(rootDocRef).catch(() => {});
    }
  } catch (err: any) {
    console.error('Failed to delete member from Firestore:', err);
    throw err;
  }
}

/**
 * Save or update a building wing in Firestore, scoped to season subcollection.
 */
export async function saveBuildingToFirestore(building: Building, seasonId?: string): Promise<void> {
  if (!db) return;
  const targetSeason = seasonId || LEGACY_DEFAULT_SEASON_ID;
  const cleanBuilding = sanitizeForFirestore(building);
  try {
    const subDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.BUILDINGS, building.code);
    await setDoc(subDocRef, cleanBuilding, { merge: true });

    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.BUILDINGS, building.code);
      await setDoc(rootDocRef, cleanBuilding, { merge: true });
    }
  } catch (err: any) {
    console.error('Failed to save building to Firestore:', err);
    throw err;
  }
}

/**
 * Permanently delete a building wing from Firestore.
 */
export async function deleteBuildingFromFirestore(buildingCode: string, seasonId?: string): Promise<void> {
  if (!db || !buildingCode) return;
  const targetSeason = seasonId || LEGACY_DEFAULT_SEASON_ID;
  try {
    const subDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.BUILDINGS, buildingCode);
    await deleteDoc(subDocRef);

    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.BUILDINGS, buildingCode);
      await deleteDoc(rootDocRef).catch(() => {});
    }
  } catch (err: any) {
    console.error('Failed to delete building from Firestore:', err);
    throw err;
  }
}

/**
 * Save or update Season configuration document in Firestore.
 */
export async function saveSeasonToFirestore(season: Season): Promise<void> {
  if (!db) return;
  const cleanSeason = sanitizeForFirestore(season);
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, season.id);
    await setDoc(seasonRef, cleanSeason, { merge: true });
  } catch (err: any) {
    console.error('Failed to save season to Firestore:', err);
    throw err;
  }
}

/**
 * Delete a draft or archived season from Firestore.
 */
export async function deleteSeasonFromFirestore(seasonId: string): Promise<void> {
  if (!db || !seasonId) return;
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, seasonId);
    await deleteDoc(seasonRef);
  } catch (err: any) {
    console.error('Failed to delete season from Firestore:', err);
    throw err;
  }
}

/**
 * Update a specific month's quota in the Season document.
 */
export async function updateSeasonMonthQuota(
  seasonId: string,
  month: string,
  amount: number
): Promise<void> {
  if (!db || !seasonId) return;
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, seasonId);
    await updateDoc(seasonRef, {
      [`monthQuotas.${month}`]: amount,
    });
  } catch (err: any) {
    console.error('Failed to update month quota in Firestore:', err);
    throw err;
  }
}

/**
 * Update season default monthly quota using field-level update.
 */
export async function updateSeasonDefaultQuota(
  seasonId: string,
  newQuota: number
): Promise<void> {
  if (!db || !seasonId) return;
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, seasonId);
    await updateDoc(seasonRef, { defaultMonthlyQuota: newQuota });
  } catch (err: any) {
    console.error('Failed to update default quota in Firestore:', err);
    throw err;
  }
}

/**
 * Save an audit log in Firestore, scoped to season subcollection.
 */
export async function saveAuditLogToFirestore(log: AuditLog, seasonId?: string): Promise<void> {
  if (!db) return;
  const targetSeason = seasonId || log.seasonId || LEGACY_DEFAULT_SEASON_ID;
  const data = sanitizeForFirestore({ ...log, seasonId: targetSeason });
  try {
    const subDocRef = doc(db, COLLECTIONS.SEASONS, targetSeason, COLLECTIONS.AUDIT_LOGS, log.id);
    await setDoc(subDocRef, data, { merge: true });

    if (isLegacySeason(targetSeason)) {
      const rootDocRef = doc(db, COLLECTIONS.AUDIT_LOGS, log.id);
      await setDoc(rootDocRef, data, { merge: true });
    }
  } catch (err: any) {
    console.error('Failed to save audit log to Firestore:', err);
    throw err;
  }
}

/**
 * Deploy fresh new season with isolated subcollections.
 */
export async function deployNewSeasonToFirestore(
  season: Season,
  members: Member[],
  buildings: Building[],
  archivedOldSeason?: Season
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  // 1. If an old season is being archived, update it first
  if (archivedOldSeason) {
    await saveSeasonToFirestore({
      ...archivedOldSeason,
      isActive: false,
      status: 'ARCHIVED',
    });
  }

  // 2. Save the new Season document
  await saveSeasonToFirestore(season);

  // 3. Save members into new season subcollection
  for (const m of members) {
    await saveMemberToFirestore(m, season.id);
  }

  // 4. Save buildings into new season subcollection
  for (const b of buildings) {
    await saveBuildingToFirestore(b, season.id);
  }

  // 5. Initial Audit Log
  const initAudit: AuditLog = {
    id: `log-${Date.now()}`,
    action: 'CREATE',
    seasonId: season.id,
    previousValue: archivedOldSeason ? { archivedSeasonId: archivedOldSeason.id } : null,
    newValue: { 
      seasonId: season.id, 
      openingBalance: season.openingBalance, 
      openingCashBalance: season.openingCashBalance,
      openingOnlineBalance: season.openingOnlineBalance,
      membersCount: members.length, 
      buildingsCount: buildings.length 
    },
    performedBy: 'Admin:NewSeasonWizard',
    timestamp: new Date().toISOString(),
    notes: `New Season ${season.name || season.id} activated with Cash: ₹${season.openingCashBalance || 0}, Online: ₹${season.openingOnlineBalance || 0}, Total Opening: ₹${season.openingBalance}`,
  };
  await saveAuditLogToFirestore(initAudit, season.id);
}

/**
 * Deploy complete snapshot to Firestore (Season, Members, Buildings).
 */
export async function deploySnapshotToFirestore(
  season: Season,
  members: Member[],
  buildings: Building[]
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  await deployNewSeasonToFirestore(season, members, buildings);
}
