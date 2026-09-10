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
  months: string[]; // ["2026-09", "2026-10", ...]
  blockedMonths: string[]; // ["2026-12", ...]
  monthQuotas?: Record<string, number>; // { "2026-09": 200 }
}

export interface Member {
  id: string;
  name: string;
  previousYearPending: number;
  isHonorary: boolean;
  isPaused: boolean;
  monthlyOverrides: Record<string, number>;
  payments: Record<string, number>;
}

export interface Flat {
  flatNo: string;
  residentName: string;
  amountPaid: number;
  isPaid: boolean;
  paymentMode?: PaymentMode;
  updatedAt?: string;
}

export interface Floor {
  floorName: string;
  flats: Flat[];
}

export interface Building {
  id: string;
  name: string;
  code: string; // "A", "B", "C"
  floors: Floor[];
}

export interface Transaction {
  id: string;
  sequenceNumber: number; // 1, 2, 3...
  timestamp: string; // ISO 8601
  type: TransactionType;
  category?: string;
  amount: number;
  mode: PaymentMode;
  status: TransactionStatus;
  entityId: string;
  entityName: string;
  details?: {
    wing?: string;
    flat?: string;
    monthAllocations?: Record<string, number>;
    previousYearCleared?: number;
    notes?: string;
    expensePurpose?: string;
  };
  performedBy: string;
  undoRefId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: AuditAction;
  targetEntity: 'TRANSACTION' | 'MEMBER' | 'SEASON' | 'BUILDING';
  targetId: string;
  performedBy: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
}

// Telegram Bot API Models
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Cloudflare Workers Environment Bindings
export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_SECRET_TOKEN?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  AUTHORIZED_TELEGRAM_IDS?: string;
  ENVIRONMENT?: string;
}

// Command Parse Result
export type ParsedCommand =
  | { type: 'SLASH_COMMAND'; command: string; arg?: string }
  | { type: 'MEMBER_PAYMENT'; memberName: string; amount: number; isOnline: boolean }
  | { type: 'BUILDING_FLAT'; wingCode: string; flatNo: string; residentName?: string; amount: number; isOnline: boolean }
  | { type: 'CHANDA'; donorName: string; amount: number; isOnline: boolean }
  | { type: 'EXPENSE'; description: string; amount: number; isOnline: boolean }
  | { type: 'UNDO'; sequenceNumber: number }
  | { type: 'MEMBER_LOOKUP'; memberName: string }
  | { type: 'INVALID'; error: string };
