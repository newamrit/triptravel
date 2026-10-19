import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TimelineIcon from '@mui/icons-material/Timeline';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Expense, ExpenseCategory, Trip, Member } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import { SoundEffects } from '../utils/soundEffects';
import { MemberAvatar, resolveMemberObject } from './MemberAvatar';

interface ExpensesViewProps {
  expenses: Expense[];
  members: Member[];
  trip: Trip;
  onOpenExpenseModal: () => void;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense: (id: number) => void;
  onOpenPdfExportModal?: (opts?: { category?: string; dayKey?: string }) => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Fuel',
  'Food & Snacks',
  'Hotel/Homestay',
  'Permits/Entry',
  'Vehicle Maintenance/Spares',
  'Miscellaneous'
];

interface DayGroup {
  dateKey: string;
  dayNumber: number;
  formattedDate: string;
  shortDate: string;
  totalSpent: number;
  poolSpent: number;
  memberSpent: number;
  items: Expense[];
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  members,
  trip,
  onOpenExpenseModal,
  onEditExpense,
  onDeleteExpense,
  onOpenPdfExportModal,
  onShowToast
}) => {
  const currency = trip.currency || 'Rs.';
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReceiptExpense, setSelectedReceiptExpense] = useState<Expense | null>(null);
  const [copiedDayKey, setCopiedDayKey] = useState<string | null>(null);

  // Establish chronological Day 1..N mapping across all trip expenses
  const allDatesSorted = useMemo(() => {
    const uniqueDates = Array.from(
      new Set(
        expenses.map((e) => (e.expense_date || '').substring(0, 10)).filter(Boolean)
      )
    ) as string[];
    return uniqueDates.sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const dayNumberMap = useMemo(() => {
    const map: Record<string, number> = {};
    allDatesSorted.forEach((d, idx) => {
      map[d] = idx + 1;
    });
    return map;
  }, [allDatesSorted]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (payerFilter === 'pool' && exp.payer_type !== 'pool') return false;
      if (payerFilter === 'member' && exp.payer_type !== 'member') return false;
      if (selectedDayKey !== 'all') {
        const expDay = (exp.expense_date || '').substring(0, 10);
        if (expDay !== selectedDayKey) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchPayer = (exp.payer_member_name || '').toLowerCase().includes(q);
        const matchCat = exp.category.toLowerCase().includes(q);
        if (!matchDesc && !matchPayer && !matchCat) return false;
      }
      return true;
    });
  }, [expenses, selectedCategory, payerFilter, selectedDayKey, searchQuery]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Group all category/payer/search-filtered expenses (ignoring selectedDayKey for the top strip)
  const dayStripGroups: DayGroup[] = useMemo(() => {
    const baseFiltered = expenses.filter((exp) => {
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (payerFilter === 'pool' && exp.payer_type !== 'pool') return false;
      if (payerFilter === 'member' && exp.payer_type !== 'member') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchPayer = (exp.payer_member_name || '').toLowerCase().includes(q);
        const matchCat = exp.category.toLowerCase().includes(q);
        if (!matchDesc && !matchPayer && !matchCat) return false;
      }
      return true;
    });

    const map: Record<string, Expense[]> = {};
    for (const exp of baseFiltered) {
      const key = (exp.expense_date || '').substring(0, 10) || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(exp);
    }

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, items]) => {
        const parsed = new Date(`${dateKey}T00:00:00`);
        const isValid = !isNaN(parsed.getTime());
        const formattedDate = isValid
          ? parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : dateKey;
        const shortDate = isValid
          ? parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : dateKey;

        let totalSpent = 0;
        let poolSpent = 0;
        let memberSpent = 0;
        for (const item of items) {
          const amt = Number(item.amount) || 0;
          totalSpent += amt;
          if (item.payer_type === 'pool') poolSpent += amt;
          else memberSpent += amt;
        }

        const sortedItems = [...items].sort((a, b) => {
          return new Date(b.expense_date.replace(' ', 'T')).getTime() - new Date(a.expense_date.replace(' ', 'T')).getTime();
        });

        return {
          dateKey,
          dayNumber: dayNumberMap[dateKey] || 1,
          formattedDate,
          shortDate,
          totalSpent,
          poolSpent,
          memberSpent,
          items: sortedItems
        };
      });
  }, [expenses, selectedCategory, payerFilter, searchQuery, dayNumberMap]);

  const visibleDayGroups = useMemo(() => {
    const groups = selectedDayKey === 'all'
      ? dayStripGroups
      : dayStripGroups.filter((g) => g.dateKey === selectedDayKey);
    return groups;
  }, [dayStripGroups, selectedDayKey]);

  const maxDailySpend = useMemo(() => {
    return Math.max(...dayStripGroups.map((d) => d.totalSpent), 1);
  }, [dayStripGroups]);

  const handleCopyDaySummary = async (day: DayGroup) => {
    SoundEffects.play('copy');
    const lines: string[] = [];
    lines.push(`🗓️ *${trip.title.toUpperCase()} — DAY ${day.dayNumber} (${day.formattedDate})*`);
    lines.push(`--------------------------------------`);
    day.items.forEach((item, idx) => {
      const payerLabel = item.payer_type === 'pool' ? 'Pool' : item.payer_member_name || 'Member';
      const firstSplitAmt = item.splits?.[0]?.split_amount ?? 0;
      const isUnequal =
        item.split_type === 'exact' ||
        item.split_type === 'shares' ||
        Boolean(item.splits?.some((s) => Math.abs((Number(s.split_amount) || 0) - Number(firstSplitAmt)) > 0.05));
      const splitDetail =
        isUnequal && item.splits?.length
          ? ` — Split: ${item.splits.map((s) => `${s.member_name?.split(' ')[0]} ${currency}${Number(s.split_amount).toLocaleString()}`).join(', ')}`
          : '';
      lines.push(`${idx + 1}. *${item.description}* (${item.category}) — *${currency} ${Number(item.amount).toLocaleString()}* _[Paid: ${payerLabel}${splitDetail}]_`);
    });
    lines.push(`--------------------------------------`);
    lines.push(`💸 *Day ${day.dayNumber} Total:* ${currency} ${day.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`   • From Pool: ${currency} ${day.poolSpent.toLocaleString()}`);
    lines.push(`   • Out-of-Pocket: ${currency} ${day.memberSpent.toLocaleString()}`);
    lines.push(`_Shared via TripPool_`);

    const text = lines.join('\n');
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
    setCopiedDayKey(day.dateKey);
    if (onShowToast) {
      onShowToast(`Copied Day ${day.dayNumber} (${day.shortDate}) summary for WhatsApp / Viber!`);
    }
    setTimeout(() => setCopiedDayKey(null), 2500);
  };

  const renderExpenseCard = (exp: Expense, isTimelineNode = false) => {
    const dateObj = new Date(exp.expense_date.replace(' ', 'T'));
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      : exp.expense_date;
    const timeStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : '';

    const firstSplitAmt = exp.splits?.[0]?.split_amount ?? 0;
    const isUnequalSplit =
      exp.split_type === 'exact' ||
      exp.split_type === 'shares' ||
      Boolean(exp.splits?.some((s) => Math.abs((Number(s.split_amount) || 0) - Number(firstSplitAmt)) > 0.05));

    const splitModeLabel =
      exp.split_type === 'exact'
        ? 'Exact Split'
        : exp.split_type === 'shares'
        ? 'Share Split'
        : isUnequalSplit
        ? 'Unequal Split'
        : `Split (${exp.splits?.length || 0})`;

    const payerMember =
      exp.payer_type === 'member'
        ? resolveMemberObject(members, exp.payer_member_id, exp.payer_member_name)
        : undefined;

    return (
      <Card
        key={exp.id}
        sx={{
          borderRadius: 3.5,
          border: '1px solid #e2e8f0',
          boxShadow: isTimelineNode ? '0 2px 8px rgba(15, 23, 42, 0.04)' : undefined,
          '&:hover': { borderColor: '#cbd5e1' }
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1.75, sm: 2.25 },
            '&:last-child': { pb: { xs: 1.75, sm: 2.25 } },
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25
          }}
        >
          {/* Top Row: Icon + Title/Meta on Left, Amount on Right */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '11px',
                  bgcolor: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.15,
                }}
              >
                {getCategoryIcon(exp.category, 'w-5 h-5')}
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: '0.88rem', sm: '0.94rem' }, wordBreak: 'break-word', lineHeight: 1.3 }}>
                  {exp.description}
                </Typography>

                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block', mt: 0.35, wordBreak: 'break-word' }}>
                  {exp.category} · {isTimelineNode ? (timeStr || dateStr) : `${dateStr}${timeStr ? ` · ${timeStr}` : ''}`}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.35 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <span>Paid by</span>
                    {exp.payer_type === 'member' && (
                      <MemberAvatar member={payerMember} name={exp.payer_member_name} size="xs" />
                    )}
                    <strong style={{ color: '#0f172a' }}>
                      {exp.payer_type === 'pool' ? 'Trip Pool' : exp.payer_member_name || 'Friend'}
                    </strong>
                    <span>· {splitModeLabel}:</span>
                  </Typography>

                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {exp.splits && exp.splits.length > 0 ? (
                      exp.splits.map((s, sIdx) => {
                        const splitMember = resolveMemberObject(members, s.member_id, s.member_name);
                        const firstName = (s.member_name || splitMember?.name || 'Friend').split(' ')[0];
                        return (
                          <Box
                            key={`${exp.id}_sp_${s.member_id}_${sIdx}`}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.4,
                              bgcolor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 1.5,
                              px: 0.6,
                              py: 0.15,
                            }}
                          >
                            <MemberAvatar member={splitMember} name={s.member_name} size="xs" />
                            <Typography variant="caption" sx={{ fontSize: '0.67rem', color: '#334155', fontWeight: 600 }}>
                              {firstName}
                              {isUnequalSplit
                                ? ` (${currency} ${Number(s.split_amount).toLocaleString()}${s.shares ? ` · ${s.shares}x` : ''})`
                                : ''}
                            </Typography>
                          </Box>
                        );
                      })
                    ) : (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#475569' }}>
                        All
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Right: Crisp Amount & Outflow Label */}
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', fontSize: { xs: '0.95rem', sm: '1.05rem' }, lineHeight: 1.2 }}>
                {currency} {Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: exp.payer_type === 'pool' ? '#64748b' : '#059669',
                  fontWeight: exp.payer_type === 'pool' ? 500 : 700,
                  fontSize: '0.66rem',
                  display: 'block',
                  mt: 0.25
                }}
              >
                {exp.payer_type === 'pool' ? 'Pool Outflow' : 'Out-of-Pocket'}
              </Typography>
            </Box>
          </Box>

          {/* Bottom Action Bar: Receipt Preview on Left, Edit & Delete on Right */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 1,
              borderTop: '1px solid #f1f5f9',
              gap: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {exp.receipt_image ? (
                <Button
                  size="small"
                  onClick={() => setSelectedReceiptExpense(exp)}
                  startIcon={<ReceiptLongIcon sx={{ fontSize: '15px !important', color: '#059669' }} />}
                  sx={{
                    py: 0.35,
                    px: 1.1,
                    minHeight: 32,
                    borderRadius: 2,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(5, 150, 105, 0.08)',
                    color: '#059669',
                    border: '1px solid rgba(5, 150, 105, 0.25)',
                    '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.16)' },
                  }}
                >
                  View Receipt
                </Button>
              ) : (
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                  No receipt photo
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {onEditExpense && (
                <Button
                  size="small"
                  onClick={() => onEditExpense(exp)}
                  startIcon={<EditIcon sx={{ fontSize: '15px !important' }} />}
                  sx={{
                    color: '#0284c7',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    minHeight: 34,
                    px: 1.1,
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.08)' }
                  }}
                >
                  Edit
                </Button>
              )}

              <IconButton
                size="small"
                aria-label="Delete expense"
                onClick={() => onDeleteExpense(exp.id)}
                sx={{
                  color: '#94a3b8',
                  width: 34,
                  height: 34,
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* Top Banner Card */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent
          sx={{
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.08rem', sm: '1.25rem' } }}>
              Trip Expense Ledger & Daily Timeline
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
              {dayStripGroups.length} active trip {dayStripGroups.length === 1 ? 'day' : 'days'} · {filteredExpenses.length} receipts · Total:{' '}
              <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: 800 }}>
                {currency} {totalFiltered.toLocaleString()}
              </span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'stretch', gap: 1.25 }}>
            {/* View Mode Switcher: Daily Timeline vs Flat List */}
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              sx={{
                bgcolor: '#f1f5f9',
                p: 0.4,
                borderRadius: 2.5,
                '& .MuiToggleButton-root': {
                  flex: { xs: 1, sm: 'initial' },
                  border: 'none',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  minHeight: 38,
                  px: 1.75,
                  color: '#64748b',
                  gap: 0.6,
                  whiteSpace: 'nowrap',
                  '&.Mui-selected': {
                    bgcolor: '#0f172a',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                    '&:hover': { bgcolor: '#1e293b' },
                  },
                },
              }}
            >
              <ToggleButton value="timeline">
                <TimelineIcon sx={{ fontSize: 16 }} />
                <span>Daily Timeline</span>
              </ToggleButton>
              <ToggleButton value="list">
                <ViewListIcon sx={{ fontSize: 16 }} />
                <span>Flat List</span>
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ display: 'grid', gridTemplateColumns: onOpenPdfExportModal ? { xs: '1fr 1fr', sm: 'auto auto' } : '1fr', gap: 1 }}>
              {onOpenPdfExportModal && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    SoundEffects.play('tap');
                    onOpenPdfExportModal({
                      category: selectedCategory,
                      dayKey: selectedDayKey,
                    });
                  }}
                  startIcon={<PictureAsPdfIcon sx={{ fontSize: '18px !important', color: '#ef4444' }} />}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    fontSize: '0.78rem',
                    minHeight: 44,
                    px: 1.75,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#dc2626',
                    bgcolor: 'rgba(239, 68, 68, 0.04)',
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Export PDF
                </Button>
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={onOpenExpenseModal}
                startIcon={<AddIcon />}
                sx={{ fontWeight: 800, borderRadius: 2.5, fontSize: '0.82rem', minHeight: 44, px: 2, whiteSpace: 'nowrap' }}
              >
                Add Expense
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Interactive Day-by-Day Spending Overview Strip (Shown in Timeline Mode) */}
      {viewMode === 'timeline' && dayStripGroups.length > 0 && (
        <Card sx={{ borderRadius: 3.5, bgcolor: '#0f172a', color: '#ffffff', border: '1px solid #1e293b' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon sx={{ color: '#34d399', fontSize: 18 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.86rem' }}>
                  Select Trip Day ({dayStripGroups.length} {dayStripGroups.length === 1 ? 'Day' : 'Days'})
                </Typography>
              </Box>
              {selectedDayKey !== 'all' && (
                <Button
                  size="small"
                  onClick={() => setSelectedDayKey('all')}
                  sx={{ color: '#34d399', fontSize: '0.72rem', fontWeight: 700, p: 0.5, minWidth: 'auto' }}
                >
                  Show All Days
                </Button>
              )}
            </Box>

            <Box
              className="no-scrollbar"
              sx={{
                display: 'flex',
                gap: 1.25,
                overflowX: 'auto',
                pb: 0.5,
                scrollSnapType: 'x mandatory',
              }}
            >
              {/* All Days Card */}
              <Box
                onClick={() => setSelectedDayKey('all')}
                sx={{
                  minWidth: 140,
                  p: 1.5,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  bgcolor: selectedDayKey === 'all' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                  border: selectedDayKey === 'all' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                }}
              >
                <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                  Entire Trip
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#ffffff', mt: 0.25, fontSize: '0.92rem' }}>
                  {currency} {dayStripGroups.reduce((s, d) => s + d.totalSpent, 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.66rem', display: 'block', mt: 0.25 }}>
                  {dayStripGroups.reduce((s, d) => s + d.items.length, 0)} total receipts
                </Typography>
              </Box>

              {/* Individual Trip Day Cards */}
              {dayStripGroups.map((day) => {
                const isSelected = selectedDayKey === day.dateKey;
                const pctOfMax = Math.round((day.totalSpent / maxDailySpend) * 100);
                return (
                  <Box
                    key={day.dateKey}
                    onClick={() => setSelectedDayKey(isSelected ? 'all' : day.dateKey)}
                    sx={{
                      minWidth: 158,
                      p: 1.5,
                      borderRadius: 2.5,
                      cursor: 'pointer',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      bgcolor: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: isSelected ? '#34d399' : '#cbd5e1', fontWeight: 800, fontSize: '0.7rem' }}>
                        Day {day.dayNumber} · {day.shortDate}
                      </Typography>
                      <Chip
                        label={`${day.items.length}`}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: '#e2e8f0'
                        }}
                      />
                    </Box>

                    <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#ffffff', mt: 0.35, fontSize: '0.92rem' }}>
                      {currency} {day.totalSpent.toLocaleString()}
                    </Typography>

                    <LinearProgress
                      variant="determinate"
                      value={pctOfMax}
                      sx={{
                        mt: 0.85,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isSelected ? '#34d399' : '#38bdf8',
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search receipts by note, location, or friend..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: { bgcolor: '#ffffff', borderRadius: 3, minHeight: 44 },
            },
          }}
        />

        <Box className="no-scrollbar" sx={{ display: 'flex', gap: 0.85, overflowX: 'auto', pb: 0.5 }}>
          <Chip
            label="All Categories"
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            clickable
            sx={{ flexShrink: 0, height: 34, fontWeight: 700, fontSize: '0.75rem', bgcolor: selectedCategory === 'all' ? '#0f172a' : '#ffffff' }}
          />
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              onClick={() => setSelectedCategory(cat)}
              color={selectedCategory === cat ? 'primary' : 'default'}
              variant={selectedCategory === cat ? 'filled' : 'outlined'}
              clickable
              sx={{
                flexShrink: 0,
                height: 34,
                fontWeight: selectedCategory === cat ? 700 : 500,
                fontSize: '0.75rem',
                bgcolor: selectedCategory === cat ? '#0f172a' : '#ffffff',
              }}
            />
          ))}
        </Box>

        <Box className="no-scrollbar" sx={{ display: 'flex', alignItems: 'center', gap: 0.85, overflowX: 'auto', pb: 0.25 }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>Paid via:</Typography>
          {['all', 'pool', 'member'].map((p) => (
            <Chip
              key={p}
              label={p === 'all' ? 'All Payers' : p === 'pool' ? 'From Pool' : 'Out-of-Pocket'}
              size="small"
              onClick={() => setPayerFilter(p)}
              color={payerFilter === p ? 'success' : 'default'}
              variant={payerFilter === p ? 'filled' : 'outlined'}
              clickable
              sx={{ flexShrink: 0, fontSize: '0.72rem', height: 30, fontWeight: 700 }}
            />
          ))}
        </Box>
      </Box>

      {/* Main Content: Empty State, Daily Timeline View, or Flat List View */}
      {filteredExpenses.length === 0 ? (
        <Card sx={{ borderRadius: 4, textAlign: 'center', py: 8 }}>
          <CardContent>
            <ReceiptLongIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              No expenses found
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
              Try adjusting your filter, or tap below to add an expense.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={onOpenExpenseModal}
              startIcon={<AddIcon />}
              sx={{ mt: 2, borderRadius: 2.5, fontWeight: 700, minHeight: 44 }}
            >
              Add Expense Now
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'timeline' ? (
        /* DAILY SPENDING TIMELINE VIEW */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {visibleDayGroups.map((day) => (
            <Box
              key={day.dateKey}
              sx={{
                position: 'relative',
                pl: { xs: 1.75, sm: 3 },
                borderLeft: '2.5px solid #10b981',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25
              }}
            >
              {/* Timeline Day Node Marker */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -8,
                  top: 16,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: '#059669',
                  border: '2.5px solid #f8fafc',
                  boxShadow: '0 0 0 2px #10b981'
                }}
              />

              {/* Day Header Banner */}
              <Card
                sx={{
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 1.75, sm: 2.25 },
                    '&:last-child': { pb: { xs: 1.75, sm: 2.25 } },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`DAY ${day.dayNumber}`}
                        size="small"
                        sx={{
                          bgcolor: '#0f172a',
                          color: '#34d399',
                          fontWeight: 900,
                          fontSize: '0.7rem',
                          letterSpacing: '0.05em',
                          height: 24,
                        }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: '0.9rem', sm: '0.96rem' } }}>
                        {day.formattedDate}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669', fontSize: { xs: '0.96rem', sm: '1.05rem' }, lineHeight: 1.1 }}>
                        {currency} {day.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.64rem', display: 'block', fontWeight: 700 }}>
                        DAY {day.dayNumber} TOTAL
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pt: 1,
                      borderTop: '1px solid #f1f5f9',
                      gap: 1,
                      flexWrap: 'wrap'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                      {day.items.length} {day.items.length === 1 ? 'item' : 'items'} · Pool: {currency} {day.poolSpent.toLocaleString()} · OOP: {currency} {day.memberSpent.toLocaleString()}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {onOpenPdfExportModal && (
                        <Tooltip title="Export this day's expenses as PDF">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              SoundEffects.play('tap');
                              onOpenPdfExportModal({
                                category: selectedCategory,
                                dayKey: day.dateKey,
                              });
                            }}
                            startIcon={<PictureAsPdfIcon sx={{ fontSize: '14px !important', color: '#ef4444' }} />}
                            sx={{
                              borderRadius: 2,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              minHeight: 32,
                              py: 0.35,
                              px: 1.1,
                              borderColor: 'rgba(239, 68, 68, 0.35)',
                              color: '#dc2626',
                              bgcolor: 'rgba(239, 68, 68, 0.04)',
                              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Day PDF
                          </Button>
                        </Tooltip>
                      )}

                      <Tooltip title="Copy this day's summary for WhatsApp / Viber">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleCopyDaySummary(day)}
                          startIcon={copiedDayKey === day.dateKey ? <CheckIcon fontSize="small" /> : <ContentCopyIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{
                            borderRadius: 2,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            minHeight: 32,
                            py: 0.35,
                            px: 1.25,
                            borderColor: copiedDayKey === day.dateKey ? '#059669' : '#cbd5e1',
                            color: copiedDayKey === day.dateKey ? '#059669' : '#334155',
                            bgcolor: copiedDayKey === day.dateKey ? 'rgba(5, 150, 105, 0.06)' : '#f8fafc',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {copiedDayKey === day.dateKey ? 'Copied Day!' : 'Copy Day Summary'}
                        </Button>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Day's Expense Cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {day.items.map((exp) => renderExpenseCard(exp, true))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        /* FLAT LIST VIEW */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredExpenses.map((exp) => renderExpenseCard(exp, false))}
        </Box>
      )}

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
