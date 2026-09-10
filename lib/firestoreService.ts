import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
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
export function subscribeToSeason(
  seasonId: string, 
  onData: (season: Season) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const seasonRef = doc(db, COLLECTIONS.SEASONS, seasonId);
    return onSnapshot(seasonRef, (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as Season);
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
      if (!snapshot.empty) {
        const list: Member[] = [];
        snapshot.forEach((d) => list.push(d.data() as Member));
        onData(list);
      }
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
      if (!snapshot.empty) {
        const list: Building[] = [];
        snapshot.forEach((d) => list.push(d.data() as Building));
        onData(list);
      }
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
 * Subscribe to Transactions in real-time, ordered by sequenceNumber desc.
 */
export function subscribeToTransactions(
  onData: (txns: Transaction[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const txnsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(txnsRef, orderBy('sequenceNumber', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => list.push(d.data() as Transaction));
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
