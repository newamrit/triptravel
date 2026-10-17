export type PaymentMethod = 'Cash' | 'Fonepay' | 'Bank Transfer' | 'Other';

export type ExpenseCategory = 
  | 'Fuel'
  | 'Food & Snacks'
  | 'Hotel/Homestay'
  | 'Permits/Entry'
  | 'Vehicle Maintenance/Spares'
  | 'Miscellaneous';

export type PayerType = 'pool' | 'member';
export type SplitType = 'equal' | 'custom';

export interface Trip {
  id: number;
  title: string;
  destination: string;
  currency: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'archived';
}

export interface Member {
  id: number;
  trip_id: number;
  name: string;
  phone?: string | null;
  notes?: string | null;
  is_leader: boolean;
  is_active: boolean;
  total_deposited?: number;
  total_consumed?: number;
  total_paid_out_of_pocket?: number;
  net_balance?: number;
  status?: 'refund_due' | 'owes_money' | 'settled';
}

export interface Deposit {
  id: number;
  trip_id: number;
  member_id: number;
  member_name?: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string | null;
  deposited_at: string;
  is_leader?: boolean;
}

export interface ExpenseSplit {
  member_id: number;
  member_name?: string;
  split_amount: number;
}

export interface Expense {
  id: number;
  trip_id: number;
  payer_type: PayerType;
  payer_member_id: number | null;
  payer_member_name?: string | null;
  amount: number;
  category: ExpenseCategory;
  description: string;
  split_type: SplitType;
  expense_date: string;
  splits: ExpenseSplit[];
  split_count?: number;
  receipt_image?: string | null; // Base64 encoded JPEG string
}

export interface SettlementDebt {
  from_id: number;
  from_name: string;
  to_id: number;
  to_name: string;
  amount: number;
  instruction: string;
}

export interface SettlementSummary {
  total_collected: number;
  total_spent: number;
  total_pool_spent: number;
  total_member_spent: number;
  pool_cash_remaining: number;
  category_breakdown: Record<string, number>;
}

export interface SettlementData {
  trip: Trip;
  currency: string;
  summary: SettlementSummary;
  members: Member[];
  settlements: SettlementDebt[];
  p2p_settlements: SettlementDebt[];
  whatsapp_summary: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'member' | 'deposit' | 'expense';
  action: 'create' | 'update';
  payload: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'leader' | 'member';
  member_id?: number | null;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'leader' | 'member';
    member_id?: number | null;
  };
  token: string;
  loginAt: string;
}
