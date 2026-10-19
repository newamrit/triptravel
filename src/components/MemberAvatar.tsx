import React, { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ExploreIcon from '@mui/icons-material/Explore';
import TerrainIcon from '@mui/icons-material/Terrain';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import BackpackIcon from '@mui/icons-material/Backpack';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarsIcon from '@mui/icons-material/Stars';
import { Member } from '../types';
import { formatBase64Size } from '../utils/imageCompressor';
import { SoundEffects } from '../utils/soundEffects';

export interface AvatarPreset {
  id: string;
  label: string;
  bg: string;
  color: string;
  borderColor: string;
  renderIcon: (fontSize: number) => React.ReactNode;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'preset:leader-crown',
    label: 'Trip Captain',
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: '#ffffff',
    borderColor: '#34d399',
    renderIcon: (sz) => <WorkspacePremiumIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:4wd-driver',
    label: '4WD Offroader',
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    color: '#ffffff',
    borderColor: '#38bdf8',
    renderIcon: (sz) => <DirectionsCarFilledIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:camera-drone',
    label: 'Photographer',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#ffffff',
    borderColor: '#a78bfa',
    renderIcon: (sz) => <PhotoCameraIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:compass-nav',
    label: 'Navigator',
    bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    color: '#ffffff',
    borderColor: '#fbbf24',
    renderIcon: (sz) => <ExploreIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:mountain-hiker',
    label: 'Summit Trekker',
    bg: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
    color: '#ffffff',
    borderColor: '#2dd4bf',
    renderIcon: (sz) => <TerrainIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:campfire-cook',
    label: 'Camp Foodie',
    bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    color: '#ffffff',
    borderColor: '#fb923c',
    renderIcon: (sz) => <RestaurantIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:moto-rider',
    label: 'Moto Rider',
    bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    color: '#ffffff',
    borderColor: '#fb7185',
    renderIcon: (sz) => <TwoWheelerIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:guitar-vibes',
    label: 'Music & Vibes',
    bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    color: '#ffffff',
    borderColor: '#818cf8',
    renderIcon: (sz) => <MusicNoteIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:first-aid',
    label: 'Medic & Safety',
    bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: '#ffffff',
    borderColor: '#f87171',
    renderIcon: (sz) => <MedicalServicesIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:coffee-tea',
    label: 'Chai & Coffee',
    bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    color: '#ffffff',
    borderColor: '#c084fc',
    renderIcon: (sz) => <LocalCafeIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:sunglasses',
    label: 'Day Cruiser',
    bg: 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
    color: '#ffffff',
    borderColor: '#facc15',
    renderIcon: (sz) => <WbSunnyIcon sx={{ fontSize: sz }} />,
  },
  {
    id: 'preset:backpacker',
    label: 'Gear Crew',
    bg: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    color: '#ffffff',
    borderColor: '#94a3b8',
    renderIcon: (sz) => <BackpackIcon sx={{ fontSize: sz }} />,
  },
];

export const DEFAULT_SEED_AVATARS: Record<number, string> = {
  1: 'preset:leader-crown',
  2: 'preset:4wd-driver',
  3: 'preset:camera-drone',
  4: 'preset:compass-nav',
  5: 'preset:mountain-hiker',
};

const INITIALS_PALETTE = [
  { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
];

export function getMemberInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'FR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function resolveMemberObject(
  members: Member[],
  memberId?: number | null,
  memberName?: string | null
): Member | undefined {
  if (memberId) {
    const byId = members.find((m) => Number(m.id) === Number(memberId));
    if (byId) return byId;
  }
  if (memberName) {
    const clean = memberName.trim().toLowerCase();
    const byExact = members.find((m) => m.name.trim().toLowerCase() === clean);
    if (byExact) return byExact;
    // Also check if settlement label is "Leader (Name) / Pool"
    const matchInParens = memberName.match(/\(([^)]+)\)/);
    if (matchInParens && matchInParens[1]) {
      const inner = matchInParens[1].trim().toLowerCase();
      const byInner = members.find((m) => m.name.trim().toLowerCase() === inner);
      if (byInner) return byInner;
    }
    const byFirstWord = members.find(
      (m) => m.name.trim().split(/\s+/)[0].toLowerCase() === clean.split(/\s+/)[0]
    );
    if (byFirstWord) return byFirstWord;
  }
  return undefined;
}

