import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Deposit, Member, Trip, PaymentMethod } from '../types';

interface DepositsViewProps {
  deposits: Deposit[];
  members: Member[];
  trip: Trip;
  onOpenDepositModal: () => void;
  onDeleteDeposit: (id: number) => void;
}

export const DepositsView: React.FC<DepositsViewProps> = ({
  deposits,
  members,
  trip,
  onOpenDepositModal,
  onDeleteDeposit
}) => {
  const currency = trip.currency || 'Rs.';

  const totalCollected = deposits.reduce((sum, d) => sum + d.amount, 0);

  // Group by payment method
  const byMethod: Record<PaymentMethod, number> = {
    'Cash': 0,
    'Fonepay': 0,
    'Bank Transfer': 0,
    'Other': 0
  };
  for (const d of deposits) {
    byMethod[d.payment_method] = (byMethod[d.payment_method] || 0) + d.amount;
  }

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'Cash':
        return <PaymentsIcon fontSize="small" sx={{ color: '#059669' }} />;
      case 'Fonepay':
        return <QrCode2Icon fontSize="small" sx={{ color: '#8b5cf6' }} />;
      case 'Bank Transfer':
        return <AccountBalanceIcon fontSize="small" sx={{ color: '#0284c7' }} />;
      default:
        return <CreditCardIcon fontSize="small" sx={{ color: '#64748b' }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* Top Banner & KPI */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Pool Collection Ledger
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Initial advance deposits and rolling contributions from friends
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={onOpenDepositModal}
            startIcon={<AddIcon />}
            sx={{ fontWeight: 700, borderRadius: 2.5, fontSize: '0.8rem', py: 1, px: 2, width: { xs: '100%', sm: 'auto' } }}
          >
            Record New Deposit
          </Button>
        </CardContent>
      </Card>

      {/* Breakdown Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#059669', mb: 0.5 }}>
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Total Collected</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {currency} {totalCollected.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#059669', mb: 0.5 }}>
              <PaymentsIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Physical Cash</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {currency} {byMethod['Cash'].toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#8b5cf6', mb: 0.5 }}>
              <QrCode2Icon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Fonepay / QR</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#8b5cf6', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {currency} {byMethod['Fonepay'].toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#0284c7', mb: 0.5 }}>
              <AccountBalanceIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Bank Transfer</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#0284c7', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {currency} {byMethod['Bank Transfer'].toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Member Contributions Summary List */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Member Pool Contributions Breakdown
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            {members.map(m => {
              const memberDeps = deposits.filter(d => d.member_id === m.id);
              const sum = memberDeps.reduce((acc, d) => acc + d.amount, 0);
              return (
                <Paper
                  key={m.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {m.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {memberDeps.length} {memberDeps.length === 1 ? 'deposit' : 'deposits'}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669' }}>
                    {currency} {sum.toLocaleString()}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Deposit Transactions History ({deposits.length})
          </Typography>

          {deposits.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">No deposits recorded yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', divideY: '1px solid #f1f5f9' }}>
              {deposits.map(d => {
                const dateObj = new Date(d.deposited_at);
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
                  <Box
                    key={d.id}
                    sx={{
                      py: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '12px',
                          bgcolor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shrink: 0,
                        }}
                      >
                        {getMethodIcon(d.payment_method)}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                            {d.member_name}
                          </Typography>
                          <Chip label={d.payment_method} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block', wordBreak: 'break-word' }}>
                          {d.notes || 'Pool fund contribution'} · {dateStr} at {timeStr}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, shrink: 0 }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#059669', fontFamily: 'monospace', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                          +{currency} {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block' }}>
                          Credited to Pool
                        </Typography>
                      </Box>

                      <Tooltip title="Delete Deposit">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteDeposit(d.id)}
                          sx={{ color: '#94a3b8', p: 1, '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
