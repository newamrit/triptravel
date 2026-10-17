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
   * Test connection to the PHP backend
   */
  static async testConnection(baseUrl: string): Promise<{ success: boolean; message: string }> {
    if (!baseUrl) {
      return { success: false, message: 'Please provide a valid PHP API URL.' };
    }

    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const testEndpoint = `${cleanUrl}/settlement.php?trip_id=1`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(testEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          success: false,
          message: `Backend returned HTTP status ${res.status}: ${res.statusText}`
        };
      }

      const json = await res.json();
      if (json && json.success) {
        return {
          success: true,
          message: `Connected successfully! Trip: ${json.data?.trip?.title || 'TripPool'} (Pool: ${json.data?.currency || 'Rs.'} ${json.data?.summary?.pool_cash_remaining ?? 0})`
        };
      } else {
        return {
          success: false,
          message: json.error || 'Server responded without success status.'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'Connection timed out (6s).' : `Network error: ${err.message}`
      };
    }
  }

  /**
   * Sync all pending items from offline queue to PHP REST backend
   */
  static async processQueue(config: AppConfig): Promise<SyncResult> {
    if (config.isSimulatedOffline) {
      return {
        success: false,
        message: 'Mountain Offline Mode is active. Turn it off to sync.',
        syncedCount: 0,
        failedCount: 0
      };
    }

    if (!config.backendApiUrl) {
      return {
        success: true,
        message: 'Running in Local Mountain Mode. All data is safely preserved in browser storage.',
        syncedCount: 0,
        failedCount: 0
      };
    }

    const cleanUrl = config.backendApiUrl.replace(/\/+$/, '');
    const queue = StorageService.getQueue();
    if (queue.length === 0) {
      return {
        success: true,
        message: 'Sync queue is empty. Everything is up to date!',
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
      let payload = item.payload;

      if (item.type === 'member') endpoint = `${cleanUrl}/members.php`;
      else if (item.type === 'deposit') endpoint = `${cleanUrl}/deposits.php`;
      else if (item.type === 'expense') endpoint = `${cleanUrl}/expenses.php`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (res.ok && json.success) {
          syncedCount++;
          // remove from remaining
          const idx = remainingQueue.findIndex(q => q.id === item.id);
          if (idx !== -1) remainingQueue.splice(idx, 1);
        } else {
          failedCount++;
          item.status = 'failed';
          item.errorMessage = json.error || 'Request rejected by API';
        }
      } catch (err: any) {
        failedCount++;
        item.status = 'failed';
        item.errorMessage = err.message || 'Network failure';
        break; // stop further attempts if network drops
      }
    }

    StorageService.saveQueue(remainingQueue);

    return {
      success: failedCount === 0,
      message: failedCount === 0
        ? `Successfully pushed ${syncedCount} queued transactions to MySQL backend!`
        : `Synced ${syncedCount} records, but ${failedCount} could not be pushed.`,
      syncedCount,
      failedCount
    };
  }

  /**
   * Pull latest data from PHP backend
   */
  static async pullFromBackend(config: AppConfig, tripId: number = 1): Promise<{
    success: boolean;
    data?: {
      trip: Trip;
      members: Member[];
      deposits: Deposit[];
      expenses: Expense[];
    };
    error?: string;
  }> {
    if (config.isSimulatedOffline || !config.backendApiUrl) {
      return { success: false, error: 'Backend URL not configured or offline mode enabled.' };
    }

    const cleanUrl = config.backendApiUrl.replace(/\/+$/, '');

    try {
      const [membersRes, depositsRes, expensesRes] = await Promise.all([
        fetch(`${cleanUrl}/members.php?trip_id=${tripId}`),
        fetch(`${cleanUrl}/deposits.php?trip_id=${tripId}`),
        fetch(`${cleanUrl}/expenses.php?trip_id=${tripId}`)
      ]);

      const [membersJson, depositsJson, expensesJson] = await Promise.all([
        membersRes.json(),
        depositsRes.json(),
        expensesRes.json()
      ]);

      if (!membersJson.success || !depositsJson.success || !expensesJson.success) {
        return { success: false, error: 'One or more API endpoints returned an error.' };
      }

      return {
        success: true,
        data: {
          trip: StorageService.getTrip(),
          members: membersJson.data.members,
          deposits: depositsJson.data.deposits,
          expenses: expensesJson.data.expenses
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch from backend.' };
    }
  }
}