/**
 * Center-crops and compresses an uploaded image file to a crisp 240x240 square JPEG data URL
 */
export function compressAvatarImage(fileOrBlob: Blob, size = 240, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Fill clean background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, size, size);

        // Center crop square from source image
        const minSide = Math.min(img.width, img.height);
        const sx = Math.max(0, (img.width - minSide) / 2);
        const sy = Math.max(0, (img.height - minSide) / 2);

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(fileOrBlob);
  });
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<
  AvatarSize,
  { box: number; icon: number; font: string; radius: string; badge: number }
> = {
  xs: { box: 22, icon: 13, font: '0.6rem', radius: '7px', badge: 10 },
  sm: { box: 30, icon: 17, font: '0.7rem', radius: '9px', badge: 13 },
  md: { box: 38, icon: 21, font: '0.8rem', radius: '11px', badge: 15 },
  lg: { box: 46, icon: 25, font: '0.92rem', radius: '13px', badge: 17 },
  xl: { box: 62, icon: 32, font: '1.15rem', radius: '16px', badge: 20 },
};

interface MemberAvatarProps {
  member?: Partial<Member> | null;
  name?: string | null;
  avatar?: string | null;
  isLeader?: boolean;
  size?: AvatarSize;
  showLeaderBadge?: boolean;
  onClick?: () => void;
  tooltip?: string;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  name,
  avatar,
  isLeader,
  size = 'md',
  showLeaderBadge = false,
  onClick,
  tooltip,
}) => {
  const resolvedName = member?.name || name || 'Friend';
  const resolvedLeader = Boolean(member?.is_leader ?? isLeader);
  const memberId = member?.id ? Number(member.id) : 0;

  // Use explicit avatar if set; if undefined (not explicitly cleared to ''), fall back to seed preset for default members
  const rawAvatar =
    avatar !== undefined
      ? avatar
      : member?.avatar !== undefined
      ? member.avatar
      : memberId && DEFAULT_SEED_AVATARS[memberId]
      ? DEFAULT_SEED_AVATARS[memberId]
      : null;

  const dim = SIZE_MAP[size];
  const isImageAvatar = Boolean(
    rawAvatar && (rawAvatar.startsWith('data:image/') || rawAvatar.startsWith('http'))
  );
  const presetObj =
    rawAvatar && rawAvatar.startsWith('preset:')
      ? AVATAR_PRESETS.find((p) => p.id === rawAvatar)
      : null;

  // Deterministic palette index for initials fallback
  const hash = resolvedName
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), memberId || 0);
  const palette = INITIALS_PALETTE[hash % INITIALS_PALETTE.length];

  const avatarBox = (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        width: dim.box,
        height: dim.box,
        borderRadius: dim.radius,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...(onClick
          ? {
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 10px rgba(15, 23, 42, 0.14)',
              },
            }
          : {}),
      }}
    >
      {/* Inner clipped frame */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: dim.radius,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isImageAvatar
            ? '#f1f5f9'
            : presetObj
            ? presetObj.bg
            : palette.bg,
          color: presetObj ? presetObj.color : palette.color,
          border: '1.5px solid',
          borderColor: resolvedLeader
            ? '#10b981'
            : isImageAvatar
            ? '#cbd5e1'
            : presetObj
            ? presetObj.borderColor
            : palette.border,
          boxShadow: '0 2px 5px rgba(15, 23, 42, 0.08)',
        }}
      >
        {isImageAvatar && rawAvatar ? (
          <Box
            component="img"
            src={rawAvatar}
            alt={resolvedName}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : presetObj ? (
          presetObj.renderIcon(dim.icon)
        ) : (
          <Typography
            component="span"
            sx={{
              fontWeight: 900,
              fontSize: dim.font,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {getMemberInitials(resolvedName)}
          </Typography>
        )}
      </Box>

      {/* Optional Leader Corner Star Badge */}
      {showLeaderBadge && resolvedLeader && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            width: dim.badge,
            height: dim.badge,
            borderRadius: '50%',
            bgcolor: '#059669',
            color: '#ffffff',
            border: '1.5px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <StarsIcon sx={{ fontSize: Math.max(8, dim.badge - 4) }} />
        </Box>
      )}
    </Box>
  );

  if (tooltip) {
    return <Tooltip title={tooltip}>{avatarBox}</Tooltip>;
  }
  return avatarBox;
};

