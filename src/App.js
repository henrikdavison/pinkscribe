import React, { useEffect, useState, useDeferredValue, useContext } from 'react'
import { BounceLoader } from 'react-spinners'
import 'react-tooltip/dist/react-tooltip.css'
import { Tooltip } from 'react-tooltip'
import useStorage from 'squirrel-gill'
import { ErrorBoundary } from 'react-error-boundary'
import path from 'path-browserify'

import './App.css'
import { readFiles } from './repo/index.js'
import SelectSystem from './repo/SelectSystem.js'
import ColorModeContext from './ColorModeContext.js'
import Roster from './Roster.js'
import { saveRoster, downloadRoster } from './repo/rosters.js'
import {
  GameContext,
  OpenCategoriesContext,
  PathContext,
  RosterContext,
  RosterErrorsContext,
  useFs,
  useNative,
  useConfirm,
  usePath,
  useRoster,
  useSystem,
} from './Context.js'
import SelectionModal from './Force/SelectionModal.js'
// Force selector is rendered in Roster header now
import ViewRoster from './ViewRoster.js'
import { refreshRoster } from './utils.js'
import EditSystem from './repo/EditSystem.js'
import { validateRoster } from './validate.js'
// import packageJson from '../package.json'
import RostaraLogo from './RostaraLogo.js'

import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import { MoreVertical } from 'lucide-react'

