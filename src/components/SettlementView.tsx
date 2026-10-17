import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SendIcon from '@mui/icons-material/Send';
import ScaleIcon from '@mui/icons-material/Scale';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { SettlementData, Trip, Member } from '../types';

interface SettlementViewProps {
  settlement: SettlementData;
  trip: Trip;
  members: Member[];
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  settlement,
  trip,
  members
}) => {
  const currency = trip.currency || 'Rs.';
  const [copiedType, setCopiedType] = useState<'settle_up' | 'full' | null>(null);
  const [mode, setMode] = useState<'pool' | 'p2p'>('pool');

  const poolBalance = settlement.summary.pool_cash_remaining;
  const activeSettlements = mode === 'pool' ? settlement.settlements : settlement.p2p_settlements;

  // Generate concise, scannable "Settle Up" message listing specifically who owes whom
  const settleUpMessage = React.useMemo(() => {
    const lines: string[] = [];
    lines.push(`⚡ *SETTLE UP: ${trip.title.toUpperCase()}* ⚡`);
    lines.push(`📋 *Who Owes Whom (Pending Settlements)*`);
    lines.push(`--------------------------------------`);

    if (activeSettlements.length === 0) {
      lines.push(`🎉 *All accounts are balanced!* No pending debts.`);
    } else {
      activeSettlements.forEach((s, idx) => {
        lines.push(`${idx + 1}️⃣ *${s.from_name}* ➔ owes *${s.to_name}*: *${currency} ${s.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`);
      });
    }

    lines.push(`--------------------------------------`);
    lines.push(`💵 *Live Pool Cash:* ${currency} ${poolBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`📲 *Please settle up via Fonepay / eSewa / Cash.*`);
    lines.push(`_Calculated via TripPool_`);

    return lines.join('\n');
  }, [trip.title, activeSettlements, currency, poolBalance]);

  const handleCopyText = async (text: string, type: 'settle_up' | 'full') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const whatsappSettleUpUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(settleUpMessage)}`;
  const whatsappFullUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(settlement.whatsapp_summary)}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* 1. Top Settlement Banner (Material Card) */}
      <Card
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          borderRadius: { xs: 3.5, sm: 4 },
          border: '1px solid rgba(51, 65, 85, 0.7)',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: '#34d399', fontWeight: 800, letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                Settlement & Debt Engine
              </Typography>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 900, color: '#ffffff', mt: 0.5, letterSpacing: '-0.02em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Final Trip Settlement
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block' }}>
                Automated reconciliation of advance deposits, out-of-pocket receipts, and consumption shares.
              </Typography>
            </Box>

            {/* Quick-Share Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="contained"
                component="a"
                href={whatsappSettleUpUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<WhatsAppIcon sx={{ color: '#ffffff' }} />}
                sx={{
                  flex: { xs: 1, sm: 'initial' },
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#1ebe5d' },
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  py: 1,
                  px: 2,
                  borderRadius: 2.5,
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                Settle Up on WhatsApp
              </Button>

              <Button
                variant="outlined"
                onClick={() => handleCopyText(settleUpMessage, 'settle_up')}
                startIcon={copiedType === 'settle_up' ? <CheckIcon sx={{ color: '#34d399' }} /> : <ContentCopyIcon fontSize="small" />}
                sx={{
                  flex: { xs: '0 0 auto', sm: 'initial' },
                  color: '#ffffff',
                  borderColor: copiedType === 'settle_up' ? '#34d399' : 'rgba(255, 255, 255, 0.2)',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                  borderRadius: 2.5,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  py: 1,
                  px: 1.75,
                }}
              >
                {copiedType === 'settle_up' ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2.5, borderColor: 'rgba(51, 65, 85, 0.7)' }} />

          {/* High Level Pool Cash Equation */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>
                Total Pool Collected
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#ffffff', mt: 0.5 }}>
                {currency} {settlement.summary.total_collected.toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>
                Pool Outflow / Spent
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#f87171', mt: 0.5 }}>
                {currency} {settlement.summary.total_pool_spent.toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 3, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <Typography variant="caption" sx={{ color: '#34d399', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>
                Live Pool Cash Remaining
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#34d399', mt: 0.5 }}>
                {currency} {poolBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Individual Member Ledgers */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Member Position & Breakdown
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Formula: (Deposited + Out-of-pocket Paid) - Consumed Share = Net Position
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            {settlement.members.map((m) => {
              const net = m.net_balance || 0;
              const isRefund = net > 0.01;
              const isOwes = net < -0.01;

              return (
                <Paper
                  key={m.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: isRefund ? 'rgba(5, 150, 105, 0.04)' : isOwes ? 'rgba(239, 68, 68, 0.04)' : '#f8fafc',
                    borderColor: isRefund ? '#6ee7b7' : isOwes ? '#fca5a5' : '#e2e8f0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {m.name}
                        </Typography>
                        {m.is_leader && (
                          <Chip label="Leader" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#0f172a', color: '#ffffff' }} />
                        )}
                      </Box>
                      {m.phone && (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                          {m.phone}
                        </Typography>
                      )}
                    </Box>

                    <Chip
                      label={
                        isRefund
                          ? `Gets Refund: ${currency} ${net.toLocaleString()}`
                          : isOwes
                          ? `Owes Pool: ${currency} ${Math.abs(net).toLocaleString()}`
                          : 'Settled (Rs. 0)'
                      }
                      size="small"
                      color={isRefund ? 'success' : isOwes ? 'error' : 'default'}
                      variant={isRefund || isOwes ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 800, fontSize: '0.72rem', height: 24, fontFamily: 'monospace' }}
                    />
                  </Box>

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(226, 232, 240, 0.7)' }} />

                  {/* Arithmetic grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, textAlign: 'center' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                        Deposited
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {currency} {(m.total_deposited || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                        Out-of-Pocket
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {currency} {(m.total_paid_out_of_pocket || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                        Share
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {currency} {(m.total_consumed || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* 3. Settlement Instructions / Debt Minimization */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Debt Reconciliation Instructions
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Clear settlement steps to bring everyone's account balance to exactly zero
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="contained"
                component="a"
                href={whatsappSettleUpUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<WhatsAppIcon />}
                size="small"
                sx={{
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#1ebe5d' },
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  py: 0.75,
                  px: 1.5,
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Settle Up on WhatsApp
              </Button>

              <ToggleButtonGroup
                size="small"
                value={mode}
                exclusive
                onChange={(_, val) => val && setMode(val)}
                sx={{
                  bgcolor: '#f1f5f9',
                  width: { xs: '100%', sm: 'auto' },
                  '& .MuiToggleButton-root': {
                    flex: { xs: 1, sm: 'initial' },
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    py: 0.5,
                    px: 1.25,
                    '&.Mui-selected': {
                      bgcolor: '#ffffff',
                      color: '#0f172a',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    },
                  },
                }}
              >
                <ToggleButton value="pool">Pool Custodian</ToggleButton>
                <ToggleButton value="p2p">Peer-to-Peer</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {activeSettlements.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">🎉 All accounts are balanced! No debts or refunds are pending.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {activeSettlements.map((step, idx) => {
                const debtorMember = members.find((m) => m.id === step.from_id);
                const cleanPhone = debtorMember?.phone ? debtorMember.phone.replace(/[^0-9]/g, '') : '';
                const individualReminder = `Hi ${step.from_name}! For *${trip.title}*, your pending share to settle is *${currency} ${step.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}* to *${step.to_name}*. Please transfer via Fonepay / Cash at your convenience. Thank you!`;
                const directReminderUrl = cleanPhone 
                  ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(individualReminder)}`
                  : `https://api.whatsapp.com/send?text=${encodeURIComponent(individualReminder)}`;

                return (
                  <Paper
                    key={idx}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      gap: 1.5,
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '8px',
                          bgcolor: 'rgba(5, 150, 105, 0.1)',
                          color: '#059669',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shrink: 0,
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                          {step.instruction}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <span>{step.from_name}</span>
                          <ArrowForwardIcon sx={{ fontSize: 12, color: '#94a3b8' }} />
                          <span>{step.to_name}</span>
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' }, pt: { xs: 1, sm: 0 }, borderTop: { xs: '1px solid #f1f5f9', sm: 'none' }, shrink: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                        {currency} {step.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>

                      <Button
                        component="a"
                        href={directReminderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          borderColor: 'rgba(5, 150, 105, 0.3)',
                          color: '#059669',
                          bgcolor: 'rgba(5, 150, 105, 0.05)',
                          '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.12)' },
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          py: 0.5,
                          px: 1.5,
                          borderRadius: 2,
                        }}
                      >
                        Remind
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}

          <Box sx={{ mt: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.72rem', lineHeight: 1.5, display: 'block' }}>
              <strong>Tip for Trip Leader:</strong> Tap <strong>"Remind"</strong> next to any friend above to notify them with pre-filled payment details, or switch between Pool Custodian and Peer-to-Peer calculation modes.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
