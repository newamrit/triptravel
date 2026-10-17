import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PieChartIcon from '@mui/icons-material/PieChart';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Trip, Member, Deposit, Expense, SettlementData } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
// Lazy-loaded: the receipt viewer is only needed after a user taps a receipt photo.
const ReceiptViewerModal = React.lazy(() => import('./ReceiptViewerModal').then(m => ({ default: m.ReceiptViewerModal })));

const CATEGORY_COLORS: Record<string, string> = {
  'Fuel': '#f59e0b',
  'Food & Snacks': '#10b981',
  'Hotel/Homestay': '#6366f1',
  'Permits/Entry': '#8b5cf6',
  'Vehicle Maintenance/Spares': '#f43f5e',
  'Miscellaneous': '#64748b'
};

interface DashboardViewProps {
  trip: Trip;
  members: Member[];
  deposits: Deposit[];
  expenses: Expense[];
  settlement: SettlementData;
  onOpenExpenseModal: () => void;
  onOpenDepositModal: () => void;
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trip,
  members,
  deposits,
  expenses,
  settlement,
  onOpenExpenseModal,
  onOpenDepositModal,
  setActiveTab
}) => {
  const currency = trip.currency || 'Rs.';
  const [selectedReceiptExpense, setSelectedReceiptExpense] = useState<Expense | null>(null);
  const poolBalance = settlement.summary.pool_cash_remaining;
  const totalCollected = settlement.summary.total_collected;
  const totalSpent = settlement.summary.total_spent;

  // Combine deposits and expenses for recent activity feed.
  // Memoized: previously this rebuilt + sorted the full merged list on every render
  // (including each keystroke in unrelated inputs), allocating fresh Date objects.
  type ActivityItem =
    | { type: 'deposit'; data: Deposit; timestamp: number }
    | { type: 'expense'; data: Expense; timestamp: number };

  const recentActivities = useMemo(() => {
    const activities: ActivityItem[] = [
      ...deposits.map(d => ({ type: 'deposit' as const, data: d, timestamp: new Date(d.deposited_at).getTime() })),
      ...expenses.map(e => ({ type: 'expense' as const, data: e, timestamp: new Date(e.expense_date).getTime() }))
    ].sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, 6);
  }, [deposits, expenses]);

  // Top spending categories
  const categories = useMemo(
    () => Object.entries(settlement.summary.category_breakdown).sort((a, b) => b[1] - a[1]),
    [settlement.summary.category_breakdown]
  );

  const chartData = useMemo(
    () => categories.map(([cat, amt]) => ({
      name: cat,
      value: amt,
      color: CATEGORY_COLORS[cat] || '#64748b'
    })),
    [categories]
  );

  const activeMemberCount = useMemo(() => members.filter(m => m.is_active).length, [members]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* 1. Hero Live Pool Cash Card (Material Dark Card with Emerald Accents) */}
      <Card
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          borderRadius: { xs: 3.5, sm: 4 },
          border: '1px solid rgba(51, 65, 85, 0.6)',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#34d399', fontWeight: 800, letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              Live Trip Pool Fund
            </Typography>
            <Chip
              label={`Status: ${trip.status}`}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
                textTransform: 'capitalize'
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'baseline' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h3"
                component="div"
                sx={{
                  fontWeight: 900,
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.75rem', sm: '2.5rem' },
                  wordBreak: 'break-word'
                }}
              >
                {currency} {poolBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block' }}>
                Remaining cash float in trip leader's custody
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onOpenExpenseModal}
                startIcon={<ArrowUpwardIcon fontSize="small" />}
                sx={{
                  flex: { xs: 1, sm: 'initial' },
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  py: 1,
                  px: 2,
                }}
              >
                Log Expense
              </Button>
              <Button
                variant="outlined"
                onClick={onOpenDepositModal}
                startIcon={<ArrowDownwardIcon fontSize="small" />}
                sx={{
                  flex: { xs: 1, sm: 'initial' },
                  color: '#e2e8f0',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  py: 1,
                  px: 2,
                }}
              >
                Add Deposit
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2.5, borderColor: 'rgba(51, 65, 85, 0.7)' }} />

          {/* Sub metrics strip */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>
                Total Collected
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#34d399', fontWeight: 800, fontFamily: 'monospace' }}>
                {currency} {totalCollected.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>
                Total Spent
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#f87171', fontWeight: 800, fontFamily: 'monospace' }}>
                {currency} {totalSpent.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>
                  Active Friends
                </Typography>
                <Typography variant="subtitle1" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                  {activeMemberCount} members
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => setActiveTab('settlement')}
                endIcon={<ChevronRightIcon fontSize="small" />}
                sx={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Settlement
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Key Insights: Recharts Doughnut Chart & Member Standing */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
        {/* Category Breakdown with Recharts Doughnut Chart (2 cols on lg) */}
        <Card sx={{ gridColumn: { xs: 'span 1', lg: 'span 2' }, borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PieChartIcon sx={{ color: '#059669', fontSize: 20 }} />
                  <span>Spending Distribution by Category</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Visual breakdown of where group trip funds are spent
                </Typography>
              </Box>
              <Chip
                label={`${expenses.length} receipts`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.72rem', fontWeight: 600 }}
              />
            </Box>

            {categories.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
                <Typography variant="body2">No expenses recorded yet. Tap "Log Expense" to start!</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: 3, alignItems: 'center' }}>
                {/* Left: Recharts Doughnut Chart */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ position: 'relative', width: '100%', height: 200, maxWidth: 220, mx: 'auto' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0];
                              const val = Number(item.value) || 0;
                              const pct = totalSpent > 0 ? Math.round((val / totalSpent) * 100) : 0;
                              return (
                                <Box
                                  sx={{
                                    bgcolor: '#0f172a',
                                    color: '#ffffff',
                                    border: '1px solid #334155',
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 2,
                                    boxShadow: 4,
                                    fontSize: '0.75rem',
                                    pointerEvents: 'none',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.payload?.color }} />
                                    <span>{item.name}</span>
                                  </Box>
                                  <Box sx={{ fontFamily: 'monospace', color: '#34d399', fontWeight: 800, mt: 0.25 }}>
                                    {currency} {val.toLocaleString()} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({pct}%)</span>
                                  </Box>
                                </Box>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered Total Spent Indicator */}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Spent
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>
                        {currency} {totalSpent.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Right: Category List with Material LinearProgress */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {categories.map(([cat, amt]) => {
                    const percentage = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
                    const color = CATEGORY_COLORS[cat] || '#64748b';
                    return (
                      <Box key={cat} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, shrink: 0 }} />
                            <Box component="span" sx={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                              {getCategoryIcon(cat as any, 'w-3.5 h-3.5')}
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              {cat}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: 'monospace' }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {percentage}%
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                              {currency} {amt.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={Math.min(percentage, 100)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: color,
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Member Standing Snapshot (1 col on lg) */}
        <Card sx={{ borderRadius: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                <span>Member Standing</span>
              </Typography>
              <Button
                size="small"
                onClick={() => setActiveTab('settlement')}
                sx={{ fontSize: '0.75rem', fontWeight: 700, p: 0, minWidth: 'auto', color: '#059669' }}
              >
                All Details
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', mb: 2, display: 'block' }}>
              Real-time net balance status for each friend
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {settlement.members.slice(0, 4).map(m => {
                const net = m.net_balance || 0;
                return (
                  <Box
                    key={m.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: '#f8fafc',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', wordBreak: 'break-word' }}>
                          {m.name}
                        </Typography>
                        {m.is_leader && (
                          <Chip
                            label="Leader"
                            size="small"
                            sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', wordBreak: 'break-word' }}>
                        Paid {currency} {((m.total_deposited || 0) + (m.total_paid_out_of_pocket || 0)).toLocaleString()} · Share {currency} {(m.total_consumed || 0).toLocaleString()}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right', shrink: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: net > 0.01 ? '#059669' : net < -0.01 ? '#ef4444' : '#64748b',
                        }}
                      >
                        {net > 0.01 ? `+${currency} ${net.toLocaleString()}` : net < -0.01 ? `-${currency} ${Math.abs(net).toLocaleString()}` : 'Settled'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block' }}>
                        {net > 0.01 ? 'Refund' : net < -0.01 ? 'Owes' : 'Balanced'}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>

          <Box sx={{ p: 2, pt: 0 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setActiveTab('settlement')}
              endIcon={<ChevronRightIcon fontSize="small" />}
              sx={{
                borderColor: '#e2e8f0',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 600,
                py: 1,
              }}
            >
              View Debt Reconciliation
            </Button>
          </Box>
        </Card>
      </Box>

      {/* 3. Recent Trip Ledger Activity Feed */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongIcon sx={{ color: '#059669', fontSize: 20 }} />
                <span>Recent Activity</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Timeline of pool deposits and on-the-road expenses
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setActiveTab('expenses')}
                sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}
              >
                All Expenses
              </Button>
              <Button
                size="small"
                onClick={() => setActiveTab('deposits')}
                sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}
              >
                All Deposits
              </Button>
            </Box>
          </Box>

          {recentActivities.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">No transactions yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', divideY: '1px solid #f1f5f9' }}>
              {recentActivities.map((item, idx) => {
                if (item.type === 'deposit') {
                  const dep = item.data;
                  const dateFormatted = new Date(dep.deposited_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <Box key={`dep_${dep.id}_${idx}`} sx={{ py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            bgcolor: 'rgba(5, 150, 105, 0.1)',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shrink: 0,
                          }}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', wordBreak: 'break-word' }}>
                              Deposit from {dep.member_name}
                            </Typography>
                            <Chip label={dep.payment_method} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', wordBreak: 'break-word' }}>
                            {dep.notes || 'Pool fund contribution'} · {dateFormatted}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right', shrink: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          +{currency} {dep.amount.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block' }}>
                          Pool Top-up
                        </Typography>
                      </Box>
                    </Box>
                  );
                } else {
                  const exp = item.data;
                  const dateFormatted = new Date(exp.expense_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <Box key={`exp_${exp.id}_${idx}`} sx={{ py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shrink: 0,
                          }}
                        >
                          {getCategoryIcon(exp.category, 'w-4 h-4')}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', wordBreak: 'break-word' }}>
                              {exp.description}
                            </Typography>
                            <Chip label={exp.category} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            {exp.receipt_image && (
                              <Chip
                                icon={<ReceiptLongIcon sx={{ fontSize: '11px !important', color: '#059669 !important' }} />}
                                label="Receipt"
                                size="small"
                                clickable
                                onClick={() => setSelectedReceiptExpense(exp)}
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  bgcolor: 'rgba(5, 150, 105, 0.08)',
                                  color: '#059669',
                                  border: '1px solid rgba(5, 150, 105, 0.25)',
                                  '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.16)' },
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', wordBreak: 'break-word' }}>
                            Paid by {exp.payer_type === 'pool' ? 'Trip Pool' : exp.payer_member_name || 'Member'} · {exp.splits?.length || 0} split · {dateFormatted}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, shrink: 0 }}>
                        {exp.receipt_image && (
                          <Box
                            onClick={() => setSelectedReceiptExpense(exp)}
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '1.2px solid rgba(5, 150, 105, 0.35)',
                              cursor: 'pointer',
                              display: { xs: 'none', sm: 'block' },
                              '&:hover': { opacity: 0.85, borderColor: '#059669' },
                            }}
                          >
                            <Box
                              component="img"
                              src={exp.receipt_image}
                              alt="Receipt thumb"
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        )}
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            -{currency} {exp.amount.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block' }}>
                            {exp.payer_type === 'pool' ? 'From Pool' : 'Out-of-pocket'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                }
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen / Bottomsheet Receipt Photo Viewer */}
      {selectedReceiptExpense && (
      <React.Suspense fallback={null}>
      <ReceiptViewerModal
        isOpen={Boolean(selectedReceiptExpense)}
        onClose={() => setSelectedReceiptExpense(null)}
        imageUrl={selectedReceiptExpense?.receipt_image}
        title={selectedReceiptExpense?.description || 'Receipt Photo'}
        subtitle={`${trip.currency} ${selectedReceiptExpense?.amount?.toLocaleString()} · Paid by ${selectedReceiptExpense?.payer_type === 'pool' ? 'Trip Pool' : selectedReceiptExpense?.payer_member_name || 'Friend'}`}
      />
      </React.Suspense>
      )}
    </Box>
  );
};
