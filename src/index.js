import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from './App.js'
import { FSContext } from './Context.js'
import { ErrorBoundary } from 'react-error-boundary'
import CssBaseline from '@mui/material/CssBaseline/index.js'
import { ThemeProvider } from '@mui/material/styles/index.js'
import theme from './theme.js'

import FS from '@isomorphic-git/lightning-fs'

const fs = new FS('bluescribedata')
const gameSystemPath = '/gameSystems'
const rosterPath = '/rosters'

// Render immediately; initialize directories in the background
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FSContext.Provider value={{ fs, gameSystemPath, rosterPath }}>
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div style={{ padding: 16 }}>
              <h3>PinkScribe failed to start</h3>
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
    </ThemeProvider>
  </React.StrictMode>,
)
;(async () => {
  try {
    await fs.promises.mkdir(gameSystemPath, { recursive: true })
  } catch {}
  try {
    await fs.promises.mkdir(rosterPath, { recursive: true })
  } catch {}
})()
