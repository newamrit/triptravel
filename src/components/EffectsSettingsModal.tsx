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
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VibrationIcon from '@mui/icons-material/Vibration';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SyncIcon from '@mui/icons-material/Sync';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import SpeedIcon from '@mui/icons-material/Speed';
import { SoundEffects, UIEffectsPreferences, SoundEffectType } from '../utils/soundEffects';

interface EffectsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewLoadingSplash: () => void;
}

const SOUND_PREVIEWS: { type: SoundEffectType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    type: 'deposit',
    label: 'Pool Deposit',
    desc: 'Coin chime arpeggio',
    icon: <PaymentsIcon sx={{ fontSize: 17, color: '#059669' }} />,
  },
  {
    type: 'expense',
    label: 'Expense Saved',
    desc: '2-tone confirmation',
    icon: <ReceiptLongIcon sx={{ fontSize: 17, color: '#0284c7' }} />,
  },
  {
    type: 'shutter',
    label: 'Receipt Camera',
    desc: 'Mechanical shutter',
    icon: <PhotoCameraIcon sx={{ fontSize: 17, color: '#8b5cf6' }} />,
  },
  {
    type: 'copy',
    label: 'Summary Copy',
    desc: 'WhatsApp / Viber chime',
    icon: <ContentCopyIcon sx={{ fontSize: 17, color: '#10b981' }} />,
  },
  {
    type: 'sync',
    label: 'MySQL Sync',
    desc: 'Harmonic cloud chord',
    icon: <SyncIcon sx={{ fontSize: 17, color: '#f59e0b' }} />,
  },
  {
    type: 'tap',
    label: 'Tab / Button Tap',
    desc: 'Soft tactile click',
    icon: <TouchAppIcon sx={{ fontSize: 17, color: '#64748b' }} />,
  },
];

export const EffectsSettingsModal: React.FC<EffectsSettingsModalProps> = ({
  isOpen,
  onClose,
  onPreviewLoadingSplash,
}) => {
  const [prefs, setPrefs] = useState<UIEffectsPreferences>(() => SoundEffects.getPrefs());

  useEffect(() => {
    setPrefs(SoundEffects.getPrefs());
    return SoundEffects.subscribe((updated) => setPrefs(updated));
  }, [isOpen]);

  const handleUpdate = (partial: Partial<UIEffectsPreferences>) => {
    const updated = SoundEffects.updatePrefs(partial);
    setPrefs(updated);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
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
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0 }}>
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
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: 'rgba(5, 150, 105, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {prefs.soundEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.02rem', sm: '1.12rem' } }}>
              Sound & Loading Animations
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Customize audio feedback, haptics, and loading transitions
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
        {/* 1. Sound & Haptics Section */}
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
          {/* Master Sound Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <VolumeUpIcon sx={{ color: prefs.soundEnabled ? '#059669' : '#94a3b8', fontSize: 21 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                  App Sound Effects
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>
                  Synthesized offline audio chimes for expenses, deposits & camera
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={prefs.soundEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                handleUpdate({ soundEnabled: next });
                if (next) SoundEffects.play('tap', true);
              }}
              color="primary"
            />
          </Box>

          {/* Volume Slider */}
          <Box
            sx={{
              pt: 1.25,
              borderTop: '1px solid #e2e8f0',
              opacity: prefs.soundEnabled ? 1 : 0.45,
              pointerEvents: prefs.soundEnabled ? 'auto' : 'none',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                Sound Volume
              </Typography>
              <Chip
                label={`${Math.round(prefs.volume * 100)}%`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: 'rgba(5, 150, 105, 0.12)',
                  color: '#059669',
                }}
              />
            </Box>
            <Slider
              size="small"
              min={0.1}
              max={1.0}
              step={0.05}
              value={prefs.volume}
              onChange={(_, val) => handleUpdate({ volume: val as number })}
              onChangeCommitted={() => SoundEffects.play('tap', true)}
              sx={{ color: '#059669', py: 1 }}
            />
          </Box>

          {/* Mobile Haptic Feedback Toggle */}
          <Box
            sx={{
              pt: 1.25,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <VibrationIcon sx={{ color: prefs.hapticsEnabled ? '#059669' : '#94a3b8', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                  Tactile Haptic Vibration
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>
                  Subtle phone vibration on supported mobile devices
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={prefs.hapticsEnabled}
              onChange={(e) => {
                handleUpdate({ hapticsEnabled: e.target.checked });
                if (e.target.checked) SoundEffects.triggerHaptic(20);
              }}
              color="primary"
            />
          </Box>
        </Box>

        {/* 2. Interactive Sound Effect Preview Board */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Test Sound Effects (Tap to Preview)
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
              100% Web Audio Synth
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {SOUND_PREVIEWS.map((item) => (
              <Button
                key={item.type}
                variant="outlined"
                onClick={() => SoundEffects.play(item.type, true)}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  p: 1.15,
                  borderRadius: 2.5,
                  borderColor: '#e2e8f0',
                  bgcolor: '#ffffff',
                  color: '#0f172a',
                  gap: 1,
                  '&:hover': {
                    borderColor: '#059669',
                    bgcolor: 'rgba(5, 150, 105, 0.04)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      color: '#0f172a',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#64748b',
                      fontSize: '0.65rem',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.desc}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>
        </Box>

        {/* 3. Loading & UI Animation Controls */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeMotionIcon sx={{ color: '#059669', fontSize: 19 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.86rem' }}>
                Loading & Transition Animations
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlayArrowIcon fontSize="small" />}
              onClick={() => {
                SoundEffects.play('sync', true);
                onPreviewLoadingSplash();
              }}
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                py: 0.35,
                px: 1.1,
                borderRadius: 2,
                borderColor: 'rgba(5, 150, 105, 0.4)',
                color: '#059669',
              }}
            >
              Preview Loader
            </Button>
          </Box>

          {/* Startup Splash Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 1,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                Startup & Sign-In Loading Splash
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                Animated TripPool splash while connecting to MySQL
              </Typography>
            </Box>
            <Switch
              size="small"
              checked={prefs.startupLoaderEnabled}
              onChange={(e) => handleUpdate({ startupLoaderEnabled: e.target.checked })}
              color="primary"
            />
          </Box>

          {/* Live Sync Shimmer Bar Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 1,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                Live Database Sync Progress Indicator
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                Top shimmer bar & floating status pill during saves
              </Typography>
            </Box>
            <Switch
              size="small"
              checked={prefs.syncProgressBarEnabled}
              onChange={(e) => handleUpdate({ syncProgressBarEnabled: e.target.checked })}
              color="primary"
            />
          </Box>

          {/* Smooth Tab Transition Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 1,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ fontSize: 18, color: '#64748b' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                  Smooth Screen Entrance Animations
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  Turn off for instant zero-motion tab switches on low battery
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={prefs.smoothTransitionsEnabled}
              onChange={(e) => handleUpdate({ smoothTransitionsEnabled: e.target.checked })}
              color="primary"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 2, sm: 2.5 },
          pt: 1.5,
          pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', sm: 2 },
        }}
      >
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={() => {
            SoundEffects.play('tap');
            onClose();
          }}
          sx={{ py: 1.2, fontWeight: 800, borderRadius: 2.5 }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};
