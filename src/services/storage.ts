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
  backendApiUrl: '', // empty means auto-detect current root/subdirectory
  isSimulatedOffline: false,
  autoSync: true
};

const DEFAULT_TRIP: Trip = {
  id: 1,
  title: 'Upper Mustang Overland 2026',
  destination: 'Pokhara • Marpha • Kagbeni • Lo Manthang',
  currency: 'Rs.',
  start_date: '2026-10-15',
  end_date: '2026-10-24',
  status: 'active',
  total_budget: 35000
};

export class StorageService {
  // -------------------------------------------------------------------
  // Synchronous Local Mirror Operations (100% Dynamic Database Mirror)
  // -------------------------------------------------------------------
  static getTrip(): Trip {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRIP);
      if (!data) return DEFAULT_TRIP;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_TRIP,
        ...parsed,
        total_budget: parsed.total_budget !== undefined ? Number(parsed.total_budget) : DEFAULT_TRIP.total_budget
      };
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
  // Never duplicates /api/api even if user entered ./api in settings
  // -------------------------------------------------------------------
  static getApiBase(): string {
    const cfg = this.getConfig();
    if (cfg.backendApiUrl && cfg.backendApiUrl.trim() !== '') {
      let clean = cfg.backendApiUrl.trim().replace(/\/+$/, '');
      if (clean === './api' || clean === '/api' || clean === 'api') {
        clean = '';
      } else if (clean.endsWith('/api')) {
        clean = clean.slice(0, -4);
      }
      if (clean !== '') {
        return clean;
      }
    }
    if (typeof window !== 'undefined' && window.location) {
      let path = window.location.pathname;
      path = path.replace(/\/[^\/]*\.[a-zA-Z0-9]+$/, '');
      path = path.replace(/\/+$/, '');
      return `${window.location.origin}${path}`;
    }
    return '';
  }

  static async fetchApiJson(endpoint: string, options?: RequestInit): Promise<any> {
    const base = this.getApiBase();

    // Convert RESTful /api/resource/123 into cPanel-safe /api/resource.php?id=123
    let phpEndpoint = endpoint;
    const matchId = endpoint.match(/^\/api\/(members|expenses|deposits|trips)\/([0-9]+)(\?.*)?$/);
    if (matchId) {
      const resource = matchId[1];
      const id = matchId[2];
      phpEndpoint = `/api/${resource}.php?id=${id}`;
    } else if (endpoint.startsWith('/api/members')) {
      phpEndpoint = endpoint.replace('/api/members', '/api/members.php');
    } else if (endpoint.startsWith('/api/expenses')) {
      phpEndpoint = endpoint.replace('/api/expenses', '/api/expenses.php');
    } else if (endpoint.startsWith('/api/deposits')) {
      phpEndpoint = endpoint.replace('/api/deposits', '/api/deposits.php');
    } else if (endpoint.startsWith('/api/trips')) {
      phpEndpoint = endpoint.replace('/api/trips', '/api/trips.php');
    } else if (endpoint.startsWith('/api/health')) {
      phpEndpoint = '/api/health.php';
    } else if (endpoint.startsWith('/api/auth/login')) {
      phpEndpoint = '/api/login.php';
    }

    const method = (options?.method || 'GET').toUpperCase();
    let lastErrorJson: any = null;

    // 1. Primary Attempt: Direct .php endpoint (works on both cPanel Apache & our Express server)
    try {
      const resPhp = await fetch(`${base}${phpEndpoint}`, {
        ...options,
        cache: 'no-store'
      });
      const contentTypePhp = resPhp.headers.get('content-type') || '';
      if (contentTypePhp.includes('application/json')) {
        const parsed = await resPhp.json();
        if (resPhp.ok) {
          return parsed;
        }
        lastErrorJson = parsed;
      }

      // If PUT or DELETE was blocked by cPanel ModSecurity (403/405/501), retry via POST + _method
      if ((method === 'DELETE' || method === 'PUT') && !resPhp.ok) {
        const sep = phpEndpoint.includes('?') ? '&' : '?';
        const overrideRes = await fetch(`${base}${phpEndpoint}${sep}_method=${method}`, {
          ...options,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
          cache: 'no-store'
        });
        const overrideType = overrideRes.headers.get('content-type') || '';
        if (overrideType.includes('application/json')) {
          const overrideParsed = await overrideRes.json();
          if (overrideRes.ok) {
            return overrideParsed;
          }
          lastErrorJson = overrideParsed;
        }
      }
    } catch (err) {
      console.warn(`PHP Endpoint fetch notice for ${phpEndpoint}:`, err);
    }

    // 2. Secondary Attempt: Standard extensionless REST endpoint
    if (endpoint !== phpEndpoint) {
      try {
        const res = await fetch(`${base}${endpoint}`, {
          ...options,
          cache: 'no-store'
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const parsed = await res.json();
          if (res.ok) {
            return parsed;
          }
          lastErrorJson = parsed;
        }
      } catch (e) {
        console.warn(`Standard API fetch notice for ${endpoint}:`, e);
      }
    }

    return lastErrorJson;
  }

  static async checkDatabaseHealth(): Promise<{
    connected: boolean;
    database?: string;
    stats?: { members: number; expenses: number; deposits: number; receipts: number };
    error?: string;
  }> {
    const data = await this.fetchApiJson('/api/health');
    if (data && (data.status === 'connected' || data.status === 'online' || data.success)) {
      return {
        connected: true,
        database: data.database || 'MySQL / Server DB',
        stats: data.stats
      };
    }
    return {
      connected: false,
      error: data?.error || 'Could not reach database API'
    };
  }

  static async fetchMembersFromApi(): Promise<Member[]> {
    const data = await this.fetchApiJson('/api/members');
    const list = Array.isArray(data) ? data : (data?.data?.members || null);
    if (Array.isArray(list)) {
      const localMembers = this.getMembers();
      const merged = list.map((m: Member) => {
        const existingLocal = localMembers.find((lm) => Number(lm.id) === Number(m.id));
        return {
          ...m,
          avatar: m.avatar !== undefined && m.avatar !== null ? m.avatar : (existingLocal?.avatar ?? m.avatar)
        };
      });
      this.saveMembers(merged);
      return merged;
    }
    return this.getMembers();
  }

  static async addMemberApi(memberData: { name: string; phone?: string; notes?: string; avatar?: string | null; is_leader: boolean }): Promise<Member[]> {
    await this.fetchApiJson('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    return this.fetchMembersFromApi();
  }

  static async updateMemberApi(id: number, memberData: Partial<Member>): Promise<Member[]> {
    // Immediately update local mirror so avatar / profile edits persist even if backend DB lacks avatar column
    const currentLocal = this.getMembers();
    const updatedLocal = currentLocal.map((m) =>
      Number(m.id) === Number(id) ? { ...m, ...memberData } : m
    );
    this.saveMembers(updatedLocal);

    await this.fetchApiJson(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...memberData })
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
    const list = Array.isArray(data) ? data : (data?.data?.expenses || null);
    if (Array.isArray(list)) {
      this.saveExpenses(list);
      return list;
    }
    return this.getExpenses();
  }

  static async addExpenseApi(expenseData: any): Promise<Expense[] | null> {
    const res = await this.fetchApiJson('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });
    if (!res || res.error || res.success === false) {
      return null;
    }
    return this.fetchExpensesFromApi();
  }

  static async updateExpenseApi(id: number, expenseData: any): Promise<Expense[] | null> {
    const res = await this.fetchApiJson(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...expenseData })
    });
    if (!res || res.error || res.success === false) {
      return null;
    }
    return this.fetchExpensesFromApi();
  }

  static async deleteExpenseApi(id: number): Promise<Expense[]> {
    await this.fetchApiJson(`/api/expenses/${id}`, { method: 'DELETE' });
    return this.fetchExpensesFromApi();
  }

  static async fetchDepositsFromApi(): Promise<Deposit[]> {
    const data = await this.fetchApiJson('/api/deposits');
    const list = Array.isArray(data) ? data : (data?.data?.deposits || null);
    if (Array.isArray(list)) {
      this.saveDeposits(list);
      return list;
    }
    return this.getDeposits();
  }

  static async addDepositApi(depositData: any): Promise<Deposit[] | null> {
    const res = await this.fetchApiJson('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(depositData)
    });
    if (!res || res.error || res.success === false) {
      return null;
    }
    return this.fetchDepositsFromApi();
  }

  static async updateDepositApi(id: number, depositData: any): Promise<Deposit[] | null> {
    const res = await this.fetchApiJson(`/api/deposits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...depositData })
    });
    if (!res || res.error || res.success === false) {
      return null;
    }
    return this.fetchDepositsFromApi();
  }

  static async deleteDepositApi(id: number): Promise<Deposit[]> {
    await this.fetchApiJson(`/api/deposits/${id}`, { method: 'DELETE' });
    return this.fetchDepositsFromApi();
  }

  static async fetchTripFromApi(): Promise<Trip> {
    const data = await this.fetchApiJson('/api/trips');
    const tripObj = data?.title ? data : (data?.data?.trip || null);
    if (tripObj && tripObj.title) {
      const localTrip = this.getTrip();
      const merged: Trip = {
        ...tripObj,
        total_budget:
          tripObj.total_budget !== undefined && tripObj.total_budget !== null
            ? Number(tripObj.total_budget)
            : (localTrip.total_budget ?? DEFAULT_TRIP.total_budget)
      };
      this.saveTrip(merged);
      return merged;
    }
    return this.getTrip();
  }

  static async updateTripApi(tripData: Trip): Promise<Trip> {
    await this.fetchApiJson(`/api/trips/${tripData.id || 1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData)
    });
    return this.fetchTripFromApi();
  }
}
