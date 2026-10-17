import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Member, PaymentMethod } from '../types';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currency: string;
  onSaveDeposit: (depositData: {
    member_id: number;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
    deposited_at: string;
  }) => void;
}

const METHODS: { label: PaymentMethod; icon: React.ReactNode; desc: string }[] = [
  { label: 'Cash', icon: <PaymentsIcon fontSize="small" sx={{ color: '#059669' }} />, desc: 'Physical cash handed to leader' },
  { label: 'Fonepay', icon: <QrCode2Icon fontSize="small" sx={{ color: '#8b5cf6' }} />, desc: 'Mobile QR digital transfer' },
  { label: 'Bank Transfer', icon: <AccountBalanceIcon fontSize="small" sx={{ color: '#0284c7' }} />, desc: 'Direct bank account transfer' },
  { label: 'Other', icon: <CreditCardIcon fontSize="small" sx={{ color: '#64748b' }} />, desc: 'Other payment option' },
];

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  members,
  currency,
  onSaveDeposit
}) => {
  const activeMembers = members.filter(m => m.is_active);

  const [memberId, setMemberId] = useState<number>(activeMembers[0]?.id || 1);
  const [amountStr, setAmountStr] = useState<string>('5000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState<string>('Initial pool contribution');
  const [depositedAt, setDepositedAt] = useState<string>(
    new Date().toISOString().substring(0, 16)
  );

  const amount = parseFloat(amountStr) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !memberId) return;

    onSaveDeposit({
      member_id: memberId,
      amount,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      deposited_at: depositedAt ? new Date(depositedAt).toISOString() : new Date().toISOString()
    });

    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '24px 24px 0 0', sm: 4 },
            m: { xs: 0, sm: 2 },
            position: { xs: 'fixed', sm: 'relative' },
            bottom: { xs: 0, sm: 'auto' },
            maxHeight: { xs: '94vh', sm: '90vh' },
            width: { xs: '100%', sm: 'auto' },
          },
        },
      }}
    >
      {/* Mobile drag handle */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0 }}>
        <Box sx={{ width: 44, height: 4, borderRadius: 2, bgcolor: '#cbd5e1' }} />
      </Box>

      <DialogTitle sx={{ m: 0, p: { xs: 2, sm: 2.5 }, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
            Record Pool Deposit
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Collect advance float or rolling top-up fund from friend
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{ color: '#64748b', p: 1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Member Selector */}
          <FormControl fullWidth size="small">
            <InputLabel id="deposit-member-label">Who is Depositing Money?</InputLabel>
            <Select
              labelId="deposit-member-label"
              value={memberId}
              label="Who is Depositing Money?"
              onChange={(e) => setMemberId(Number(e.target.value))}
              sx={{ borderRadius: 2.5 }}
            >
              {activeMembers.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name} {m.is_leader ? '(Leader / Custodian)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Amount */}
          <Box>
            <TextField
              fullWidth
              type="number"
              label={`Amount (${currency})`}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="5000"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontWeight: 800, color: '#059669', fontSize: '1.25rem' }}>
                        {currency}
                      </Typography>
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    borderRadius: 3,
                  },
                },
              }}
            />
            {/* Presets with smooth touch scrolling */}
            <Box className="no-scrollbar" sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5, WebkitOverflowScrolling: 'touch' }}>
              {[1000, 2000, 5000, 10000].map((val) => (
                <Chip
                  key={val}
                  label={`${currency} ${val}`}
                  size="small"
                  onClick={() => setAmountStr(val.toString())}
                  clickable
                  sx={{ shrink: 0, fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f1f5f9' }}
                />
              ))}
            </Box>
          </Box>

          {/* Payment Method */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Payment Method Received
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: { xs: 1, sm: 1.5 } }}>
              {METHODS.map((m) => {
                const isSelected = paymentMethod === m.label;
                return (
                  <Button
                    key={m.label}
                    type="button"
                    variant="outlined"
                    onClick={() => setPaymentMethod(m.label)}
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      textAlign: 'left',
                      borderColor: isSelected ? '#059669' : '#e2e8f0',
                      bgcolor: isSelected ? 'rgba(5, 150, 105, 0.08)' : '#ffffff',
                      boxShadow: 'none',
                    }}
                  >
                    <Box sx={{ mt: 0.25, shrink: 0 }}>{m.icon}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 600, color: isSelected ? '#059669' : '#0f172a', fontSize: '0.8rem', wordBreak: 'break-word' }}>
                        {m.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', display: { xs: 'none', sm: 'block' }, lineHeight: 1.1 }}>
                        {m.desc}
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            label="Note / Reference"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Initial pool deposit, Surkhet fuel top-up"
            size="small"
            slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
          />

          {/* Timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
            <TextField
              type="datetime-local"
              size="small"
              value={depositedAt}
              onChange={(e) => setDepositedAt(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '0.78rem', borderRadius: 2 } } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1.5, pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, py: 1, px: 2 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={amount <= 0}
            startIcon={<ArrowDownwardIcon fontSize="small" />}
            sx={{ flex: 1, py: 1.25, fontWeight: 800, borderRadius: 2.5 }}
          >
            Record Deposit ({currency} {amount.toLocaleString()})
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
