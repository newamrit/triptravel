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
import EditIcon from '@mui/icons-material/Edit';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Deposit, Member, Trip, PaymentMethod } from '../types';
import { MemberAvatar, resolveMemberObject } from './MemberAvatar';

interface DepositsViewProps {
  deposits: Deposit[];
  members: Member[];
  trip: Trip;
  onOpenDepositModal: () => void;
  onEditDeposit?: (deposit: Deposit) => void;
  onDeleteDeposit: (id: number) => void;
}

export const DepositsView: React.FC<DepositsViewProps> = ({
  deposits,
  members,
  trip,
  onOpenDepositModal,
  onEditDeposit,
  onDeleteDeposit
}) => {
  const currency = trip.currency || 'Rs.';

  const totalCollected = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // Group by payment method
  const byMethod: Record<PaymentMethod, number> = {
    'Cash': 0,
    'Fonepay': 0,
    'Bank Transfer': 0,
    'Other': 0
  };
  for (const d of deposits) {
    byMethod[d.payment_method] = (byMethod[d.payment_method] || 0) + Number(d.amount || 0);
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
        <CardContent
          sx={{
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.08rem', sm: '1.25rem' } }}>
              Pool Collection Ledger
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
              Initial advance deposits and rolling contributions from friends
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={onOpenDepositModal}
            startIcon={<AddIcon />}
            sx={{ fontWeight: 800, borderRadius: 2.5, fontSize: '0.82rem', minHeight: 44, px: 2, whiteSpace: 'nowrap' }}
          >
            Record New Deposit
          </Button>
        </CardContent>
      </Card>

      {/* Breakdown Cards Grid (2x2 on mobile, 4-col on desktop) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 1.25, sm: 2 } }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#059669', mb: 0.5 }}>
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Total Collected</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', fontSize: { xs: '0.98rem', sm: '1.2rem' } }}>
              {currency} {totalCollected.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#059669', mb: 0.5 }}>
              <PaymentsIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Physical Cash</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669', fontSize: { xs: '0.98rem', sm: '1.2rem' } }}>
              {currency} {byMethod['Cash'].toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#8b5cf6', mb: 0.5 }}>
              <QrCode2Icon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Fonepay / QR</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#8b5cf6', fontSize: { xs: '0.98rem', sm: '1.2rem' } }}>
              {currency} {byMethod['Fonepay'].toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#0284c7', mb: 0.5 }}>
              <AccountBalanceIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Bank Transfer</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#0284c7', fontSize: { xs: '0.98rem', sm: '1.2rem' } }}>
              {currency} {byMethod['Bank Transfer'].toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Member Contributions Summary List (Compact 2-col grid on mobile, 4-col on desktop) */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.75, fontSize: { xs: '0.98rem', sm: '1.05rem' } }}>
            Member Pool Contributions
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 1.25, sm: 2 } }}>
            {members.map(m => {
              const memberDeps = deposits.filter(d => Number(d.member_id) === Number(m.id));
              const sum = memberDeps.reduce((acc, d) => acc + Number(d.amount || 0), 0);
              return (
                <Paper
                  key={m.id}
                  variant="outlined"
                  sx={{
                    p: { xs: 1.35, sm: 2 },
                    borderRadius: 3,
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 0.75
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
                    <MemberAvatar member={m} size="sm" showLeaderBadge />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                        {memberDeps.length} {memberDeps.length === 1 ? 'deposit' : 'deposits'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669', fontSize: { xs: '0.86rem', sm: '0.95rem' }, flexShrink: 0 }}>
                    {currency} {sum.toLocaleString()}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, fontSize: { xs: '0.98rem', sm: '1.05rem' } }}>
            Deposit Transactions History ({deposits.length})
          </Typography>

          {deposits.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">No deposits recorded yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {deposits.map((d, idx) => {
                const isLast = idx === deposits.length - 1;
                const depMember = resolveMemberObject(members, d.member_id, d.member_name);
                const dateObj = new Date(d.deposited_at.replace(' ', 'T'));
                const dateStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                  : d.deposited_at;
                const timeStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <Box
                    key={d.id}
                    sx={{
                      py: 1.75,
                      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0, flex: 1 }}>
                        <MemberAvatar member={depMember} name={d.member_name} size="md" showLeaderBadge />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.88rem', wordBreak: 'break-word' }}>
                              {d.member_name}
                            </Typography>
                            <Chip
                              icon={getMethodIcon(d.payment_method) as any}
                              label={d.payment_method}
                              size="small"
                              sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, pl: 0.5 }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block', mt: 0.25, wordBreak: 'break-word' }}>
                            {d.notes || 'Pool fund contribution'} · {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#059669', fontFamily: 'monospace', fontSize: { xs: '0.92rem', sm: '1rem' }, lineHeight: 1.2 }}>
                          +{currency} {Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block', mt: 0.2 }}>
                          Credited to Pool
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action strip on right */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      {onEditDeposit && (
                        <Button
                          size="small"
                          onClick={() => onEditDeposit(d)}
                          startIcon={<EditIcon sx={{ fontSize: '15px !important' }} />}
                          sx={{
                            color: '#0284c7',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            minHeight: 32,
                            px: 1,
                            borderRadius: 2,
                            '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.08)' }
                          }}
                        >
                          Edit
                        </Button>
                      )}

                      <Tooltip title="Delete Deposit">
                        <IconButton
                          size="small"
                          aria-label="Delete deposit"
                          onClick={() => onDeleteDeposit(d.id)}
                          sx={{ color: '#94a3b8', width: 32, height: 32, '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
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
