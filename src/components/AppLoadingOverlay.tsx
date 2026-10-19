import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import LandscapeIcon from '@mui/icons-material/Landscape';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface AppBootSplashProps {
  open: boolean;
  tripTitle?: string;
  statusText?: string;
  onDismiss?: () => void;
}

export const AppBootSplash: React.FC<AppBootSplashProps> = ({
  open,
  tripTitle = 'TripPool Nepal',
  statusText = 'Syncing live trip ledger & settlement...',
  onDismiss,
}) => {
  if (!open) return null;

  return (
    <Box
      onClick={onDismiss}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        bgcolor: '#090d16',
        backgroundImage:
          'radial-gradient(at 20% 15%, rgba(5, 150, 105, 0.22) 0px, transparent 55%), radial-gradient(at 80% 85%, rgba(2, 132, 199, 0.18) 0px, transparent 55%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        color: '#ffffff',
        animation: 'trippoolFadeIn 0.2s ease-out',
      }}
    >
      {/* Animated Brand Pulse Ring */}
      <Box
        sx={{
          position: 'relative',
          width: 88,
          height: 88,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        {/* Outer Ripple Ring */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '28px',
            border: '2px solid rgba(52, 211, 153, 0.35)',
            animation: 'trippoolPulseRing 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite',
          }}
        />
        {/* Rotating Orbit Ring */}
        <CircularProgress
          size={86}
          thickness={2.2}
          sx={{
            position: 'absolute',
            color: '#10b981',
            opacity: 0.85,
          }}
        />
        {/* Core Emblem */}
        <Box
          sx={{
            width: 62,
            height: 62,
            borderRadius: '20px',
            bgcolor: 'rgba(16, 185, 129, 0.16)',
            border: '1px solid rgba(52, 211, 153, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
            boxShadow: '0 12px 32px -4px rgba(5, 150, 105, 0.45)',
          }}
        >
          <LandscapeIcon sx={{ fontSize: 32 }} />
        </Box>
      </Box>

      {/* Title & Subtitle */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          fontSize: { xs: '1.2rem', sm: '1.35rem' },
          textAlign: 'center',
        }}
      >
        {tripTitle}
      </Typography>

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          mt: 1,
          px: 1.75,
          py: 0.6,
          borderRadius: 99,
          bgcolor: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid rgba(51, 65, 85, 0.85)',
        }}
      >
        <StorageIcon sx={{ fontSize: 14, color: '#34d399' }} />
        <Typography
          variant="caption"
          sx={{
            color: '#cbd5e1',
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
          }}
        >
          {statusText}
        </Typography>
      </Box>

      {/* Shimmer Progress Bar */}
      <Box
        sx={{
          width: 200,
          height: 4,
          borderRadius: 99,
          bgcolor: 'rgba(51, 65, 85, 0.6)',
          overflow: 'hidden',
          mt: 2.5,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: '55%',
            borderRadius: 99,
            background: 'linear-gradient(90deg, transparent, #10b981, #38bdf8, transparent)',
            animation: 'trippoolShimmerBar 1.1s ease-in-out infinite',
          }}
        />
      </Box>
    </Box>
  );
};

interface FloatingActivityPillProps {
  active: boolean;
  label?: string;
  doneLabel?: string;
}

export const FloatingActivityPill: React.FC<FloatingActivityPillProps> = ({
  active,
  label = 'Syncing with MySQL...',
}) => {
  if (!active) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 74px)', md: 24 },
        left: { xs: 14, md: 24 },
        zIndex: 1400,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 99,
        bgcolor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        color: '#ffffff',
        border: '1px solid rgba(52, 211, 153, 0.4)',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
        animation: 'trippoolSlideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'none',
      }}
    >
      <CircularProgress size={14} thickness={5} sx={{ color: '#34d399' }} />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: '0.72rem',
          color: '#e2e8f0',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export const TopSyncProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 13000,
        bgcolor: 'rgba(16, 185, 129, 0.15)',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          width: '45%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #10b981, #34d399, #38bdf8, transparent)',
          animation: 'trippoolShimmerBar 1s linear infinite',
        }}
      />
    </Box>
  );
};