interface AvatarPickerFieldProps {
  value?: string | null;
  memberName?: string;
  isLeader?: boolean;
  onChange: (newAvatar: string | null) => void;
  compact?: boolean;
}

export const AvatarPickerField: React.FC<AvatarPickerFieldProps> = ({
  value,
  memberName = 'Friend',
  isLeader = false,
  onChange,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isCustomPhoto = Boolean(value && value.startsWith('data:image/'));
  const selectedPreset = value && value.startsWith('preset:')
    ? AVATAR_PRESETS.find((p) => p.id === value)
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const compressedDataUrl = await compressAvatarImage(file, 240, 0.84);
      SoundEffects.play('tap');
      onChange(compressedDataUrl);
    } catch {
      setUploadError('Could not process photo. Please try another image.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: 3,
        bgcolor: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Hidden File Inputs for Gallery & Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Top Row: Live Avatar Preview + Upload / Reset Actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.35, minWidth: 0 }}>
          <MemberAvatar
            name={memberName || 'Friend'}
            avatar={value || ''}
            isLeader={isLeader}
            size={compact ? 'md' : 'lg'}
            showLeaderBadge
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
              Profile Avatar Icon
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
              {isCustomPhoto
                ? `Custom Uploaded Photo (${formatBase64Size(value || '')})`
                : selectedPreset
                ? `Preset: ${selectedPreset.label}`
                : 'Auto Initials Badge (Select an icon or upload photo)'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Button
            type="button"
            size="small"
            variant="outlined"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            startIcon={
              isUploading ? (
                <CircularProgress size={13} color="inherit" />
              ) : (
                <AddPhotoAlternateIcon sx={{ fontSize: '15px !important' }} />
              )
            }
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: 2,
              minHeight: 34,
              px: 1.25,
              borderColor: '#cbd5e1',
              color: '#0f172a',
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
            }}
          >
            Upload Photo
          </Button>

          <Button
            type="button"
            size="small"
            variant="outlined"
            disabled={isUploading}
            onClick={() => cameraInputRef.current?.click()}
            startIcon={<CameraAltIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: 2,
              minHeight: 34,
              px: 1.15,
              borderColor: '#cbd5e1',
              color: '#0284c7',
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f0f9ff', borderColor: '#38bdf8' },
            }}
          >
            Camera
          </Button>

          {value && (
            <Tooltip title="Reset to Initials">
              <Button
                type="button"
                size="small"
                onClick={() => {
                  SoundEffects.play('tap');
                  onChange('');
                }}
                startIcon={<RestartAltIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: 2,
                  minHeight: 34,
                  px: 1,
                  color: '#64748b',
                }}
              >
                Initials
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      {uploadError && (
        <Typography variant="caption" sx={{ color: '#dc2626', display: 'block', mb: 1, fontWeight: 600 }}>
          {uploadError}
        </Typography>
      )}

      {/* Preset Icons Grid */}
      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.85, fontSize: '0.68rem' }}>
        Or Select a Trip Role Avatar Icon:
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(4, 1fr)',
            sm: compact ? 'repeat(6, 1fr)' : 'repeat(4, 1fr)',
          },
          gap: 0.85,
        }}
      >
        {AVATAR_PRESETS.map((preset) => {
          const isSelected = value === preset.id;
          return (
            <Box
              key={preset.id}
              onClick={() => {
                SoundEffects.play('tap');
                onChange(preset.id);
              }}
              sx={{
                position: 'relative',
                p: 0.85,
                borderRadius: 2.25,
                bgcolor: isSelected ? 'rgba(5, 150, 105, 0.08)' : '#ffffff',
                border: isSelected ? '1.5px solid #059669' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: isSelected ? '#059669' : '#94a3b8',
                  bgcolor: isSelected ? 'rgba(5, 150, 105, 0.12)' : '#f8fafc',
                },
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '9px',
                  background: preset.bg,
                  color: preset.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(15,23,42,0.1)',
                }}
              >
                {preset.renderIcon(17)}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? '#059669' : '#475569',
                  textAlign: 'center',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                {preset.label}
              </Typography>
              {isSelected && (
                <CheckCircleIcon
                  sx={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    fontSize: 13,
                    color: '#059669',
                    bgcolor: '#ffffff',
                    borderRadius: '50%',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
