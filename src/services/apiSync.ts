import { StorageService, AppConfig } from './storage';
import { Member, Deposit, Expense, Trip } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount: number;
  failedCount: number;
}

export class ApiSyncService {
  /**
   * Test connection to the MySQL / PHP backend
   */
  static async testConnection(baseUrl?: string): Promise<{
    success: boolean;
    message: string;
    diagnostics?: any;
  }> {
    let base = StorageService.getApiBase();
    if (baseUrl && baseUrl.trim() !== '' && baseUrl.trim() !== './api' && baseUrl.trim() !== '/api') {
      base = baseUrl.trim().replace(/\/+$/, '');
      if (base.endsWith('/api')) {
        base = base.slice(0, -4);
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Try health.php / health endpoint
      const endpoints = [`${base}/api/health.php`, `${base}/api/health`, `${base}/debug.php?format=json`];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store'
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            clearTimeout(timeoutId);

            if (res.ok && (json.status === 'connected' || json.status === 'online' || json.database?.connected)) {
              const dbName = json.database?.config?.database || json.database || 'MySQL';
              const stats = json.stats || {
                members: json.database?.tables?.members?.count ?? 0,
                expenses: json.database?.tables?.expenses?.count ?? 0,
                deposits: json.database?.tables?.deposits?.count ?? 0,
                receipts: 0
              };
              return {
                success: true,
                message: `Connected to Database (${dbName})! Live records: ${stats.members} Members, ${stats.expenses} Expenses, ${stats.deposits} Deposits.`,
                diagnostics: json
              };
            } else {
              return {
                success: false,
                message: json.error || json.database?.error || 'Database responded with an error. Check credentials in api/db.php.',
                diagnostics: json
              };
            }
          }
        } catch {
          // Try next endpoint
        }
      }

      clearTimeout(timeoutId);
      return {
        success: false,
        message: 'Could not reach PHP/MySQL API endpoints. Verify files are uploaded to public_html/api/.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'Connection timed out (8s).' : `Network error: ${err.message}`
      };
    }
  }

  /**
   * Fetch full diagnostic report from debug.php?format=json (Trip Leader Only)
   */
  static async fetchDiagnostics(): Promise<any> {
    const base = StorageService.getApiBase();
    const urls = [`${base}/debug.php?format=json&leader_token=trippool_leader_2026`, `${base}/api/health.php`, `${base}/api/health`];
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      } catch {
        // continue
      }
    }
    return null;
  }

  /**
   * Sync all pending items from offline queue to MySQL REST backend
   */
  static async processQueue(config: AppConfig): Promise<SyncResult> {
    if (config.isSimulatedOffline) {
      return {
        success: false,
        message: 'Mountain Offline Mode is active. Turn it off to sync to database.',
        syncedCount: 0,
        failedCount: 0
      };
    }

    const queue = StorageService.getQueue();
    if (queue.length === 0) {
      return {
        success: true,
        message: 'Sync queue is empty. All records are synced with the database!',
        syncedCount: 0,
        failedCount: 0
      };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue = [...queue];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      let endpoint = '';
      const payload = item.payload;

      if (item.type === 'member') endpoint = '/api/members';
      else if (item.type === 'deposit') endpoint = '/api/deposits';
      else if (item.type === 'expense') endpoint = '/api/expenses';

      try {
        const json = await StorageService.fetchApiJson(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (json && (json.success || json.id)) {
          syncedCount++;
          const idx = remainingQueue.findIndex(q => q.id === item.id);
          if (idx !== -1) remainingQueue.splice(idx, 1);
        } else {
          failedCount++;
          item.status = 'failed';
          item.errorMessage = json?.error || 'Request rejected by database API';
        }
      } catch (err: any) {
        failedCount++;
        item.status = 'failed';
        item.errorMessage = err.message || 'Network failure';
        break;
      }
    }

    StorageService.saveQueue(remainingQueue);

    return {
      success: failedCount === 0,
      message: failedCount === 0
        ? `Successfully synced ${syncedCount} offline transaction(s) to MySQL database!`
        : `Synced ${syncedCount} record(s), ${failedCount} still pending.`,
      syncedCount,
      failedCount
    };
  }

  /**
   * Pull latest data from MySQL backend
   */
  static async pullFromBackend(config: AppConfig): Promise<{
    success: boolean;
    data?: {
      trip: Trip;
      members: Member[];
      deposits: Deposit[];
      expenses: Expense[];
    };
    error?: string;
  }> {
    if (config.isSimulatedOffline) {
      return { success: false, error: 'Offline mode is active.' };
    }

    try {
      const [trip, members, deposits, expenses] = await Promise.all([
        StorageService.fetchTripFromApi(),
        StorageService.fetchMembersFromApi(),
        StorageService.fetchDepositsFromApi(),
        StorageService.fetchExpensesFromApi()
      ]);

      return {
        success: true,
        data: { trip, members, deposits, expenses }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch from database.' };
    }
  }
}
