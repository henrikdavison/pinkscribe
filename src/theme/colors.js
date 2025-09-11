// src/theme/colors.js
import { alpha } from '@mui/material/styles/index.js'

// Helper to create 20% opacity shades
const generateShade = (color) => alpha(color, 0.2)

const colors = (theme) => ({
  primary: theme.palette.primary.main,
  primaryShade: generateShade(theme.palette.primary.main),
  secondary: theme.palette.secondary.main,
  secondaryShade: generateShade(theme.palette.secondary.main),
  error: theme.palette.error.main,
  errorShade: generateShade(theme.palette.error.main),
  warning: theme.palette.warning.main,
  warningShade: generateShade(theme.palette.warning.main),
  info: theme.palette.info.main,
  infoShade: generateShade(theme.palette.info.main),
  success: theme.palette.success.main,
  successShade: generateShade(theme.palette.success.main),
})

export default colors
