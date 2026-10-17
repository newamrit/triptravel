import React, { useState, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HotelIcon from '@mui/icons-material/Hotel';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import BuildIcon from '@mui/icons-material/Build';
import CategoryIcon from '@mui/icons-material/Category';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplayIcon from '@mui/icons-material/Replay';
import { Member, ExpenseCategory, PayerType, SplitType } from '../types';
import { compressReceiptImage, formatBase64Size } from '../utils/imageCompressor';
import { ReceiptViewerModal } from './ReceiptViewerModal';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currency: string;
  onSaveExpense: (expenseData: {
    amount: number;
    category: ExpenseCategory;
    payer_type: PayerType;
    payer_member_id: number | null;
    description: string;
    split_type: SplitType;
    split_members: number[];
    expense_date: string;
    receipt_image?: string | null;
  }) => void;
}

const CATEGORIES: { label: ExpenseCategory; icon: React.ReactNode }[] = [
  { label: 'Food & Snacks', icon: <RestaurantIcon fontSize="small" /> },
  { label: 'Fuel', icon: <LocalGasStationIcon fontSize="small" /> },
  { label: 'Hotel/Homestay', icon: <HotelIcon fontSize="small" /> },
  { label: 'Permits/Entry', icon: <ConfirmationNumberIcon fontSize="small" /> },
  { label: 'Vehicle Maintenance/Spares', icon: <BuildIcon fontSize="small" /> },
  { label: 'Miscellaneous', icon: <CategoryIcon fontSize="small" /> },
];

