import React from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScaleIcon from '@mui/icons-material/Scale';
import GroupIcon from '@mui/icons-material/Group';
import { SoundEffects } from '../utils/soundEffects';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenExpenseModal: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Pool', icon: AccountBalanceWalletIcon },
  { id: 'expenses', label: 'Expenses', icon: ReceiptLongIcon },
  { id: 'deposits', label: 'Deposits', icon: PaymentsIcon },
  { id: 'settlement', label: 'Settle', icon: ScaleIcon },
  { id: 'members', label: 'Members', icon: GroupIcon },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenExpenseModal
}) => {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      {/* Floating Action Button (FAB) for quick 1-tap receipt logging on the road */}
      <Tooltip title="Quick Log Expense" placement="left">
        <Fab
          color="primary"
          aria-label="Log Expense"
          onClick={() => {
            SoundEffects.play('tap');
            onOpenExpenseModal();
          }}
          sx={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
            right: 16,
            zIndex: (theme) => theme.zIndex.appBar - 1,
            width: 52,
            height: 52,
            bgcolor: '#059669',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 10px 25px -4px rgba(5, 150, 105, 0.55), 0 4px 10px -2px rgba(15, 23, 42, 0.2)',
            '&:hover': {
              bgcolor: '#047857',
            },
            '&:active': {
              transform: 'scale(0.92)',
            },
            transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease',
          }}
        >
          <AddIcon sx={{ fontSize: 26 }} />
        </Fab>
      </Tooltip>

      {/* Fixed Glassmorphic Mobile Bottom Navigation Dock */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderTop: '1px solid rgba(226, 232, 240, 0.9)',
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.06)',
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Box
          component="nav"
          aria-label="Mobile Bottom Navigation"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            alignItems: 'center',
            height: 64,
            px: 0.75,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <ButtonBase
                key={item.id}
                onClick={() => {
                  SoundEffects.play('tap');
                  setActiveTab(item.id);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 54,
                  borderRadius: 3,
                  color: isSelected ? '#059669' : '#64748b',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:active': {
                    transform: 'scale(0.94)',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 28,
                    borderRadius: '14px',
                    bgcolor: isSelected ? 'rgba(5, 150, 105, 0.12)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <IconComponent sx={{ fontSize: 21 }} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#0f172a' : '#64748b',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                    mt: 0.35,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};
