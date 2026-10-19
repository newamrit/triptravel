import { Trip, Member, Deposit, Expense, SettlementData } from '../types';

export interface BackupReminderPrefs {
  enabled: boolean;
  intervalMinutes: number; // e.g. 15, 360 (6h), 720 (12h), 1440 (24h)
  remindAfterNewRecords: number; // e.g. 5 records
  lastBackupAt: string | null;
  nextReminderTimestamp: number;
  recordsSinceLastBackup: number;
  preferredFormat: 'sql_and_json' | 'sql' | 'json';
}

const BACKUP_PREFS_KEY = 'trippool_backup_reminder_prefs_v1';

// Default recurring reminder: enabled, every 12 hours (720 mins) or after 5 new records,
// and first reminder scheduled 2 minutes after first session start if never backed up.
const DEFAULT_BACKUP_PREFS: BackupReminderPrefs = {
  enabled: true,
  intervalMinutes: 720, // 12 hours default
  remindAfterNewRecords: 5,
  lastBackupAt: null,
  nextReminderTimestamp: Date.now() + 2 * 60 * 1000,
  recordsSinceLastBackup: 0,
  preferredFormat: 'sql_and_json',
};

export class BackupManager {
  private static listeners: Set<(prefs: BackupReminderPrefs) => void> = new Set();

