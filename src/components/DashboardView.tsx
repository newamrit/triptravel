import React, { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Collapse from '@mui/material/Collapse';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PieChartIcon from '@mui/icons-material/PieChart';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TimelineIcon from '@mui/icons-material/Timeline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/Error';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Trip, Member, Deposit, Expense, SettlementData } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import { SoundEffects } from '../utils/soundEffects';
import { MemberAvatar, resolveMemberObject } from './MemberAvatar';

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
  onSaveTrip?: (updatedTrip: Trip) => void;
  onOpenExpenseModal: () => void;
  onOpenDepositModal: () => void;
  onOpenPdfExportModal?: (opts?: { category?: string; dayKey?: string }) => void;
  setActiveTab: (tab: string) => void;
  onShowToast?: (msg: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trip,
  members,
  deposits,
  expenses,
  settlement,
  onSaveTrip,
  onOpenExpenseModal,
  onOpenDepositModal,
  onOpenPdfExportModal,
  setActiveTab,
  onShowToast
}) => {
  const currency = trip.currency || 'Rs.';
  const [selectedReceiptExpense, setSelectedReceiptExpense] = useState<Expense | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Budget Threshold State & Editor
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>(() => String(trip.total_budget ?? 35000));

  useEffect(() => {
    setBudgetInput(String(trip.total_budget ?? 35000));
  }, [trip.total_budget]);

  const poolBalance = settlement.summary.pool_cash_remaining;
  const totalCollected = settlement.summary.total_collected;
  const totalSpent = settlement.summary.total_spent;
  const activeMembersCount = Math.max(members.filter(m => m.is_active).length, 1);

  // Budget Threshold Calculations (80% Yellow Warning, 100% Red Critical Alert)
  const totalBudget = Number(trip.total_budget ?? 0);
  const hasBudget = totalBudget > 0;
  const rawBudgetRatio = hasBudget ? (totalSpent / totalBudget) * 100 : 0;
  const budgetPercentFormatted = Math.round(rawBudgetRatio * 10) / 10;
  const budgetProgressClamped = Math.min(Math.max(rawBudgetRatio, 0), 100);
  const warningThreshold80Amount = Math.round(totalBudget * 0.8);
  const budgetRemaining = totalBudget - totalSpent;
  const overBudgetAmount = Math.max(0, totalSpent - totalBudget);
  const perPersonBudget = hasBudget ? Math.round(totalBudget / activeMembersCount) : 0;
  const perPersonRemaining = hasBudget ? Math.round(Math.abs(budgetRemaining) / activeMembersCount) : 0;

  const budgetAlertLevel: 'none' | 'safe' | 'warning' | 'exceeded' = useMemo(() => {
    if (!hasBudget) return 'none';
    if (rawBudgetRatio >= 100) return 'exceeded';
    if (rawBudgetRatio >= 80) return 'warning';
    return 'safe';
  }, [hasBudget, rawBudgetRatio]);

  const budgetTheme = useMemo(() => {
    if (budgetAlertLevel === 'exceeded') {
      return {
        level: 'exceeded',
        label: 'CRITICAL: OVER BUDGET (≥100%)',
        shortLabel: 'Exceeded (Red)',
        accentColor: '#ef4444',
        strongColor: '#dc2626',
        darkText: '#7f1d1d',
        subText: '#991b1b',
        lightBg: '#fef2f2',
        cardBorder: '#fca5a5',
        heroBadgeBg: 'rgba(239, 68, 68, 0.18)',
        heroBadgeBorder: 'rgba(248, 113, 113, 0.5)',
        heroBadgeText: '#fca5a5',
      };
    }
    if (budgetAlertLevel === 'warning') {
      return {
        level: 'warning',
        label: 'WARNING: NEAR BUDGET LIMIT (≥80%)',
        shortLabel: 'Warning (Yellow)',
        accentColor: '#f59e0b',
        strongColor: '#d97706',
        darkText: '#78350f',
        subText: '#92400e',
        lightBg: '#fffbeb',
        cardBorder: '#fcd34d',
        heroBadgeBg: 'rgba(245, 158, 11, 0.18)',
        heroBadgeBorder: 'rgba(251, 191, 36, 0.5)',
        heroBadgeText: '#fde68a',
      };
    }
    return {
      level: 'safe',
      label: 'ON TRACK (<80% OF BUDGET)',
      shortLabel: 'Safe (Green)',
      accentColor: '#10b981',
      strongColor: '#059669',
      darkText: '#064e3b',
      subText: '#065f46',
      lightBg: '#f0fdf4',
      cardBorder: '#cbd5e1',
      heroBadgeBg: 'rgba(16, 185, 129, 0.14)',
      heroBadgeBorder: 'rgba(52, 211, 153, 0.35)',
      heroBadgeText: '#6ee7b7',
    };
  }, [budgetAlertLevel]);

  const handleSaveBudgetAmount = (newAmount: number) => {
    const cleanBudget = Math.max(0, Math.round(Number(newAmount) || 0));
    setBudgetInput(String(cleanBudget));
    setIsEditingBudget(false);
    if (onSaveTrip) {
      onSaveTrip({
        ...trip,
        total_budget: cleanBudget,
      });
    }
  };

  // Daily Spending Timeline Aggregation
  const dailyTimeline = useMemo(() => {
    const map: Record<string, { total: number; pool: number; oop: number; count: number; topCategory: string; catMap: Record<string, number> }> = {};
    for (const exp of expenses) {
      const dateKey = (exp.expense_date || '').substring(0, 10) || 'Unknown';
      if (!map[dateKey]) {
        map[dateKey] = { total: 0, pool: 0, oop: 0, count: 0, topCategory: exp.category, catMap: {} };
      }
      const amt = Number(exp.amount) || 0;
      map[dateKey].total += amt;
      if (exp.payer_type === 'pool') map[dateKey].pool += amt;
      else map[dateKey].oop += amt;
      map[dateKey].count += 1;
      map[dateKey].catMap[exp.category] = (map[dateKey].catMap[exp.category] || 0) + amt;
    }

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, stats], idx) => {
        const parsed = new Date(`${dateKey}T00:00:00`);
        const formatted = !isNaN(parsed.getTime())
          ? parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          : dateKey;
        const topCat = Object.entries(stats.catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Miscellaneous';
        return {
          dateKey,
          dayNumber: idx + 1,
          formattedDate: formatted,
          total: stats.total,
          pool: stats.pool,
          oop: stats.oop,
          count: stats.count,
          topCategory: topCat
        };
      });
  }, [expenses]);

  const maxDailySpend = useMemo(() => {
    return Math.max(...dailyTimeline.map((d) => d.total), 1);
  }, [dailyTimeline]);

  const handleOneTapSummaryCopy = async () => {
    SoundEffects.play('copy');
    const text = settlement.whatsapp_summary;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedSummary(true);
    if (onShowToast) {
      onShowToast('Trip Summary copied! Ready to paste into WhatsApp or Viber.');
    }
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Combine deposits and expenses for recent activity feed
  type ActivityItem = 
    | { type: 'deposit'; data: Deposit; timestamp: number }
    | { type: 'expense'; data: Expense; timestamp: number };

  const activities: ActivityItem[] = [
    ...deposits.map(d => ({ type: 'deposit' as const, data: d, timestamp: new Date(d.deposited_at).getTime() })),
    ...expenses.map(e => ({ type: 'expense' as const, data: e, timestamp: new Date(e.expense_date).getTime() }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  const recentActivities = activities.slice(0, 6);

  // Top spending categories
  const categories = Object.entries(settlement.summary.category_breakdown)
    .sort((a, b) => b[1] - a[1]);

  const chartData = categories.map(([cat, amt]) => ({
    name: cat,
    value: amt,
    color: CATEGORY_COLORS[cat] || '#64748b'
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* 0. Color-Coded Budget Threshold Alert Banner (Yellow >= 80%, Red >= 100%) */}
      {hasBudget && (budgetAlertLevel === 'warning' || budgetAlertLevel === 'exceeded') && (
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: { xs: 3, sm: 3.5 },
            bgcolor: budgetAlertLevel === 'exceeded' ? '#fef2f2' : '#fffbeb',
            border: '2px solid',
            borderColor: budgetAlertLevel === 'exceeded' ? '#ef4444' : '#f59e0b',
            boxShadow:
              budgetAlertLevel === 'exceeded'
                ? '0 10px 25px -5px rgba(239, 68, 68, 0.22)'
                : '0 10px 25px -5px rgba(245, 158, 11, 0.2)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                bgcolor: budgetAlertLevel === 'exceeded' ? '#fee2e2' : '#fef3c7',
                border: '1px solid',
                borderColor: budgetAlertLevel === 'exceeded' ? '#fca5a5' : '#fcd34d',
                color: budgetAlertLevel === 'exceeded' ? '#dc2626' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              {budgetAlertLevel === 'exceeded' ? (
                <ErrorOutlineIcon sx={{ fontSize: 24 }} />
              ) : (
                <WarningAmberIcon sx={{ fontSize: 24 }} />
              )}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 900,
                    color: budgetAlertLevel === 'exceeded' ? '#7f1d1d' : '#78350f',
                    fontSize: { xs: '0.92rem', sm: '1rem' },
                    lineHeight: 1.25,
                  }}
                >
                  {budgetAlertLevel === 'exceeded'
                    ? `Red Alert: Trip Budget Exceeded (${budgetPercentFormatted}% Spent)`
                    : `Yellow Warning: 80% Budget Threshold Reached (${budgetPercentFormatted}% Spent)`}
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: budgetAlertLevel === 'exceeded' ? '#991b1b' : '#92400e',
                  fontSize: { xs: '0.78rem', sm: '0.84rem' },
                  mt: 0.4,
                  fontWeight: 600,
                }}
              >
                {budgetAlertLevel === 'exceeded' ? (
                  <>
                    Total expenses (<strong>{currency} {totalSpent.toLocaleString()}</strong>) have exceeded your{' '}
                    <strong>{currency} {totalBudget.toLocaleString()}</strong> trip budget by{' '}
                    <strong>{currency} {overBudgetAmount.toLocaleString()}</strong> ({currency} {perPersonRemaining.toLocaleString()}/friend overrun).
                  </>
                ) : (
                  <>
                    Total expenses (<strong>{currency} {totalSpent.toLocaleString()}</strong>) have crossed the 80% warning mark (
                    <strong>{currency} {warningThreshold80Amount.toLocaleString()}</strong>). Only{' '}
                    <strong>{currency} {Math.max(0, budgetRemaining).toLocaleString()}</strong> remaining before reaching your{' '}
                    <strong>{currency} {totalBudget.toLocaleString()}</strong> cap.
                  </>
                )}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                SoundEffects.play('tap');
                setIsEditingBudget(true);
              }}
              startIcon={<EditIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                fontSize: '0.76rem',
                minHeight: 38,
                px: 1.5,
                borderColor: budgetAlertLevel === 'exceeded' ? '#f87171' : '#fbbf24',
                color: budgetAlertLevel === 'exceeded' ? '#991b1b' : '#78350f',
                bgcolor: 'rgba(255,255,255,0.65)',
                '&:hover': {
                  bgcolor: '#ffffff',
                  borderColor: budgetAlertLevel === 'exceeded' ? '#dc2626' : '#d97706',
                },
                whiteSpace: 'nowrap',
              }}
            >
              Adjust Budget
            </Button>
            {budgetAlertLevel === 'exceeded' && (
              <Button
                size="small"
                variant="contained"
                onClick={() => setActiveTab('settlement')}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  minHeight: 38,
                  px: 1.5,
                  bgcolor: '#dc2626',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#b91c1c' },
                  whiteSpace: 'nowrap',
                }}
              >
                Review Settlement
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* 1. Hero Live Pool Cash Card (Material Dark Card with Emerald Accents) */}
      <Card
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          borderRadius: { xs: 3.5, sm: 4 },
          border: '1px solid rgba(51, 65, 85, 0.65)',
          boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.28)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <CardContent sx={{ p: { xs: 2.25, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="overline" sx={{ color: '#34d399', fontWeight: 800, letterSpacing: '0.08em', fontSize: '0.7rem', lineHeight: 1.2 }}>
              Live Trip Pool Fund
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
              {onOpenPdfExportModal && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    SoundEffects.play('tap');
                    onOpenPdfExportModal();
                  }}
                  startIcon={<PictureAsPdfIcon sx={{ fontSize: '14px !important', color: '#f87171' }} />}
                  sx={{
                    color: '#e2e8f0',
                    borderColor: 'rgba(248, 113, 113, 0.35)',
                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)', borderColor: '#f87171' },
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 0.45,
                    px: 1.15,
                    minHeight: 32,
                    whiteSpace: 'nowrap',
                    textTransform: 'none'
                  }}
                >
                  Export PDF
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                onClick={handleOneTapSummaryCopy}
                startIcon={copiedSummary ? <CheckIcon sx={{ fontSize: '14px !important', color: '#34d399' }} /> : <ContentCopyIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  color: copiedSummary ? '#34d399' : '#e2e8f0',
                  borderColor: copiedSummary ? '#34d399' : 'rgba(255, 255, 255, 0.2)',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)', borderColor: '#34d399' },
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: 2,
                  py: 0.45,
                  px: 1.25,
                  minHeight: 32,
                  whiteSpace: 'nowrap',
                  textTransform: 'none'
                }}
              >
                {copiedSummary ? 'Copied!' : (
                  <>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Copy Summary</Box>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Copy WhatsApp / Viber Summary</Box>
                  </>
                )}
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'baseline' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h3"
                component="div"
                sx={{
                  fontWeight: 900,
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.9rem', sm: '2.5rem' },
                  lineHeight: 1.15,
                  wordBreak: 'break-word'
                }}
              >
                {currency} {poolBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.4, display: 'block', fontSize: '0.75rem' }}>
                Remaining cash float in trip leader's custody · {members.filter(m => m.is_active).length} active friends
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25, width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onOpenExpenseModal}
                startIcon={<ArrowUpwardIcon fontSize="small" />}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  borderRadius: 2.5,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  minHeight: 46,
                  px: 2,
                  whiteSpace: 'nowrap'
                }}
              >
                Log Expense
              </Button>
              <Button
                variant="outlined"
                onClick={onOpenDepositModal}
                startIcon={<ArrowDownwardIcon fontSize="small" />}
                sx={{
                  color: '#e2e8f0',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                  },
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  minHeight: 46,
                  px: 2,
                  whiteSpace: 'nowrap'
                }}
              >
                Add Deposit
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(51, 65, 85, 0.7)' }} />

          {/* Sub metrics strip: 3-column compact layout on mobile and desktop */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 2 }, alignItems: 'center' }}>
            <Box sx={{ p: { xs: 1.1, sm: 1.5 }, borderRadius: 2.5, bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: { xs: '0.66rem', sm: '0.72rem' }, whiteSpace: 'nowrap' }}>
                Collected
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 800, fontFamily: 'monospace', fontSize: { xs: '0.82rem', sm: '0.98rem' }, mt: 0.2 }}>
                {currency} {totalCollected.toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ p: { xs: 1.1, sm: 1.5 }, borderRadius: 2.5, bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: { xs: '0.66rem', sm: '0.72rem' }, whiteSpace: 'nowrap' }}>
                Total Spent
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  color:
                    budgetAlertLevel === 'exceeded'
                      ? '#f87171'
                      : budgetAlertLevel === 'warning'
                      ? '#fbbf24'
                      : '#f87171',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  fontSize: { xs: '0.82rem', sm: '0.98rem' },
                  mt: 0.2
                }}
              >
                {currency} {totalSpent.toLocaleString()}
              </Typography>
            </Box>

            <Box
              onClick={() => setActiveTab('settlement')}
              sx={{
                p: { xs: 1.1, sm: 1.5 },
                borderRadius: 2.5,
                bgcolor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.18)' }
              }}
            >
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', fontSize: { xs: '0.66rem', sm: '0.72rem' }, whiteSpace: 'nowrap' }}>
                Reconcile
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.2 }}>
                <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 800, fontSize: { xs: '0.78rem', sm: '0.9rem' }, whiteSpace: 'nowrap' }}>
                  Settle Up
                </Typography>
                <ChevronRightIcon sx={{ color: '#34d399', fontSize: 16 }} />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 1B. Trip Budget Threshold & Burn-Rate Monitor Card */}
      <Card
        sx={{
          borderRadius: { xs: 3.5, sm: 4 },
          border: '1.5px solid',
          borderColor: hasBudget ? budgetTheme.cardBorder : '#e2e8f0',
          bgcolor:
            budgetAlertLevel === 'exceeded'
              ? 'rgba(254, 242, 242, 0.55)'
              : budgetAlertLevel === 'warning'
              ? 'rgba(255, 251, 235, 0.55)'
              : '#ffffff',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <AccountBalanceWalletIcon
                  sx={{
                    fontSize: 20,
                    color: hasBudget ? budgetTheme.strongColor : '#059669',
                  }}
                />
                <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800 }}>
                  Trip Budget Threshold Monitor
                </Typography>
                {hasBudget && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: budgetTheme.strongColor,
                      letterSpacing: '0.03em',
                      fontSize: '0.72rem',
                    }}
                  >
                    · {budgetTheme.label}
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                Automatic Yellow warning at 80% ({currency} {warningThreshold80Amount.toLocaleString()}) and Red alert at 100% ({currency} {totalBudget.toLocaleString()}) of allocated trip budget
              </Typography>
            </Box>

            <Button
              size="small"
              variant={isEditingBudget ? 'contained' : 'outlined'}
              onClick={() => {
                SoundEffects.play('tap');
                setIsEditingBudget(!isEditingBudget);
              }}
              startIcon={<EditIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 800,
                minHeight: 36,
                px: 1.5,
                flexShrink: 0,
                ...(isEditingBudget
                  ? { bgcolor: '#0f172a', color: '#fff', '&:hover': { bgcolor: '#1e293b' } }
                  : { borderColor: '#cbd5e1', color: '#0f172a' }),
              }}
            >
              {isEditingBudget ? 'Close Editor' : hasBudget ? 'Edit Budget' : 'Set Trip Budget'}
            </Button>
          </Box>

          {/* Expandable Budget Configuration Panel */}
          <Collapse in={isEditingBudget}>
            <Box
              sx={{
                p: { xs: 1.75, sm: 2.25 },
                mb: 2.5,
                borderRadius: 3,
                bgcolor: '#f8fafc',
                border: '1px solid #cbd5e1',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                Define Total Trip Budget ({currency})
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.75 }}>
                Dashboard triggers a <strong>Yellow Warning</strong> when expenses reach <strong>80%</strong> and a <strong>Red Alert</strong> when expenses reach <strong>100%</strong>.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.25, alignItems: { xs: 'stretch', sm: 'center' }, mb: 1.75 }}>
                <TextField
                  size="small"
                  type="number"
                  label={`Total Allocated Budget (${currency})`}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 35000"
                  sx={{ flex: 1, bgcolor: '#ffffff' }}
                  slotProps={{
                    input: {
                      sx: { fontFamily: 'monospace', fontWeight: 800, borderRadius: 2 },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => handleSaveBudgetAmount(Number(budgetInput))}
                  startIcon={<SaveIcon fontSize="small" />}
                  sx={{
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' },
                    fontWeight: 800,
                    borderRadius: 2,
                    minHeight: 40,
                    px: 2.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Save Budget Cap
                </Button>
              </Box>

              {/* Quick Presets to easily set or test Green (<80%), Yellow (80%-99%), or Red (>=100%) thresholds */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, mr: 0.5 }}>
                  Quick Presets:
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSaveBudgetAmount(totalCollected > 0 ? totalCollected : 50000)}
                  sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.75, py: 0.35, px: 1, minHeight: 28, borderColor: '#10b981', color: '#047857', bgcolor: '#f0fdf4' }}
                >
                  Match Pool ({currency} {(totalCollected > 0 ? totalCollected : 50000).toLocaleString()})
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSaveBudgetAmount(Math.max(1000, Math.round(totalSpent / 0.65)))}
                  sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.75, py: 0.35, px: 1, minHeight: 28, borderColor: '#10b981', color: '#047857' }}
                >
                  Safe Green (~65%)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSaveBudgetAmount(Math.max(1000, Math.round(totalSpent / 0.85)))}
                  sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.75, py: 0.35, px: 1, minHeight: 28, borderColor: '#f59e0b', color: '#b45309', bgcolor: '#fffbeb' }}
                >
                  Yellow Warning (~85%)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSaveBudgetAmount(Math.max(1000, Math.round(totalSpent / 1.12)))}
                  sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.75, py: 0.35, px: 1, minHeight: 28, borderColor: '#ef4444', color: '#b91c1c', bgcolor: '#fef2f2' }}
                >
                  Red Exceeded (~112%)
                </Button>
              </Box>
            </Box>
          </Collapse>

          {hasBudget ? (
            <>
              {/* Progress Bar with 80% Yellow Marker and 100% Red Marker */}
              <Box sx={{ mb: 2.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.85, gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {budgetAlertLevel === 'exceeded' ? (
                      <ErrorOutlineIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                    ) : budgetAlertLevel === 'warning' ? (
                      <WarningAmberIcon sx={{ fontSize: 18, color: '#d97706' }} />
                    ) : (
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#059669' }} />
                    )}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        fontSize: { xs: '0.88rem', sm: '0.96rem' },
                        color: budgetTheme.darkText,
                      }}
                    >
                      {currency} {totalSpent.toLocaleString()} spent of {currency} {totalBudget.toLocaleString()}
                    </Typography>
                  </Box>

                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      fontSize: { xs: '0.88rem', sm: '0.95rem' },
                      color: budgetTheme.strongColor,
                    }}
                  >
                    {budgetPercentFormatted}% of Budget Used
                  </Typography>
                </Box>

                {/* Custom Threshold Bar with 80% Tick Line */}
                <Box
                  sx={{
                    position: 'relative',
                    height: 14,
                    borderRadius: 999,
                    bgcolor: '#e2e8f0',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  {/* Filled Progress */}
                  <Box
                    sx={{
                      width: `${budgetProgressClamped}%`,
                      height: '100%',
                      bgcolor: budgetTheme.accentColor,
                      transition: 'width 0.35s ease, background-color 0.25s ease',
                      borderRadius: 999,
                    }}
                  />
                  {/* 80% Yellow Threshold Marker Line */}
                  <Box
                    title={`80% Warning Threshold: ${currency} ${warningThreshold80Amount.toLocaleString()}`}
                    sx={{
                      position: 'absolute',
                      left: '80%',
                      top: 0,
                      bottom: 0,
                      width: '2.5px',
                      bgcolor: '#0f172a',
                      opacity: 0.65,
                      zIndex: 2,
                    }}
                  />
                </Box>

                {/* Threshold Scale Legend under Bar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.65, fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                  <span>0% ({currency} 0)</span>
                  <span style={{ color: '#d97706', fontWeight: 700 }}>
                    ▲ 80% Warning ({currency} {warningThreshold80Amount.toLocaleString()})
                  </span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    100% Cap ({currency} {totalBudget.toLocaleString()})
                  </span>
                </Box>
              </Box>

              {/* 4-Column Budget Breakdown Strip */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.25 }}>
                <Box sx={{ p: 1.35, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                    Allocated Budget
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', mt: 0.2 }}>
                    {currency} {totalBudget.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                    {currency} {perPersonBudget.toLocaleString()} / friend
                  </Typography>
                </Box>

                <Box sx={{ p: 1.35, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                    80% Warning Trigger
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#d97706', mt: 0.2 }}>
                    {currency} {warningThreshold80Amount.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                    {rawBudgetRatio >= 80 ? 'Threshold crossed' : `${currency} ${(warningThreshold80Amount - totalSpent).toLocaleString()} headroom`}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.35,
                    borderRadius: 2.5,
                    bgcolor: budgetTheme.lightBg,
                    border: '1px solid',
                    borderColor: budgetTheme.cardBorder,
                  }}
                >
                  <Typography variant="caption" sx={{ color: budgetTheme.subText, display: 'block', fontSize: '0.68rem', fontWeight: 700 }}>
                    {budgetRemaining >= 0 ? 'Budget Remaining' : 'Over Budget By'}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace', color: budgetTheme.strongColor, mt: 0.2 }}>
                    {budgetRemaining >= 0
                      ? `${currency} ${budgetRemaining.toLocaleString()}`
                      : `+${currency} ${overBudgetAmount.toLocaleString()}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: budgetTheme.subText, fontSize: '0.65rem' }}>
                    {currency} {perPersonRemaining.toLocaleString()} / friend
                  </Typography>
                </Box>

                <Box sx={{ p: 1.35, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                    Threshold Status
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: budgetTheme.strongColor, mt: 0.2 }}>
                    {budgetTheme.shortLabel}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                    {budgetAlertLevel === 'exceeded'
                      ? '≥ 100% Red Alert'
                      : budgetAlertLevel === 'warning'
                      ? '80%–99% Yellow Warning'
                      : '< 80% Normal'}
                  </Typography>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ py: 2, textAlign: 'center', color: '#64748b' }}>
              <Typography variant="body2">
                No trip budget threshold set. Tap <strong>"Set Trip Budget"</strong> above to enable Yellow (80%) and Red (100%) spending alerts.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 2. Daily Spending Timeline Breakdown Card (Swipeable on Mobile, Grid on Desktop) */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75, gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon sx={{ color: '#059669', fontSize: 20 }} />
                <span>Daily Spending Timeline</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Day-by-day trip expenditure across {dailyTimeline.length} {dailyTimeline.length === 1 ? 'day' : 'days'}
              </Typography>
            </Box>

            <Button
              size="small"
              variant="outlined"
              onClick={() => setActiveTab('expenses')}
              endIcon={<ChevronRightIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                fontSize: '0.74rem',
                fontWeight: 700,
                borderColor: '#cbd5e1',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minHeight: 36,
                px: 1.25
              }}
            >
              Full Timeline
            </Button>
          </Box>

          {dailyTimeline.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">No daily expenses logged yet.</Typography>
            </Box>
          ) : (
            <Box
              className="no-scrollbar"
              sx={{
                display: { xs: 'flex', md: 'grid' },
                gridTemplateColumns: { md: 'repeat(3, 1fr)' },
                gap: 1.5,
                overflowX: { xs: 'auto', md: 'visible' },
                pb: { xs: 0.5, md: 0 },
                scrollSnapType: { xs: 'x mandatory', md: 'none' },
              }}
            >
              {dailyTimeline.map((day) => {
                const pct = Math.round((day.total / maxDailySpend) * 100);
                return (
                  <Box
                    key={day.dateKey}
                    onClick={() => setActiveTab('expenses')}
                    sx={{
                      minWidth: { xs: 255, sm: 270, md: 'auto' },
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      p: 2,
                      borderRadius: 3,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#10b981', bgcolor: '#f0fdf4' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
                        <Chip
                          label={`Day ${day.dayNumber}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            bgcolor: '#0f172a',
                            color: '#34d399'
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>
                          {day.formattedDate}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {day.count} {day.count === 1 ? 'item' : 'items'}
                      </Typography>
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', fontSize: '1.05rem', mb: 1 }}>
                      {currency} {day.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>

                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#e2e8f0',
                        mb: 1,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#059669',
                          borderRadius: 3
                        }
                      }}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                      <span>Pool: {currency} {day.pool.toLocaleString()}</span>
                      <span>Out-of-Pocket: {currency} {day.oop.toLocaleString()}</span>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 3. Key Insights: Recharts Doughnut Chart & Member Standing */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, sm: 3 } }}>
        {/* Category Breakdown with Recharts Doughnut Chart (2 cols on lg) */}
        <Card sx={{ gridColumn: { xs: 'span 1', lg: 'span 2' }, borderRadius: { xs: 3.5, sm: 4 } }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3 }, gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PieChartIcon sx={{ color: '#059669', fontSize: 20 }} />
                  <span>Spending by Category</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Breakdown of where group trip funds are spent
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${expenses.length} receipts`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}
                />
                {onOpenPdfExportModal && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      SoundEffects.play('tap');
                      onOpenPdfExportModal();
                    }}
                    startIcon={<PictureAsPdfIcon sx={{ fontSize: '14px !important', color: '#ef4444' }} />}
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 0.35,
                      px: 1.1,
                      minHeight: 30,
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      color: '#dc2626',
                      bgcolor: 'rgba(239, 68, 68, 0.04)',
                      '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Export PDF
                  </Button>
                )}
              </Box>
            </Box>

            {categories.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
                <Typography variant="body2">No expenses recorded yet. Tap "Log Expense" to start!</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: { xs: 2, sm: 3 }, alignItems: 'center' }}>
                {/* Left: Recharts Doughnut Chart */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ position: 'relative', width: '100%', height: { xs: 175, sm: 200 }, maxWidth: 210, mx: 'auto' }}>
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
                          innerRadius={48}
                          outerRadius={72}
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
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Spent
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '0.82rem' }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, minWidth: 0 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                            <Box component="span" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                              {getCategoryIcon(cat as any, 'w-3.5 h-3.5')}
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cat}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, fontFamily: 'monospace', flexShrink: 0 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
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
        <Card sx={{ borderRadius: { xs: 3.5, sm: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                <span>Member Standing</span>
              </Typography>
              <Button
                size="small"
                onClick={() => setActiveTab('settlement')}
                sx={{ fontSize: '0.75rem', fontWeight: 700, p: 0.5, minWidth: 'auto', color: '#059669' }}
              >
                All Details
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', mb: 2, display: 'block' }}>
              Real-time net balance status for each friend
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.15 }}>
              {settlement.members.slice(0, 4).map(m => {
                const net = m.net_balance || 0;
                return (
                  <Box
                    key={m.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: '#f8fafc',
                      border: '1px solid rgba(226, 232, 240, 0.85)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.15
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0, flex: 1 }}>
                      <MemberAvatar member={m} size="sm" showLeaderBadge />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
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
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                          Paid {currency} {((m.total_deposited || 0) + (m.total_paid_out_of_pocket || 0)).toLocaleString()} · Share {currency} {(m.total_consumed || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
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

          <Box sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setActiveTab('settlement')}
              endIcon={<ChevronRightIcon fontSize="small" />}
              sx={{
                borderColor: '#cbd5e1',
                color: '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 700,
                minHeight: 42,
                borderRadius: 2.5
              }}
            >
              View Debt Reconciliation
            </Button>
          </Box>
        </Card>
      </Box>

      {/* 4. Recent Trip Ledger Activity Feed */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongIcon sx={{ color: '#059669', fontSize: 20 }} />
                <span>Recent Activity</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Latest pool deposits and on-the-road expenses
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
              <Button
                size="small"
                onClick={() => setActiveTab('expenses')}
                sx={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', px: 1, minWidth: 'auto' }}
              >
                Expenses
              </Button>
              <Button
                size="small"
                onClick={() => setActiveTab('deposits')}
                sx={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', px: 1, minWidth: 'auto' }}
              >
                Deposits
              </Button>
            </Box>
          </Box>

          {recentActivities.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">No transactions yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {recentActivities.map((item, idx) => {
                const isLast = idx === recentActivities.length - 1;
                if (item.type === 'deposit') {
                  const dep = item.data;
                  const depMember = resolveMemberObject(members, dep.member_id, dep.member_name);
                  const dateFormatted = new Date(dep.deposited_at.replace(' ', 'T')).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <Box
                      key={`dep_${dep.id}_${idx}`}
                      sx={{
                        py: 1.6,
                        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'flex-start',
                         gap: 1.25
                      }}
                    >
                      <MemberAvatar member={depMember} name={dep.member_name} size="md" showLeaderBadge />

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', wordBreak: 'break-word' }}>
                            Deposit from {dep.member_name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            +{currency} {dep.amount.toLocaleString()}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.35, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                            {dep.payment_method} · {dep.notes || 'Pool contribution'} · {dateFormatted}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                            Pool Top-up
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                } else {
                  const exp = item.data;
                  const payerMember = exp.payer_type === 'member'
                    ? resolveMemberObject(members, exp.payer_member_id, exp.payer_member_name)
                    : undefined;
                  const dateFormatted = new Date(exp.expense_date.replace(' ', 'T')).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <Box
                      key={`exp_${exp.id}_${idx}`}
                      sx={{
                        py: 1.6,
                        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.25
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '11px',
                          bgcolor: '#f1f5f9',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          mt: 0.2
                        }}
                      >
                        {getCategoryIcon(exp.category, 'w-4 h-4')}
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', wordBreak: 'break-word' }}>
                            {exp.description}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            -{currency} {exp.amount.toLocaleString()}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.4, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <span>{exp.category} · Paid by</span>
                              {exp.payer_type === 'member' && (
                                <MemberAvatar member={payerMember} name={exp.payer_member_name} size="xs" />
                              )}
                              <strong style={{ color: '#334155' }}>
                                {exp.payer_type === 'pool' ? 'Pool' : exp.payer_member_name || 'Member'}
                              </strong>
                              <span>· {dateFormatted}</span>
                            </Typography>
                            {exp.receipt_image && (
                              <Chip
                                icon={<ReceiptLongIcon sx={{ fontSize: '11px !important', color: '#059669 !important' }} />}
                                label="Receipt"
                                size="small"
                                clickable
                                onClick={() => setSelectedReceiptExpense(exp)}
                                sx={{
                                  height: 20,
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  bgcolor: 'rgba(5, 150, 105, 0.08)',
                                  color: '#059669',
                                  border: '1px solid rgba(5, 150, 105, 0.25)',
                                }}
                              />
                            )}
                          </Box>

                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
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
      <ReceiptViewerModal
        isOpen={Boolean(selectedReceiptExpense)}
        onClose={() => setSelectedReceiptExpense(null)}
        imageUrl={selectedReceiptExpense?.receipt_image}
        title={selectedReceiptExpense?.description || 'Receipt Photo'}
        subtitle={`${trip.currency} ${selectedReceiptExpense?.amount?.toLocaleString()} · Paid by ${selectedReceiptExpense?.payer_type === 'pool' ? 'Trip Pool' : selectedReceiptExpense?.payer_member_name || 'Friend'}`}
      />
    </Box>
  );
};
