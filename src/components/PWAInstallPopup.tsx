import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import AndroidIcon from '@mui/icons-material/Android';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';
import SignalCellularConnectedNoInternet4BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet4Bar';
import SpeedIcon from '@mui/icons-material/Speed';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxIcon from '@mui/icons-material/AddBox';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPopupProps {
  isOpenTriggered?: boolean;
}

export const PWAInstallPopup: React.FC<PWAInstallPopupProps> = ({ isOpenTriggered = false }) => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Show prompt when user is on mobile/desktop, app is NOT installed, and hasn't been dismissed in this session
    const dismissed = sessionStorage.getItem('trippool_pwa_dismissed');
    
    if (!isInstalled && !dismissed) {
      // Automatically open prompt if installable OR triggered upon login
      if (isInstallable || isIOS || isOpenTriggered || isMobile) {
        // Small delay after login so UI renders smoothly
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, isInstalled, isIOS, isOpenTriggered, isMobile]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstalledSuccess(true);
        setTimeout(() => setIsOpen(false), 2000);
      }
    } else {
      // Native browser trigger fallback
      sessionStorage.setItem('trippool_pwa_dismissed', 'true');
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('trippool_pwa_dismissed', 'true');
    setIsOpen(false);
  };

  if (isInstalled || (!isOpen && !isOpenTriggered)) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleDismiss}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '24px 24px 0 0', sm: 4 },
            m: { xs: 0, sm: 2 },
            position: { xs: 'fixed', sm: 'relative' },
            bottom: { xs: 0, sm: 'auto' },
            bgcolor: '#0f172a',
            color: '#ffffff',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Top drag handle indicator on mobile */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: '#334155' }} />
      </Box>

      <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton size="small" onClick={handleDismiss} sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3.5, pt: 0, textAlign: 'center' }}>
        {installedSuccess ? (
          <Box sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#34d399' }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              App Installed!
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Launch TripPool directly from your Home Screen anytime.
            </Typography>
          </Box>
        ) : (
          <>
            {/* App Icon Banner */}
            <Box sx={{ display: 'inline-flex', position: 'relative', mb: 2 }}>
              <Box
                component="img"
                src="/pwa-192x192.png"
                alt="TripPool App Icon"
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '20px',
                  boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)',
                  border: '2px solid rgba(52, 211, 153, 0.4)',
                }}
              />
              <Chip
                icon={<AndroidIcon sx={{ fontSize: '13px !important', color: '#ffffff !important' }} />}
                label="Android"
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: -8,
                  right: -10,
                  bgcolor: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  height: 20,
                  px: 0.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em', mb: 0.5 }}>
              Install TripPool App
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.82rem', mb: 2.5 }}>
              Get the native Android app experience on your phone for offline trip logging & quick access.
            </Typography>

            {/* Benefit Highlights */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 3, textAlign: 'left', bgcolor: 'rgba(30, 41, 59, 0.6)', p: 2, borderRadius: 3, border: '1px solid rgba(51, 65, 85, 0.6)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SignalCellularConnectedNoInternet4BarIcon sx={{ color: '#34d399', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
                  Offline Mountain Mode for remote Himalayan valleys
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SpeedIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
                  Full screen standalone view without browser bars
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AndroidIcon sx={{ color: '#a3e635', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
                  1-Tap launch from Home Screen & App Drawer
                </Typography>
              </Box>
            </Box>

            {/* iOS Safari Guide vs Android Install Button */}
            {isIOS ? (
              <Box sx={{ p: 2, bgcolor: 'rgba(5, 150, 105, 0.1)', borderRadius: 2.5, border: '1px solid rgba(52, 211, 153, 0.3)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  To Install on iPhone / iPad:
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  Tap <IosShareIcon sx={{ fontSize: 16, color: '#38bdf8' }} /> Share then select <AddBoxIcon sx={{ fontSize: 16, color: '#38bdf8' }} /> "Add to Home Screen"
                </Typography>
              </Box>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={handleInstallClick}
                startIcon={<GetAppIcon />}
                sx={{
                  py: 1.25,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  bgcolor: '#059669',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(5, 150, 105, 0.5)',
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                Install App Now
              </Button>
            )}

            <Button
              fullWidth
              onClick={handleDismiss}
              sx={{ mt: 1, color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}
            >
              Continue in Web Browser
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
