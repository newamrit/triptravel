import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LandscapeIcon from '@mui/icons-material/Landscape';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WifiIcon from '@mui/icons-material/Wifi';
import StorageIcon from '@mui/icons-material/Storage';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import GetAppIcon from '@mui/icons-material/GetApp';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import IconButton from '@mui/material/IconButton';
import { Trip, AuthSession } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { SoundEffects, UIEffectsPreferences } from '../utils/soundEffects';

interface TopBarProps {
  trip: Trip;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSimulatedOffline: boolean;
  queuedCount: number;
  currentUser?: AuthSession['user'] | null;
  onLogout?: () => void;
  onOpenBackend: () => void;
  onOpenExpenseModal: () => void;
  onOpenEffectsModal: () => void;
  onOpenBackupModal: () => void;
  isBackupDue?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  trip,
  activeTab,
  setActiveTab,
  isSimulatedOffline,
  queuedCount,
  currentUser,
  onLogout,
  onOpenBackend,
  onOpenExpenseModal,
  onOpenEffectsModal,
  onOpenBackupModal,
  isBackupDue = false
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [effectsPrefs, setEffectsPrefs] = useState<UIEffectsPreferences>(() => SoundEffects.getPrefs());

  useEffect(() => {
    return SoundEffects.subscribe((updated) => setEffectsPrefs(updated));
  }, []);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.75)',
          pt: 'env(safe-area-inset-top, 0px)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            justifyContent: 'space-between',
            gap: { xs: 0.75, sm: 2 },
            px: { xs: 1.5, sm: 3 },
            minHeight: { xs: 56, sm: 64 }
          }}
        >
          {/* Zone 1: Brand title wordmark & active trip */}
          <Box
            onClick={() => {
              SoundEffects.play('tap');
              setActiveTab('dashboard');
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.1, sm: 1.5 },
              minWidth: 0,
              cursor: 'pointer'
            }}
          >
            <Box
              sx={{
                width: { xs: 34, sm: 38 },
                height: { xs: 34, sm: 38 },
                borderRadius: '11px',
                bgcolor: 'rgba(16, 185, 129, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                flexShrink: 0
              }}
            >
              <LandscapeIcon sx={{ fontSize: { xs: 19, sm: 21 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography
                  variant="subtitle1"
                  component="span"
                  sx={{
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    fontSize: { xs: '0.95rem', sm: '1.02rem' },
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap'
                  }}
                >
                  TripPool
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: { xs: 'none', sm: 'inline' } }}>
                  ·
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#cbd5e1',
                    fontWeight: 600,
                    display: { xs: 'none', sm: 'inline' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200
                  }}
                >
                  {trip.title}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: '#94a3b8',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: { xs: 135, sm: 230 },
                  fontSize: { xs: '0.68rem', sm: '0.7rem' },
                  lineHeight: 1.15,
                  mt: 0.15
                }}
              >
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }, color: '#cbd5e1', fontWeight: 600 }}>
                  {trip.title}
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {trip.destination}
                </Box>
              </Typography>
            </Box>
          </Box>

          {/* Zone 2: Navigation Links (Desktop md+) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75 }}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'expenses', label: 'Expenses' },
              { id: 'deposits', label: 'Pool Deposits' },
              { id: 'settlement', label: 'Settlement' },
              { id: 'members', label: 'Members' },
            ].map((item) => (
              <Button
                key={item.id}
                onClick={() => {
                  SoundEffects.play('tap');
                  setActiveTab(item.id);
                }}
                size="small"
                sx={{
                  color: activeTab === item.id ? '#34d399' : '#cbd5e1',
                  bgcolor: activeTab === item.id ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  fontWeight: activeTab === item.id ? 700 : 500,
                  fontSize: '0.8125rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.65,
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    color: '#ffffff',
                    bgcolor: activeTab === item.id ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Zone 3: Backup, Sound & Loading Effects, Offline/Cloud Status & User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.55, sm: 0.9 }, flexShrink: 0 }}>
            {/* Full Database Backup & Recurring Reminder Button */}
            <Tooltip title="Full Database Backup (.SQL / .JSON) & Recurring Reminder">
              <IconButton
                size="small"
                onClick={() => {
                  SoundEffects.play('tap');
                  onOpenBackupModal();
                }}
                aria-label="Database Backup and Recurring Reminder"
                sx={{
                  position: 'relative',
                  width: 34,
                  height: 34,
                  borderRadius: 2.25,
                  color: isBackupDue ? '#fcd34d' : '#38bdf8',
                  bgcolor: isBackupDue ? 'rgba(245, 158, 11, 0.14)' : 'rgba(2, 132, 199, 0.14)',
                  border: '1px solid',
                  borderColor: isBackupDue ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.35)',
                  '&:hover': {
                    bgcolor: isBackupDue ? 'rgba(245, 158, 11, 0.24)' : 'rgba(2, 132, 199, 0.24)',
                  },
                }}
              >
                <CloudDownloadIcon sx={{ fontSize: 17 }} />
                {isBackupDue && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      bgcolor: '#f59e0b',
                      border: '1.5px solid #0f172a',
                    }}
                  />
                )}
              </IconButton>
            </Tooltip>

            {/* Sound & Loading Animation Settings Button */}
            <Tooltip title="Manage Sound Effects & Loading Animations">
              <IconButton
                size="small"
                onClick={() => {
                  SoundEffects.play('tap');
                  onOpenEffectsModal();
                }}
                aria-label="Sound and Loading Animation Settings"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2.25,
                  color: effectsPrefs.soundEnabled ? '#34d399' : '#94a3b8',
                  bgcolor: effectsPrefs.soundEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.65)',
                  border: '1px solid',
                  borderColor: effectsPrefs.soundEnabled ? 'rgba(52, 211, 153, 0.35)' : 'rgba(148, 163, 184, 0.25)',
                  '&:hover': {
                    bgcolor: effectsPrefs.soundEnabled ? 'rgba(16, 185, 129, 0.22)' : 'rgba(51, 65, 85, 0.7)',
                  },
                }}
              >
                {effectsPrefs.soundEnabled ? (
                  <VolumeUpIcon sx={{ fontSize: 17 }} />
                ) : (
                  <VolumeOffIcon sx={{ fontSize: 17 }} />
                )}
              </IconButton>
            </Tooltip>

            {currentUser?.role === 'leader' ? (
              <Tooltip title="Backend Settings & MySQL Sync Queue (Trip Leader Only)">
                <Button
                  onClick={() => {
                    SoundEffects.play('tap');
                    onOpenBackend();
                  }}
                  variant="outlined"
                  size="small"
                  sx={{
                    minWidth: { xs: 36, sm: 'auto' },
                    height: 34,
                    color: isSimulatedOffline ? '#fcd34d' : '#e2e8f0',
                    borderColor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.45)' : 'rgba(148, 163, 184, 0.25)',
                    bgcolor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.65)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    py: 0.5,
                    px: { xs: 0.9, sm: 1.25 },
                    borderRadius: 2.25,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    '&:hover': {
                      borderColor: isSimulatedOffline ? '#f59e0b' : '#94a3b8',
                      bgcolor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.2)' : 'rgba(51, 65, 85, 0.65)',
                    },
                  }}
                >
                  {isSimulatedOffline ? (
                    <WifiOffIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                  ) : (
                    <WifiIcon sx={{ color: '#10b981', fontSize: 16 }} />
                  )}
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, whiteSpace: 'nowrap' }}>
                    {isSimulatedOffline ? 'Mountain Mode' : 'Online'}
                  </Box>
                  {queuedCount > 0 ? (
                    <Box
                      component="span"
                      sx={{
                        px: 0.65,
                        py: 0.1,
                        borderRadius: 1.5,
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        bgcolor: '#0284c7',
                        color: '#ffffff',
                        lineHeight: 1.3
                      }}
                    >
                      {queuedCount}
                    </Box>
                  ) : (
                    <StorageIcon sx={{ color: '#94a3b8', fontSize: 15, display: { xs: 'none', sm: 'inline-flex' } }} />
                  )}
                </Button>
              </Tooltip>
            ) : (
              <Chip
                icon={
                  isSimulatedOffline ? (
                    <WifiOffIcon sx={{ color: '#f59e0b !important', fontSize: '15px !important' }} />
                  ) : (
                    <WifiIcon sx={{ color: '#10b981 !important', fontSize: '15px !important' }} />
                  )
                }
                label={isSimulatedOffline ? 'Mountain Mode' : 'Online'}
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  color: isSimulatedOffline ? '#fcd34d' : '#e2e8f0',
                  border: '1px solid',
                  borderColor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.4)' : 'rgba(148, 163, 184, 0.25)',
                  bgcolor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  height: 30,
                }}
              />
            )}

            {/* Install App Quick Action */}
            {!isInstalled && isInstallable && (
              <Tooltip title="Install TripPool App">
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    SoundEffects.play('tap');
                    install();
                  }}
                  startIcon={<GetAppIcon sx={{ fontSize: '16px !important' }} />}
                  sx={{
                    bgcolor: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    height: 34,
                    py: 0.5,
                    px: { xs: 1, sm: 1.25 },
                    borderRadius: 2.25,
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Install App</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>App</Box>
                </Button>
              </Tooltip>
            )}

            <Button
              onClick={() => {
                SoundEffects.play('tap');
                onOpenExpenseModal();
              }}
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                fontWeight: 700,
                fontSize: '0.78rem',
                height: 34,
                py: 0.65,
                px: 1.5,
                borderRadius: 2.25,
                whiteSpace: 'nowrap'
              }}
            >
              Add Expense
            </Button>

            {/* Current User & Account / Logout Trigger */}
            {currentUser && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  pl: { xs: 0.15, sm: 0.75 },
                  borderLeft: { xs: 'none', sm: '1px solid rgba(51, 65, 85, 0.6)' }
                }}
              >
                <Tooltip title="Account & Sign Out">
                  <Chip
                    clickable
                    onClick={() => {
                      SoundEffects.play('tap');
                      setIsLogoutDialogOpen(true);
                    }}
                    icon={
                      <PersonIcon
                        sx={{
                          fontSize: '15px !important',
                          color: currentUser.role === 'leader' ? '#34d399 !important' : '#94a3b8 !important'
                        }}
                      />
                    }
                    label={currentUser.name.split(' ')[0]}
                    size="small"
                    sx={{
                      bgcolor: currentUser.role === 'leader' ? 'rgba(5, 150, 105, 0.18)' : 'rgba(30, 41, 59, 0.85)',
                      color: currentUser.role === 'leader' ? '#34d399' : '#e2e8f0',
                      border: '1px solid',
                      borderColor: currentUser.role === 'leader' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(71, 85, 105, 0.45)',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      height: 34,
                      borderRadius: 2.25,
                      px: 0.25,
                      maxWidth: { xs: 92, sm: 120 },
                      '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.28)' },
                    }}
                  />
                </Tooltip>

                {onLogout && (
                  <Tooltip title="Log Out">
                    <IconButton
                      size="small"
                      onClick={() => {
                        SoundEffects.play('tap');
                        setIsLogoutDialogOpen(true);
                      }}
                      sx={{
                        display: { xs: 'none', sm: 'inline-flex' },
                        color: '#94a3b8',
                        p: 0.85,
                        '&:hover': { color: '#f87171', bgcolor: 'rgba(239, 68, 68, 0.1)' },
                      }}
                    >
                      <LogoutIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Bottom Sheet / Modal Logout Confirmation Dialog */}
      <Dialog
        open={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: '24px 24px 0 0', sm: 3.5 },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: '90dvh', sm: '88vh' },
              width: { xs: '100%', sm: 'auto' },
              alignSelf: { xs: 'flex-end', sm: 'center' },
              bgcolor: '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            },
          },
        }}
      >
        {/* Mobile drag handle */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0 }}>
          <Box sx={{ width: 42, height: 4, borderRadius: 2, bgcolor: '#334155' }} />
        </Box>

        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 1, pt: { xs: 1.5, sm: 2.5 } }}>
          Account & Session
        </DialogTitle>
        <DialogContent sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          {currentUser && (
            <Box sx={{ p: 1.75, bgcolor: '#1e293b', borderRadius: 3, mb: 1.5, border: '1px solid #334155' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.92rem' }}>
                {currentUser.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.25 }}>
                {currentUser.email} · {currentUser.role === 'leader' ? 'Trip Leader' : 'Group Member'}
              </Typography>
            </Box>
          )}
          You will need to sign in with your email and password to re-access trip funds.
        </DialogContent>
        <DialogActions
          sx={{
            p: 2.5,
            pt: 1,
            pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', sm: 2.5 },
            gap: 1
          }}
        >
          <Button
            onClick={() => setIsLogoutDialogOpen(false)}
            sx={{ color: '#cbd5e1', fontWeight: 700, minHeight: 44, px: 2 }}
          >
            Stay Signed In
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              SoundEffects.play('tap');
              setIsLogoutDialogOpen(false);
              onLogout?.();
            }}
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{ fontWeight: 800, borderRadius: 2.5, minHeight: 44, px: 2.5, flex: { xs: 1, sm: 'initial' } }}
          >
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
