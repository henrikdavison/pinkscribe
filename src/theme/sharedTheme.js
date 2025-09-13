import { createTheme, alpha } from '@mui/material/styles'

// Ported primitives from MUI Dashboard shared-theme (JS adaption)
export const brand = {
  50: 'hsl(210, 100%, 95%)',
  100: 'hsl(210, 100%, 92%)',
  200: 'hsl(210, 100%, 80%)',
  300: 'hsl(210, 100%, 65%)',
  400: 'hsl(210, 98%, 48%)',
  500: 'hsl(210, 98%, 42%)',
  600: 'hsl(210, 98%, 55%)',
  700: 'hsl(210, 100%, 35%)',
  800: 'hsl(210, 100%, 16%)',
  900: 'hsl(210, 100%, 21%)',
}

export const gray = {
  50: 'hsl(220, 35%, 97%)',
  100: 'hsl(220, 30%, 94%)',
  200: 'hsl(220, 20%, 88%)',
  300: 'hsl(220, 20%, 80%)',
  400: 'hsl(220, 20%, 65%)',
  500: 'hsl(220, 20%, 42%)',
  600: 'hsl(220, 20%, 35%)',
  700: 'hsl(220, 20%, 25%)',
  800: 'hsl(220, 30%, 6%)',
  900: 'hsl(220, 35%, 3%)',
}

export const green = {
  50: 'hsl(120, 80%, 98%)',
  100: 'hsl(120, 75%, 94%)',
  200: 'hsl(120, 75%, 87%)',
  300: 'hsl(120, 61%, 77%)',
  400: 'hsl(120, 44%, 53%)',
  500: 'hsl(120, 59%, 30%)',
  600: 'hsl(120, 70%, 25%)',
  700: 'hsl(120, 75%, 16%)',
  800: 'hsl(120, 84%, 10%)',
  900: 'hsl(120, 87%, 6%)',
}

export const orange = {
  50: 'hsl(45, 100%, 97%)',
  100: 'hsl(45, 92%, 90%)',
  200: 'hsl(45, 94%, 80%)',
  300: 'hsl(45, 90%, 65%)',
  400: 'hsl(45, 90%, 40%)',
  500: 'hsl(45, 90%, 35%)',
  600: 'hsl(45, 91%, 25%)',
  700: 'hsl(45, 94%, 20%)',
  800: 'hsl(45, 95%, 16%)',
  900: 'hsl(45, 93%, 12%)',
}

export const red = {
  50: 'hsl(0, 100%, 97%)',
  100: 'hsl(0, 92%, 90%)',
  200: 'hsl(0, 94%, 80%)',
  300: 'hsl(0, 90%, 65%)',
  400: 'hsl(0, 90%, 40%)',
  500: 'hsl(0, 90%, 30%)',
  600: 'hsl(0, 91%, 25%)',
  700: 'hsl(0, 94%, 18%)',
  800: 'hsl(0, 95%, 12%)',
  900: 'hsl(0, 93%, 6%)',
}

export const getSharedTheme = (mode = 'dark') => {
  // Adjusted for MUI v5: build a standard theme from tokens
  const light = mode !== 'dark'
  const palette = {
    mode: light ? 'light' : 'dark',
    primary: light
      ? { light: brand[200], main: brand[400], dark: brand[700], contrastText: brand[50] }
      : { light: brand[300], main: brand[400], dark: brand[700], contrastText: brand[50] },
    warning: light
      ? { light: orange[300], main: orange[400], dark: orange[800] }
      : { light: orange[400], main: orange[500], dark: orange[700] },
    error: light
      ? { light: red[300], main: red[400], dark: red[800] }
      : { light: red[400], main: red[500], dark: red[700] },
    success: light
      ? { light: green[300], main: green[400], dark: green[800] }
      : { light: green[400], main: green[500], dark: green[700] },
    grey: gray,
    divider: light ? alpha(gray[300], 0.4) : alpha(gray[700], 0.6),
    background: light
      ? { default: 'hsl(0, 0%, 99%)', paper: gray[50] }
      : { default: gray[900], paper: 'hsl(220, 30%, 7%)' },
    text: light ? { primary: gray[800], secondary: gray[600] } : { primary: 'hsl(0, 0%, 100%)', secondary: gray[400] },
    action: light
      ? { hover: alpha(gray[200], 0.2), selected: alpha(gray[200], 0.3) }
      : { hover: alpha(gray[600], 0.2), selected: alpha(gray[600], 0.3) },
  }

  const theme = createTheme({
    palette,
    typography: {
      fontFamily: 'Inter, sans-serif',
      h1: { fontSize: 48, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.5 },
      h2: { fontSize: 36, fontWeight: 600, lineHeight: 1.2 },
      h3: { fontSize: 30, lineHeight: 1.2 },
      h4: { fontSize: 24, fontWeight: 600, lineHeight: 1.5 },
      h5: { fontSize: 20, fontWeight: 600 },
      h6: { fontSize: 18, fontWeight: 600 },
      subtitle1: { fontSize: 18 },
      subtitle2: { fontSize: 14, fontWeight: 500 },
      body1: { fontSize: 14 },
      body2: { fontSize: 14, fontWeight: 400 },
      caption: { fontSize: 12, fontWeight: 400 },
      button: { textTransform: 'none' },
    },
    shape: { borderRadius: 8 },
    components: {
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
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: ({ theme, ownerState }) => ({
            border: '1px solid',
            borderRadius: 999,
            borderColor: theme.palette.grey[theme.palette.mode === 'dark' ? 700 : 200],
            // Warning chip styled similar to alert for visibility
            ...(ownerState?.color === 'warning' && {
              backgroundColor: theme.palette.mode === 'dark' ? alpha(orange[900], 0.5) : orange[100],
              borderColor: alpha(theme.palette.mode === 'dark' ? orange[800] : orange[300], 0.5),
              color: theme.palette.text.primary,
              '& .MuiChip-icon': { color: orange[500] },
            }),
            // Success chip styling to match alert tone
            ...(ownerState?.color === 'success' && {
              backgroundColor: theme.palette.mode === 'dark' ? alpha(green[900], 0.5) : green[50],
              borderColor: theme.palette.mode === 'dark' ? green[800] : green[200],
              color: theme.palette.mode === 'dark' ? green[300] : green[500],
              '& .MuiChip-icon': { color: theme.palette.mode === 'dark' ? green[300] : green[500] },
            }),
          }),
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            backgroundColor: theme.palette.mode === 'dark' ? alpha(orange[900], 0.5) : orange[100],
            border: `1px solid ${alpha(theme.palette.mode === 'dark' ? orange[800] : orange[300], 0.5)}`,
          }),
        },
      },
    },
  })

  // Shadow preset index 1 to match template vibe
  theme.shadows[1] =
    theme.palette.mode === 'dark'
      ? 'hsla(220, 30%, 5%, 0.7) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.8) 0px 8px 16px -5px'
      : 'hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px'

  return theme
}

export default getSharedTheme
