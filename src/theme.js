import { createTheme, alpha } from '@mui/material/styles'
import { getSharedTheme } from './theme/sharedTheme.js'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

export const getTheme = (mode = 'dark', useShared = false) => {
  if (useShared) return getSharedTheme(mode)
  const theme = createTheme({
    palette: {
      mode: mode === 'dark' ? 'dark' : 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      error: { main: '#d32f2f' },
      info: { main: '#0288d1' },
      warning: { main: '#ed6c02' },
      success: { main: '#2e7d32' },
      background: {
        // Use solid backgrounds to avoid unintended translucency in menus/popovers
        default: mode === 'dark' ? '#11191f' : '#f5f5f5',
        paper: mode === 'dark' ? '#11191f' : '#ffffff',
      },
    },
    typography: {
      fontFamily: 'Inter, Arial, sans-serif',
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none' },
    },
    shape: { borderRadius: 8 },
    // Use MUI's default 25-level shadow scale to satisfy components (e.g., Paper elevation=8)
    // We can customize later with a full-length array if desired
    spacing: 8,
    components: {
      // Adopt key bits from MUI Dashboard template
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#121212' : '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.16),
              },
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: ({ theme }) => ({
            minWidth: 0,
            marginRight: theme.spacing(2.5),
            color: 'inherit',
          }),
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            width: 32,
            height: 32,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
      },
    },
  })

  // Note: spacing is 8 by default (8pt grid). Use theme.spacing(n).

  return theme
}

// Keep existing import sites working; default to dark mode
// Activate the shared (dashboard) theme by default
const theme = getTheme('dark', true)
export default theme
