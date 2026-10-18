import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles'

const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: {
      fontFamily: "'Cinzel', serif",
      fontWeight: 700,
      letterSpacing: '0.04em',
    },
    h2: {
      fontFamily: "'Cinzel', serif",
      fontWeight: 700,
      letterSpacing: '0.03em',
    },
    h3: {
      fontFamily: "'Cinzel', serif",
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    h4: {
      fontFamily: "'Cinzel', serif",
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
}

export function getAppTheme(mode: 'dark' | 'light') {
  const isDark = mode === 'dark'

  const theme = createTheme({
    ...baseThemeOptions,
    palette: {
      mode,
      primary: {
        main: '#d4af37', // Благородное золото ЧГК
        light: '#f5d97a',
        dark: '#aa8a26',
        contrastText: '#0a1410',
      },
      secondary: {
        main: '#10b981', // Изумруд
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0c1612' : '#f5f7f6',
        paper: isDark ? '#14221b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f5f3' : '#111827',
        secondary: isDark ? '#94a39d' : '#4b5563',
      },
      divider: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#1f382c #0c1612' : '#cbd5e1 #f8fafc',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: isDark ? '#233f32' : '#cbd5e1',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 18px',
            boxShadow: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: isDark
                ? '0 4px 14px 0 rgba(212, 175, 55, 0.25)'
                : '0 4px 12px 0 rgba(212, 175, 55, 0.2)',
            },
          },
          containedPrimary: {
            background: isDark
              ? 'linear-gradient(135deg, #d4af37 0%, #aa8a26 100%)'
              : 'linear-gradient(135deg, #d4af37 0%, #b8972b 100%)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: isDark
              ? '1px solid rgba(212, 175, 55, 0.15)'
              : '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: isDark
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              : '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: isDark
              ? '1px solid rgba(212, 175, 55, 0.2)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            backgroundColor: isDark ? 'rgba(12, 22, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
    },
  })

  return responsiveFontSizes(theme)
}
