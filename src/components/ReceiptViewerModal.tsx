import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null | undefined;
  title?: string;
  subtitle?: string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Receipt Photo',
  subtitle
}) => {
  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `receipt_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog
      open={Boolean(isOpen && imageUrl)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '20px 20px 0 0', sm: 3.5 },
            m: { xs: 0, sm: 2 },
            maxHeight: { xs: '90dvh', sm: '90vh' },
            width: { xs: '100%', sm: 'auto' },
            alignSelf: { xs: 'flex-end', sm: 'center' },
            bgcolor: '#0f172a',
            color: '#ffffff',
          },
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              bgcolor: 'rgba(5, 150, 105, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              shrink: 0,
            }}
          >
            <ReceiptLongIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem', wordBreak: 'break-word' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleDownload}
            startIcon={<DownloadIcon fontSize="small" />}
            sx={{
              color: '#34d399',
              borderColor: 'rgba(52, 211, 153, 0.4)',
              fontSize: '0.75rem',
              py: 0.5,
              px: 1.25,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Save Photo
          </Button>

          <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8', p: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Box
          sx={{
            width: '100%',
            maxHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            borderRadius: 2,
            bgcolor: '#020617',
            p: 1,
          }}
        >
          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt="Physical Receipt"
              sx={{
                maxWidth: '100%',
                maxHeight: '68vh',
                objectFit: 'contain',
                borderRadius: 1.5,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            />
          )}
        </Box>

        <Box sx={{ display: { xs: 'flex', sm: 'none' }, width: '100%', mt: 1.5, justifyContent: 'center' }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleDownload}
            startIcon={<DownloadIcon fontSize="small" />}
            sx={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)', py: 1 }}
          >
            Save Receipt Image
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
