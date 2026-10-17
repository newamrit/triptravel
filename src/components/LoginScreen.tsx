import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LoginIcon from '@mui/icons-material/Login';
import { AuthService } from '../services/authService';
import { AuthSession } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await AuthService.login(email, password);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMessage(res.error || 'Failed to authenticate.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#090d16',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(5, 150, 105, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.18) 0px, transparent 50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Brand Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 3.5,
              bgcolor: '#059669',
              color: '#ffffff',
              boxShadow: '0 8px 24px -4px rgba(5, 150, 105, 0.5)',
              mb: 1.5,
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
            TripPool Nepal
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, fontSize: '0.85rem' }}>
            Live Shared Travel Expenses & Pool Settlement
          </Typography>

          {/* Security Chip */}
          <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'center' }}>
            <Chip
              icon={<SecurityIcon sx={{ fontSize: '14px !important', color: '#34d399 !important' }} />}
              label="PBKDF2-SHA256 Encrypted (100k Iterations)"
              size="small"
              sx={{
                bgcolor: 'rgba(5, 150, 105, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                fontWeight: 700,
                fontSize: '0.68rem',
                height: 24,
              }}
            />
          </Box>
        </Box>

        {/* Main Sign In Card */}
        <Card
          sx={{
            borderRadius: 4,
            bgcolor: '#0f172a',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
            color: '#ffffff',
            overflow: 'hidden',
          }}
        >
          {/* Card Title */}
          <Box sx={{ p: { xs: 2.5, sm: 3 }, pb: 2, borderBottom: '1px solid rgba(51, 65, 85, 0.6)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LoginIcon sx={{ color: '#34d399', fontSize: 22 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.1rem' }}>
                Sign In
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
              Enter your email and encrypted password to access trip funds
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.8rem' }}>
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Email Field */}
                <TextField
                  label="Email Address"
                  type="email"
                  fullWidth
                  size="small"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2.5,
                        bgcolor: '#1e293b',
                        color: '#ffffff',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      },
                    },
                    inputLabel: { sx: { color: '#94a3b8' } },
                  }}
                />

                {/* Password Field */}
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  size="small"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#94a3b8', fontSize: 19 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: '#94a3b8' }}
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2.5,
                        bgcolor: '#1e293b',
                        color: '#ffffff',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      },
                    },
                    inputLabel: { sx: { color: '#94a3b8' } },
                  }}
                />

                {/* Submit Action */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                  sx={{
                    mt: 1,
                    py: 1.25,
                    borderRadius: 2.5,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    bgcolor: '#059669',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  {isLoading ? 'Verifying Credentials...' : 'Sign In to TripPool'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
            <DirectionsCarIcon sx={{ fontSize: 15 }} />
            Nepal Roadtrip & Overland Float Fund Manager
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
