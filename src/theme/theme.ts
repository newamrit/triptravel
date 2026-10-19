import { createTheme } from '@mui/material/styles';

const DISPLAY_FONT = [
  '"Outfit"',
  '"Plus Jakarta Sans"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(',');

const BODY_FONT = [
  '"DM Sans"',
  '"Plus Jakarta Sans"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(',');

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#059669', // Emerald 600
      light: '#34d399',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0284c7', // Sky 600
      light: '#38bdf8',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#6ee7b7',
      dark: '#047857',
    },
    warning: {
      main: '#f59e0b',
      light: '#fcd34d',
      dark: '#b45309',
    },
    error: {
      main: '#ef4444',
      light: '#fca5a5',
      dark: '#b91c1c',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569', // Higher-contrast Slate 600 for crisp outdoor & mobile readability
    },
  },
  typography: {
    fontFamily: BODY_FONT,
    h3: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h4: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      letterSpacing: '-0.018em',
      lineHeight: 1.25,
    },
    h5: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.3,
    },
    h6: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      letterSpacing: '-0.012em',
      lineHeight: 1.35,
    },
    subtitle1: {
      fontFamily: BODY_FONT,
      fontWeight: 600,
      fontSize: '0.975rem',
      letterSpacing: '-0.005em',
      lineHeight: 1.45,
    },
    subtitle2: {
      fontFamily: BODY_FONT,
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0em',
      lineHeight: 1.45,
    },
    body1: {
      fontFamily: BODY_FONT,
      fontWeight: 400,
      fontSize: '0.95rem',
      letterSpacing: '0.005em',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: BODY_FONT,
      fontWeight: 400,
      fontSize: '0.875rem',
      letterSpacing: '0.005em',
      lineHeight: 1.55,
    },
    caption: {
      fontFamily: BODY_FONT,
      fontWeight: 500,
      fontSize: '0.78rem',
      letterSpacing: '0.01em',
      lineHeight: 1.5,
    },
    overline: {
      fontFamily: DISPLAY_FONT,
      fontWeight: 700,
      fontSize: '0.72rem',
      letterSpacing: '0.08em',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: BODY_FONT,
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.005em',
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          textRendering: 'optimizeLegibility',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: BODY_FONT,
          borderRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          boxShadow: 'none',
          letterSpacing: '0.005em',
          '&:hover': {
            boxShadow: '0 2px 8px -2px rgba(5, 150, 105, 0.25)',
          },
        },
        contained: {
          backgroundColor: '#059669',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#047857',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: BODY_FONT,
          fontSize: '0.925rem',
          lineHeight: 1.5,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: BODY_FONT,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        disableScrollLock: true,
      },
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiModal: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: BODY_FONT,
          fontWeight: 600,
          borderRadius: 8,
          letterSpacing: '0.005em',
        },
      },
    },
  },
});
