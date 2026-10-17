import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Expense, ExpenseCategory, Trip, Member } from '../types';
import { getCategoryIcon, getCategoryBadgeClass } from '../utils/categoryIcons';
import { ReceiptViewerModal } from './ReceiptViewerModal';

interface ExpensesViewProps {
  expenses: Expense[];
  members: Member[];
  trip: Trip;
  onOpenExpenseModal: () => void;
  onDeleteExpense: (id: number) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Fuel',
  'Food & Snacks',
  'Hotel/Homestay',
  'Permits/Entry',
  'Vehicle Maintenance/Spares',
  'Miscellaneous'
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  members,
  trip,
  onOpenExpenseModal,
  onDeleteExpense
}) => {
  const currency = trip.currency || 'Rs.';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReceiptExpense, setSelectedReceiptExpense] = useState<Expense | null>(null);

  const filteredExpenses = expenses.filter(exp => {
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

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* Top Banner Card */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Trip Expense Ledger
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Total {expenses.length} receipts · Filtered sum:{' '}
              <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: 800 }}>
                {currency} {totalFiltered.toLocaleString()}
              </span>
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={onOpenExpenseModal}
            startIcon={<AddIcon />}
            sx={{ fontWeight: 700, borderRadius: 2.5, fontSize: '0.8rem', py: 1, px: 2, width: { xs: '100%', sm: 'auto' } }}
          >
            Add New Expense
          </Button>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Search input */}
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
              sx: { bgcolor: '#ffffff', borderRadius: 3, fontSize: '0.85rem' },
            },
          }}
        />

        {/* Category Horizontal Filter Chips with smooth touch scrolling */}
        <Box className="no-scrollbar" sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, WebkitOverflowScrolling: 'touch' }}>
          <Chip
            label="All Categories"
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            clickable
            sx={{ shrink: 0, fontWeight: 700, fontSize: '0.75rem', bgcolor: selectedCategory === 'all' ? '#0f172a' : '#ffffff' }}
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
                shrink: 0,
                fontWeight: selectedCategory === cat ? 700 : 500,
                fontSize: '0.75rem',
                bgcolor: selectedCategory === cat ? '#0f172a' : '#ffffff',
              }}
            />
          ))}
        </Box>

        {/* Payer Filter Chips */}
        <Box className="no-scrollbar" sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', pb: 0.5, WebkitOverflowScrolling: 'touch' }}>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, shrink: 0 }}>Paid via:</Typography>
          {['all', 'pool', 'member'].map((p) => (
            <Chip
              key={p}
              label={p === 'all' ? 'All Payers' : p === 'pool' ? 'From Pool' : 'Out-of-Pocket'}
              size="small"
              onClick={() => setPayerFilter(p)}
              color={payerFilter === p ? 'success' : 'default'}
              variant={payerFilter === p ? 'filled' : 'outlined'}
              clickable
              sx={{ shrink: 0, fontSize: '0.7rem', height: 26, fontWeight: 700 }}
            />
          ))}
        </Box>
      </Box>

      {/* Expense List */}
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
              sx={{ mt: 2, borderRadius: 2.5, fontWeight: 700 }}
            >
              Add Expense Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredExpenses.map((exp) => {
            const dateObj = new Date(exp.expense_date);
            const dateStr = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            const timeStr = dateObj.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <Card key={exp.id} sx={{ borderRadius: 3.5, '&:hover': { borderColor: '#cbd5e1' } }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.75 }}>
                  {/* Left: Icon & Details */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        bgcolor: '#f1f5f9',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shrink: 0,
                        mt: 0.25,
                      }}
                    >
                      {getCategoryIcon(exp.category, 'w-5 h-5')}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                          {exp.description}
                        </Typography>
                        <Chip
                          label={exp.category}
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                        />
                        {exp.receipt_image && (
                          <Chip
                            icon={<ReceiptLongIcon sx={{ fontSize: '13px !important', color: '#059669 !important' }} />}
                            label="Receipt"
                            size="small"
                            clickable
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReceiptExpense(exp);
                            }}
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: 'rgba(5, 150, 105, 0.08)',
                              color: '#059669',
                              border: '1px solid rgba(5, 150, 105, 0.25)',
                              '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.18)' },
                            }}
                          />
                        )}
                      </Box>

                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', wordBreak: 'break-word' }}>
                        {dateStr} at {timeStr} · Paid by:{' '}
                        <strong style={{ color: '#0f172a' }}>
                          {exp.payer_type === 'pool' ? 'Trip Pool / Leader' : exp.payer_member_name || 'Friend'}
                        </strong>
                      </Typography>

                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', wordBreak: 'break-word' }}>
                        Split ({exp.splits?.length || 0} friends):{' '}
                        <span style={{ color: '#475569' }}>
                          {exp.splits?.map(s => s.member_name?.split(' ')[0]).join(', ') || 'All members'}
                        </span>
                      </Typography>
                    </Box>
                  </Box>

                  {/* Right: Receipt thumbnail, Amount & Delete */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' }, gap: 1.5, pt: { xs: 1.5, sm: 0 }, borderTop: { xs: '1px solid #f1f5f9', sm: 'none' }, shrink: 0 }}>
                    {exp.receipt_image && (
                      <Tooltip title="View Receipt Photo">
                        <Box
                          onClick={() => setSelectedReceiptExpense(exp)}
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1.5px solid rgba(5, 150, 105, 0.35)',
                            cursor: 'pointer',
                            position: 'relative',
                            shrink: 0,
                            '&:hover': { opacity: 0.9, borderColor: '#059669' },
                          }}
                        >
                          <Box
                            component="img"
                            src={exp.receipt_image}
                            alt="Receipt thumb"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                      </Tooltip>
                    )}

                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', fontSize: '1.05rem' }}>
                        {currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block' }}>
                        {exp.payer_type === 'pool' ? 'Pool Outflow' : 'Out-of-Pocket Credit'}
                      </Typography>
                    </Box>

                    <Tooltip title="Delete Expense">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteExpense(exp.id)}
                        sx={{ color: '#94a3b8', p: 1, '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
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
