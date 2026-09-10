export type PaymentMode = 'ONLINE' | 'OFFLINE';
export type TransactionType = 'MEMBER' | 'BUILDING' | 'CHANDA' | 'EXPENSE';
export type TransactionStatus = 'ACTIVE' | 'REVERSED';
export type AuditAction = 'CREATE' | 'UPDATE' | 'UNDO' | 'ROLLOVER';

export interface Season {
  id: string; // e.g. "2026-2027"
  name: string;
  startDate: string; // "2026-09"
  endDate: string; // "2027-08"
  openingBalance: number;
  isActive: boolean;
  liveMonth: string; // "YYYY-MM" e.g. "2026-09"
  defaultMonthlyQuota: number; // e.g. 200
  months: string[]; // ["2026-09", "2026-10", "2026-11", ...]
  blockedMonths: string[]; // ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"]
}

export interface Member {
  id: string;
  name: string;
  previousYearPending: number;
  isHonorary: boolean; // e.g. Ronik, Suraj (no dues)
  isPaused: boolean;
  monthlyOverrides: Record<string, number>; // { "2026-09": 100 }
  payments: Record<string, number>; // Cumulative paid per month { "2026-09": 200 }
}

export interface Flat {
  flatNo: string; // "001", "301"
  residentName: string;
  amountPaid: number;
  isPaid: boolean;
  paymentMode?: PaymentMode;
  updatedAt?: string;
}

export interface Floor {
  floorName: string; // "3F", "2F", "1F", "GR"
  flats: Flat[];
}

export interface Building {
  id: string;
  name: string; // "A Wing"
  code: string; // "A"
  floors: Floor[];
}

export interface TransactionMetadata {
  memberId?: string;
  memberName?: string;
  buildingCode?: string;
  flatNo?: string;
  category?: string;
}

export interface Transaction {
  id: string;
  sequenceNumber: number; // Permanent human readable code e.g. 1, 2, 3
  timestamp: string;
  type: TransactionType;
  amount: number;
  mode: PaymentMode;
  status: TransactionStatus;
  description: string;
  source?: 'TEL' | 'WEB';
  metadata?: TransactionMetadata;
}

export interface AuditLog {
  id: string;
  txnId?: string;
  action: AuditAction;
  previousValue: any;
  newValue: any;
  performedBy: string; // "TelegramBot" | "Admin:Rishikesh"
  timestamp: string;
  notes?: string;
  type?: 'INCOME' | 'EXPENSE' | 'EDIT' | 'UNDO' | 'ROLLOVER';
  source?: 'TEL' | 'WEB';
  syncStatus?: 'SYNCED' | 'FAILED' | 'PENDING';
  amount?: number;
  name?: string;
  mode?: PaymentMode;
  category?: string;
}

export interface MemberDueSummary {
  memberId: string;
  memberName: string;
  previousYearPending: number;
  currentSeasonPaid: number;
  currentSeasonTarget: number;
  currentSeasonPending: number;
  totalPending: number; // Previous Year Pending + Current Season Pending
  isHonorary: boolean;
  isPaused: boolean;
}

export interface FinanceSummary {
  totalInflows: number;
  totalExpenses: number;
  netBalance: number; // Total Inflow - Total Outflow + Opening Balance
  onlineInflows: number;
  onlineExpenses: number;
  netOnlineBalance: number;
  offlineInflows: number;
  offlineExpenses: number;
  netOfflineBalance: number;
  openingBalance: number;
  personalBankBalance: number;
  actualPersonalSavings: number; // Bank Balance - Net Online Mandal Pool
}
