import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from './App.js'
import { FSContext } from './Context.js'
import { ErrorBoundary } from 'react-error-boundary'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { getTheme } from './theme.js'
import ColorModeContext from './ColorModeContext.js'

import FS from '@isomorphic-git/lightning-fs'

const fs = new FS('rostaradata')
const gameSystemPath = '/gameSystems'
const rosterPath = '/rosters'

// Render immediately; initialize directories in the background
const Root = () => {
  const [mode, setMode] = React.useState(() => {
    try {
      return localStorage.getItem('themeMode') || 'dark'
    } catch {
      return 'dark'
    }
  })
  const theme = React.useMemo(() => getTheme(mode, true), [mode])
  const ctx = React.useMemo(
    () => ({
      mode,
      setMode: (m) => {
        try {
          localStorage.setItem('themeMode', m)
        } catch {}
        setMode(m)
      },
    }),
    [mode],
  )

  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ColorModeContext.Provider value={ctx}>
          <FSContext.Provider value={{ fs, gameSystemPath, rosterPath }}>
            <ErrorBoundary
              fallbackRender={({ error, resetErrorBoundary }) => (
                <div style={{ padding: 16 }}>
                  <h3>Rostara failed to start</h3>
                  <p>{error?.message}</p>
                  <button
                    onClick={() => {
                      try {
                        localStorage.removeItem('system')
                      } catch {}
                      resetErrorBoundary()
                    }}
                  >
                    Reset and retry
                  </button>
                </div>
              )}
            >
              <App />
            </ErrorBoundary>
          </FSContext.Provider>
        </ColorModeContext.Provider>
      </ThemeProvider>
    </React.StrictMode>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<Root />)
;(async () => {
  try {
    await fs.promises.mkdir(gameSystemPath, { recursive: true })
  } catch {}
  try {
    await fs.promises.mkdir(rosterPath, { recursive: true })
  } catch {}
})()
