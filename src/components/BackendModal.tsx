import React, { useState, useEffect } from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import StorageIcon from '@mui/icons-material/Storage';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import DnsIcon from '@mui/icons-material/Dns';
import CodeIcon from '@mui/icons-material/Code';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { AppConfig } from '../services/storage';
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
  initialTab?: 'sync' | 'debug' | 'cpanel';
}

export const BackendModal: React.FC<BackendModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  queuedItems,
  onTriggerSync,
  onResetData,
  isSyncing,
  initialTab = 'sync'
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'debug' | 'cpanel'>(initialTab);
  const [apiUrl, setApiUrl] = useState(config.backendApiUrl);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [diagData, setDiagData] = useState<any>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      runLiveDiagnostics();
    }
  }, [isOpen, initialTab]);

  const runLiveDiagnostics = async () => {
    setLoadingDiag(true);
    const data = await ApiSyncService.fetchDiagnostics();
    setDiagData(data);
    setLoadingDiag(false);
  };

  const handleSaveApiUrl = () => {
    onUpdateConfig({
      ...config,
      backendApiUrl: apiUrl.trim()
    });
    setConnectionStatus({ success: true, message: 'API URL saved! All operations will sync with this database endpoint.' });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    const res = await ApiSyncService.testConnection(apiUrl.trim());
    setTestingConnection(false);
    setConnectionStatus(res);
    if (res.diagnostics) {
      setDiagData(res.diagnostics);
    }
  };

  const handleOpenStandaloneDebugPhp = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      } catch {}
    }
    window.location.href = './debug.php?t=' + Date.now();
  };

  const isDbConnected = Boolean(
    diagData?.database?.connected ||
    diagData?.status === 'connected' ||
    diagData?.status === 'online'
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '24px 24px 0 0', sm: 4 },
            m: { xs: 0, sm: 2 },
            maxHeight: { xs: '90dvh', sm: '90vh' },
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
              MySQL Database & Diagnostic Center
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', wordBreak: 'break-word' }}>
              100% Database-Driven Roadtrip Sync & Live cPanel Debug
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748b', p: 1, shrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
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
          <Tab label={`Database Sync (${queuedItems.length})`} value="sync" />
          <Tab
            icon={<BugReportIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Live Debug (debug.php)"
            value="debug"
          />
          <Tab label="cPanel & Receipt Storage Info" value="cpanel" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {activeTab === 'sync' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Live DB Status Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: isDbConnected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                borderColor: isDbConnected ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isDbConnected ? (
                  <CheckCircleIcon sx={{ color: '#10b981' }} />
                ) : (
                  <WifiOffIcon sx={{ color: '#ef4444' }} />
                )}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDbConnected ? '#065f46' : '#991b1b' }}>
                    {isDbConnected
                      ? `Database Connected (${diagData?.database?.config?.database || diagData?.database || 'MySQL'})`
                      : 'Database Connection Needs Check'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: isDbConnected ? '#047857' : '#b91c1c', display: 'block' }}>
                    {isDbConnected
                      ? 'All members, deposits, expenses, and receipt photos save directly to the database.'
                      : 'Click "Live Debug (debug.php)" tab to inspect database credentials and file paths.'}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setActiveTab('debug')}
                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
              >
                View Diagnostics
              </Button>
            </Paper>

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
                    Mountain Offline Mode (Zero Signal Simulation)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#b45309', display: 'block', fontSize: '0.72rem' }}>
                    Keep this OFF when online so expenses save directly to MySQL. Turn ON only in zero-network zones.
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

            {/* Endpoint Configuration */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  Server API Base URL (Leave blank for automatic same-domain detection)
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setApiUrl('');
                    onUpdateConfig({ ...config, backendApiUrl: '' });
                  }}
                  sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}
                >
                  Auto-Detect Same Server
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="Leave empty for automatic same-domain /api detection"
                  slotProps={{ input: { sx: { borderRadius: 2.5, fontFamily: 'monospace', fontSize: '0.8rem' } } }}
                />
                <Button variant="contained" color="inherit" onClick={handleSaveApiUrl} sx={{ fontWeight: 700, bgcolor: '#0f172a', color: '#ffffff', shrink: 0 }}>
                  Save
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  startIcon={<RefreshIcon className={testingConnection ? 'animate-spin' : ''} fontSize="small" />}
                  sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Test MySQL Connection Now
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleOpenStandaloneDebugPhp}
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}
                >
                  Open /debug.php Page
                </Button>
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
                    Push Queue to Database Now
                  </Button>
                )}
              </Box>

              {queuedItems.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc', color: '#64748b', fontSize: '0.78rem' }}>
                  ✓ All transactions are saved directly in the database! Offline queue is empty.
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
                      <Chip label={item.status} size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            {/* Clear Local Cache */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #e2e8f0' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  Force Reload from Database
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Clears browser cache and pulls fresh records from MySQL
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
                Reload DB State
              </Button>
            </Box>
          </Box>
        )}

        {activeTab === 'debug' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Live Server & MySQL Diagnostic Report
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={runLiveDiagnostics}
                  disabled={loadingDiag}
                  startIcon={<RefreshIcon className={loadingDiag ? 'animate-spin' : ''} fontSize="small" />}
                  sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Refresh Check
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleOpenStandaloneDebugPhp}
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ fontSize: '0.75rem', fontWeight: 700, bgcolor: '#059669' }}
                >
                  Open /debug.php Directly
                </Button>
              </Box>
            </Box>

            {diagData ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#0f172a', color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.76rem' }}>
                <Box sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid #334155', color: isDbConnected ? '#34d399' : '#f87171', fontWeight: 800 }}>
                  {isDbConnected
                    ? `✓ CONNECTED TO DATABASE: ${diagData?.database?.config?.database || diagData?.database || 'MySQL'}`
                    : `✗ DATABASE CONNECTION ERROR: ${diagData?.database?.error || diagData?.error || 'Check api/db.php'}`}
                </Box>

                {diagData.filesystem && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>
                      1. SERVER DIRECTORY & PHP:
                    </Typography>
                    <div>Directory: {diagData.filesystem.dir}</div>
                    <div>PHP Version: {diagData.filesystem.php_version} | Server: {diagData.filesystem.server_software}</div>
                  </Box>
                )}

                {diagData.database?.tables && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      2. MYSQL TABLES & ROW COUNTS:
                    </Typography>
                    {Object.entries(diagData.database.tables).map(([tbl, info]: [string, any]) => (
                      <div key={tbl} style={{ color: info.exists ? '#e2e8f0' : '#f87171' }}>
                        • {tbl}: {info.exists ? `✓ Active (${info.count} rows)` : `✗ Missing (${info.error})`}
                      </div>
                    ))}
                  </Box>
                )}

                {diagData.stats && !diagData.database?.tables && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      2. LIVE DATABASE COUNTS:
                    </Typography>
                    <div>• members: {diagData.stats.members} rows</div>
                    <div>• expenses: {diagData.stats.expenses} rows</div>
                    <div>• deposits: {diagData.stats.deposits} rows</div>
                    <div>• receipt photos in DB: {diagData.stats.receipts ?? 0} stored</div>
                  </Box>
                )}

                {diagData.files && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      3. REQUIRED API FILES IN CURRENT LOCATION:
                    </Typography>
                    {Object.entries(diagData.files).map(([file, info]: [string, any]) => (
                      <div key={file} style={{ color: info.exists ? '#34d399' : '#f87171' }}>
                        • {file}: {info.exists ? `✓ Found (${info.size} bytes)` : '✗ Missing'}
                      </div>
                    ))}
                  </Box>
                )}
              </Paper>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
                Could not load JSON diagnostics from server. Click "Open /debug.php Directly" above to verify PHP file placement.
              </Alert>
            )}
          </Box>
        )}

        {activeTab === 'cpanel' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <PhotoCameraIcon fontSize="small" />
                <span>Where Are Receipt Photos Stored?</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#047857', lineHeight: 1.6, display: 'block' }}>
                When you take a photo of a bill or receipt on the road, the app automatically compresses the image and stores it as a Base64 data URL directly inside the <strong><code>receipt_image</code> (LONGTEXT) column of the <code>expenses</code> table</strong> in your MySQL database. Every device logged into your trip can view the receipt photo immediately with zero external file permission issues!
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <DnsIcon fontSize="small" />
                <span>Step 1: Run npm run build & Upload dist/</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                Run <code>npm run build</code> locally, then upload all files inside <strong><code>dist/</code></strong> (including <code>.htaccess</code>, <code>debug.php</code>, and the <code>api/</code> folder) to your cPanel <code>public_html/</code> directory.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CodeIcon fontSize="small" />
                <span>Step 2: Enter MySQL Credentials in api/db.php</span>
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                Edit <code>public_html/api/db.php</code> in cPanel File Manager and set <code>$db_host</code>, <code>$db_name</code>, <code>$db_user</code>, and <code>$db_pass</code>. Note: <code>api/db.php</code> automatically creates all 7 MySQL tables on first connection if they do not exist yet!
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
