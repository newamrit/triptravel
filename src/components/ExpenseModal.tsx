import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BalanceIcon from '@mui/icons-material/Balance';
import { Member, Expense, ExpenseCategory, PayerType, SplitType, ExpenseSplit } from '../types';
import { compressReceiptImage, formatBase64Size } from '../utils/imageCompressor';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import { SoundEffects } from '../utils/soundEffects';
import { MemberAvatar } from './MemberAvatar';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currency: string;
  editingExpense?: Expense | null;
  onSaveExpense: (expenseData: {
    id?: number;
    amount: number;
    category: ExpenseCategory;
    payer_type: PayerType;
    payer_member_id: number | null;
    description: string;
    split_type: SplitType;
    split_members: number[];
    custom_splits?: ExpenseSplit[];
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

function toDatetimeLocalValue(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().substring(0, 16);
  }
  const normalized = dateStr.replace(' ', 'T');
  if (normalized.length >= 16) {
    return normalized.substring(0, 16);
  }
  return new Date().toISOString().substring(0, 16);
}

/**
 * Reconciles rounded split amounts so the sum matches targetTotal to the exact 0.01
 */
function reconcileSplitRounding(splits: ExpenseSplit[], targetTotal: number): ExpenseSplit[] {
  if (splits.length === 0) return [];
  const rounded = splits.map((s) => ({
    ...s,
    split_amount: Math.round((Number(s.split_amount) || 0) * 100) / 100,
  }));
  const currentSum = Math.round(rounded.reduce((acc, s) => acc + s.split_amount, 0) * 100) / 100;
  const diff = Math.round((targetTotal - currentSum) * 100) / 100;
  if (Math.abs(diff) >= 0.01 && Math.abs(diff) <= 0.15) {
    rounded[0] = {
      ...rounded[0],
      split_amount: Math.round((rounded[0].split_amount + diff) * 100) / 100,
    };
  }
  return rounded;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  members,
  currency,
  editingExpense,
  onSaveExpense
}) => {
  const activeMembers = useMemo(() => members.filter(m => m.is_active), [members]);

  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Snacks');
  const [payerType, setPayerType] = useState<PayerType>('pool');
  const [payerMemberId, setPayerMemberId] = useState<number | null>(activeMembers[0]?.id || null);
  const [description, setDescription] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    activeMembers.map(m => m.id)
  );
  // Exact amount map: memberId -> string input value
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  // Share multiplier map: memberId -> numeric share weight (e.g. 0, 0.5, 1, 2, 3)
  const [memberShares, setMemberShares] = useState<Record<number, number>>({});

  const [expenseDate, setExpenseDate] = useState<string>(() => toDatetimeLocalValue());

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

  const amount = Math.round((parseFloat(amountStr) || 0) * 100) / 100;

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraActive(false);
  };

  // Sync form state whenever modal opens or editingExpense / members change
  useEffect(() => {
    if (!isOpen) {
      stopLiveCamera();
      setCameraError(null);
      setIsLiveCameraActive(false);
      setIsPreviewModalOpen(false);
      return;
    }

    const defaultShares: Record<number, number> = {};
    const defaultExact: Record<number, string> = {};
    activeMembers.forEach((m) => {
      defaultShares[m.id] = 1;
      defaultExact[m.id] = '';
    });

    if (editingExpense) {
      const expAmt = Number(editingExpense.amount) || 0;
      setAmountStr(String(expAmt));
      setCategory(editingExpense.category);
      setPayerType(editingExpense.payer_type);
      setPayerMemberId(editingExpense.payer_member_id || activeMembers[0]?.id || null);
      setDescription(editingExpense.description);

      // Determine split mode from saved expense or infer if splits are unequal
      let resolvedSplitType: SplitType = editingExpense.split_type || 'equal';
      const existingSplits = editingExpense.splits || [];
      if (existingSplits.length > 0 && resolvedSplitType === 'custom') {
        const firstAmt = Number(existingSplits[0].split_amount) || 0;
        const hasUnequal = existingSplits.some((s) => Math.abs((Number(s.split_amount) || 0) - firstAmt) > 0.05);
        if (hasUnequal) {
          resolvedSplitType = 'exact';
        }
      }
      setSplitType(resolvedSplitType);

      const splitIds = existingSplits.map(s => Number(s.member_id));
      setSelectedMemberIds(splitIds.length > 0 ? splitIds : activeMembers.map(m => m.id));

      // Populate exact amounts from existing splits
      const populatedExact: Record<number, string> = { ...defaultExact };
      existingSplits.forEach((s) => {
        const mid = Number(s.member_id);
        const sAmt = Number(s.split_amount) || 0;
        populatedExact[mid] = sAmt > 0 ? String(sAmt) : '';
      });
      setExactAmounts(populatedExact);

      // Populate shares from existing splits (either stored shares or ratio relative to smallest positive split)
      const populatedShares: Record<number, number> = {};
      activeMembers.forEach((m) => {
        populatedShares[m.id] = 0;
      });
      const positiveSplits = existingSplits.filter((s) => (Number(s.split_amount) || 0) > 0);
      const minSplit = positiveSplits.length > 0
        ? Math.min(...positiveSplits.map((s) => Number(s.split_amount)))
        : 0;

      existingSplits.forEach((s) => {
        const mid = Number(s.member_id);
        if (s.shares !== undefined && s.shares > 0) {
          populatedShares[mid] = s.shares;
        } else if (minSplit > 0 && Number(s.split_amount) > 0) {
          const ratio = Math.round((Number(s.split_amount) / minSplit) * 2) / 2;
          populatedShares[mid] = Math.max(0.5, ratio);
        }
      });
      if (Object.values(populatedShares).every((v) => v === 0)) {
        activeMembers.forEach((m) => {
          populatedShares[m.id] = 1;
        });
      }
      setMemberShares(populatedShares);

      setExpenseDate(toDatetimeLocalValue(editingExpense.expense_date));
      setReceiptImage(editingExpense.receipt_image || null);
    } else {
      setAmountStr('');
      setCategory('Food & Snacks');
      setPayerType('pool');
      setPayerMemberId(activeMembers[0]?.id || null);
      setDescription('');
      setSplitType('equal');
      setSelectedMemberIds(activeMembers.map(m => m.id));
      setExactAmounts(defaultExact);
      setMemberShares(defaultShares);
      setExpenseDate(toDatetimeLocalValue());
      setReceiptImage(null);
    }
  }, [isOpen, editingExpense, activeMembers]);

  // Switch split mode handler with smart defaults
  const handleSwitchSplitType = (nextType: SplitType | null) => {
    if (!nextType) return;
    SoundEffects.play('tap');
    setSplitType(nextType);

    if (nextType === 'equal') {
      setSelectedMemberIds(activeMembers.map((m) => m.id));
    } else if (nextType === 'exact') {
      // If exact amounts are all blank and amount > 0, keep them blank or if switching from custom/shares prefill only if helpful
      const currentExactSum = Object.values(exactAmounts).reduce(
        (acc, val) => acc + (parseFloat(val) || 0),
        0
      );
      if (currentExactSum === 0 && amount > 0 && activeMembers.length > 0) {
        const targetIds = selectedMemberIds.length > 0 ? selectedMemberIds : activeMembers.map((m) => m.id);
        const equalPart = Math.floor((amount / targetIds.length) * 100) / 100;
        const nextExact: Record<number, string> = {};
        activeMembers.forEach((m) => {
          nextExact[m.id] = '';
        });
        targetIds.forEach((id, idx) => {
          if (idx === 0) {
            const rem = Math.round((amount - equalPart * (targetIds.length - 1)) * 100) / 100;
            nextExact[id] = String(rem);
          } else {
            nextExact[id] = String(equalPart);
          }
        });
        setExactAmounts(nextExact);
      }
    } else if (nextType === 'shares') {
      const totalSh = Object.values(memberShares).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalSh <= 0) {
        const reset: Record<number, number> = {};
        activeMembers.forEach((m) => {
          reset[m.id] = 1;
        });
        setMemberShares(reset);
      }
    }
  };

  // Calculations for Exact Mode
  const exactTotalAssigned = useMemo(() => {
    const sum = activeMembers.reduce((acc, m) => {
      const val = parseFloat(exactAmounts[m.id] || '0');
      return acc + (Number.isFinite(val) && val > 0 ? val : 0);
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [activeMembers, exactAmounts]);

  const exactRemaining = useMemo(() => {
    return Math.round((amount - exactTotalAssigned) * 100) / 100;
  }, [amount, exactTotalAssigned]);

  const isExactBalanced = useMemo(() => {
    return amount > 0 && Math.abs(exactRemaining) <= 0.02 && exactTotalAssigned > 0;
  }, [amount, exactRemaining, exactTotalAssigned]);

  // Calculations for Shares Mode
  const totalSharesWeight = useMemo(() => {
    return activeMembers.reduce((acc, m) => acc + (Number(memberShares[m.id]) || 0), 0);
  }, [activeMembers, memberShares]);

  const costPerUnitShare = useMemo(() => {
    if (amount <= 0 || totalSharesWeight <= 0) return 0;
    return Math.round((amount / totalSharesWeight) * 100) / 100;
  }, [amount, totalSharesWeight]);

  // Live computed splits array for all 4 modes
  const computedSplits: ExpenseSplit[] = useMemo(() => {
    if (activeMembers.length === 0 || amount <= 0) return [];

    if (splitType === 'equal') {
      const rawShare = amount / activeMembers.length;
      const rawSplits = activeMembers.map((m) => ({
        member_id: m.id,
        member_name: m.name,
        split_amount: rawShare,
      }));
      return reconcileSplitRounding(rawSplits, amount);
    }

    if (splitType === 'custom') {
      const chosen = activeMembers.filter((m) => selectedMemberIds.includes(m.id));
      const effective = chosen.length > 0 ? chosen : activeMembers;
      const rawShare = amount / effective.length;
      const rawSplits = effective.map((m) => ({
        member_id: m.id,
        member_name: m.name,
        split_amount: rawShare,
      }));
      return reconcileSplitRounding(rawSplits, amount);
    }

    if (splitType === 'exact') {
      const rawSplits: ExpenseSplit[] = [];
      activeMembers.forEach((m) => {
        const val = Math.round((parseFloat(exactAmounts[m.id] || '0') || 0) * 100) / 100;
        if (val > 0) {
          rawSplits.push({
            member_id: m.id,
            member_name: m.name,
            split_amount: val,
          });
        }
      });
      return rawSplits;
    }

    if (splitType === 'shares') {
      if (totalSharesWeight <= 0) return [];
      const rawSplits: ExpenseSplit[] = [];
      activeMembers.forEach((m) => {
        const sh = Number(memberShares[m.id]) || 0;
        if (sh > 0) {
          rawSplits.push({
            member_id: m.id,
            member_name: m.name,
            split_amount: (amount * sh) / totalSharesWeight,
            shares: sh,
          });
        }
      });
      return reconcileSplitRounding(rawSplits, amount);
    }

    return [];
  }, [activeMembers, amount, splitType, selectedMemberIds, exactAmounts, memberShares, totalSharesWeight]);

  // Helper actions for Exact Split Mode
  const handleDistributeRemainingEqually = () => {
    SoundEffects.play('tap');
    if (amount <= 0) return;

    // Find members with 0 / empty amount first; if none are empty, distribute difference across all active members
    const emptyMembers = activeMembers.filter((m) => !(parseFloat(exactAmounts[m.id] || '0') > 0));
    const targets = emptyMembers.length > 0 ? emptyMembers : activeMembers;
    if (targets.length === 0) return;

    const perTarget = Math.floor((exactRemaining / targets.length) * 100) / 100;
    const nextExact = { ...exactAmounts };

    targets.forEach((m, idx) => {
      const cur = parseFloat(nextExact[m.id] || '0') || 0;
      if (idx === 0) {
        const rem = Math.round((exactRemaining - perTarget * (targets.length - 1)) * 100) / 100;
        const updated = Math.max(0, Math.round((cur + rem) * 100) / 100);
        nextExact[m.id] = updated > 0 ? String(updated) : '';
      } else {
        const updated = Math.max(0, Math.round((cur + perTarget) * 100) / 100);
        nextExact[m.id] = updated > 0 ? String(updated) : '';
      }
    });

    setExactAmounts(nextExact);
  };

  const handleSetTotalFromExactSum = () => {
    SoundEffects.play('tap');
    if (exactTotalAssigned > 0) {
      setAmountStr(String(exactTotalAssigned));
    }
  };

  const handleClearExactAmounts = () => {
    SoundEffects.play('tap');
    const cleared: Record<number, string> = {};
    activeMembers.forEach((m) => {
      cleared[m.id] = '';
    });
    setExactAmounts(cleared);
  };

  // Helper actions for Shares Mode
  const handleAdjustMemberShare = (memberId: number, delta: number) => {
    SoundEffects.play('tap');
    setMemberShares((prev) => {
      const cur = Number(prev[memberId]) || 0;
      const next = Math.max(0, Math.round((cur + delta) * 2) / 2);
      return { ...prev, [memberId]: next };
    });
  };

  const handleSetMemberShare = (memberId: number, value: number) => {
    SoundEffects.play('tap');
    setMemberShares((prev) => ({
      ...prev,
      [memberId]: Math.max(0, value),
    }));
  };

  const handleResetAllShares = () => {
    SoundEffects.play('tap');
    const reset: Record<number, number> = {};
    activeMembers.forEach((m) => {
      reset[m.id] = 1;
    });
    setMemberShares(reset);
  };

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

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      setCameraError(err.message || 'Unable to open live camera viewfinder. Use the native camera button below.');
      setIsLiveCameraActive(false);
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
      SoundEffects.play('shutter');
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
      SoundEffects.play('shutter');
      setIsProcessingImage(true);
      const base64 = await compressReceiptImage(file, 1200, 0.82);
      setReceiptImage(base64);
      setCameraError(null);
    } catch (err: any) {
      console.error('Error processing receipt image:', err);
      setCameraError('Failed to process image. Please try again.');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const handleAddPreset = (val: number) => {
    SoundEffects.play('tap');
    const cur = parseFloat(amountStr) || 0;
    setAmountStr((cur + val).toString());
  };

  const handleToggleMember = (id: number) => {
    SoundEffects.play('tap');
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length === 1) return;
      setSelectedMemberIds(selectedMemberIds.filter(m => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSelectAll = () => {
    SoundEffects.play('tap');
    setSelectedMemberIds(activeMembers.map(m => m.id));
  };

  const canSubmit = useMemo(() => {
    if (amount <= 0 || !description.trim()) return false;
    if (splitType === 'exact') {
      return isExactBalanced && computedSplits.length > 0;
    }
    if (splitType === 'shares') {
      return totalSharesWeight > 0 && computedSplits.length > 0;
    }
    return computedSplits.length > 0;
  }, [amount, description, splitType, isExactBalanced, totalSharesWeight, computedSplits.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const cleanDateStr = expenseDate
      ? expenseDate.replace('T', ' ') + (expenseDate.length === 16 ? ':00' : '')
      : new Date().toISOString().replace('T', ' ').substring(0, 19);

    onSaveExpense({
      ...(editingExpense ? { id: editingExpense.id } : {}),
      amount,
      category,
      payer_type: payerType,
      payer_member_id: payerType === 'member' ? (payerMemberId || activeMembers[0]?.id || null) : null,
      description: description.trim(),
      split_type: splitType,
      split_members: computedSplits.map((s) => s.member_id),
      custom_splits: computedSplits,
      expense_date: cleanDateStr,
      receipt_image: receiptImage
    });

    stopLiveCamera();
    onClose();
  };

  const participantCount = splitType === 'equal' ? activeMembers.length : computedSplits.length;
  const equalPerPersonShare =
    amount > 0 && participantCount > 0 ? (amount / participantCount).toFixed(2) : '0.00';

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: handleSubmit,
            sx: {
              borderRadius: { xs: '24px 24px 0 0', sm: 4 },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: '92dvh', sm: '90vh' },
              width: { xs: '100%', sm: 'auto' },
              alignSelf: { xs: 'flex-end', sm: 'center' },
            },
          } as any,
        }}
      >
        {/* Mobile drag handle */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.25, pb: 0, flexShrink: 0 }}>
          <Box sx={{ width: 44, height: 4, borderRadius: 2, bgcolor: '#cbd5e1' }} />
        </Box>

        <DialogTitle sx={{ m: 0, p: { xs: 2, sm: 2.5 }, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
              {editingExpense ? 'Edit Expense Record' : 'Quick Expense Entry'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {editingExpense
                ? 'Update expense details and split weights directly in database'
                : 'Log equal, selective, exact-amount, or share-based expenses'}
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

        <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* 1. Large Amount Input */}
          <Box>
            <TextField
              fullWidth
              type="number"
              label={`Total Expense Amount (${currency})`}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              slotProps={{
                htmlInput: {
                  inputMode: 'decimal',
                  step: 'any',
                },
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
                  sx={{ flexShrink: 0, fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f1f5f9' }}
                />
              ))}
              <Button
                size="small"
                onClick={() => setAmountStr('')}
                sx={{ ml: 'auto', color: '#ef4444', minWidth: 'auto', fontSize: '0.75rem', flexShrink: 0 }}
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

          {/* 4. Paid By */}
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: payerType === 'member' ? 1.5 : 0 }}>
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
                  value={payerMemberId || activeMembers[0]?.id || ''}
                  label="Select Paying Friend"
                  onChange={(e) => setPayerMemberId(Number(e.target.value))}
                  sx={{ borderRadius: 2.5, bgcolor: '#ffffff' }}
                >
                  {activeMembers.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MemberAvatar member={m} size="xs" showLeaderBadge />
                        <span>{m.name} {m.is_leader ? '(Trip Leader)' : ''}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* 5. Split Distribution (Equal All | Select Friends | Exact Amount | By Shares) */}
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
                <BalanceIcon sx={{ color: '#059669', fontSize: 19 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                    How Should This Be Split?
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    {splitType === 'equal' && `Equal split across all ${activeMembers.length} active members`}
                    {splitType === 'custom' && `Equal split among ${selectedMemberIds.length} selected member(s)`}
                    {splitType === 'exact' && `Custom exact ${currency} amount for each member`}
                    {splitType === 'shares' && `Proportional split by share multipliers (1x, 2x, 0.5x)`}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 4-Way Split Mode Selector */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 0.75,
                p: 0.5,
                bgcolor: '#e2e8f0',
                borderRadius: 2.5,
              }}
            >
              {[
                { id: 'equal' as SplitType, label: 'Equal (All)', sub: `${activeMembers.length} friends` },
                { id: 'custom' as SplitType, label: 'Select Friends', sub: 'Pick who joined' },
                { id: 'exact' as SplitType, label: `Exact (${currency})`, sub: 'Unequal bills' },
                { id: 'shares' as SplitType, label: 'By Shares', sub: '1x, 2x, 0.5x' },
              ].map((tab) => {
                const active = splitType === tab.id;
                return (
                  <Box
                    key={tab.id}
                    component="button"
                    type="button"
                    onClick={() => handleSwitchSplitType(tab.id)}
                    sx={{
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      py: 0.85,
                      px: 1,
                      borderRadius: 2,
                      bgcolor: active ? '#0f172a' : 'transparent',
                      color: active ? '#ffffff' : '#334155',
                      boxShadow: active ? '0 2px 6px rgba(15, 23, 42, 0.2)' : 'none',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: active ? '#1e293b' : 'rgba(255,255,255,0.6)',
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.73rem',
                        display: 'block',
                        lineHeight: 1.2,
                        color: active ? '#34d399' : '#0f172a',
                      }}
                    >
                      {tab.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.62rem',
                        display: 'block',
                        color: active ? '#cbd5e1' : '#64748b',
                        mt: 0.15,
                      }}
                    >
                      {tab.sub}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* MODE A: Equal (All) Summary */}
            {splitType === 'equal' && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1.5,
                  pt: 1.25,
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Each member&apos;s equal share ({activeMembers.length} members):
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: 'monospace', color: '#059669' }}>
                  {currency} {equalPerPersonShare} / person
                </Typography>
              </Box>
            )}

            {/* MODE B: Select Friends (Equal among chosen subset) */}
            {splitType === 'custom' && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                    Select participating friends ({selectedMemberIds.length} of {activeMembers.length}):
                  </Typography>
                  <Button size="small" onClick={handleSelectAll} sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', fontWeight: 700 }}>
                    Select All
                  </Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 0.85 }}>
                  {activeMembers.map((m) => {
                    const isChecked = selectedMemberIds.includes(m.id);
                    const memberSplit = computedSplits.find((s) => s.member_id === m.id);
                    return (
                      <Button
                        key={m.id}
                        type="button"
                        variant="outlined"
                        onClick={() => handleToggleMember(m.id)}
                        sx={{
                          justifyContent: 'space-between',
                          textTransform: 'none',
                          py: 0.9,
                          px: 1.35,
                          borderRadius: 2.25,
                          borderColor: isChecked ? '#059669' : '#cbd5e1',
                          bgcolor: isChecked ? 'rgba(5, 150, 105, 0.08)' : '#ffffff',
                          color: isChecked ? '#0f172a' : '#64748b',
                          '&:hover': {
                            borderColor: '#059669',
                            bgcolor: isChecked ? 'rgba(5, 150, 105, 0.12)' : '#f8fafc',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                          <CheckIcon
                            sx={{
                              fontSize: 16,
                              color: isChecked ? '#059669' : 'transparent',
                              border: isChecked ? 'none' : '1.5px solid #cbd5e1',
                              borderRadius: '4px',
                              flexShrink: 0,
                            }}
                          />
                          <MemberAvatar member={m} size="xs" />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isChecked ? 700 : 500,
                              fontSize: '0.78rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.name}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: isChecked ? '#059669' : '#94a3b8',
                            ml: 1,
                            flexShrink: 0,
                          }}
                        >
                          {isChecked && memberSplit
                            ? `${currency} ${memberSplit.split_amount.toFixed(2)}`
                            : `${currency} 0.00`}
                        </Typography>
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* MODE C: Exact Amounts (Unequal Currency Amounts per Member) */}
            {splitType === 'exact' && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75 }}>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                    Enter exact {currency} amount for each member:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {amount > 0 && Math.abs(exactRemaining) > 0.02 && (
                      <Button
                        size="small"
                        type="button"
                        onClick={handleDistributeRemainingEqually}
                        startIcon={<AutoFixHighIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          py: 0.25,
                          px: 1,
                          minHeight: 26,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(5, 150, 105, 0.1)',
                          color: '#059669',
                          '&:hover': { bgcolor: 'rgba(5, 150, 105, 0.18)' },
                        }}
                      >
                        Split Remaining ({currency} {exactRemaining.toFixed(2)})
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="button"
                      onClick={handleClearExactAmounts}
                      sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', minWidth: 'auto', p: 0.25 }}
                    >
                      Clear All
                    </Button>
                  </Box>
                </Box>

                {/* Member Exact Input Rows */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
                  {activeMembers.map((m) => {
                    const rawVal = exactAmounts[m.id] ?? '';
                    const numVal = parseFloat(rawVal) || 0;
                    const pct = amount > 0 && numVal > 0 ? Math.round((numVal / amount) * 100) : 0;

                    return (
                      <Box
                        key={m.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1.25,
                          p: 1,
                          pl: 1.25,
                          borderRadius: 2.25,
                          bgcolor: '#ffffff',
                          border: '1px solid',
                          borderColor: numVal > 0 ? 'rgba(5, 150, 105, 0.45)' : '#e2e8f0',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, minWidth: 0, flex: 1 }}>
                          <MemberAvatar member={m} size="sm" />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: numVal > 0 ? 800 : 600,
                                fontSize: '0.8rem',
                                color: numVal > 0 ? '#0f172a' : '#64748b',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {m.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.66rem' }}>
                              {numVal > 0
                                ? `${pct}% of bill`
                                : 'Not included (0.00)'}
                            </Typography>
                          </Box>
                        </Box>

                        <TextField
                          type="number"
                          size="small"
                          placeholder="0.00"
                          value={rawVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExactAmounts((prev) => ({ ...prev, [m.id]: val }));
                          }}
                          sx={{ width: { xs: 135, sm: 155 }, flexShrink: 0 }}
                          slotProps={{
                            htmlInput: {
                              inputMode: 'decimal',
                              step: 'any',
                              min: 0,
                            },
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                    {currency}
                                  </Typography>
                                </InputAdornment>
                              ),
                              sx: {
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.86rem',
                                borderRadius: 2,
                                bgcolor: '#f8fafc',
                              },
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>

                {/* Live Reconciliation Bar for Exact Mode */}
                <Box
                  sx={{
                    p: 1.35,
                    borderRadius: 2.25,
                    bgcolor: isExactBalanced
                      ? 'rgba(16, 185, 129, 0.1)'
                      : exactRemaining < -0.02
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid',
                    borderColor: isExactBalanced
                      ? 'rgba(16, 185, 129, 0.35)'
                      : exactRemaining < -0.02
                      ? 'rgba(239, 68, 68, 0.35)'
                      : 'rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        color: isExactBalanced ? '#047857' : exactRemaining < -0.02 ? '#b91c1c' : '#b45309',
                        display: 'block',
                      }}
                    >
                      {isExactBalanced
                        ? `✓ Exact split matches total (${currency} ${amount.toLocaleString()})`
                        : amount <= 0 && exactTotalAssigned > 0
                        ? `Sum of member bills: ${currency} ${exactTotalAssigned.toLocaleString()}`
                        : exactRemaining > 0.02
                        ? `${currency} ${exactRemaining.toFixed(2)} remaining to assign`
                        : `Over-assigned by ${currency} ${Math.abs(exactRemaining).toFixed(2)}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.68rem' }}>
                      Assigned: <strong>{currency} {exactTotalAssigned.toFixed(2)}</strong> / Total Bill: <strong>{currency} {amount.toFixed(2)}</strong>
                    </Typography>
                  </Box>

                  {exactTotalAssigned > 0 && Math.abs(exactTotalAssigned - amount) > 0.02 && (
                    <Button
                      size="small"
                      type="button"
                      variant="contained"
                      onClick={handleSetTotalFromExactSum}
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        py: 0.4,
                        px: 1.25,
                        borderRadius: 1.75,
                        bgcolor: '#0f172a',
                        color: '#ffffff',
                        '&:hover': { bgcolor: '#1e293b' },
                      }}
                    >
                      Set Total = {currency} {exactTotalAssigned.toLocaleString()}
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* MODE D: By Shares / Multipliers (1x, 2x, 0.5x...) */}
            {splitType === 'shares' && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75 }}>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                    Assign share multipliers (e.g. 2x for couple/guest, 0.5x half, 0x skip):
                  </Typography>
                  <Button
                    size="small"
                    type="button"
                    onClick={handleResetAllShares}
                    sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', minWidth: 'auto', p: 0.25 }}
                  >
                    Reset All to 1x
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
                  {activeMembers.map((m) => {
                    const sh = Number(memberShares[m.id]) || 0;
                    const memberSplit = computedSplits.find((s) => s.member_id === m.id);
                    const calcAmt = memberSplit ? memberSplit.split_amount : 0;
                    const pct = totalSharesWeight > 0 && sh > 0 ? Math.round((sh / totalSharesWeight) * 100) : 0;

                    return (
                      <Box
                        key={m.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          p: 1,
                          pl: 1.25,
                          borderRadius: 2.25,
                          bgcolor: '#ffffff',
                          border: '1px solid',
                          borderColor: sh > 0 ? 'rgba(5, 150, 105, 0.4)' : '#e2e8f0',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, minWidth: 110, flex: 1 }}>
                          <MemberAvatar member={m} size="sm" />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: sh > 0 ? 800 : 500,
                                fontSize: '0.8rem',
                                color: sh > 0 ? '#0f172a' : '#94a3b8',
                              }}
                            >
                              {m.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                color: sh > 0 ? '#059669' : '#94a3b8',
                              }}
                            >
                              {sh > 0
                                ? `${currency} ${calcAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`
                                : 'Excluded (0 shares)'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Quick Share Preset Buttons + Stepper */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {[0, 0.5, 1, 2].map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              size="small"
                              onClick={() => handleSetMemberShare(m.id, preset)}
                              sx={{
                                minWidth: 32,
                                height: 28,
                                p: 0,
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                borderRadius: 1.5,
                                bgcolor: sh === preset ? '#0f172a' : '#f1f5f9',
                                color: sh === preset ? '#34d399' : '#475569',
                                display: { xs: preset === 0.5 ? 'none' : 'inline-flex', sm: 'inline-flex' },
                                '&:hover': {
                                  bgcolor: sh === preset ? '#1e293b' : '#e2e8f0',
                                },
                              }}
                            >
                              {preset}x
                            </Button>
                          ))}

                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              bgcolor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: 2,
                              ml: 0.25,
                            }}
                          >
                            <IconButton
                              size="small"
                              type="button"
                              onClick={() => handleAdjustMemberShare(m.id, -0.5)}
                              disabled={sh <= 0}
                              sx={{ p: 0.4, color: '#475569' }}
                            >
                              <RemoveIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                fontSize: '0.76rem',
                                px: 0.75,
                                minWidth: 34,
                                textAlign: 'center',
                                color: '#0f172a',
                              }}
                            >
                              {sh}x
                            </Typography>
                            <IconButton
                              size="small"
                              type="button"
                              onClick={() => handleAdjustMemberShare(m.id, 0.5)}
                              sx={{ p: 0.4, color: '#059669' }}
                            >
                              <AddIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {/* Shares Summary Footer */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pt: 1,
                    borderTop: '1px dashed #cbd5e1',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                    Total Pool Weight: <strong>{totalSharesWeight} {totalSharesWeight === 1 ? 'share' : 'shares'}</strong> ({computedSplits.length} {computedSplits.length === 1 ? 'member' : 'members'})
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                    1x Share = {currency} {costPerUnitShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* 6. Physical Receipt Photo & Camera Access */}
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
                    flexShrink: 0,
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
                    {formatBase64Size(receiptImage)} · Stored in Database as Base64 JPEG
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
                    Snap diesel receipts, hotel invoices, or food bills. Photos are compressed to ~100–200KB and saved directly into the MySQL database.
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

          {/* 7. Timestamp */}
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

        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1.5, pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, py: 1, px: 2 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!canSubmit}
            sx={{ flex: 1, py: 1.25, fontWeight: 800, borderRadius: 2.5 }}
          >
            {splitType === 'exact' && amount > 0 && !isExactBalanced
              ? `Balance Exact Split (${currency} ${Math.abs(exactRemaining).toFixed(2)} ${exactRemaining > 0 ? 'left' : 'over'})`
              : editingExpense
              ? `Save Changes (${currency} ${amount > 0 ? amount.toLocaleString() : '0'})`
              : `Record Expense (${currency} ${amount > 0 ? amount.toLocaleString() : '0'})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Preview Modal inside ExpenseModal */}
      <ReceiptViewerModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        imageUrl={receiptImage}
        title={description || 'Attached Receipt Photo'}
        subtitle={`${currency} ${amount > 0 ? amount.toLocaleString() : '0.00'} · ${category}`}
      />
    </>
  );
};
