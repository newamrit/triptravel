import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { muiTheme } from './theme/theme';
import { Trip, Member, Deposit, Expense, ExpenseCategory, PayerType, SplitType, PaymentMethod, AuthSession, ExpenseSplit } from './types';
import { StorageService, AppConfig } from './services/storage';
import { calculateSettlement } from './services/settlementEngine';
import { ApiSyncService } from './services/apiSync';
import { TopBar } from './components/TopBar';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { DepositsView } from './components/DepositsView';
import { SettlementView } from './components/SettlementView';
import { MembersView } from './components/MembersView';
import { ExpenseModal } from './components/ExpenseModal';
import { DepositModal } from './components/DepositModal';
import { BackendModal } from './components/BackendModal';
import { LoginScreen } from './components/LoginScreen';
import { PWAInstallPopup } from './components/PWAInstallPopup';
import { AuthService } from './services/authService';
import { SoundEffects, UIEffectsPreferences } from './utils/soundEffects';
import { AppBootSplash, FloatingActivityPill, TopSyncProgressBar } from './components/AppLoadingOverlay';
import { EffectsSettingsModal } from './components/EffectsSettingsModal';
import { PdfExportModal } from './components/PdfExportModal';
import {
  BackupManager,
  BackupReminderPrefs,
  exportDatabaseAsSql,
  exportDatabaseAsJson,
} from './utils/backupExporter';
import { BackupReminderBanner, BackupReminderModal } from './components/BackupReminderModal';