const QUICK_DESCRIPTIONS = [
  'Lunch at Dhaba',
  'Fuel top-up',
  'Tea & morning snacks',
  'Homestay lodging',
  'Dinner & bonfire',
  'Entry tickets & permit',
  'Tire repair / wash'
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  members,
  currency,
  onSaveExpense
}) => {
  const activeMembers = members.filter(m => m.is_active);

  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Snacks');
  const [payerType, setPayerType] = useState<PayerType>('pool');
  const [payerMemberId, setPayerMemberId] = useState<number | null>(activeMembers[0]?.id || null);
  const [description, setDescription] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    activeMembers.map(m => m.id)
  );
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().substring(0, 16)
  );

  // Camera & Receipt Photo State
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement | null>(null);

  const amount = parseFloat(amountStr) || 0;
  const participantCount = splitType === 'equal' ? activeMembers.length : selectedMemberIds.length;
  const perPersonShare = amount > 0 && participantCount > 0 ? (amount / participantCount).toFixed(2) : '0.00';

  // Stop camera and cleanup when modal closes
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopLiveCamera();
      setReceiptImage(null);
      setCameraError(null);
      setIsLiveCameraActive(false);
    }
  }, [isOpen]);

  const startLiveCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Direct camera API not supported in this browser. Opening device camera picker instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsLiveCameraActive(true);

      // Attach stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      setCameraError(err.message || 'Unable to open live camera viewfinder. Use the native camera button below.');
      setIsLiveCameraActive(false);
      // Automatically fallback to device native camera trigger
      if (fileInputCameraRef.current) {
        fileInputCameraRef.current.click();
      }
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  const captureLivePhoto = async () => {
    if (!videoRef.current) return;
    try {
      setIsProcessingImage(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const base64 = await compressReceiptImage(blob, 1200, 0.82);
              setReceiptImage(base64);
            }
            setIsProcessingImage(false);
            stopLiveCamera();
          },
          'image/jpeg',
          0.85
        );
      }
    } catch (err) {
      console.error('Error capturing photo from live camera', err);
      setIsProcessingImage(false);
      stopLiveCamera();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const base64 = await compressReceiptImage(file, 1200, 0.82);
      setReceiptImage(base64);
      setCameraError(null);
    } catch (err: any) {
      console.error('Error processing receipt image:', err);
      setCameraError('Failed to process image. Please try again.');
    } finally {
      setIsProcessingImage(false);
      // Reset input value so taking another photo triggers onChange
      e.target.value = '';
    }
  };

  const handleAddPreset = (val: number) => {
    const cur = parseFloat(amountStr) || 0;
    setAmountStr((cur + val).toString());
  };

  const handleToggleMember = (id: number) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length === 1) return;
      setSelectedMemberIds(selectedMemberIds.filter(m => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedMemberIds(activeMembers.map(m => m.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    onSaveExpense({
      amount,
      category,
      payer_type: payerType,
      payer_member_id: payerType === 'member' ? payerMemberId : null,
      description: description.trim(),
      split_type: splitType,
      split_members: splitType === 'equal' ? activeMembers.map(m => m.id) : selectedMemberIds,
      expense_date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
      receipt_image: receiptImage
    });

    stopLiveCamera();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
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
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
            Quick Expense Entry
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Log on-the-road spendings immediately
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{ color: '#64748b', p: 1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 1. Large Amount Input */}
          <Box>
            <TextField
              fullWidth
              autoFocus
              type="number"
              label={`Amount (${currency})`}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontWeight: 800, color: '#059669', fontSize: '1.25rem' }}>
                        {currency}
                      </Typography>
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    borderRadius: 3,
                  },
                },
              }}
            />
            {/* Quick Amount Presets with touch scrolling */}
            <Box className="no-scrollbar" sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5, WebkitOverflowScrolling: 'touch' }}>
              {[100, 500, 1000, 2000, 5000].map((val) => (
                <Chip
                  key={val}
                  label={`+${val}`}
                  size="small"
                  onClick={() => handleAddPreset(val)}
                  clickable
                  sx={{ shrink: 0, fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f1f5f9' }}
                />
              ))}
              <Button
                size="small"
                onClick={() => setAmountStr('')}
                sx={{ ml: 'auto', color: '#ef4444', minWidth: 'auto', fontSize: '0.75rem', shrink: 0 }}
              >
                Clear
              </Button>
            </Box>
          </Box>

          {/* 2. Category Selector */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Category
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <Button
                    key={cat.label}
                    type="button"
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={isSelected ? 'primary' : 'inherit'}
                    startIcon={cat.icon}
                    onClick={() => setCategory(cat.label)}
                    sx={{
                      justifyContent: 'flex-start',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      py: 1,
                      px: 1.5,
                      borderRadius: 2.5,
                      borderColor: isSelected ? '#059669' : '#e2e8f0',
                      bgcolor: isSelected ? 'rgba(5, 150, 105, 0.1)' : '#ffffff',
                      color: isSelected ? '#059669' : '#334155',
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: isSelected ? 'rgba(5, 150, 105, 0.18)' : '#f8fafc',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.label}
                    </span>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* 3. Description / Note with quick chips */}
          <Box>
            <TextField
              fullWidth
              required
              label="Description / Location"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch at Kalikot Dhaba, Fuel at Kohalpur"
              size="small"
              slotProps={{ input: { sx: { borderRadius: 3 } } }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
              {QUICK_DESCRIPTIONS.map((desc) => (
                <Chip
                  key={desc}
                  label={desc}
                  size="small"
                  onClick={() => setDescription(desc)}
                  clickable
                  sx={{ fontSize: '0.68rem', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}
                />
              ))}
            </Box>
          </Box>

          {/* 4. Physical Receipt Photo & Camera Access */}
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoCameraIcon sx={{ color: '#059669', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Physical Receipt Photo
                </Typography>
              </Box>
              {receiptImage && (
                <Chip
                  label={formatBase64Size(receiptImage)}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(5, 150, 105, 0.05)' }}
                />
              )}
            </Box>

            {/* Hidden native camera and file inputs */}
            <input
              ref={fileInputCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <input
              ref={fileInputGalleryRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* View State A: Live Camera Active */}
            {isLiveCameraActive ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: { xs: 240, sm: 270 },
                    bgcolor: '#000000',
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Viewfinder Receipt Target Frame Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: { xs: 16, sm: 24 },
                      border: '2px dashed rgba(52, 211, 153, 0.8)',
                      borderRadius: 2,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      p: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#34d399',
                        bgcolor: 'rgba(0, 0, 0, 0.65)',
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                      }}
                    >
                      Align Receipt Slip Inside Box
                    </Typography>
                  </Box>

                  {/* Top Camera Controls */}
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={toggleFacingMode}
                      sx={{ bgcolor: 'rgba(0, 0, 0, 0.65)', color: '#ffffff', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' } }}
                      title="Switch Front/Rear Camera"
                    >
                      <CameraswitchIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={stopLiveCamera}
                      sx={{ bgcolor: 'rgba(0, 0, 0, 0.65)', color: '#ffffff', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' } }}
                      title="Close Camera"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Camera Shutter Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Button
                    size="small"
                    onClick={stopLiveCamera}
                    sx={{ color: '#64748b', fontSize: '0.75rem' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={captureLivePhoto}
                    disabled={isProcessingImage}
                    startIcon={isProcessingImage ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon />}
                    sx={{
                      bgcolor: '#059669',
                      '&:hover': { bgcolor: '#047857' },
                      borderRadius: 3,
                      px: 3,
                      py: 1,
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.45)',
                    }}
                  >
                    {isProcessingImage ? 'Saving...' : 'Snap Receipt Photo'}
                  </Button>
                </Box>
              </Box>
            ) : receiptImage ? (
              /* View State B: Receipt Captured & Ready */
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: '#ffffff',
                  p: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                }}
              >
                {/* Thumbnail Preview */}
                <Box
                  onClick={() => setIsPreviewModalOpen(true)}
                  sx={{
                    position: 'relative',
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '1px solid #cbd5e1',
                    shrink: 0,
                    bgcolor: '#0f172a',
                    '&:hover .overlay': { opacity: 1 },
                  }}
                >
                  <Box
                    component="img"
                    src={receiptImage}
                    alt="Receipt"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(15, 23, 42, 0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: '#ffffff',
                    }}
                  >
                    <VisibilityIcon sx={{ fontSize: 20 }} />
                  </Box>
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CheckIcon sx={{ color: '#10b981', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                      Receipt Attached
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                    {formatBase64Size(receiptImage)} · Stored as Base64 JPEG
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setIsPreviewModalOpen(true)}
                      startIcon={<VisibilityIcon fontSize="small" />}
                      sx={{ fontSize: '0.7rem', py: 0.25, px: 1, color: '#334155', borderColor: '#cbd5e1' }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => startLiveCamera()}
                      startIcon={<ReplayIcon fontSize="small" />}
                      sx={{ fontSize: '0.7rem', py: 0.25, px: 1, color: '#059669', borderColor: 'rgba(5, 150, 105, 0.4)' }}
                    >
                      Retake
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setReceiptImage(null)}
                      startIcon={<DeleteIcon fontSize="small" />}
                      sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              </Box>
            ) : (
              /* View State C: No Receipt Attached -> Buttons to Take or Upload Photo */
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => startLiveCamera()}
                    startIcon={<PhotoCameraIcon />}
                    sx={{
                      py: 1.1,
                      borderRadius: 2.5,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      bgcolor: '#059669',
                      '&:hover': { bgcolor: '#047857' },
                    }}
                  >
                    Take Receipt Photo
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => fileInputGalleryRef.current?.click()}
                    startIcon={<AddPhotoAlternateIcon />}
                    sx={{
                      py: 1.1,
                      borderRadius: 2.5,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      borderColor: '#cbd5e1',
                      color: '#334155',
                      bgcolor: '#ffffff',
                      '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                    }}
                  >
                    Upload from Gallery
                  </Button>
                </Box>

                {isProcessingImage ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <CircularProgress size={14} color="inherit" />
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Compressing receipt photo...</Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block', mt: 0.25 }}>
                    Snap diesel receipts, hotel invoices, or food bills. Photos are automatically compressed to ~100–200KB and stored offline with this transaction.
                  </Typography>
                )}

                {cameraError && (
                  <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                    {cameraError}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* 5. Paid By */}
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                Who Paid for This?
              </Typography>
              <ToggleButtonGroup
                size="small"
                value={payerType}
                exclusive
                onChange={(_, val) => val && setPayerType(val)}
                sx={{
                  bgcolor: '#ffffff',
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    py: 0.5,
                    px: 1.25,
                    '&.Mui-selected': {
                      bgcolor: '#059669',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#047857' },
                    },
                  },
                }}
              >
                <ToggleButton value="pool">Trip Pool</ToggleButton>
                <ToggleButton value="member">Friend Paid</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {payerType === 'member' && (
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel id="payer-member-label">Select Paying Friend</InputLabel>
                <Select
                  labelId="payer-member-label"
                  value={payerMemberId || ''}
                  label="Select Paying Friend"
                  onChange={(e) => setPayerMemberId(Number(e.target.value))}
                  sx={{ borderRadius: 2.5 }}
                >
                  {activeMembers.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name} {m.is_leader ? '(Trip Leader)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* 5. Split Distribution */}
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  Split Between Whom?
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {splitType === 'equal' ? `Equal split (${activeMembers.length} members)` : `Selective (${selectedMemberIds.length} members)`}
                </Typography>
              </Box>

              <ToggleButtonGroup
                size="small"
                value={splitType}
                exclusive
                onChange={(_, val) => {
                  if (val) {
                    setSplitType(val);
                    if (val === 'equal') setSelectedMemberIds(activeMembers.map(m => m.id));
                  }
                }}
                sx={{
                  bgcolor: '#ffffff',
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    py: 0.5,
                    px: 1.25,
                    '&.Mui-selected': {
                      bgcolor: '#059669',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#047857' },
                    },
                  },
                }}
              >
                <ToggleButton value="equal">All</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {splitType === 'custom' && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Select friends participating:</Typography>
                  <Button size="small" onClick={handleSelectAll} sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem' }}>
                    Select All
                  </Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  {activeMembers.map((m) => {
                    const isChecked = selectedMemberIds.includes(m.id);
                    return (
                      <Button
                        key={m.id}
                        type="button"
                        variant="outlined"
                        onClick={() => handleToggleMember(m.id)}
                        endIcon={isChecked ? <CheckIcon fontSize="small" sx={{ color: '#059669' }} /> : null}
                        sx={{
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          fontWeight: isChecked ? 700 : 500,
                          py: 0.75,
                          px: 1.25,
                          borderRadius: 2,
                          borderColor: isChecked ? '#059669' : '#e2e8f0',
                          bgcolor: isChecked ? 'rgba(5, 150, 105, 0.08)' : '#ffffff',
                          color: isChecked ? '#059669' : '#475569',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name}
                        </span>
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>Cost per person:</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                {currency} {perPersonShare}
              </Typography>
            </Box>
          </Box>

          {/* 6. Timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
            <TextField
              type="datetime-local"
              size="small"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '0.78rem', borderRadius: 2 } } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1.5, pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, py: 1, px: 2 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={amount <= 0 || !description.trim()}
            sx={{ flex: 1, py: 1.25, fontWeight: 800, borderRadius: 2.5 }}
          >
            Record Expense ({currency} {amount > 0 ? amount.toLocaleString() : '0'})
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
