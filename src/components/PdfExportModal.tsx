import React, { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ScaleIcon from '@mui/icons-material/Scale';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Trip, Member, Deposit, Expense, SettlementData } from '../types';
import { exportTripExpensesToPdf } from '../utils/pdfExporter';
import { SoundEffects } from '../utils/soundEffects';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members: Member[];
  deposits: Deposit[];
  expenses: Expense[];
  settlement: SettlementData;
  preparedBy?: string;
  initialCategory?: string;
  initialDayKey?: string;
  onShowToast?: (msg: string) => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  trip,
  members,
  deposits,
  expenses,
  settlement,
  preparedBy = 'Trip Leader / Admin',
  initialCategory = 'all',
  initialDayKey = 'all',
  onShowToast,
}) => {
  const currency = trip.currency || 'Rs.';

  const [includeCategoryBreakdown, setIncludeCategoryBreakdown] = useState(true);
  const [includeDailyTimeline, setIncludeDailyTimeline] = useState(true);
  const [includeItemizedExpenses, setIncludeItemizedExpenses] = useState(true);
  const [includeMemberSettlement, setIncludeMemberSettlement] = useState(true);
  const [includeReceiptPhotos, setIncludeReceiptPhotos] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>(initialCategory);
  const [filterDayKey, setFilterDayKey] = useState<string>(initialDayKey);
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFilterCategory(initialCategory || 'all');
      setFilterDayKey(initialDayKey || 'all');
    }
  }, [isOpen, initialCategory, initialDayKey]);

  const availableDays = useMemo(() => {
    const unique = Array.from(
      new Set(expenses.map((e) => (e.expense_date || '').substring(0, 10)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return unique.map((dateKey, idx) => ({
      dateKey,
      label: `Day ${idx + 1} (${dateKey})`,
    }));
  }, [expenses]);

  const filteredPreview = useMemo(() => {
    const list = expenses.filter((e) => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterDayKey !== 'all' && (e.expense_date || '').substring(0, 10) !== filterDayKey) return false;
      return true;
    });
    const totalAmount = list.reduce((s, e) => s + Number(e.amount || 0), 0);
    const receiptsCount = list.filter((e) => Boolean(e.receipt_image)).length;
    return {
      count: list.length,
      totalAmount,
      receiptsCount,
    };
  }, [expenses, filterCategory, filterDayKey]);

  const handleGeneratePdf = async () => {
    try {
      setIsGenerating(true);
      SoundEffects.play('tap');
      const filename = await exportTripExpensesToPdf(
        trip,
        members,
        deposits,
        expenses,
        settlement,
        {
          includeCategoryBreakdown,
          includeDailyTimeline,
          includeItemizedExpenses,
          includeMemberSettlement,
          includeReceiptPhotos,
          filterCategory,
          filterDayKey,
          preparedBy,
        }
      );
      SoundEffects.play('copy');
      onShowToast?.(`Exported PDF Report: ${filename}`);
      onClose();
    } catch (err) {
      console.error('PDF export error:', err);
      SoundEffects.play('error');
      onShowToast?.('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '24px 24px 0 0', sm: 4 },
            m: { xs: 0, sm: 2 },
            maxHeight: { xs: '90dvh', sm: '88vh' },
            width: { xs: '100%', sm: 'auto' },
            alignSelf: { xs: 'flex-end', sm: 'center' },
          },
        },
      }}
    >
      {/* Mobile drag handle */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0, flexShrink: 0 }}>
        <Box sx={{ width: 44, height: 4, borderRadius: 2, bgcolor: '#cbd5e1' }} />
      </Box>

      <DialogTitle
        sx={{
          m: 0,
          p: { xs: 2, sm: 2.5 },
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.02rem', sm: '1.12rem' } }}>
              Export Expense Statement (PDF)
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Generate an itemized PDF report showing where every rupee was spent
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748b', p: 1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* 1. Live Report Preview Banner */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#0f172a',
            color: '#ffffff',
            border: '1px solid rgba(51, 65, 85, 0.85)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="overline" sx={{ color: '#34d399', fontWeight: 800, fontSize: '0.66rem', letterSpacing: '0.07em', lineHeight: 1.2 }}>
              PDF STATEMENT SUMMARY
            </Typography>
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#34d399 !important' }} />}
              label={`${filteredPreview.count} Expenses`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 800,
                bgcolor: 'rgba(16, 185, 129, 0.16)',
                color: '#34d399',
              }}
            />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
            {trip.title}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mt: 1.5,
              pt: 1.25,
              borderTop: '1px solid rgba(51, 65, 85, 0.8)',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Pool Collected
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#34d399', fontSize: '0.82rem' }}>
                {currency} {settlement.summary.total_collected.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Selected Spend
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#fcd34d', fontSize: '0.82rem' }}>
                {currency} {filteredPreview.totalAmount.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Pool Remaining
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#ffffff', fontSize: '0.82rem' }}>
                {currency} {settlement.summary.pool_cash_remaining.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 2. Optional Scope Filters (All Expenses vs Specific Category or Day) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="pdf-cat-filter-label">Filter by Category</InputLabel>
            <Select
              labelId="pdf-cat-filter-label"
              value={filterCategory}
              label="Filter by Category"
              onChange={(e) => setFilterCategory(e.target.value)}
              sx={{ borderRadius: 2.5 }}
            >
              <MenuItem value="all">All Categories (Full Breakdown)</MenuItem>
              <MenuItem value="Fuel">Fuel</MenuItem>
              <MenuItem value="Food & Snacks">Food & Snacks</MenuItem>
              <MenuItem value="Hotel/Homestay">Hotel/Homestay</MenuItem>
              <MenuItem value="Permits/Entry">Permits/Entry</MenuItem>
              <MenuItem value="Vehicle Maintenance/Spares">Vehicle Maintenance/Spares</MenuItem>
              <MenuItem value="Miscellaneous">Miscellaneous</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="pdf-day-filter-label">Filter by Trip Day</InputLabel>
            <Select
              labelId="pdf-day-filter-label"
              value={filterDayKey}
              label="Filter by Trip Day"
              onChange={(e) => setFilterDayKey(e.target.value)}
              sx={{ borderRadius: 2.5 }}
            >
              <MenuItem value="all">All Trip Days ({availableDays.length} Days)</MenuItem>
              {availableDays.map((d) => (
                <MenuItem key={d.dateKey} value={d.dateKey}>
                  {d.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 3. Report Sections Checklist */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Included PDF Report Sections
          </Typography>

          {/* Toggle 1: Category Breakdown */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <PieChartIcon sx={{ fontSize: 19, color: '#059669' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  1. Where Money Was Spent (By Category)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  Fuel, Food, Hotel, Permits totals & percentage share
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={includeCategoryBreakdown}
              onChange={(e) => setIncludeCategoryBreakdown(e.target.checked)}
              color="primary"
            />
          </Box>

          {/* Toggle 2: Day-by-Day Timeline */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <TimelineIcon sx={{ fontSize: 19, color: '#0284c7' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  2. Day-by-Day Spending Timeline
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  Daily spend totals from Day 1 to Day {availableDays.length || 1}
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={includeDailyTimeline}
              onChange={(e) => setIncludeDailyTimeline(e.target.checked)}
              color="primary"
            />
          </Box>

          {/* Toggle 3: Complete Itemized Expense Ledger */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <ReceiptLongIcon sx={{ fontSize: 19, color: '#f59e0b' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  3. Complete Itemized Expense List ({filteredPreview.count} Bills)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  Every expense with date, location, who paid & per-person split
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={includeItemizedExpenses}
              onChange={(e) => setIncludeItemizedExpenses(e.target.checked)}
              color="primary"
            />
          </Box>

          {/* Toggle 4: Member Deposits & Final Settlement */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <ScaleIcon sx={{ fontSize: 19, color: '#8b5cf6' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  4. Member Deposits & Final Settlement Table
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  Who deposited, fair share consumed & who owes whom
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={includeMemberSettlement}
              onChange={(e) => setIncludeMemberSettlement(e.target.checked)}
              color="primary"
            />
          </Box>

          {/* Toggle 5: Attached Receipt Photos Appendix */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <PhotoCameraIcon sx={{ fontSize: 19, color: '#10b981' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  5. Physical Receipt Photos Appendix ({filteredPreview.receiptsCount})
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  Embeds attached bill/receipt photos at the end of the PDF
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={includeReceiptPhotos}
              onChange={(e) => setIncludeReceiptPhotos(e.target.checked)}
              color="primary"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 2, sm: 2.5 },
          pt: 1.5,
          pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', sm: 2 },
          display: 'flex',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, py: 1, px: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGeneratePdf}
          disabled={isGenerating}
          startIcon={
            isGenerating ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <DownloadIcon />
            )
          }
          sx={{
            flex: 1,
            py: 1.25,
            fontWeight: 800,
            borderRadius: 2.5,
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
          }}
        >
          {isGenerating ? 'Generating PDF...' : 'Download Expense PDF Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
