import React, { useState } from 'react';
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
import IconButton from '@mui/material/IconButton';
import { Trip, AuthSession } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  onOpenExpenseModal
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: '#0f172a', // Slate 900
          borderBottom: '1px solid rgba(51, 65, 85, 0.7)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: { xs: 58, sm: 64 } }}>
          {/* Zone 1: Brand title wordmark */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              <LandscapeIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" component="span" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  TripPool
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: { xs: 'none', sm: 'inline' } }}>
                  /
                </Typography>
                <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 120, sm: 200 } }}>
                  {trip.title}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 160, sm: 220 }, fontSize: '0.68rem', lineHeight: 1.1 }}>
                {trip.destination}
              </Typography>
            </Box>
          </Box>

          {/* Zone 2: Navigation Links (Hidden on small mobile) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'expenses', label: 'Expenses' },
              { id: 'deposits', label: 'Pool Deposits' },
              { id: 'settlement', label: 'Settlement' },
              { id: 'members', label: 'Members' },
            ].map((item) => (
              <Button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                size="small"
                sx={{
                  color: activeTab === item.id ? '#34d399' : '#cbd5e1',
                  fontWeight: activeTab === item.id ? 700 : 500,
                  fontSize: '0.8125rem',
                  minWidth: 'auto',
                  px: 1.5,
                  '&:hover': {
                    color: '#ffffff',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Zone 3: Primary Action & Offline/Cloud Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.25 } }}>
            <Tooltip title="Backend Settings & MySQL Sync Queue">
              <Button
                onClick={onOpenBackend}
                variant="outlined"
                size="small"
                startIcon={
                  isSimulatedOffline ? (
                    <WifiOffIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                  ) : (
                    <WifiIcon sx={{ color: '#10b981', fontSize: 16 }} />
                  )
                }
                endIcon={
                  queuedCount > 0 ? (
                    <Chip
                      label={queuedCount}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        bgcolor: '#0284c7',
                        color: '#ffffff',
                      }}
                    />
                  ) : (
                    <StorageIcon sx={{ color: '#94a3b8', fontSize: 16 }} />
                  )
                }
                sx={{
                  color: isSimulatedOffline ? '#fcd34d' : '#e2e8f0',
                  borderColor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.4)' : 'rgba(148, 163, 184, 0.25)',
                  bgcolor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                  fontSize: '0.75rem',
                  py: 0.5,
                  px: 1.25,
                  '&:hover': {
                    borderColor: isSimulatedOffline ? '#f59e0b' : '#94a3b8',
                    bgcolor: isSimulatedOffline ? 'rgba(245, 158, 11, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {isSimulatedOffline ? 'Mountain Mode' : 'Online'}
                </Box>
              </Button>
            </Tooltip>

            {/* Install App Quick Action */}
            {!isInstalled && isInstallable && (
              <Tooltip title="Install TripPool Android App">
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => install()}
                  startIcon={<GetAppIcon fontSize="small" />}
                  sx={{
                    bgcolor: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    py: 0.5,
                    px: 1.25,
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  Install App
                </Button>
              </Tooltip>
            )}

            <Button
              onClick={onOpenExpenseModal}
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 0.75,
                px: 1.5,
                borderRadius: '10px',
                whiteSpace: 'nowrap'
              }}
            >
              Add Expense
            </Button>

            {/* Current User & Logout */}
            {currentUser && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5, borderLeft: '1px solid rgba(51, 65, 85, 0.6)' }}>
                <Tooltip title="Tap to view profile / Log Out">
                  <Chip
                    clickable
                    onClick={() => setIsLogoutDialogOpen(true)}
                    icon={<PersonIcon sx={{ fontSize: '14px !important', color: currentUser.role === 'leader' ? '#34d399 !important' : '#94a3b8 !important' }} />}
                    label={currentUser.name.split(' ')[0]}
                    size="small"
                    sx={{
                      bgcolor: currentUser.role === 'leader' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                      color: currentUser.role === 'leader' ? '#34d399' : '#e2e8f0',
                      border: '1px solid',
                      borderColor: currentUser.role === 'leader' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(71, 85, 105, 0.4)',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      height: 28,
                      maxWidth: { xs: 80, sm: 110 },
                      '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.3)' },
                    }}
                  />
                </Tooltip>

                {onLogout && (
                  <Tooltip title="Log Out">
                    <IconButton
                      size="small"
                      onClick={() => setIsLogoutDialogOpen(true)}
                      sx={{
                        color: '#94a3b8',
                        p: 0.75,
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

      {/* Custom Material UI Logout Confirmation Dialog */}
      <Dialog
        open={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: '20px 20px 0 0', sm: 3.5 },
              m: { xs: 0, sm: 2 },
              position: { xs: 'fixed', sm: 'relative' },
              bottom: { xs: 0, sm: 'auto' },
              bgcolor: '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 1 }}>
          Log Out of TripPool?
        </DialogTitle>
        <DialogContent sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          {currentUser && (
            <Box sx={{ p: 1.5, bgcolor: '#1e293b', borderRadius: 2.5, mb: 1.5, border: '1px solid #334155' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff' }}>
                {currentUser.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                {currentUser.email} · {currentUser.role === 'leader' ? 'Trip Leader' : 'Group Member'}
              </Typography>
            </Box>
          )}
          You will need to sign in with your email and password to re-access trip funds.
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsLogoutDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setIsLogoutDialogOpen(false);
              onLogout?.();
            }}
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{ fontWeight: 800, borderRadius: 2.5 }}
          >
            Log Out Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
