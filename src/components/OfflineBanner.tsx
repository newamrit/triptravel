import React from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import LandscapeIcon from '@mui/icons-material/Landscape';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

interface OfflineBannerProps {
  isSimulatedOffline: boolean;
  queuedCount: number;
  onSyncNow: () => void;
  onToggleOffline: () => void;
  isSyncing: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isSimulatedOffline,
  queuedCount,
  onSyncNow,
  onToggleOffline,
  isSyncing
}) => {
  if (!isSimulatedOffline && queuedCount === 0) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Alert
        severity={isSimulatedOffline ? 'warning' : 'info'}
        icon={isSimulatedOffline ? <LandscapeIcon fontSize="small" /> : <CloudQueueIcon fontSize="small" />}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              color={isSimulatedOffline ? 'warning' : 'info'}
              onClick={onToggleOffline}
              startIcon={isSimulatedOffline ? <WifiOffIcon fontSize="inherit" /> : <LandscapeIcon fontSize="inherit" />}
              sx={{
                fontSize: '0.75rem',
                py: 0.25,
                px: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              {isSimulatedOffline ? 'Switch to Online' : 'Mountain Mode'}
            </Button>

            {!isSimulatedOffline && queuedCount > 0 && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={onSyncNow}
                disabled={isSyncing}
                startIcon={
                  isSyncing ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <SyncIcon fontSize="inherit" />
                  )
                }
                sx={{
                  fontSize: '0.75rem',
                  py: 0.25,
                  px: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2
                }}
              >
                {isSyncing ? 'Syncing...' : 'Sync to MySQL'}
              </Button>
            )}
          </Box>
        }
        sx={{
          py: 0.75,
          px: { xs: 1.5, sm: 3 },
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: isSimulatedOffline ? 'warning.light' : 'info.light',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1, sm: 0 },
          '& .MuiAlert-message': {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            p: 0,
          },
          '& .MuiAlert-action': {
            p: 0,
            mr: 0,
            pt: { xs: 0.5, sm: 0 },
            alignSelf: { xs: 'stretch', sm: 'center' },
          }
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
          {isSimulatedOffline ? (
            <span>
              <strong>Mountain Remote Mode Active:</strong> All transactions save instantly to offline IndexedDB/LocalStorage.
            </span>
          ) : (
            <span>
              <strong>Offline Queue:</strong> Transactions safely queued locally.
            </span>
          )}
        </Typography>

        {queuedCount > 0 && (
          <Chip
            label={`${queuedCount} ${queuedCount === 1 ? 'item queued' : 'items queued'}`}
            size="small"
            color={isSimulatedOffline ? 'warning' : 'info'}
            variant="filled"
            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
          />
        )}
      </Alert>
    </Box>
  );
};
