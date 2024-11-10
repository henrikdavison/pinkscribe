import { createTheme, alpha } from '@mui/material/styles'
import typography from './typography'
import spacing from './spacing'
import '@fontsource/inter'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { capitalize } from '@mui/material'

const getTheme = (mode) => {
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
        default: mode === 'dark' ? '#121212' : '#f5f5f5',
        paper:
          mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)' // Transparent overlay for most paper surfaces
            : '#ffffff',
      },
    },
    typography: {
      ...typography,
      fontFamily: 'Inter, sans-serif',
      h1: { fontWeight: 600, fontSize: '2.5rem' },
      h2: { fontWeight: 600, fontSize: '2rem' },
      body1: { fontWeight: 400, fontSize: '1rem' },
      button: { textTransform: capitalize },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.1)',
      '0px 3px 6px rgba(0, 0, 0, 0.1)',
      '0px 4px 8px rgba(0, 0, 0, 0.12)',
    ],
    spacing: 8,
    customSpacing: spacing,
    components: {
      MuiTypography: {
        variants: [
          {
            props: { variant: 'pointsValue' },
            style: ({ theme }) => ({
              fontSize: '0.75rem',
              fontWeight: 600,
              color: mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
              backgroundColor: theme.palette.shades.primaryShade,
              borderRadius: 8,
              paddingLeft: theme.spacing(1),
              paddingRight: theme.spacing(1),
              paddingTop: theme.spacing(0.5),
              paddingBottom: theme.spacing(0.5),
              lineHeight: '1rem',
              whiteSpace: 'nowrap',
            }),
          },
          {
            props: { variant: 'unitName' },
            style: ({ theme }) => ({
              fontSize: '1rem',
              fontWeight: 500,
            }),
          },
        ],
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#121212' : '#ffffff', // Solid color for Drawer background
          },
        },
      },
      MuiButton: {
        variants: [
          {
            props: { variant: 'options' },
            style: ({ theme }) => ({
              borderRadius: 16,
              borderColor: theme.palette.text.secondary,
              color: theme.palette.text.secondary,
              paddingBottom: 4,
              paddingTop: 4,
              borderWidth: 1,
              borderStyle: 'solid',
              '&:hover': {
                borderColor: theme.palette.text.secondary,
                backgroundColor: alpha(theme.palette.text.secondary, 0.1),
              },
            }),
          },
        ],
      },
    },
    utils: {
      giveOuterPadding: {
        px: {
          xs: spacing.outerAppPadding.xs,
          sm: spacing.outerAppPadding.sm,
          md: spacing.outerAppPadding.md,
        },
      },
    },
  })

  // Generate shades with 20% opacity for theme colors
  theme.palette.shades = {
    primaryShade: alpha(theme.palette.primary.main, 0.2),
    secondaryShade: alpha(theme.palette.secondary.main, 0.2),
    errorShade: alpha(theme.palette.error.main, 0.2),
    infoShade: alpha(theme.palette.info.main, 0.2),
    warningShade: alpha(theme.palette.warning.main, 0.2),
    successShade: alpha(theme.palette.success.main, 0.2),
  }

  return theme
}

export default getTheme
