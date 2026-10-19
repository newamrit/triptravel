import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SendIcon from '@mui/icons-material/Send';
import ForumIcon from '@mui/icons-material/Forum';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { SettlementData, Trip, Member } from '../types';
import { SoundEffects } from '../utils/soundEffects';
import { MemberAvatar, resolveMemberObject } from './MemberAvatar';

interface SettlementViewProps {
  settlement: SettlementData;
  trip: Trip;
  members: Member[];
  onOpenPdfExportModal?: () => void;
  onShowToast?: (msg: string) => void;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  settlement,
  trip,
  members,
  onOpenPdfExportModal,
  onShowToast
}) => {
  const currency = trip.currency || 'Rs.';
  const [copiedType, setCopiedType] = useState<'settle_up' | 'full' | null>(null);
  const [mode, setMode] = useState<'pool' | 'p2p'>('pool');
  const [summaryFormat, setSummaryFormat] = useState<'settle_up' | 'full'>('settle_up');

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
        lines.push(`${idx + 1}. *${s.from_name}* ➔ owes *${s.to_name}*: *${currency} ${s.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`);
      });
    }

    lines.push(`--------------------------------------`);
    lines.push(`💰 *Total Collected:* ${currency} ${settlement.summary.total_collected.toLocaleString()}`);
    lines.push(`💸 *Total Spent:* ${currency} ${settlement.summary.total_spent.toLocaleString()}`);
    lines.push(`💵 *Live Pool Cash:* ${currency} ${poolBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`📲 *Please settle up via Fonepay / eSewa / Cash.*`);
    lines.push(`_Shared via TripPool_`);

    return lines.join('\n');
  }, [trip.title, activeSettlements, currency, poolBalance, settlement.summary.total_collected, settlement.summary.total_spent]);

  const activeSummaryText = summaryFormat === 'settle_up' ? settleUpMessage : settlement.whatsapp_summary;

  const handleCopyText = async (text: string, type: 'settle_up' | 'full') => {
    SoundEffects.play('copy');
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
    setCopiedType(type);
    if (onShowToast) {
      onShowToast(
        type === 'settle_up'
          ? 'Settle-Up summary copied! Paste directly into WhatsApp or Viber.'
          : 'Full Trip Report (with Daily Timeline) copied for WhatsApp / Viber!'
      );
    }
    setTimeout(() => setCopiedType(null), 2500);
  };

  const whatsappSettleUpUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(settleUpMessage)}`;
  const whatsappSelectedUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(activeSummaryText)}`;
  const viberSelectedUrl = `viber://forward?text=${encodeURIComponent(activeSummaryText)}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* 1. Top Settlement Banner (Material Dark Card) */}
      <Card
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          borderRadius: { xs: 3.5, sm: 4 },
          border: '1px solid rgba(51, 65, 85, 0.7)',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.25, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: '#34d399', fontWeight: 800, letterSpacing: '0.08em', fontSize: '0.7rem', lineHeight: 1.2 }}>
                Settlement & Debt Engine
              </Typography>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 900, color: '#ffffff', mt: 0.35, letterSpacing: '-0.02em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Final Trip Settlement
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.35, display: 'block' }}>
                Automated reconciliation of advance deposits, out-of-pocket receipts, and consumption shares.
              </Typography>
            </Box>

            {/* Quick-Share Action Buttons */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'auto auto auto' }, gap: 1.15 }}>
              {onOpenPdfExportModal && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    SoundEffects.play('tap');
                    onOpenPdfExportModal();
                  }}
                  startIcon={<PictureAsPdfIcon sx={{ color: '#f87171', fontSize: '16px !important' }} />}
                  sx={{
                    gridColumn: { xs: '1 / -1', sm: 'auto' },
                    color: '#ffffff',
                    borderColor: 'rgba(248, 113, 113, 0.45)',
                    bgcolor: 'rgba(239, 68, 68, 0.12)',
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.22)', borderColor: '#f87171' },
                    borderRadius: 2.5,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    minHeight: 44,
                    px: 1.5,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Export Expenses PDF
                </Button>
              )}

              <Button
                variant="contained"
                onClick={() => handleCopyText(settleUpMessage, 'settle_up')}
                startIcon={copiedType === 'settle_up' ? <CheckIcon sx={{ color: '#ffffff', fontSize: '16px !important' }} /> : <ContentCopyIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  bgcolor: copiedType === 'settle_up' ? '#059669' : '#10b981',
                  '&:hover': { bgcolor: '#059669' },
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  minHeight: 44,
                  px: 1.5,
                  borderRadius: 2.5,
                  whiteSpace: 'nowrap'
                }}
              >
                {copiedType === 'settle_up' ? 'Copied!' : 'Copy Settle-Up'}
              </Button>

              <Button
                variant="outlined"
                onClick={() => handleCopyText(settlement.whatsapp_summary, 'full')}
                startIcon={copiedType === 'full' ? <CheckIcon sx={{ color: '#34d399', fontSize: '16px !important' }} /> : <ContentCopyIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  color: '#ffffff',
                  borderColor: copiedType === 'full' ? '#34d399' : 'rgba(255, 255, 255, 0.22)',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                  borderRadius: 2.5,
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  minHeight: 44,
                  px: 1.5,
                  whiteSpace: 'nowrap'
                }}
              >
                {copiedType === 'full' ? 'Copied!' : 'Full Report'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2.25, borderColor: 'rgba(51, 65, 85, 0.7)' }} />

          {/* High Level Pool Cash Equation (2-col + 1 span on mobile, 3-col on desktop) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: { xs: 1.25, sm: 2 } }}>
            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                Pool Collected
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#ffffff', mt: 0.35, fontSize: { xs: '0.96rem', sm: '1.15rem' } }}>
                {currency} {settlement.summary.total_collected.toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>
                Pool Outflow
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#f87171', mt: 0.35, fontSize: { xs: '0.96rem', sm: '1.15rem' } }}>
                {currency} {settlement.summary.total_pool_spent.toLocaleString()}
              </Typography>
            </Box>

            <Box
              sx={{
                gridColumn: { xs: 'span 2', sm: 'span 1' },
                p: { xs: 1.5, sm: 2 },
                bgcolor: 'rgba(16, 185, 129, 0.12)',
                borderRadius: 3,
                border: '1px solid rgba(16, 185, 129, 0.28)',
                display: 'flex',
                flexDirection: { xs: 'row', sm: 'column' },
                alignItems: { xs: 'center', sm: 'flex-start' },
                justifyContent: 'space-between'
              }}
            >
              <Typography variant="caption" sx={{ color: '#34d399', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>
                Live Pool Cash Remaining
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#34d399', mt: { xs: 0, sm: 0.35 }, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                {currency} {poolBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Individual Member Ledgers */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800 }}>
              Member Position & Breakdown
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              (Deposited + Out-of-pocket Paid) − Consumed Share = Net Position
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
            {settlement.members.map((m) => {
              const net = m.net_balance || 0;
              const isRefund = net > 0.01;
              const isOwes = net < -0.01;

              return (
                <Paper
                  key={m.id}
                  variant="outlined"
                  sx={{
                    p: { xs: 1.75, sm: 2 },
                    borderRadius: 3,
                    bgcolor: isRefund ? 'rgba(5, 150, 105, 0.04)' : isOwes ? 'rgba(239, 68, 68, 0.04)' : '#f8fafc',
                    borderColor: isRefund ? '#6ee7b7' : isOwes ? '#fca5a5' : '#e2e8f0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                      <MemberAvatar member={m} size="md" showLeaderBadge />
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
                            {m.name}
                          </Typography>
                          {m.is_leader && (
                            <Chip label="Leader" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#0f172a', color: '#ffffff' }} />
                          )}
                        </Box>
                        {m.phone && (
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>
                            {m.phone}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Chip
                      label={
                        isRefund
                          ? `Refund: +${currency} ${net.toLocaleString()}`
                          : isOwes
                          ? `Owes: ${currency} ${Math.abs(net).toLocaleString()}`
                          : 'Settled (Rs. 0)'
                      }
                      size="small"
                      color={isRefund ? 'success' : isOwes ? 'error' : 'default'}
                      variant={isRefund || isOwes ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 800, fontSize: '0.7rem', height: 24, fontFamily: 'monospace' }}
                    />
                  </Box>

                  <Divider sx={{ my: 1.25, borderColor: 'rgba(226, 232, 240, 0.7)' }} />

                  {/* Arithmetic grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, textAlign: 'center' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                        Deposited
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.76rem' }}>
                        {currency} {(m.total_deposited || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                        Out-of-Pocket
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.76rem' }}>
                        {currency} {(m.total_paid_out_of_pocket || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                        Share
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.76rem' }}>
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
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.75, mb: 2.25 }}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800 }}>
                Debt Reconciliation Instructions
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Clear settlement steps to bring everyone's account balance to zero
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'stretch', gap: 1.25 }}>
              <ToggleButtonGroup
                size="small"
                value={mode}
                exclusive
                onChange={(_, val) => val && setMode(val)}
                sx={{
                  bgcolor: '#f1f5f9',
                  p: 0.35,
                  borderRadius: 2.5,
                  '& .MuiToggleButton-root': {
                    flex: { xs: 1, sm: 'initial' },
                    border: 'none',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    minHeight: 36,
                    px: 1.5,
                    '&.Mui-selected': {
                      bgcolor: '#ffffff',
                      color: '#0f172a',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    },
                  },
                }}
              >
                <ToggleButton value="pool">Pool Custodian</ToggleButton>
                <ToggleButton value="p2p">Peer-to-Peer</ToggleButton>
              </ToggleButtonGroup>

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
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  minHeight: 40,
                  px: 1.75,
                  borderRadius: 2.5,
                  whiteSpace: 'nowrap',
                }}
              >
                Settle Up on WhatsApp
              </Button>
            </Box>
          </Box>

          {activeSettlements.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">🎉 All accounts are balanced! No debts or refunds are pending.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {activeSettlements.map((step, idx) => {
                const debtorMember = resolveMemberObject(members, step.from_id, step.from_name);
                const creditorMember = resolveMemberObject(members, step.to_id, step.to_name);
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
                      p: { xs: 1.75, sm: 2 },
                      borderRadius: 3,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      gap: 1.25,
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '8px',
                          bgcolor: 'rgba(5, 150, 105, 0.12)',
                          color: '#059669',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          mt: 0.15
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                          {step.instruction}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, flexWrap: 'wrap', mt: 0.65 }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: '#ffffff', px: 0.85, py: 0.35, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                            <MemberAvatar member={debtorMember} name={step.from_name} size="xs" showLeaderBadge />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.72rem' }}>
                              {step.from_name}
                            </Typography>
                          </Box>
                          <ArrowForwardIcon sx={{ fontSize: 14, color: '#059669' }} />
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: '#ffffff', px: 0.85, py: 0.35, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                            <MemberAvatar member={creditorMember} name={step.to_name} size="xs" showLeaderBadge />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.72rem' }}>
                              {step.to_name}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' }, pt: { xs: 1, sm: 0 }, borderTop: { xs: '1px solid #e2e8f0', sm: 'none' }, flexShrink: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669', fontSize: { xs: '0.96rem', sm: '1.05rem' } }}>
                        {currency} {step.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>

                      <Button
                        component="a"
                        href={directReminderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        startIcon={<SendIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                          borderColor: 'rgba(5, 150, 105, 0.35)',
                          color: '#059669',
                          bgcolor: 'rgba(5, 150, 105, 0.06)',
                          '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.14)' },
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          minHeight: 36,
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
        </CardContent>
      </Card>

      {/* 4. One-Tap WhatsApp / Viber Summary Copy & Preview Card */}
      <Card sx={{ borderRadius: { xs: 3.5, sm: 4 }, border: '1px solid #cbd5e1' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 1.75, mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: { xs: '0.98rem', sm: '1.05rem' }, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ForumIcon sx={{ color: '#059669', fontSize: 20 }} />
                <span>One-Tap WhatsApp / Viber Group Summary</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Formatted plain-text summary ready to copy and paste directly into your group chat
              </Typography>
            </Box>

            <ToggleButtonGroup
              size="small"
              value={summaryFormat}
              exclusive
              onChange={(_, val) => val && setSummaryFormat(val)}
              sx={{
                bgcolor: '#f1f5f9',
                p: 0.35,
                borderRadius: 2.5,
                '& .MuiToggleButton-root': {
                  flex: { xs: 1, sm: 'initial' },
                  border: 'none',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  minHeight: 36,
                  px: 1.25,
                  whiteSpace: 'nowrap',
                  '&.Mui-selected': {
                    bgcolor: '#0f172a',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#1e293b' }
                  }
                }
              }}
            >
              <ToggleButton value="settle_up">Quick Settle-Up</ToggleButton>
              <ToggleButton value="full">Full Report + Daily</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Formatted Text Preview Box */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3,
              bgcolor: '#0f172a',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: { xs: '0.72rem', sm: '0.76rem' },
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              maxHeight: 260,
              overflowY: 'auto',
              border: '1px solid #334155',
              mb: 2
            }}
          >
            {activeSummaryText}
          </Paper>

          {/* Action Bar: One-Tap Copy, WhatsApp, Viber */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: '2fr 1fr 1fr' }, gap: 1.25 }}>
            <Button
              variant="contained"
              onClick={() => handleCopyText(activeSummaryText, summaryFormat)}
              startIcon={copiedType === summaryFormat ? <CheckIcon /> : <ContentCopyIcon />}
              sx={{
                gridColumn: { xs: 'span 2', sm: 'span 1' },
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                minHeight: 46,
                px: 2,
                borderRadius: 2.5,
                whiteSpace: 'nowrap'
              }}
            >
              {copiedType === summaryFormat ? 'Copied to Clipboard!' : 'One-Tap Copy Summary'}
            </Button>

            <Button
              variant="contained"
              component="a"
              href={whatsappSelectedUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<WhatsAppIcon />}
              sx={{
                bgcolor: '#25D366',
                '&:hover': { bgcolor: '#1ebe5d' },
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.8rem',
                minHeight: 46,
                px: 2,
                borderRadius: 2.5,
                whiteSpace: 'nowrap'
              }}
            >
              WhatsApp
            </Button>

            <Button
              variant="contained"
              component="a"
              href={viberSelectedUrl}
              startIcon={<SendIcon />}
              sx={{
                bgcolor: '#7360f2',
                '&:hover': { bgcolor: '#5e4ad8' },
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.8rem',
                minHeight: 46,
                px: 2,
                borderRadius: 2.5,
                whiteSpace: 'nowrap'
              }}
            >
              Viber
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
