// --- Start of Code for App.js ---
import { useState, useCallback } from 'react'
import useStorage from 'squirrel-gill'
import RosterManager from './RosterManager'
import './App.css'
import getTheme from './theme/theme'
import TopMenu from './components/TopMenu'
import { Box, CssBaseline, ThemeProvider } from '@mui/material'

function App() {
  // Initialize mode with useStorage inside the component function
  const [mode, setMode] = useStorage(localStorage, 'dataMode', 'editRoster')
  const theme = getTheme(mode)

  // Toggle function for light/dark mode
  const toggleDarkMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const [systemInfo, setSystemInfo] = useState(JSON.parse(localStorage.system || '{}'))

  const setSystemInfoHandler = useCallback((info) => {
    localStorage.system = JSON.stringify(info)
    setSystemInfo(info)
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TopMenu toggleDarkMode={toggleDarkMode} mode={mode} />
      <Box>
        <RosterManager systemInfo={systemInfo} setSystemInfo={setSystemInfoHandler} setMode={setMode} />
      </Box>
    </ThemeProvider>
  )
}

export default App
