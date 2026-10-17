import { Trip, Member, Deposit, Expense, SyncQueueItem } from '../types';

const STORAGE_KEYS = {
  TRIP: 'trippool_trip_v1',
  MEMBERS: 'trippool_members_v1',
  DEPOSITS: 'trippool_deposits_v1',
  EXPENSES: 'trippool_expenses_v1',
  QUEUE: 'trippool_sync_queue_v1',
  CONFIG: 'trippool_config_v1'
};

export interface AppConfig {
  backendApiUrl: string;
  isSimulatedOffline: boolean;
  autoSync: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  backendApiUrl: '', // empty means local-first / offline queue
  isSimulatedOffline: false,
  autoSync: true
};

const DEFAULT_TRIP: Trip = {
  id: 1,
  title: 'Rara Trip 2026',
  destination: 'Rara Lake & Karnali Valley',
  currency: 'Rs.',
  start_date: '2026-10-18',
  end_date: '2026-10-25',
  status: 'active'
};

const DEFAULT_MEMBERS: Member[] = [
  { id: 1, trip_id: 1, name: 'Ramesh Sharma', phone: '+977-9841000001', notes: 'Trip Leader & Cash Custodian', is_leader: true, is_active: true },
  { id: 2, trip_id: 1, name: 'Bikash Thapa', phone: '+977-9841000002', notes: 'Scout & Co-driver', is_leader: false, is_active: true },
  { id: 3, trip_id: 1, name: 'Saurav Joshi', phone: '+977-9841000003', notes: 'Photographer', is_leader: false, is_active: true },
  { id: 4, trip_id: 1, name: 'Ayush Shrestha', phone: '+977-9841000004', notes: 'Navigator', is_leader: false, is_active: true }
];

const DEFAULT_DEPOSITS: Deposit[] = [
  { id: 1, trip_id: 1, member_id: 1, member_name: 'Ramesh Sharma', amount: 5000, payment_method: 'Cash', notes: 'Initial pool cash contribution', deposited_at: '2026-10-17T08:30:00' },
  { id: 2, trip_id: 1, member_id: 2, member_name: 'Bikash Thapa', amount: 5000, payment_method: 'Fonepay', notes: 'Advance deposit via Fonepay QR', deposited_at: '2026-10-17T09:15:00' },
  { id: 3, trip_id: 1, member_id: 3, member_name: 'Saurav Joshi', amount: 5000, payment_method: 'Bank Transfer', notes: 'Transferred to Leader Nabil Bank', deposited_at: '2026-10-17T10:00:00' },
  { id: 4, trip_id: 1, member_id: 4, member_name: 'Ayush Shrestha', amount: 5000, payment_method: 'Fonepay', notes: 'Fonepay deposit', deposited_at: '2026-10-17T11:20:00' }
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 1,
    trip_id: 1,
    payer_type: 'pool',
    payer_member_id: null,
    payer_member_name: 'Trip Pool',
    amount: 4000,
    category: 'Fuel',
    description: 'Scorpio diesel top-up at Kohalpur',
    split_type: 'equal',
    expense_date: '2026-10-17T14:00:00',
    splits: [
      { member_id: 1, member_name: 'Ramesh Sharma', split_amount: 1000 },
      { member_id: 2, member_name: 'Bikash Thapa', split_amount: 1000 },
      { member_id: 3, member_name: 'Saurav Joshi', split_amount: 1000 },
      { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 1000 }
    ]
  },
  {
    id: 2,
    trip_id: 1,
    payer_type: 'pool',
    payer_member_id: null,
    payer_member_name: 'Trip Pool',
    amount: 1400,
    category: 'Food & Snacks',
    description: 'Mutton Thali & milk tea at Kalikot Dhaba',
    split_type: 'equal',
    expense_date: '2026-10-18T12:30:00',
    splits: [
      { member_id: 1, member_name: 'Ramesh Sharma', split_amount: 350 },
      { member_id: 2, member_name: 'Bikash Thapa', split_amount: 350 },
      { member_id: 3, member_name: 'Saurav Joshi', split_amount: 350 },
      { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 350 }
    ]
  },
  {
    id: 3,
    trip_id: 1,
    payer_type: 'member',
    payer_member_id: 2,
    payer_member_name: 'Bikash Thapa',
    amount: 1200,
    category: 'Vehicle Maintenance/Spares',
    description: 'Tire puncture repair & spare valve tube (paid by Bikash)',
    split_type: 'equal',
    expense_date: '2026-10-18T16:45:00',
    splits: [
      { member_id: 1, member_name: 'Ramesh Sharma', split_amount: 300 },
      { member_id: 2, member_name: 'Bikash Thapa', split_amount: 300 },
      { member_id: 3, member_name: 'Saurav Joshi', split_amount: 300 },
      { member_id: 4, member_name: 'Ayush Shrestha', split_amount: 300 }
    ]
  }
];

export class StorageService {
  static getTrip(): Trip {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRIP);
      return data ? JSON.parse(data) : DEFAULT_TRIP;
    } catch {
      return DEFAULT_TRIP;
    }
  }

  static saveTrip(trip: Trip): void {
    localStorage.setItem(STORAGE_KEYS.TRIP, JSON.stringify(trip));
  }

  static getMembers(): Member[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return data ? JSON.parse(data) : DEFAULT_MEMBERS;
    } catch {
      return DEFAULT_MEMBERS;
    }
  }

  static saveMembers(members: Member[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }

  static getDeposits(): Deposit[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
      return data ? JSON.parse(data) : DEFAULT_DEPOSITS;
    } catch {
      return DEFAULT_DEPOSITS;
    }
  }

  static saveDeposits(deposits: Deposit[]): void {
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));
  }

  static getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  }

  static saveExpenses(expenses: Expense[]): void {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }

  static getQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

  static addToQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status'>): SyncQueueItem {
    const queue = this.getQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    queue.push(newItem);
    this.saveQueue(queue);
    return newItem;
  }

  static removeFromQueue(id: string): void {
    const queue = this.getQueue().filter(q => q.id !== id);
    this.saveQueue(queue);
  }

  static clearQueue(): void {
    this.saveQueue([]);
  }

  static getConfig(): AppConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return data ? { ...DEFAULT_CONFIG, ...JSON.parse(data) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  static saveConfig(config: AppConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  static resetToDemo(): void {
    localStorage.setItem(STORAGE_KEYS.TRIP, JSON.stringify(DEFAULT_TRIP));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(DEFAULT_DEPOSITS));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify([]));
  }
}
