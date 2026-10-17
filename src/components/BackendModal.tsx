import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import StorageIcon from '@mui/icons-material/Storage';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DnsIcon from '@mui/icons-material/Dns';
import CodeIcon from '@mui/icons-material/Code';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { AppConfig, StorageService } from '../services/storage';
import { ApiSyncService } from '../services/apiSync';
import { SyncQueueItem } from '../types';

interface BackendModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  queuedItems: SyncQueueItem[];
  onTriggerSync: () => void;
  onResetData: () => void;
  isSyncing: boolean;
}

export const BackendModal: React.FC<BackendModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  queuedItems,
  onTriggerSync,
  onResetData,
  isSyncing
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'cpanel' | 'code'>('sync');
  const [apiUrl, setApiUrl] = useState(config.backendApiUrl);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<'schema' | 'db' | 'members' | 'deposits' | 'expenses' | 'settlement'>('schema');

  const handleSaveApiUrl = () => {
    onUpdateConfig({
      ...config,
      backendApiUrl: apiUrl.trim()
    });
    setConnectionStatus({ success: true, message: 'API URL saved! Queued items will sync to this endpoint.' });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    const res = await ApiSyncService.testConnection(apiUrl.trim());
    setTestingConnection(false);
    setConnectionStatus(res);
  };

  const handleCopyCode = async (codeSnippet: string, key: string) => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setCopiedScript(key);
      setTimeout(() => setCopiedScript(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '24px 24px 0 0', sm: 4 },
            m: { xs: 0, sm: 2 },
            position: { xs: 'fixed', sm: 'relative' },
            bottom: { xs: 0, sm: 'auto' },
            maxHeight: { xs: '94vh', sm: '90vh' },
            width: { xs: '100%', sm: 'auto' },
          },
        },
      }}
    >
      {/* Mobile drag handle */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0 }}>
        <Box sx={{ width: 44, height: 4, borderRadius: 2, bgcolor: '#cbd5e1' }} />
      </Box>

      <DialogTitle sx={{ m: 0, p: { xs: 2, sm: 2.5 }, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: '#0f172a',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              shrink: 0,
            }}
          >
            <StorageIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.1rem' }, wordBreak: 'break-word' }}>
              MySQL & PHP Backend Center
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', wordBreak: 'break-word' }}>
              Shared cPanel deployment & remote offline sync
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748b', p: 1, shrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Tabs with horizontal scroll on mobile */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1.5, sm: 2.5 }, bgcolor: '#f8fafc' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.78rem',
              px: { xs: 1.5, sm: 2 },
            },
          }}
        >
          <Tab label={`Sync (${queuedItems.length})`} value="sync" />
          <Tab label="cPanel Guide" value="cpanel" />
          <Tab label="PHP & SQL Scripts" value="code" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {activeTab === 'sync' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Mountain Mode Toggle */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'rgba(245, 158, 11, 0.05)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shrink: 0,
                  }}
                >
                  {config.isSimulatedOffline ? <WifiOffIcon fontSize="small" /> : <WifiIcon fontSize="small" />}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400e' }}>
                    Simulate Mountain Remote Mode
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#b45309', display: 'block', fontSize: '0.72rem' }}>
                    Simulates travelling with zero mobile reception. All receipts queue locally in storage.
                  </Typography>
                </Box>
              </Box>

              <Button
                variant={config.isSimulatedOffline ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  onUpdateConfig({
                    ...config,
                    isSimulatedOffline: !config.isSimulatedOffline,
                  });
                }}
                sx={{
                  bgcolor: config.isSimulatedOffline ? '#d97706' : '#ffffff',
                  '&:hover': { bgcolor: config.isSimulatedOffline ? '#b45309' : '#fef3c7' },
                  color: config.isSimulatedOffline ? '#ffffff' : '#92400e',
                  borderColor: '#d97706',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  shrink: 0,
                }}
              >
                {config.isSimulatedOffline ? 'Mode: Offline' : 'Mode: Online'}
              </Button>
            </Paper>

            {/* Zero Node.js Notice */}
            <Alert severity="success" variant="outlined" sx={{ borderRadius: 3, fontSize: '0.78rem' }}>
              <strong>100% Shared Hosting Compatible:</strong> React is pre-compiled into static HTML/CSS/JS. Your cPanel server only runs standard PHP scripts and MySQL. Zero Node.js required on the server!
            </Alert>

            {/* Endpoint Configuration */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  PHP REST API Endpoint URL
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setApiUrl('./api');
                    onUpdateConfig({ ...config, backendApiUrl: './api' });
                  }}
                  sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}
                >
                  Use Same Server (./api)
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="./api or https://yourdomain.com/api"
                  slotProps={{ input: { sx: { borderRadius: 2.5, fontFamily: 'monospace', fontSize: '0.8rem' } } }}
                />
                <Button variant="contained" color="inherit" onClick={handleSaveApiUrl} sx={{ fontWeight: 700, bgcolor: '#0f172a', color: '#ffffff', shrink: 0 }}>
                  Save URL
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !apiUrl}
                  startIcon={<RefreshIcon className={testingConnection ? 'animate-spin' : ''} fontSize="small" />}
                  sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  Test Connection
                </Button>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Pings settlement.php to verify PDO connection
                </Typography>
              </Box>

              {connectionStatus && (
                <Alert severity={connectionStatus.success ? 'success' : 'error'} sx={{ mt: 1, borderRadius: 2.5, fontSize: '0.78rem' }}>
                  {connectionStatus.message}
                </Alert>
              )}
            </Box>

            {/* Queued Items */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  Pending Offline Sync Queue ({queuedItems.length})
                </Typography>
                {queuedItems.length > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={onTriggerSync}
                    disabled={isSyncing || config.isSimulatedOffline}
                    startIcon={<RefreshIcon className={isSyncing ? 'animate-spin' : ''} fontSize="small" />}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  >
                    Sync Now
                  </Button>
                )}
              </Box>

              {queuedItems.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc', color: '#64748b', fontSize: '0.78rem' }}>
                  ✓ All transactions are up to date! Local queue is empty.
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 180, overflowY: 'auto' }}>
                  {queuedItems.map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', display: 'block' }}>
                          {item.type}: {item.payload.description || item.payload.name || `${item.payload.amount} deposit`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                          Queued at {new Date(item.createdAt).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Chip label={item.status} size="small" color="info" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            {/* Reset to Demo */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #e2e8f0' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  Reset Demo Scenario
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Restore default sample data for Rara Trip 2026
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => onResetData()}
                startIcon={<RestartAltIcon fontSize="small" />}
                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
              >
                Reset Demo
              </Button>
            </Box>
          </Box>
        )}

        {activeTab === 'cpanel' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <DnsIcon fontSize="small" />
                <span>Step 1: Create Database in cPanel</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                Open <strong>MySQL® Databases</strong> in cPanel. Create a database (e.g. <code>trippool_db</code>) and user with <strong>ALL PRIVILEGES</strong>.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <StorageIcon fontSize="small" />
                <span>Step 2: Import schema.sql into phpMyAdmin</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                Open <strong>phpMyAdmin</strong>, click the <strong>Import</strong> tab, and upload <code>schema.sql</code> to create all tables and initial indexes.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CodeIcon fontSize="small" />
                <span>Step 3: Upload cpanel_public_html/ folder</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                Upload the files inside <code>cpanel_public_html/</code> to your <code>public_html/</code> directory. Enter your database password in <code>api/db.php</code>.
              </Typography>
            </Paper>
          </Box>
        )}

        {activeTab === 'code' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
              {(['schema', 'db', 'members', 'deposits', 'expenses', 'settlement'] as const).map((key) => (
                <Chip
                  key={key}
                  label={key === 'schema' ? 'schema.sql' : `${key}.php`}
                  onClick={() => setSelectedScript(key)}
                  color={selectedScript === key ? 'primary' : 'default'}
                  clickable
                  sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem' }}
                />
              ))}
            </Box>

            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                bgcolor: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 3,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: 1.6,
              }}
            >
              <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 700, display: 'block', mb: 1 }}>
                // Ready for shared cPanel deployment (No Node.js needed):
              </Typography>
              {selectedScript === 'schema' && (
                <p>-- schema.sql (Located at root and /backend/schema.sql)<br />-- Contains tables: trips, members, deposits, expenses, expense_splits, foreign keys, and indexes.</p>
              )}
              {selectedScript === 'db' && (
                <p>// backend/db.php<br />// Handles PDO connection, UTF-8, CORS preflight, and JSON responders.</p>
              )}
              {selectedScript === 'members' && (
                <p>// backend/api/members.php<br />// GET / POST trip members with net balance summaries.</p>
              )}
              {selectedScript === 'deposits' && (
                <p>// backend/api/deposits.php<br />// GET / POST collection ledger (Cash, Fonepay, Bank Transfer).</p>
              )}
              {selectedScript === 'expenses' && (
                <p>// backend/api/expenses.php<br />// POST expense with transactional split distribution.</p>
              )}
              {selectedScript === 'settlement' && (
                <p>// backend/api/settlement.php<br />// Debt reconciliation engine and WhatsApp text exporter.</p>
              )}
            </Paper>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
