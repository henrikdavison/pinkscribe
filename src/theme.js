import { createTheme } from '@mui/material/styles/index.js'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#36d7b7' },
    background: { default: '#11191f', paper: '#11191f' },
  },
  shape: { borderRadius: 8 },
})

export default theme
