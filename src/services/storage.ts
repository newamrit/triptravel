import { Trip, Member, Deposit, Expense, SyncQueueItem } from '../types';

const STORAGE_KEYS = {
  TRIP: 'trippool_trip_v2',
  MEMBERS: 'trippool_members_v2',
  DEPOSITS: 'trippool_deposits_v2',
  EXPENSES: 'trippool_expenses_v2',
  QUEUE: 'trippool_sync_queue_v2',
  CONFIG: 'trippool_config_v2'
};

export interface AppConfig {
  backendApiUrl: string;
  isSimulatedOffline: boolean;
  autoSync: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  backendApiUrl: '', // empty means auto-detect current root/subdirectory /api
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

export class StorageService {
  // -------------------------------------------------------------------
  // Synchronous Local Cache Operations (100% Dynamic Database Mirror)
  // -------------------------------------------------------------------
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
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveMembers(members: Member[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }

  static getDeposits(): Deposit[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveDeposits(deposits: Deposit[]): void {
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));
  }

  static getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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
    localStorage.removeItem(STORAGE_KEYS.TRIP);
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.DEPOSITS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.QUEUE);
  }

  // -------------------------------------------------------------------
  // Subdirectory-Aware Direct Database Async REST API Operations
  // -------------------------------------------------------------------
  static getApiBase(): string {
    const cfg = this.getConfig();
    if (cfg.backendApiUrl && cfg.backendApiUrl.trim() !== '') {
      return cfg.backendApiUrl.replace(/\/$/, '');
    }
    // Auto-detect origin and active subdirectory
    if (typeof window !== 'undefined' && window.location) {
      const path = window.location.pathname.replace(/\/[^\/]*$/, '');
      return `${window.location.origin}${path}`.replace(/\/$/, '');
    }
    return '';
  }

  private static async fetchApiJson(endpoint: string, options?: RequestInit): Promise<any> {
    const base = this.getApiBase();
    
    // 1. Direct cPanel PHP endpoint attempt
    try {
      let phpEndpoint = endpoint;
      if (endpoint.startsWith('/api/members')) {
        phpEndpoint = endpoint.replace('/api/members', '/api/members.php');
      } else if (endpoint.startsWith('/api/expenses')) {
        phpEndpoint = endpoint.replace('/api/expenses', '/api/expenses.php');
      } else if (endpoint.startsWith('/api/deposits')) {
        phpEndpoint = endpoint.replace('/api/deposits', '/api/deposits.php');
      } else if (endpoint.startsWith('/api/trips')) {
        phpEndpoint = endpoint.replace('/api/trips', '/api/trips.php');
      } else if (endpoint.startsWith('/api/auth/login')) {
        phpEndpoint = '/api/login.php';
      }

      const resPhp = await fetch(`${base}${phpEndpoint}`, options);
      const contentTypePhp = resPhp.headers.get('content-type') || '';
      if (resPhp.ok && contentTypePhp.includes('application/json')) {
        return await resPhp.json();
      }
    } catch (err) {
      console.warn(`PHP Endpoint fetch notice for ${endpoint}:`, err);
    }

    // 2. Standard REST API endpoint attempt (Node Express or Apache Rewritten)
    try {
      const res = await fetch(`${base}${endpoint}`, options);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`Standard API fetch notice for ${endpoint}:`, e);
    }

    return null;
  }

  static async fetchMembersFromApi(): Promise<Member[]> {
    const data = await this.fetchApiJson('/api/members');
    if (Array.isArray(data)) {
      this.saveMembers(data);
      return data;
    }
    return this.getMembers();
  }

  static async addMemberApi(memberData: { name: string; phone?: string; notes?: string; is_leader: boolean }): Promise<Member[]> {
    await this.fetchApiJson('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    return this.fetchMembersFromApi();
  }

  static async updateMemberApi(id: number, memberData: Partial<Member>): Promise<Member[]> {
    await this.fetchApiJson(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    return this.fetchMembersFromApi();
  }

  static async deleteMemberApi(id: number): Promise<Member[]> {
    await this.fetchApiJson(`/api/members/${id}`, {
      method: 'DELETE'
    });
    return this.fetchMembersFromApi();
  }

  static async fetchExpensesFromApi(): Promise<Expense[]> {
    const data = await this.fetchApiJson('/api/expenses');
    if (Array.isArray(data)) {
      this.saveExpenses(data);
      return data;
    }
    return this.getExpenses();
  }

  static async addExpenseApi(expenseData: any): Promise<Expense[]> {
    await this.fetchApiJson('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });
    return this.fetchExpensesFromApi();
  }

  static async deleteExpenseApi(id: number): Promise<Expense[]> {
    await this.fetchApiJson(`/api/expenses/${id}`, { method: 'DELETE' });
    return this.fetchExpensesFromApi();
  }

  static async fetchDepositsFromApi(): Promise<Deposit[]> {
    const data = await this.fetchApiJson('/api/deposits');
    if (Array.isArray(data)) {
      this.saveDeposits(data);
      return data;
    }
    return this.getDeposits();
  }

  static async addDepositApi(depositData: any): Promise<Deposit[]> {
    await this.fetchApiJson('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(depositData)
    });
    return this.fetchDepositsFromApi();
  }

  static async deleteDepositApi(id: number): Promise<Deposit[]> {
    await this.fetchApiJson(`/api/deposits/${id}`, { method: 'DELETE' });
    return this.fetchDepositsFromApi();
  }

  static async fetchTripFromApi(): Promise<Trip> {
    const data = await this.fetchApiJson('/api/trips');
    if (data && data.title) {
      this.saveTrip(data);
      return data;
    }
    return this.getTrip();
  }
}