  static getPrefs(): BackupReminderPrefs {
    try {
      const raw = localStorage.getItem(BACKUP_PREFS_KEY);
      if (raw) {
        return { ...DEFAULT_BACKUP_PREFS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore storage errors
    }
    return { ...DEFAULT_BACKUP_PREFS };
  }

  static savePrefs(partial: Partial<BackupReminderPrefs>): BackupReminderPrefs {
    const current = this.getPrefs();
    const updated: BackupReminderPrefs = { ...current, ...partial };
    try {
      localStorage.setItem(BACKUP_PREFS_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    this.listeners.forEach((cb) => cb(updated));
    return updated;
  }

  static subscribe(cb: (prefs: BackupReminderPrefs) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  static recordDataMutation(): BackupReminderPrefs {
    const prefs = this.getPrefs();
    return this.savePrefs({
      recordsSinceLastBackup: (prefs.recordsSinceLastBackup || 0) + 1,
    });
  }

  static markBackupCompleted(): BackupReminderPrefs {
    const prefs = this.getPrefs();
    const nowIso = new Date().toISOString();
    const nextTs = Date.now() + prefs.intervalMinutes * 60 * 1000;
    return this.savePrefs({
      lastBackupAt: nowIso,
      nextReminderTimestamp: nextTs,
      recordsSinceLastBackup: 0,
    });
  }

  static snoozeReminder(minutes: number): BackupReminderPrefs {
    return this.savePrefs({
      nextReminderTimestamp: Date.now() + minutes * 60 * 1000,
    });
  }

  static isReminderDue(): { due: boolean; reason: 'scheduled' | 'changes' | null } {
    const prefs = this.getPrefs();
    if (!prefs.enabled) return { due: false, reason: null };

    if (
      prefs.remindAfterNewRecords > 0 &&
      prefs.recordsSinceLastBackup >= prefs.remindAfterNewRecords
    ) {
      return { due: true, reason: 'changes' };
    }

    if (Date.now() >= prefs.nextReminderTimestamp) {
      return { due: true, reason: 'scheduled' };
    }

    return { due: false, reason: null };
  }
}

function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${str}'`;
}

function triggerBrowserDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Generates and downloads a complete MySQL / phpMyAdmin compatible .SQL database dump
 * containing schema + all live trip, member, deposit, expense, and split records.
 */
export function exportDatabaseAsSql(
  trip: Trip,
  members: Member[],
  deposits: Deposit[],
  expenses: Expense[]
): string {
  const timestamp = new Date().toISOString();
  const dateSlug = timestamp.substring(0, 10);
  const safeTripSlug = (trip.title || 'trippool')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  const lines: string[] = [];
  lines.push(`-- ============================================================================`);
  lines.push(`-- TripPool Complete MySQL Database Backup (.SQL)`);
  lines.push(`-- Trip: ${trip.title} (${trip.destination})`);
  lines.push(`-- Generated At: ${timestamp}`);
  lines.push(`-- Compatible with: cPanel phpMyAdmin / MySQL 5.7+ / MariaDB 10.3+`);
  lines.push(`-- ============================================================================`);
  lines.push(``);
  lines.push(`SET NAMES utf8mb4;`);
  lines.push(`SET FOREIGN_KEY_CHECKS = 0;`);
  lines.push(``);

  // 1. Trips Table
  lines.push(`CREATE TABLE IF NOT EXISTS \`trips\` (`);
  lines.push(`  \`id\` INT AUTO_INCREMENT PRIMARY KEY,`);
  lines.push(`  \`title\` VARCHAR(180) NOT NULL,`);
  lines.push(`  \`destination\` VARCHAR(255) DEFAULT '',`);
  lines.push(`  \`currency\` VARCHAR(16) DEFAULT 'Rs.',`);
  lines.push(`  \`start_date\` DATE DEFAULT NULL,`);
  lines.push(`  \`end_date\` DATE DEFAULT NULL,`);
  lines.push(`  \`status\` VARCHAR(32) DEFAULT 'active',`);
  lines.push(`  \`total_budget\` DECIMAL(12,2) DEFAULT 35000.00`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);
  lines.push(
    `REPLACE INTO \`trips\` (\`id\`, \`title\`, \`destination\`, \`currency\`, \`start_date\`, \`end_date\`, \`status\`, \`total_budget\`) VALUES (${sqlEscape(
      trip.id || 1
    )}, ${sqlEscape(trip.title)}, ${sqlEscape(trip.destination)}, ${sqlEscape(
      trip.currency || 'Rs.'
    )}, ${sqlEscape(trip.start_date)}, ${sqlEscape(trip.end_date)}, ${sqlEscape(
      trip.status || 'active'
    )}, ${Number(trip.total_budget || 0).toFixed(2)});`
  );
  lines.push(``);

  // 2. Members Table
  lines.push(`CREATE TABLE IF NOT EXISTS \`members\` (`);
  lines.push(`  \`id\` BIGINT PRIMARY KEY,`);
  lines.push(`  \`trip_id\` INT DEFAULT 1,`);
  lines.push(`  \`name\` VARCHAR(120) NOT NULL,`);
  lines.push(`  \`phone\` VARCHAR(45) DEFAULT NULL,`);
  lines.push(`  \`is_leader\` TINYINT(1) DEFAULT 0,`);
  lines.push(`  \`is_active\` TINYINT(1) DEFAULT 1,`);
  lines.push(`  \`notes\` VARCHAR(255) DEFAULT NULL,`);
  lines.push(`  \`avatar\` LONGTEXT DEFAULT NULL`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);
  members.forEach((m) => {
    lines.push(
      `REPLACE INTO \`members\` (\`id\`, \`trip_id\`, \`name\`, \`phone\`, \`is_leader\`, \`is_active\`, \`notes\`, \`avatar\`) VALUES (${sqlEscape(
        m.id
      )}, ${sqlEscape(m.trip_id || trip.id || 1)}, ${sqlEscape(m.name)}, ${sqlEscape(
        m.phone || null
      )}, ${sqlEscape(Boolean(m.is_leader))}, ${sqlEscape(
        m.is_active !== false
      )}, ${sqlEscape(m.notes || null)}, ${sqlEscape(m.avatar || null)});`
    );
  });
  lines.push(``);

  // 3. Deposits Table
  lines.push(`CREATE TABLE IF NOT EXISTS \`deposits\` (`);
  lines.push(`  \`id\` BIGINT PRIMARY KEY,`);
  lines.push(`  \`trip_id\` INT DEFAULT 1,`);
  lines.push(`  \`member_id\` BIGINT NOT NULL,`);
  lines.push(`  \`member_name\` VARCHAR(120) NOT NULL,`);
  lines.push(`  \`amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`);
  lines.push(`  \`payment_method\` VARCHAR(50) DEFAULT 'Cash',`);
  lines.push(`  \`notes\` VARCHAR(255) DEFAULT NULL,`);
  lines.push(`  \`deposited_at\` DATETIME NOT NULL`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);
  deposits.forEach((d) => {
    lines.push(
      `REPLACE INTO \`deposits\` (\`id\`, \`trip_id\`, \`member_id\`, \`member_name\`, \`amount\`, \`payment_method\`, \`notes\`, \`deposited_at\`) VALUES (${sqlEscape(
        d.id
      )}, ${sqlEscape(d.trip_id || trip.id || 1)}, ${sqlEscape(d.member_id)}, ${sqlEscape(
        d.member_name
      )}, ${sqlEscape(Number(d.amount) || 0)}, ${sqlEscape(
        d.payment_method || 'Cash'
      )}, ${sqlEscape(d.notes || null)}, ${sqlEscape(d.deposited_at)});`
    );
  });
  lines.push(``);

  // 4. Expenses & Expense Splits Tables
  lines.push(`CREATE TABLE IF NOT EXISTS \`expenses\` (`);
  lines.push(`  \`id\` BIGINT PRIMARY KEY,`);
  lines.push(`  \`trip_id\` INT DEFAULT 1,`);
  lines.push(`  \`amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`);
  lines.push(`  \`category\` VARCHAR(80) NOT NULL,`);
  lines.push(`  \`payer_type\` VARCHAR(24) NOT NULL DEFAULT 'pool',`);
  lines.push(`  \`payer_member_id\` BIGINT DEFAULT NULL,`);
  lines.push(`  \`payer_member_name\` VARCHAR(120) DEFAULT 'Trip Pool',`);
  lines.push(`  \`description\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`split_type\` VARCHAR(24) NOT NULL DEFAULT 'equal',`);
  lines.push(`  \`receipt_image\` LONGTEXT DEFAULT NULL,`);
  lines.push(`  \`expense_date\` DATETIME NOT NULL`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`CREATE TABLE IF NOT EXISTS \`expense_splits\` (`);
  lines.push(`  \`expense_id\` BIGINT NOT NULL,`);
  lines.push(`  \`member_id\` BIGINT NOT NULL,`);
  lines.push(`  \`member_name\` VARCHAR(120) NOT NULL,`);
  lines.push(`  \`split_amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`);
  lines.push(`  PRIMARY KEY (\`expense_id\`, \`member_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  expenses.forEach((e) => {
    lines.push(
      `REPLACE INTO \`expenses\` (\`id\`, \`trip_id\`, \`amount\`, \`category\`, \`payer_type\`, \`payer_member_id\`, \`payer_member_name\`, \`description\`, \`split_type\`, \`receipt_image\`, \`expense_date\`) VALUES (${sqlEscape(
        e.id
      )}, ${sqlEscape(e.trip_id || trip.id || 1)}, ${sqlEscape(
        Number(e.amount) || 0
      )}, ${sqlEscape(e.category)}, ${sqlEscape(e.payer_type)}, ${sqlEscape(
        e.payer_member_id || null
      )}, ${sqlEscape(e.payer_member_name || 'Trip Pool')}, ${sqlEscape(
        e.description
      )}, ${sqlEscape(e.split_type || 'equal')}, ${sqlEscape(
        e.receipt_image || null
      )}, ${sqlEscape(e.expense_date)});`
    );

    if (Array.isArray(e.splits)) {
      e.splits.forEach((s) => {
        lines.push(
          `REPLACE INTO \`expense_splits\` (\`expense_id\`, \`member_id\`, \`member_name\`, \`split_amount\`) VALUES (${sqlEscape(
            e.id
          )}, ${sqlEscape(s.member_id)}, ${sqlEscape(s.member_name)}, ${sqlEscape(
            Number(s.split_amount) || 0
          )});`
        );
      });
    }
  });

  lines.push(``);
  lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  lines.push(`-- End of TripPool SQL Backup`);

  const filename = `${safeTripSlug}_full_db_backup_${dateSlug}.sql`;
  triggerBrowserDownload(lines.join('\n'), filename, 'application/sql;charset=utf-8');
  return filename;
}

/**
 * Generates and downloads a complete JSON database snapshot
 * including trip metadata, members, deposits, expenses (with receipt photos), and settlement calculations.
 */
export function exportDatabaseAsJson(
  trip: Trip,
  members: Member[],
  deposits: Deposit[],
  expenses: Expense[],
  settlement: SettlementData
): string {
  const timestamp = new Date().toISOString();
  const dateSlug = timestamp.substring(0, 10);
  const safeTripSlug = (trip.title || 'trippool')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  const payload = {
    backup_version: '2.0',
    exported_at: timestamp,
    database_stats: {
      members_count: members.length,
      deposits_count: deposits.length,
      expenses_count: expenses.length,
      receipt_photos_count: expenses.filter((e) => Boolean(e.receipt_image)).length,
      total_collected: settlement.summary.total_collected,
      total_spent: settlement.summary.total_spent,
      pool_cash_remaining: settlement.summary.pool_cash_remaining,
    },
    trip,
    members,
    deposits,
    expenses,
    settlement_snapshot: settlement,
  };

  const filename = `${safeTripSlug}_full_db_backup_${dateSlug}.json`;
  triggerBrowserDownload(
    JSON.stringify(payload, null, 2),
    filename,
    'application/json;charset=utf-8'
  );
  return filename;
}
