import React from 'react';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScaleIcon from '@mui/icons-material/Scale';
import GroupIcon from '@mui/icons-material/Group';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenExpenseModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenExpenseModal
}) => {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      {/* Floating Action Button (FAB) for quick receipt logging on the road */}
      <Tooltip title="Quick Log Expense" placement="left">
        <Fab
          color="primary"
          aria-label="add expense"
          onClick={onOpenExpenseModal}
          sx={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
            right: 16,
            zIndex: (theme) => theme.zIndex.appBar - 1,
            width: 52,
            height: 52,
            bgcolor: '#059669',
            boxShadow: '0 8px 24px -4px rgba(5, 150, 105, 0.55)',
            '&:hover': {
              bgcolor: '#047857',
            },
            '&:active': {
              transform: 'scale(0.92)',
            },
            transition: 'all 0.15s ease-in-out',
          }}
        >
          <AddIcon sx={{ fontSize: 26 }} />
        </Fab>
      </Tooltip>

      {/* Fixed Bottom Tab Bar with iOS/Android safe area support */}
      <Paper
        elevation={10}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderTop: '1px solid rgba(226, 232, 240, 0.9)',
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
          }}
          sx={{
            height: 60,
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '4px 0',
              color: '#64748b',
              transition: 'all 0.15s ease-in-out',
              '&.Mui-selected': {
                color: '#059669',
                fontWeight: 700,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              mt: 0.25,
              '&.Mui-selected': {
                fontSize: '0.7rem',
                fontWeight: 800,
              },
            },
          }}
        >
          <BottomNavigationAction
            label="Pool"
            value="dashboard"
            icon={<AccountBalanceWalletIcon sx={{ fontSize: 21 }} />}
          />
          <BottomNavigationAction
            label="Expenses"
            value="expenses"
            icon={<ReceiptLongIcon sx={{ fontSize: 21 }} />}
          />
          <BottomNavigationAction
            label="Deposits"
            value="deposits"
            icon={<PaymentsIcon sx={{ fontSize: 21 }} />}
          />
          <BottomNavigationAction
            label="Settle"
            value="settlement"
            icon={<ScaleIcon sx={{ fontSize: 21 }} />}
          />
          <BottomNavigationAction
            label="Members"
            value="members"
            icon={<GroupIcon sx={{ fontSize: 21 }} />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

