import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { muiTheme } from './theme/theme';
import { Trip, Member, Deposit, Expense, ExpenseCategory, PayerType, SplitType, PaymentMethod } from './types';
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
import { AuthSession } from './types';

export default function App() {
  // Authentication Session
  const [session, setSession] = useState<AuthSession | null>(() => AuthService.getCurrentSession());

  // 1. Initial State from Storage
  const [trip, setTrip] = useState<Trip>(() => StorageService.getTrip());
  const [members, setMembers] = useState<Member[]>(() => StorageService.getMembers());
  const [deposits, setDeposits] = useState<Deposit[]>(() => StorageService.getDeposits());
  const [expenses, setExpenses] = useState<Expense[]>(() => StorageService.getExpenses());
  const [queuedItems, setQueuedItems] = useState(() => StorageService.getQueue());
  const [config, setConfig] = useState<AppConfig>(() => StorageService.getConfig());

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Initialize seed accounts
  useEffect(() => {
    AuthService.init();
  }, []);

  // 100% Database Sync: Query Database REST API on mount & tab navigation
  useEffect(() => {
    let isMounted = true;
    const syncWithDatabase = async () => {
      try {
        const [dbMembers, dbExpenses, dbDeposits, dbTrip] = await Promise.all([
          StorageService.fetchMembersFromApi(),
          StorageService.fetchExpensesFromApi(),
          StorageService.fetchDepositsFromApi(),
          StorageService.fetchTripFromApi(),
        ]);
        if (isMounted) {
          if (Array.isArray(dbMembers)) setMembers(dbMembers);
          if (Array.isArray(dbExpenses)) setExpenses(dbExpenses);
          if (Array.isArray(dbDeposits)) setDeposits(dbDeposits);
          if (dbTrip) setTrip(dbTrip);
        }
      } catch (err) {
        console.warn('Database auto-sync notice:', err);
      }
    };
    syncWithDatabase();
    return () => { isMounted = false; };
  }, [activeTab]);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 2. Settlement Engine (Auto recalculates on any financial movement)
  const settlementResult = useMemo(() => {
    return calculateSettlement(trip, members, deposits, expenses);
  }, [trip, members, deposits, expenses]);

  // 3. Handlers for Expenses
  const handleSaveExpense = async (data: {
    amount: number;
    category: ExpenseCategory;
    payer_type: PayerType;
    payer_member_id: number | null;
    description: string;
    split_type: SplitType;
    split_members: number[];
    expense_date: string;
    receipt_image?: string | null;
  }) => {
    const activeMembers = members.filter(m => m.is_active);
    const targetMembers = activeMembers.filter(m => data.split_members.includes(m.id));

    if (targetMembers.length === 0) {
      showToast('Error: At least 1 active member required to split expense.');
      return;
    }

    const perPersonSplit = Math.round((data.amount / targetMembers.length) * 100) / 100;
    const splits = targetMembers.map(m => ({
      member_id: m.id,
      member_name: m.name,
      split_amount: perPersonSplit
    }));

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
      payer_member_id: data.payer_member_id,
      payer_member_name: payerName,
      description: data.description,
      split_type: data.split_type,
      splits,
      receipt_image: data.receipt_image,
      expense_date: data.expense_date
    };

    if (!config.isSimulatedOffline) {
      try {
        const updated = await StorageService.addExpenseApi(expensePayload);
        if (Array.isArray(updated) && updated.length > 0) {
          setExpenses(updated);
          showToast(`Logged ${trip.currency} ${data.amount} for ${data.category} to Database!`);
          return;
        }
      } catch (e) {
        console.warn('API expense save failed, falling back to offline queue:', e);
      }
    }

    // Fallback or offline queue
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
    showToast(`Logged ${trip.currency} ${data.amount} for ${data.category} (Queued Offline)!`);
  };

  const handleDeleteExpense = async (id: number) => {
    const updated = await StorageService.deleteExpenseApi(id);
    setExpenses(updated);
    showToast('Expense removed from database.');
  };

  // 4. Handlers for Deposits
  const handleSaveDeposit = async (data: {
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
      member_name: member?.name || 'Unknown Member',
      amount: data.amount,
      payment_method: data.payment_method,
      notes: data.notes,
      deposited_at: data.deposited_at
    };

    if (!config.isSimulatedOffline) {
      try {
        const updated = await StorageService.addDepositApi(depositPayload);
        if (Array.isArray(updated) && updated.length > 0) {
          setDeposits(updated);
          showToast(`Deposit of ${trip.currency} ${data.amount} from ${member?.name} recorded to Database!`);
          return;
        }
      } catch (e) {
        console.warn('API deposit save failed, falling back to offline queue:', e);
      }
    }

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
    showToast(`Deposit of ${trip.currency} ${data.amount} from ${member?.name} recorded (Queued Offline)!`);
  };

  const handleDeleteDeposit = async (id: number) => {
    const updated = await StorageService.deleteDepositApi(id);
    setDeposits(updated);
    showToast('Deposit removed from database.');
  };

  // 5. Handlers for Members & Trip
  const handleSaveTrip = (updatedTrip: Trip) => {
    setTrip(updatedTrip);
    showToast('Trip profile updated.');
  };

  const handleAddMember = async (data: { name: string; phone?: string; notes?: string; is_leader: boolean }) => {
    const updated = await StorageService.addMemberApi(data);
    setMembers(updated);
    showToast(`${data.name} added to database!`);
  };

  const handleUpdateMember = async (id: number, updates: Partial<Member>) => {
    const updated = await StorageService.updateMemberApi(id, updates);
    setMembers(updated);
    showToast('Member profile updated in database.');
  };

  const handleDeleteMember = async (id: number) => {
    const updated = await StorageService.deleteMemberApi(id);
    setMembers(updated);
    showToast('Member deleted from database.');
  };

  // 6. Sync Queue Handlers
  const triggerBackgroundSync = async () => {
    setIsSyncing(true);
    const res = await ApiSyncService.processQueue(config);
    setQueuedItems(StorageService.getQueue());
    setIsSyncing(false);

    if (res.success) {
      showToast('All pending offline transactions synced to Database!');
    } else {
      showToast('Sync paused - queued for reconnection.');
    }
  };

  const handleResetData = () => {
    StorageService.resetToDemo();
    setTrip(StorageService.getTrip());
    setMembers(StorageService.getMembers());
    setDeposits(StorageService.getDeposits());
    setExpenses(StorageService.getExpenses());
    setQueuedItems([]);
    showToast('Reset all data to default demo state.');
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />

      {/* Global Toast Notification */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: 68, sm: 76 }, zIndex: 9999 }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            bgcolor: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.8125rem',
            borderRadius: 3,
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.3)',
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
            setSession(newSession);
            showToast(`Welcome back, ${newSession.user.name}!`);
          }}
        />
      ) : (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
          {/* Top Navigation Bar */}
          <TopBar
            trip={trip}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isSimulatedOffline={config.isSimulatedOffline}
            queuedCount={queuedItems.length}
            currentUser={session.user}
            onLogout={() => {
              AuthService.logout();
              setSession(null);
            }}
            onOpenBackend={() => setIsBackendModalOpen(true)}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          />

          {/* Offline / Mountain Mode Notice Banner */}
          <OfflineBanner
            isSimulatedOffline={config.isSimulatedOffline}
            queuedCount={queuedItems.length}
            onSyncNow={triggerBackgroundSync}
            onToggleOffline={() => setConfig(prev => ({ ...prev, isSimulatedOffline: !prev.isSimulatedOffline }))}
            isSyncing={isSyncing}
          />

          {/* Main View Router */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
            {activeTab === 'dashboard' && (
              <DashboardView
                trip={trip}
                members={members}
                deposits={deposits}
                expenses={expenses}
                settlement={settlementResult}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                onOpenDepositModal={() => setIsDepositModalOpen(true)}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                expenses={expenses}
                members={members}
                trip={trip}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'deposits' && (
              <DepositsView
                deposits={deposits}
                members={members}
                trip={trip}
                onOpenDepositModal={() => setIsDepositModalOpen(true)}
                onDeleteDeposit={handleDeleteDeposit}
              />
            )}

            {activeTab === 'settlement' && (
              <SettlementView
                settlement={settlementResult}
                trip={trip}
                members={members}
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
          </main>

          {/* Fixed Mobile Bottom Tab Bar */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          />

          {/* Modals & Dialogs */}
          <ExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            members={members}
            currency={trip.currency}
            onSaveExpense={handleSaveExpense}
          />

          <DepositModal
            isOpen={isDepositModalOpen}
            onClose={() => setIsDepositModalOpen(false)}
            members={members}
            currency={trip.currency}
            onSaveDeposit={handleSaveDeposit}
          />

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

          {/* Mobile Android App Install Prompt Popup */}
          <PWAInstallPopup isOpenTriggered={Boolean(session)} />
        </div>
      )}
    </ThemeProvider>
  );
}
