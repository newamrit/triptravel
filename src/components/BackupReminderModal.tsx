import React, { useState, useEffect } from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StorageIcon from '@mui/icons-material/Storage';
import DataObjectIcon from '@mui/icons-material/DataObject';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SnoozeIcon from '@mui/icons-material/Snooze';
import { Trip, Member, Deposit, Expense, SettlementData } from '../types';
import {
  BackupManager,
  BackupReminderPrefs,
  exportDatabaseAsSql,
  exportDatabaseAsJson,
} from '../utils/backupExporter';
import { SoundEffects } from '../utils/soundEffects';

interface BackupReminderBannerProps {
  visible: boolean;
  reason: 'scheduled' | 'changes' | null;
  recordsSinceBackup: number;
  lastBackupAt: string | null;
  onQuickDownloadBackup: () => void;
  onOpenBackupModal: () => void;
  onSnooze: (minutes: number) => void;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  visible,
  reason,
  recordsSinceBackup,
  lastBackupAt,
  onQuickDownloadBackup,
  onOpenBackupModal,
  onSnooze,
}) => {
  if (!visible) return null;

  const lastBackupText = lastBackupAt
    ? `Last backup: ${new Date(lastBackupAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'No database backup downloaded yet';

  return (
    <Box
      sx={{
        bgcolor: '#0f172a',
        borderBottom: '1px solid rgba(52, 211, 153, 0.35)',
        backgroundImage:
          'linear-gradient(90deg, rgba(5, 150, 105, 0.16) 0%, rgba(15, 23, 42, 0.96) 60%)',
        color: '#ffffff',
        px: { xs: 1.5, sm: 3 },
        py: 1.15,
        animation: 'trippoolSlideUpFade 0.22s ease-out',
      }}
    >
      <Box
        sx={{
          maxWidth: '80rem',
          mx: 'auto',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(52, 211, 153, 0.45)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <NotificationsActiveIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.82rem', lineHeight: 1.2 }}
              >
                {reason === 'changes'
                  ? `Database Backup Recommended (${recordsSinceBackup} new records logged)`
                  : 'Scheduled Database Backup Reminder'}
              </Typography>
              <Chip
                label={lastBackupText}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(30, 41, 59, 0.9)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', display: 'block', fontSize: '0.71rem', mt: 0.2 }}
            >
              Download a full MySQL (.sql) & JSON snapshot of your trip data to keep a safe local copy.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.85,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              SoundEffects.play('tap');
              onQuickDownloadBackup();
            }}
            startIcon={<CloudDownloadIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.74rem',
              borderRadius: 2,
              py: 0.5,
              px: 1.4,
              minHeight: 34,
              whiteSpace: 'nowrap',
              flex: { xs: 1, sm: 'initial' },
            }}
          >
            Backup Now (.SQL + .JSON)
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              SoundEffects.play('tap');
              onOpenBackupModal();
            }}
            sx={{
              color: '#cbd5e1',
              borderColor: 'rgba(148, 163, 184, 0.35)',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: 2,
              py: 0.45,
              px: 1.15,
              minHeight: 34,
              whiteSpace: 'nowrap',
            }}
          >
            Schedule
          </Button>

          <Button
            size="small"
            onClick={() => {
              SoundEffects.play('tap');
              onSnooze(60);
            }}
            startIcon={<SnoozeIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              color: '#94a3b8',
              fontSize: '0.71rem',
              fontWeight: 700,
              minHeight: 34,
              px: 1,
              whiteSpace: 'nowrap',
            }}
          >
            Later (1h)
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

interface BackupReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members: Member[];
  deposits: Deposit[];
  expenses: Expense[];
  settlement: SettlementData;
  onBackupCompleted: (message: string) => void;
}

export const BackupReminderModal: React.FC<BackupReminderModalProps> = ({
  isOpen,
  onClose,
  trip,
  members,
  deposits,
  expenses,
  settlement,
  onBackupCompleted,
}) => {
  const [prefs, setPrefs] = useState<BackupReminderPrefs>(() => BackupManager.getPrefs());

  useEffect(() => {
    setPrefs(BackupManager.getPrefs());
    return BackupManager.subscribe((updated) => setPrefs(updated));
  }, [isOpen]);

  const handleUpdatePrefs = (partial: Partial<BackupReminderPrefs>) => {
    const next = BackupManager.savePrefs(partial);
    setPrefs(next);
  };

  const handleDownloadSql = () => {
    SoundEffects.play('tap');
    const file = exportDatabaseAsSql(trip, members, deposits, expenses);
    BackupManager.markBackupCompleted();
    SoundEffects.play('sync');
    onBackupCompleted(`Downloaded MySQL Database Backup: ${file}`);
  };

  const handleDownloadJson = () => {
    SoundEffects.play('tap');
    const file = exportDatabaseAsJson(trip, members, deposits, expenses, settlement);
    BackupManager.markBackupCompleted();
    SoundEffects.play('sync');
    onBackupCompleted(`Downloaded JSON Database Snapshot: ${file}`);
  };

  const handleDownloadFullBundle = () => {
    SoundEffects.play('tap');
    const sqlFile = exportDatabaseAsSql(trip, members, deposits, expenses);
    setTimeout(() => {
      exportDatabaseAsJson(trip, members, deposits, expenses, settlement);
    }, 250);
    BackupManager.markBackupCompleted();
    SoundEffects.play('sync');
    onBackupCompleted(`Full Database Backup (.SQL + .JSON) downloaded! (${sqlFile})`);
    onClose();
  };

  const receiptsCount = expenses.filter((e) => Boolean(e.receipt_image)).length;

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
              bgcolor: 'rgba(5, 150, 105, 0.12)',
              color: '#059669',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CloudDownloadIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.02rem', sm: '1.12rem' } }}>
              Full Database Backup & Recurring Reminder
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Export your complete trip database (.SQL & .JSON) and manage automatic reminders
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
          gap: 2.25,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* 1. Live Database Snapshot Status Card */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#0f172a',
            color: '#ffffff',
            border: '1px solid rgba(51, 65, 85, 0.85)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="overline" sx={{ color: '#34d399', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.07em', lineHeight: 1.2 }}>
              LIVE TRIP DATABASE SNAPSHOT
            </Typography>
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#34d399 !important' }} />}
              label={
                prefs.lastBackupAt
                  ? `Backed up ${new Date(prefs.lastBackupAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Backup Recommended'
              }
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

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              mt: 1,
              pt: 1.25,
              borderTop: '1px solid rgba(51, 65, 85, 0.8)',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Members
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#ffffff' }}>
                {members.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Deposits
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#34d399' }}>
                {deposits.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Expenses
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#fcd34d' }}>
                {expenses.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                Receipts
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#38bdf8' }}>
                {receiptsCount}
              </Typography>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1.25, fontSize: '0.7rem' }}>
            {prefs.lastBackupAt
              ? `Last full export: ${new Date(prefs.lastBackupAt).toLocaleString()} · ${prefs.recordsSinceLastBackup} new change(s) since backup`
              : `No full backup exported yet · ${prefs.recordsSinceLastBackup} change(s) recorded in this session`}
          </Typography>
        </Box>

        {/* 2. Direct Download Formats */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.15 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Download Database Export Now
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.15 }}>
            <Button
              variant="outlined"
              onClick={handleDownloadSql}
              startIcon={<StorageIcon sx={{ color: '#059669' }} />}
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                p: 1.5,
                borderRadius: 2.5,
                borderColor: '#cbd5e1',
                color: '#0f172a',
                bgcolor: '#ffffff',
                '&:hover': { borderColor: '#059669', bgcolor: 'rgba(5, 150, 105, 0.04)' },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>
                  MySQL Backup (.SQL)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.67rem' }}>
                  Ready to import in cPanel phpMyAdmin
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              onClick={handleDownloadJson}
              startIcon={<DataObjectIcon sx={{ color: '#0284c7' }} />}
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                p: 1.5,
                borderRadius: 2.5,
                borderColor: '#cbd5e1',
                color: '#0f172a',
                bgcolor: '#ffffff',
                '&:hover': { borderColor: '#0284c7', bgcolor: 'rgba(2, 132, 199, 0.04)' },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>
                  Full Data Snapshot (.JSON)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.67rem' }}>
                  Includes receipts & settlement ledger
                </Typography>
              </Box>
            </Button>
          </Box>
        </Box>

        {/* 3. Recurring Reminder Configuration */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.75,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <NotificationsActiveIcon sx={{ color: prefs.enabled ? '#059669' : '#94a3b8', fontSize: 21 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.86rem' }}>
                  Recurring Backup Reminder
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.71rem' }}>
                  Automatically prompt to download a database backup on schedule
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={prefs.enabled}
              onChange={(e) => handleUpdatePrefs({ enabled: e.target.checked })}
              color="primary"
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
              pt: 1.25,
              borderTop: '1px solid #e2e8f0',
              opacity: prefs.enabled ? 1 : 0.5,
              pointerEvents: prefs.enabled ? 'auto' : 'none',
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="backup-interval-label">Reminder Frequency</InputLabel>
              <Select
                labelId="backup-interval-label"
                value={prefs.intervalMinutes}
                label="Reminder Frequency"
                onChange={(e) => {
                  const mins = Number(e.target.value);
                  handleUpdatePrefs({
                    intervalMinutes: mins,
                    nextReminderTimestamp: Date.now() + mins * 60 * 1000,
                  });
                }}
                sx={{ borderRadius: 2.5, bgcolor: '#ffffff' }}
              >
                <MenuItem value={15}>Every 15 Minutes (Intensive)</MenuItem>
                <MenuItem value={60}>Every 1 Hour</MenuItem>
                <MenuItem value={360}>Every 6 Hours (Roadtrip Mode)</MenuItem>
                <MenuItem value={720}>Every 12 Hours (Twice Daily)</MenuItem>
                <MenuItem value={1440}>Every 24 Hours (Daily Backup)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="backup-changes-label">Activity Trigger</InputLabel>
              <Select
                labelId="backup-changes-label"
                value={prefs.remindAfterNewRecords}
                label="Activity Trigger"
                onChange={(e) =>
                  handleUpdatePrefs({ remindAfterNewRecords: Number(e.target.value) })
                }
                sx={{ borderRadius: 2.5, bgcolor: '#ffffff' }}
              >
                <MenuItem value={3}>After every 3 new records</MenuItem>
                <MenuItem value={5}>After every 5 new records</MenuItem>
                <MenuItem value={10}>After every 10 new records</MenuItem>
                <MenuItem value={0}>Time schedule only</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#64748b' }}>
              <AccessTimeIcon sx={{ fontSize: 15 }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                Next scheduled check:{' '}
                <strong>
                  {new Date(prefs.nextReminderTimestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </Typography>
            </Box>

            <Button
              size="small"
              onClick={() => {
                SoundEffects.play('tap');
                BackupManager.snoozeReminder(60);
                onClose();
              }}
              sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', minHeight: 30, py: 0.25 }}
            >
              Snooze 1 Hour
            </Button>
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
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleDownloadFullBundle}
          startIcon={<CloudDownloadIcon />}
          sx={{
            flex: 1,
            py: 1.25,
            fontWeight: 800,
            borderRadius: 2.5,
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
          }}
        >
          Download Full Backup (.SQL + .JSON)
        </Button>
      </DialogActions>
    </Dialog>
  );
};
