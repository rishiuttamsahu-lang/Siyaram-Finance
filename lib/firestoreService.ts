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
          if (s.isActive || !active) active = s;
        });
        if (active) onData(active);
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
 * Subscribe to all Members in real-time.
 */
export function subscribeToMembers(
  onData: (members: Member[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const membersRef = collection(db, COLLECTIONS.MEMBERS);
    return onSnapshot(membersRef, (snapshot) => {
      const list: Member[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Member));
      }
      onData(list);
    }, (error) => {
      console.warn('Firestore Members snapshot listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToMembers failed:', err);
    return null;
  }
}

/**
 * Subscribe to Buildings & Wings in real-time.
 */
export function subscribeToBuildings(
  onData: (buildings: Building[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const buildingsRef = collection(db, COLLECTIONS.BUILDINGS);
    return onSnapshot(buildingsRef, (snapshot) => {
      const list: Building[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Building));
      }
      onData(list);
    }, (error) => {
      console.warn('Firestore Buildings snapshot listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToBuildings failed:', err);
    return null;
  }
}

/**
 * Subscribe to Transactions in real-time, ordered by recent date/time first.
 */
export function subscribeToTransactions(
  onData: (txns: Transaction[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const txnsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    return onSnapshot(txnsRef, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Transaction));
      list.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
          return timeB - timeA;
        }
        const seqA = Number(a.sequenceNumber) || 0;
        const seqB = Number(b.sequenceNumber) || 0;
        return seqB - seqA;
      });
      onData(list);
    }, (error) => {
      console.warn('Firestore Transactions snapshot listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToTransactions failed:', err);
    return null;
  }
}

/**
 * Subscribe to Audit Logs in real-time.
 */
export function subscribeToAuditLogs(
  onData: (logs: AuditLog[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((d) => list.push(d.data() as AuditLog));
      onData(list);
    }, (error) => {
      console.warn('Firestore AuditLogs snapshot listener notice:', error.message);
      onError?.(error);
    });
  } catch (err: any) {
    console.warn('Firestore subscribeToAuditLogs failed:', err);
    return null;
  }
}

// ----------------- WRITE OPERATIONS -----------------

/**
 * Save or update a transaction in Firestore.
 */
export async function saveTransactionToFirestore(txn: Transaction): Promise<void> {
  if (!db) return;
  try {
    const txnRef = doc(db, COLLECTIONS.TRANSACTIONS, txn.id);
    await setDoc(txnRef, txn, { merge: true });
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
  updates: Partial<Transaction>
): Promise<void> {
  if (!db) return;
  try {
    const txnRef = doc(db, COLLECTIONS.TRANSACTIONS, txnId);
    await updateDoc(txnRef, updates);
  } catch (err: any) {
    console.error('Failed to update transaction in Firestore:', err);
    throw err;
  }
}

/**
 * Save or update a member in Firestore.
 */
export async function saveMemberToFirestore(member: Member): Promise<void> {
  if (!db) return;
  try {
    const memberRef = doc(db, COLLECTIONS.MEMBERS, member.id);
    await setDoc(memberRef, member, { merge: true });
  } catch (err: any) {
    console.error('Failed to save member to Firestore:', err);
    throw err;
  }
}

/**
 * Permanently delete a member from Firestore.
 */
export async function deleteMemberFromFirestore(memberId: string): Promise<void> {
  if (!db || !memberId) return;
  try {
    const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
    await deleteDoc(memberRef);
  } catch (err: any) {
    console.error('Failed to delete member from Firestore:', err);
    throw err;
  }
}

/**
 * Save or update a building wing in Firestore.
 */
export async function saveBuildingToFirestore(building: Building): Promise<void> {
  if (!db) return;
  try {
    const buildingRef = doc(db, COLLECTIONS.BUILDINGS, building.code);
    await setDoc(buildingRef, building, { merge: true });
  } catch (err: any) {
    console.error('Failed to save building to Firestore:', err);
    throw err;
  }
}

/**
 * Permanently delete a building wing from Firestore.
 */
export async function deleteBuildingFromFirestore(buildingCode: string): Promise<void> {
  if (!db || !buildingCode) return;
  try {
    const buildingRef = doc(db, COLLECTIONS.BUILDINGS, buildingCode);
    await deleteDoc(buildingRef);
  } catch (err: any) {
    console.error('Failed to delete building from Firestore:', err);
    throw err;
  }
}

/**
 * Save or update Season configuration in Firestore.
 */
export async function saveSeasonToFirestore(season: Season): Promise<void> {
  if (!db) return;
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, season.id);
    await setDoc(seasonRef, season, { merge: true });
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
 * Update a specific month's quota in the Season document using field-level update.
 * More reliable than full setDoc for single-field updates.
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
 * Save an audit log in Firestore.
 */
export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  if (!db) return;
  try {
    const logRef = doc(db, COLLECTIONS.AUDIT_LOGS, log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (err: any) {
    console.error('Failed to save audit log to Firestore:', err);
    throw err;
  }
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
  
  // 1. Save Season
  await saveSeasonToFirestore(season);

  // 2. Save Members
  for (const m of members) {
    await saveMemberToFirestore(m);
  }

  // 3. Save Buildings
  for (const b of buildings) {
    await saveBuildingToFirestore(b);
  }

  // 4. Initial Audit Log
  const initAudit: AuditLog = {
    id: `log-${Date.now()}`,
    action: 'CREATE',
    previousValue: null,
    newValue: { seasonId: season.id, openingBalance: season.openingBalance, membersCount: members.length, buildingsCount: buildings.length },
    performedBy: 'Admin:SnapshotDeployer',
    timestamp: new Date().toISOString(),
    notes: `Initial snapshot deployed to Firestore with Opening Balance ₹${season.openingBalance}`,
  };
  await saveAuditLogToFirestore(initAudit);
}