export default function App() {
  // Authentication Session
  const [session, setSession] = useState<AuthSession | null>(() => AuthService.getCurrentSession());

  // 1. State Mirrored from Database API
  const [trip, setTrip] = useState<Trip>(() => StorageService.getTrip());
  const [members, setMembers] = useState<Member[]>(() => StorageService.getMembers());
  const [deposits, setDeposits] = useState<Deposit[]>(() => StorageService.getDeposits());
  const [expenses, setExpenses] = useState<Expense[]>(() => StorageService.getExpenses());
  const [queuedItems, setQueuedItems] = useState(() => StorageService.getQueue());
  const [config, setConfig] = useState<AppConfig>(() => StorageService.getConfig());

  // Sound & Animation Preferences
  const [effectsPrefs, setEffectsPrefs] = useState<UIEffectsPreferences>(() => SoundEffects.getPrefs());
  const [isEffectsModalOpen, setIsEffectsModalOpen] = useState<boolean>(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState<boolean>(false);
  const [pdfExportFilter, setPdfExportFilter] = useState<{ category: string; dayKey: string }>({
    category: 'all',
    dayKey: 'all',
  });

  // Recurring Database Backup Reminder State
  const [backupPrefs, setBackupPrefs] = useState<BackupReminderPrefs>(() => BackupManager.getPrefs());
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupDueStatus, setBackupDueStatus] = useState<{
    due: boolean;
    reason: 'scheduled' | 'changes' | null;
  }>(() => BackupManager.isReminderDue());

  // Loading & Activity Animation States
  const [isBootSplashOpen, setIsBootSplashOpen] = useState<boolean>(() => {
    const prefs = SoundEffects.getPrefs();
    return Boolean(AuthService.getCurrentSession()) && prefs.startupLoaderEnabled;
  });
  const [bootStatusText, setBootStatusText] = useState<string>('Connecting to TripPool MySQL...');
  const [activityLabel, setActivityLabel] = useState<string | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    return SoundEffects.subscribe((updated) => setEffectsPrefs(updated));
  }, []);

  useEffect(() => {
    const unsub = BackupManager.subscribe((updated) => {
      setBackupPrefs(updated);
      setBackupDueStatus(BackupManager.isReminderDue());
    });
    const timer = setInterval(() => {
      setBackupDueStatus(BackupManager.isReminderDue());
    }, 20000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // Initialize seed accounts
  useEffect(() => {
    AuthService.init();
  }, []);

  // Dismiss initial startup splash smoothly after initial sync
  useEffect(() => {
    if (!isBootSplashOpen) return;
    const t1 = setTimeout(() => {
      setBootStatusText('Syncing live trip ledger & settlement...');
    }, 280);
    const t2 = setTimeout(() => {
      setIsBootSplashOpen(false);
    }, 780);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isBootSplashOpen]);

  // Pull all fresh records from MySQL Database API
  const syncWithDatabase = useCallback(async (showIndicator = false) => {
    if (config.isSimulatedOffline) return;
    if (showIndicator) {
      setActivityLabel('Syncing with MySQL Database...');
    }
    try {
      const [dbMembers, dbExpenses, dbDeposits, dbTrip] = await Promise.all([
        StorageService.fetchMembersFromApi(),
        StorageService.fetchExpensesFromApi(),
        StorageService.fetchDepositsFromApi(),
        StorageService.fetchTripFromApi(),
      ]);
      if (Array.isArray(dbMembers)) setMembers(dbMembers);
      if (Array.isArray(dbExpenses)) setExpenses(dbExpenses);
      if (Array.isArray(dbDeposits)) setDeposits(dbDeposits);
      if (dbTrip && dbTrip.title) setTrip(dbTrip);
    } catch (err) {
      console.warn('Database auto-sync notice:', err);
    } finally {
      if (showIndicator) {
        setTimeout(() => setActivityLabel(null), 260);
      }
    }
  }, [config.isSimulatedOffline]);

  // 100% Database Sync: Query Database REST API on mount, login, & tab navigation
  useEffect(() => {
    syncWithDatabase(false);
  }, [activeTab, session, syncWithDatabase]);

  // Save local mirror state
  useEffect(() => {
    StorageService.saveTrip(trip);
  }, [trip]);

  useEffect(() => {
    StorageService.saveMembers(members);
  }, [members]);

  useEffect(() => {
    StorageService.saveDeposits(deposits);
  }, [deposits]);

  useEffect(() => {
    StorageService.saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    StorageService.saveConfig(config);
  }, [config]);

  // 6. Sync Queue Handler
  const triggerBackgroundSync = useCallback(async () => {
    if (config.isSimulatedOffline) return;
    setIsSyncing(true);
    setActivityLabel('Syncing offline queue to MySQL...');
    const res = await ApiSyncService.processQueue(config);
    setQueuedItems(StorageService.getQueue());
    await syncWithDatabase(false);
    setIsSyncing(false);
    setActivityLabel(null);

    if (res.syncedCount > 0) {
      SoundEffects.play('sync');
      showToast(`Synced ${res.syncedCount} queued record(s) to MySQL Database!`);
    } else if (res.success) {
      SoundEffects.play('sync');
      showToast('All records synced with MySQL Database!');
    } else {
      SoundEffects.play('error');
      showToast(res.message || 'Sync paused - queued for reconnection.');
    }
  }, [config, showToast, syncWithDatabase]);

  // Auto-sync when device regains internet connection on the road or exits simulated offline mode
  useEffect(() => {
    const handleOnline = () => {
      if (StorageService.getQueue().length > 0 && !config.isSimulatedOffline) {
        triggerBackgroundSync();
      } else {
        syncWithDatabase(true);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [config.isSimulatedOffline, triggerBackgroundSync, syncWithDatabase]);

  useEffect(() => {
    if (!config.isSimulatedOffline && queuedItems.length > 0) {
      triggerBackgroundSync();
    }
  }, [config.isSimulatedOffline]);

  // 2. Settlement Engine (Auto recalculates on any financial movement)
  const settlementResult = useMemo(() => {
    return calculateSettlement(trip, members, deposits, expenses);
  }, [trip, members, deposits, expenses]);

  // 3. Handlers for Expenses (100% Database First when online, supports both Create & Edit)
  const handleSaveExpense = async (data: {
    id?: number;
    amount: number;
    category: ExpenseCategory;
    payer_type: PayerType;
    payer_member_id: number | null;
    description: string;
    split_type: SplitType;
    split_members: number[];
    custom_splits?: ExpenseSplit[];
    expense_date: string;
    receipt_image?: string | null;
  }) => {
    const activeMembers = members.filter(m => m.is_active);
    const targetMembers = activeMembers.filter(m => data.split_members.includes(m.id));
    const effectiveMembers = targetMembers.length > 0 ? targetMembers : activeMembers;

    if (effectiveMembers.length === 0 && (!data.custom_splits || data.custom_splits.length === 0)) {
      SoundEffects.play('error');
      showToast('Error: At least 1 active member required to split expense.');
      return;
    }

    let splits: ExpenseSplit[];
    if (data.custom_splits && data.custom_splits.length > 0) {
      splits = data.custom_splits.map(s => {
        const memberObj = members.find(m => m.id === s.member_id);
        return {
          member_id: s.member_id,
          member_name: s.member_name || memberObj?.name || 'Member',
          split_amount: Math.round((Number(s.split_amount) || 0) * 100) / 100,
          ...(s.shares !== undefined ? { shares: s.shares } : {})
        };
      });
    } else {
      const perPersonSplit = Math.round((data.amount / effectiveMembers.length) * 100) / 100;
      splits = effectiveMembers.map(m => ({
        member_id: m.id,
        member_name: m.name,
        split_amount: perPersonSplit
      }));
    }

    let payerName = 'Trip Pool';
    if (data.payer_type === 'member' && data.payer_member_id) {
      const payerObj = members.find(m => m.id === data.payer_member_id);
      if (payerObj) payerName = payerObj.name;
    }

    const expensePayload = {
      trip_id: trip.id,
      amount: data.amount,
      category: data.category,
      payer_type: data.payer_type,
      payer_member_id: data.payer_type === 'member' ? data.payer_member_id : null,
      payer_member_name: payerName,
      description: data.description,
      split_type: data.split_type,
      splits,
      receipt_image: data.receipt_image || null,
      expense_date: data.expense_date
    };

    setActivityLabel(data.id ? 'Updating expense in MySQL...' : 'Saving expense to MySQL...');

    // If editing an existing expense, update directly in Database
    if (data.id) {
      const updated = await StorageService.updateExpenseApi(data.id, expensePayload);
      setActivityLabel(null);
      if (Array.isArray(updated)) {
        setExpenses(updated);
        setEditingExpense(null);
        BackupManager.recordDataMutation();
        SoundEffects.play('expense');
        showToast(`Updated expense (${trip.currency} ${data.amount}) in Database!`);
        return;
      }
      SoundEffects.play('error');
      showToast('Failed to update expense in database. Check connection.');
      return;
    }

    if (!config.isSimulatedOffline) {
      try {
        const updated = await StorageService.addExpenseApi(expensePayload);
        if (Array.isArray(updated)) {
          setActivityLabel(null);
          setExpenses(updated);
          BackupManager.recordDataMutation();
          SoundEffects.play('expense');
          showToast(
            data.receipt_image
              ? `Saved ${trip.currency} ${data.amount} + Receipt Photo to Database!`
              : `Logged ${trip.currency} ${data.amount} for ${data.category} to Database!`
          );
          return;
        }
      } catch (e) {
        console.warn('API expense save failed, falling back to offline queue:', e);
      }
    }

    setActivityLabel(null);
    // Offline fallback queue (when in zero-signal mountain area)
    const newId = Date.now();
    const newExpense: Expense = {
      id: newId,
      ...expensePayload,
      receipt_image: data.receipt_image || undefined
    };

    setExpenses([newExpense, ...expenses]);
    StorageService.addToQueue({
      type: 'expense',
      action: 'create',
      payload: expensePayload
    });
    setQueuedItems(StorageService.getQueue());
    BackupManager.recordDataMutation();
    SoundEffects.play('expense');
    showToast(`Offline Mode: Queued ${trip.currency} ${data.amount} for database sync!`);
  };

  const handleDeleteExpense = async (id: number) => {
    SoundEffects.play('delete');
    setActivityLabel('Removing expense from MySQL...');
    const updated = await StorageService.deleteExpenseApi(id);
    setExpenses(updated);
    setActivityLabel(null);
    showToast('Expense removed from database.');
  };

  // 4. Handlers for Deposits (100% Database First when online, supports both Create & Edit)
  const handleSaveDeposit = async (data: {
    id?: number;
    member_id: number;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
    deposited_at: string;
  }) => {
    const member = members.find(m => m.id === data.member_id);
    const depositPayload = {
      trip_id: trip.id,
      member_id: data.member_id,
      member_name: member?.name || 'Member',
      amount: data.amount,
      payment_method: data.payment_method,
      notes: data.notes,
      deposited_at: data.deposited_at
    };

    setActivityLabel(data.id ? 'Updating deposit in MySQL...' : 'Recording pool deposit...');

    if (data.id) {
      const updated = await StorageService.updateDepositApi(data.id, depositPayload);
      setActivityLabel(null);
      if (Array.isArray(updated)) {
        setDeposits(updated);
        setEditingDeposit(null);
        BackupManager.recordDataMutation();
        SoundEffects.play('deposit');
        showToast(`Updated deposit (${trip.currency} ${data.amount}) in Database!`);
        return;
      }
      SoundEffects.play('error');
      showToast('Failed to update deposit in database. Check connection.');
      return;
    }

    if (!config.isSimulatedOffline) {
      try {
        const updated = await StorageService.addDepositApi(depositPayload);
        if (Array.isArray(updated)) {
          setActivityLabel(null);
          setDeposits(updated);
          BackupManager.recordDataMutation();
          SoundEffects.play('deposit');
          showToast(`Deposit of ${trip.currency} ${data.amount} from ${member?.name} saved to Database!`);
          return;
        }
      } catch (e) {
        console.warn('API deposit save failed, falling back to offline queue:', e);
      }
    }

    setActivityLabel(null);
    const newDeposit: Deposit = {
      id: Date.now(),
      ...depositPayload,
      notes: data.notes || undefined
    };

    setDeposits([newDeposit, ...deposits]);
    StorageService.addToQueue({
      type: 'deposit',
      action: 'create',
      payload: depositPayload
    });
    setQueuedItems(StorageService.getQueue());
    BackupManager.recordDataMutation();
    SoundEffects.play('deposit');
    showToast(`Offline Mode: Deposit of ${trip.currency} ${data.amount} queued for sync!`);
  };

  const handleDeleteDeposit = async (id: number) => {
    SoundEffects.play('delete');
    setActivityLabel('Removing deposit from MySQL...');
    const updated = await StorageService.deleteDepositApi(id);
    setDeposits(updated);
    setActivityLabel(null);
    showToast('Deposit removed from database.');
  };

  // 5. Handlers for Members & Trip (100% Database Driven)
  const handleSaveTrip = async (updatedTrip: Trip) => {
    setActivityLabel('Saving trip profile...');
    setTrip(updatedTrip);
    const saved = await StorageService.updateTripApi(updatedTrip);
    setTrip(saved);
    setActivityLabel(null);
    BackupManager.recordDataMutation();
    SoundEffects.play('sync');
    showToast('Trip profile updated in database.');
  };

  const handleAddMember = async (data: { name: string; phone?: string; notes?: string; avatar?: string | null; is_leader: boolean }) => {
    setActivityLabel(`Adding ${data.name} to trip...`);
    const updated = await StorageService.addMemberApi(data);
    setMembers(updated);
    setActivityLabel(null);
    BackupManager.recordDataMutation();
    SoundEffects.play('deposit');
    showToast(`${data.name} added to database!`);
  };

  const handleUpdateMember = async (id: number, updates: Partial<Member>) => {
    setActivityLabel('Updating member profile...');
    const updated = await StorageService.updateMemberApi(id, updates);
    setMembers(updated);
    // Sync expenses & deposits in case member name was cascaded in DB
    await syncWithDatabase(false);
    setActivityLabel(null);
    BackupManager.recordDataMutation();
    SoundEffects.play('sync');
    showToast('Member profile updated in database.');
  };

  const handleDeleteMember = async (id: number) => {
    SoundEffects.play('delete');
    setActivityLabel('Removing member...');
    const updated = await StorageService.deleteMemberApi(id);
    setMembers(updated);
    await syncWithDatabase(false);
    setActivityLabel(null);
    showToast('Member deleted from database.');
  };

  const handleResetData = async () => {
    setActivityLabel('Reloading live state from MySQL...');
    StorageService.resetToDemo();
    setQueuedItems([]);
    await syncWithDatabase(false);
    setActivityLabel(null);
    SoundEffects.play('sync');
    showToast('Cleared local cache and reloaded live state from Database.');
  };

  const handlePreviewLoadingSplash = () => {
    setIsEffectsModalOpen(false);
    setBootStatusText('Connecting to TripPool MySQL...');
    setIsBootSplashOpen(true);
  };

  const handleQuickFullBackupDownload = () => {
    const sqlFile = exportDatabaseAsSql(trip, members, deposits, expenses);
    setTimeout(() => {
      exportDatabaseAsJson(trip, members, deposits, expenses, settlementResult);
    }, 250);
    BackupManager.markBackupCompleted();
    SoundEffects.play('sync');
    showToast(`Full Database Backup (.SQL + .JSON) downloaded! (${sqlFile})`);
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />

      {/* Initial Startup / Preview Loading Splash Animation */}
      <AppBootSplash
        open={isBootSplashOpen}
        tripTitle={trip.title || 'TripPool Nepal'}
        statusText={bootStatusText}
        onDismiss={() => setIsBootSplashOpen(false)}
      />

      {/* Top Live Sync Shimmer Bar & Floating Activity Pill */}
      <TopSyncProgressBar active={effectsPrefs.syncProgressBarEnabled && (Boolean(activityLabel) || isSyncing)} />
      <FloatingActivityPill
        active={effectsPrefs.syncProgressBarEnabled && (Boolean(activityLabel) || isSyncing)}
        label={activityLabel || 'Syncing with MySQL...'}
      />

      {/* Global Toast Notification */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: { xs: 'calc(env(safe-area-inset-top, 0px) + 62px)', sm: 76 },
          left: { xs: 12, sm: 'auto' },
          right: { xs: 12, sm: 'auto' },
          zIndex: 9999,
        }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            maxWidth: 460,
            bgcolor: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.8125rem',
            borderRadius: 3,
            py: 0.75,
            px: 2,
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.45)',
            border: '1px solid #334155',
            '& .MuiAlert-icon': {
              color: '#10b981',
            },
          }}
        >
          {toast}
        </Alert>
      </Snackbar>

      {/* Authentication Gate */}
      {!session ? (
        <LoginScreen
          onLoginSuccess={(newSession) => {
            SoundEffects.play('welcome');
            setSession(newSession);
            if (effectsPrefs.startupLoaderEnabled) {
              setBootStatusText('Loading your trip pool ledger...');
              setIsBootSplashOpen(true);
            }
            showToast(`Welcome back, ${newSession.user.name}!`);
          }}
        />
      ) : (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
          {/* Top Navigation Bar */}
          <TopBar
            trip={trip}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isSimulatedOffline={config.isSimulatedOffline}
            queuedCount={queuedItems.length}
            currentUser={session.user}
            onLogout={() => {
              AuthService.logout();
              setSession(null);
            }}
            onOpenBackend={() => {
              if (session.user.role === 'leader') {
                setIsBackendModalOpen(true);
              }
            }}
            onOpenExpenseModal={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            onOpenEffectsModal={() => setIsEffectsModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            isBackupDue={backupDueStatus.due}
          />

          {/* Recurring Full Database Backup Reminder Banner */}
          <BackupReminderBanner
            visible={backupDueStatus.due}
            reason={backupDueStatus.reason}
            recordsSinceBackup={backupPrefs.recordsSinceLastBackup}
            lastBackupAt={backupPrefs.lastBackupAt}
            onQuickDownloadBackup={handleQuickFullBackupDownload}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onSnooze={(mins) => {
              BackupManager.snoozeReminder(mins);
              showToast(`Database backup reminder snoozed for ${mins} minutes.`);
            }}
          />

          {/* Offline / Mountain Mode Notice Banner */}
          <OfflineBanner
            isSimulatedOffline={config.isSimulatedOffline}
            queuedCount={queuedItems.length}
            onSyncNow={triggerBackgroundSync}
            onToggleOffline={() => {
              SoundEffects.play('tap');
              setConfig(prev => ({ ...prev, isSimulatedOffline: !prev.isSimulatedOffline }));
            }}
            isSyncing={isSyncing}
          />

          {/* Main View Router */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6 pb-28 md:pb-8">
            <div key={activeTab} className={effectsPrefs.smoothTransitionsEnabled ? 'view-transition-enter' : ''}>
              {activeTab === 'dashboard' && (
                <DashboardView
                  trip={trip}
                  members={members}
                  deposits={deposits}
                  expenses={expenses}
                  settlement={settlementResult}
                  onSaveTrip={handleSaveTrip}
                  onOpenExpenseModal={() => {
                    SoundEffects.play('tap');
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  onOpenDepositModal={() => {
                    SoundEffects.play('tap');
                    setEditingDeposit(null);
                    setIsDepositModalOpen(true);
                  }}
                  onOpenPdfExportModal={(opts) => {
                    setPdfExportFilter({
                      category: opts?.category || 'all',
                      dayKey: opts?.dayKey || 'all',
                    });
                    setIsPdfExportModalOpen(true);
                  }}
                  setActiveTab={(tab) => {
                    SoundEffects.play('tap');
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpensesView
                  expenses={expenses}
                  members={members}
                  trip={trip}
                  onOpenExpenseModal={() => {
                    SoundEffects.play('tap');
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  onEditExpense={(exp) => {
                    SoundEffects.play('tap');
                    setEditingExpense(exp);
                    setIsExpenseModalOpen(true);
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  onOpenPdfExportModal={(opts) => {
                    setPdfExportFilter({
                      category: opts?.category || 'all',
                      dayKey: opts?.dayKey || 'all',
                    });
                    setIsPdfExportModalOpen(true);
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'deposits' && (
                <DepositsView
                  deposits={deposits}
                  members={members}
                  trip={trip}
                  onOpenDepositModal={() => {
                    SoundEffects.play('tap');
                    setEditingDeposit(null);
                    setIsDepositModalOpen(true);
                  }}
                  onEditDeposit={(dep) => {
                    SoundEffects.play('tap');
                    setEditingDeposit(dep);
                    setIsDepositModalOpen(true);
                  }}
                  onDeleteDeposit={handleDeleteDeposit}
                />
              )}

              {activeTab === 'settlement' && (
                <SettlementView
                  settlement={settlementResult}
                  trip={trip}
                  members={members}
                  onOpenPdfExportModal={() => {
                    setPdfExportFilter({ category: 'all', dayKey: 'all' });
                    setIsPdfExportModalOpen(true);
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'members' && (
                <MembersView
                  trip={trip}
                  members={members}
                  onSaveTrip={handleSaveTrip}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  onDeleteMember={handleDeleteMember}
                />
              )}
            </div>
          </main>

          {/* Fixed Mobile Bottom Tab Bar */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenExpenseModal={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
          />

          {/* Modals & Dialogs */}
          <ExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => {
              setIsExpenseModalOpen(false);
              setEditingExpense(null);
            }}
            members={members}
            currency={trip.currency}
            editingExpense={editingExpense}
            onSaveExpense={handleSaveExpense}
          />

          <DepositModal
            isOpen={isDepositModalOpen}
            onClose={() => {
              setIsDepositModalOpen(false);
              setEditingDeposit(null);
            }}
            members={members}
            currency={trip.currency}
            editingDeposit={editingDeposit}
            onSaveDeposit={handleSaveDeposit}
          />

          <EffectsSettingsModal
            isOpen={isEffectsModalOpen}
            onClose={() => setIsEffectsModalOpen(false)}
            onPreviewLoadingSplash={handlePreviewLoadingSplash}
          />

          <PdfExportModal
            isOpen={isPdfExportModalOpen}
            onClose={() => setIsPdfExportModalOpen(false)}
            trip={trip}
            members={members}
            deposits={deposits}
            expenses={expenses}
            settlement={settlementResult}
            preparedBy={session.user.name}
            initialCategory={pdfExportFilter.category}
            initialDayKey={pdfExportFilter.dayKey}
            onShowToast={showToast}
          />

          <BackupReminderModal
            isOpen={isBackupModalOpen}
            onClose={() => setIsBackupModalOpen(false)}
            trip={trip}
            members={members}
            deposits={deposits}
            expenses={expenses}
            settlement={settlementResult}
            onBackupCompleted={showToast}
          />

          {session.user.role === 'leader' && (
            <BackendModal
              isOpen={isBackendModalOpen}
              onClose={() => setIsBackendModalOpen(false)}
              config={config}
              onUpdateConfig={setConfig}
              queuedItems={queuedItems}
              onTriggerSync={triggerBackgroundSync}
              onResetData={handleResetData}
              isSyncing={isSyncing}
            />
          )}

          {/* Mobile Android App Install Prompt Popup */}
          <PWAInstallPopup isOpenTriggered={Boolean(session)} />
        </div>
      )}
    </ThemeProvider>
  );
}