const Body = ({ children, systemInfo, setSystemInfo }) => {
  const [roster, setRoster] = useRoster()
  const confirmLeaveRoster = useConfirm(
    roster?.__.updated,
    `${roster?.__.filename} has not been saved. Are you sure you want to close it?`,
  )
  const system = useSystem()
  const [, setPath] = usePath()

  const [open, setOpen] = useState(false)
  const [menuEl, setMenuEl] = useState(null)
  const { mode, setMode } = useContext(ColorModeContext)
  const { fs, rosterPath } = useFs()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <div>
      <Tooltip id="tooltip" />
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
        <Toolbar sx={{ display: 'flex', gap: 2, px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <RostaraLogo withText />
            {/* Force dropdown moved to roster header */}
          </Stack>

          {system && (
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Desktop actions */}
              {roster && !isMobile && (
                <>
                  <Button variant="outlined" onClick={() => setOpen(!open)}>
                    View/Print
                  </Button>
                  <Button variant="outlined" onClick={() => downloadRoster(roster)}>
                    Download
                  </Button>
                  <Button
                    variant="contained"
                    disabled={!roster.__.updated}
                    onClick={async () => {
                      await saveRoster(roster, fs, rosterPath)
                      setRoster(roster, false)
                    }}
                  >
                    Save
                  </Button>
                </>
              )}
              {/* Mobile: collapse actions into a single options menu */}
              {roster && isMobile && (
                <IconButton aria-label="Options" onClick={(e) => setMenuEl(e.currentTarget)}>
                  <MoreVertical size={20} />
                </IconButton>
              )}
              {/* Always keep Menu entry point for desktop */}
              {!isMobile && (
                <Button variant="outlined" onClick={(e) => setMenuEl(e.currentTarget)}>
                  Menu
                </Button>
              )}
              <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}>
                {/* On mobile, include quick actions here */}
                {isMobile && roster && (
                  <>
                    <MenuItem
                      onClick={() => {
                        setMenuEl(null)
                        setOpen((o) => !o)
                      }}
                    >
                      View / Print
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setMenuEl(null)
                        downloadRoster(roster)
                      }}
                    >
                      Download
                    </MenuItem>
                    <MenuItem
                      disabled={!roster.__.updated}
                      onClick={async () => {
                        await saveRoster(roster, fs, rosterPath)
                        setRoster(roster, false)
                        setMenuEl(null)
                      }}
                    >
                      Save
                    </MenuItem>
                    <Divider />
                  </>
                )}
                {roster && (
                  <MenuItem
                    onClick={() => {
                      setMenuEl(null)
                      setRoster(refreshRoster(roster, system))
                    }}
                  >
                    Refresh Roster
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setMode(mode === 'dark' ? 'light' : 'dark')
                    setMenuEl(null)
                  }}
                >
                  {mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </MenuItem>
                {roster && (
                  <MenuItem
                    onClick={async () =>
                      await confirmLeaveRoster(() => {
                        setMenuEl(null)
                        setPath('')
                        setRoster()
                      })
                    }
                  >
                    Roster ({roster.__.filename.split('/').at(-1)})
                  </MenuItem>
                )}
                <MenuItem
                  onClick={async () =>
                    await confirmLeaveRoster(() => {
                      setMenuEl(null)
                      setPath('')
                      setRoster()
                      setSystemInfo({ name: systemInfo.name })
                    })
                  }
                >
                  Game System ({system?.gameSystem.name})
                </MenuItem>
              </Menu>
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      {children}
      <SelectionModal open={open} setOpen={setOpen}>
        {roster && <ViewRoster />}
      </SelectionModal>
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(false)
  const [gameData, setGameData] = useState(null)

  const [systemInfo, setInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.system || '{}')
    } catch {
      // Corrupt or legacy value in localStorage; reset to empty
      localStorage.removeItem('system')
      return {}
    }
  })

  const setSystemInfo = (info) => {
    localStorage.system = JSON.stringify(info)
    setInfo(info)
  }
  const [mode, setMode] = useStorage(localStorage, 'dataMode', 'editRoster')

  const [roster, setRoster] = useState(null)
  const [openCategories, setOpenCategories] = useState({})
  const [currentPath, setCurrentPath] = useState('')
  const { fs, gameSystemPath } = useFs()
  const { readFilesNative } = useNative()

  useEffect(() => {
    const load = async () => {
      if (mode === 'editRoster') {
        try {
          console.log('System: ' + systemInfo.name, gameSystemPath)
          const systemPath = path.join(gameSystemPath, systemInfo.name)
          var dataPath = systemPath
          if (systemInfo.externalPath) {
            dataPath = systemInfo.externalPath
          }
          setGameData(await readFiles(dataPath, fs, systemPath, readFilesNative))
        } catch (e) {
          console.log(e)
          setSystemInfo({})
        }
        setLoading(false)
      }
    }

    if (systemInfo.battleScribeVersion) {
      setLoading(true)
      load()
    }
  }, [systemInfo, mode, fs, gameSystemPath, readFilesNative])

  window.gameData = gameData

  // Always define hooks at top-level (before any early returns)
  // Defer and debounce validation to reduce jank during rapid edits
  const deferredRoster = useDeferredValue(roster)
  const [errors, setErrors] = useState({})
  useEffect(() => {
    if (!gameData) return
    const id = setTimeout(() => {
      try {
        setErrors(validateRoster(deferredRoster, gameData))
      } catch (e) {
        console.error(e)
      }
    }, 150)
    return () => clearTimeout(id)
  }, [deferredRoster, gameData])
  window.errors = errors

  if (loading) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <div className="container">
          <BounceLoader color="#36d7b7" className="loading" />
        </div>
      </Body>
    )
  }

  if (!systemInfo?.battleScribeVersion) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <div className="container">
          <SelectSystem setSystemInfo={setSystemInfo} setMode={setMode} previouslySelected={systemInfo} />
        </div>
      </Body>
    )
  }

  if (mode === 'editSystem') {
    return <EditSystem systemInfo={systemInfo} setSystemInfo={setSystemInfo} />
  }

  return (
    <GameContext.Provider value={gameData}>
      <RosterContext.Provider value={[roster, setRoster]}>
        <RosterErrorsContext.Provider value={errors}>
          <OpenCategoriesContext.Provider value={[openCategories, setOpenCategories]}>
            <PathContext.Provider value={[currentPath, setCurrentPath]}>
              <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
                <ErrorBoundary
                  fallbackRender={({ error, resetErrorBoundary }) => {
                    return (
                      <div className="container">
                        <SelectSystem
                          setSystemInfo={(i) => {
                            resetErrorBoundary()
                            setSystemInfo(i)
                          }}
                          setMode={setMode}
                          previouslySelected={systemInfo}
                          error={error}
                        />
                      </div>
                    )
                  }}
                >
                  <Roster />
                </ErrorBoundary>
              </Body>
            </PathContext.Provider>
          </OpenCategoriesContext.Provider>
        </RosterErrorsContext.Provider>
      </RosterContext.Provider>
    </GameContext.Provider>
  )
}

export default App
