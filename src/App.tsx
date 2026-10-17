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

  // Initialize demo accounts on app start
  useEffect(() => {
    AuthService.init();
  }, []);

  // Sync state to local storage whenever modified
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
  const settlement = useMemo(() => {
    return calculateSettlement(trip, members, deposits, expenses);
  }, [trip, members, deposits, expenses]);

  // 3. Handlers for Expenses
  const handleSaveExpense = (data: {
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
    const newId = Date.now();
    const payerMember = data.payer_member_id ? members.find(m => m.id === data.payer_member_id) : null;

    // Distribute splits
    const targetMemberIds = data.split_members.length > 0
      ? data.split_members
      : members.filter(m => m.is_active).map(m => m.id);

    const share = targetMemberIds.length > 0 ? Math.round((data.amount / targetMemberIds.length) * 100) / 100 : 0;
    const splits = targetMemberIds.map(mid => {
      const m = members.find(item => item.id === mid);
      return {
        member_id: mid,
        member_name: m?.name || `Member ${mid}`,
        split_amount: share
      };
    });

    const newExpense: Expense = {
      id: newId,
      trip_id: trip.id,
      payer_type: data.payer_type,
      payer_member_id: data.payer_member_id,
      payer_member_name: payerMember?.name || (data.payer_type === 'pool' ? 'Trip Pool' : 'Friend'),
      amount: data.amount,
      category: data.category,
      description: data.description,
      split_type: data.split_type,
      expense_date: data.expense_date,
      splits,
      receipt_image: data.receipt_image || null
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);

    // Queue for sync
    StorageService.addToQueue({
      type: 'expense',
      action: 'create',
      payload: {
        trip_id: trip.id,
        amount: data.amount,
        category: data.category,
        payer_type: data.payer_type,
        payer_member_id: data.payer_member_id,
        description: data.description,
        split_type: data.split_type,
        split_members: targetMemberIds,
        expense_date: data.expense_date,
        receipt_image: data.receipt_image || null
      }
    });
    setQueuedItems(StorageService.getQueue());

    showToast(`Expense "${data.description}" recorded (${trip.currency} ${data.amount})!`);

    // Auto-sync attempt if connected
    if (config.backendApiUrl && !config.isSimulatedOffline) {
      triggerBackgroundSync();
    }
  };

  const handleDeleteExpense = (id: number) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    showToast('Expense removed.');
  };

  // 4. Handlers for Deposits
  const handleSaveDeposit = (data: {
    member_id: number;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
    deposited_at: string;
  }) => {
    const newId = Date.now();
    const member = members.find(m => m.id === data.member_id);

    const newDeposit: Deposit = {
      id: newId,
      trip_id: trip.id,
      member_id: data.member_id,
      member_name: member?.name || `Member ${data.member_id}`,
      amount: data.amount,
      payment_method: data.payment_method,
      notes: data.notes || 'Pool fund contribution',
      deposited_at: data.deposited_at,
      is_leader: member?.is_leader
    };

    const updated = [newDeposit, ...deposits];
    setDeposits(updated);

    // Queue for sync
    StorageService.addToQueue({
      type: 'deposit',
      action: 'create',
      payload: {
        trip_id: trip.id,
        member_id: data.member_id,
        amount: data.amount,
        payment_method: data.payment_method,
        notes: data.notes,
        deposited_at: data.deposited_at
      }
    });
    setQueuedItems(StorageService.getQueue());

    showToast(`Deposit of ${trip.currency} ${data.amount} from ${member?.name} recorded!`);

    if (config.backendApiUrl && !config.isSimulatedOffline) {
      triggerBackgroundSync();
    }
  };

  const handleDeleteDeposit = (id: number) => {
    const updated = deposits.filter(d => d.id !== id);
    setDeposits(updated);
    showToast('Deposit removed.');
  };

  // 5. Handlers for Members & Trip
  const handleSaveTrip = (updatedTrip: Trip) => {
    setTrip(updatedTrip);
    showToast('Trip profile updated.');
  };

  const handleAddMember = (data: { name: string; phone?: string; notes?: string; is_leader: boolean }) => {
    const newId = Date.now();
    let currentMembers = [...members];

    if (data.is_leader) {
      currentMembers = currentMembers.map(m => ({ ...m, is_leader: false }));
    }

    const newMember: Member = {
      id: newId,
      trip_id: trip.id,
      name: data.name,
      phone: data.phone,
      notes: data.notes,
      is_leader: data.is_leader,
      is_active: true
    };

    setMembers([...currentMembers, newMember]);

    StorageService.addToQueue({
      type: 'member',
      action: 'create',
      payload: {
        trip_id: trip.id,
        name: data.name,
        phone: data.phone,
        notes: data.notes,
        is_leader: data.is_leader ? 1 : 0,
        is_active: 1
      }
    });
    setQueuedItems(StorageService.getQueue());
    showToast(`${data.name} added to trip!`);
  };

  const handleUpdateMember = (id: number, updates: Partial<Member>) => {
    let currentMembers = [...members];
    if (updates.is_leader) {
      currentMembers = currentMembers.map(m => ({ ...m, is_leader: false }));
    }
    const updated = currentMembers.map(m => m.id === id ? { ...m, ...updates } : m);
    setMembers(updated);
    showToast('Member profile updated.');
  };

  const handleDeleteMember = (id: number) => {
    setMembers(members.filter(m => m.id !== id));
    showToast('Member removed.');
  };

  // 6. Sync Queue Handlers
  const triggerBackgroundSync = async () => {
    setIsSyncing(true);
    const res = await ApiSyncService.processQueue(config);
    setIsSyncing(false);
    setQueuedItems(StorageService.getQueue());
    if (res.syncedCount > 0) {
      showToast(res.message);
    }
  };

  const handleResetData = () => {
    StorageService.resetToDemo();
    setTrip(StorageService.getTrip());
    setMembers(StorageService.getMembers());
    setDeposits(StorageService.getDeposits());
    setExpenses(StorageService.getExpenses());
    setQueuedItems([]);
    showToast('Demo data restored for Rara Trip 2026!');
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />

      {/* Material UI Snackbar Notification */}
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

      {/* Authentication Gate: User must login with encrypted credentials to access the app */}
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
              showToast('Logged out of TripPool.');
            }}
            onOpenBackend={() => setIsBackendModalOpen(true)}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          />

          {/* Offline Alert Banner */}
          <OfflineBanner
            isSimulatedOffline={config.isSimulatedOffline}
            queuedCount={queuedItems.length}
            onSyncNow={triggerBackgroundSync}
            onToggleOffline={() => {
              const toggled = !config.isSimulatedOffline;
              setConfig({ ...config, isSimulatedOffline: toggled });
              showToast(toggled ? 'Mountain Mode enabled' : 'Online Mode active');
            }}
            isSyncing={isSyncing}
          />

      {/* Main Content Area with mobile safe bottom clearance */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 sm:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            trip={trip}
            members={members}
            deposits={deposits}
            expenses={expenses}
            settlement={settlement}
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
            settlement={settlement}
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

      {/* Mobile Bottom Tab Bar with Floating Action Button */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
      />

      {/* Modals */}
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
