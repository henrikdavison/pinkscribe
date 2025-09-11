import { useEffect, useState } from 'react'
import { BounceLoader } from 'react-spinners'
import 'react-tooltip/dist/react-tooltip.css'
import { Tooltip } from 'react-tooltip'
import useStorage from 'squirrel-gill'
import { ErrorBoundary } from 'react-error-boundary'
import path from 'path-browserify'

import '@picocss/pico'
import './App.css'
import { readFiles } from './repo/index.js'
import SelectSystem from './repo/SelectSystem.js'
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
import SelectForce from './Force/SelectForce.js'
import ViewRoster from './ViewRoster.js'
import { refreshRoster } from './utils.js'
import EditSystem from './repo/EditSystem.js'
import { pathToForce, validateRoster } from './validate.js'
import packageJson from '../package.json'

import AppBar from '@mui/material/AppBar/index.js'
import Toolbar from '@mui/material/Toolbar/index.js'
import Typography from '@mui/material/Typography/index.js'
import Button from '@mui/material/Button/index.js'
import Box from '@mui/material/Box/index.js'
import Menu from '@mui/material/Menu/index.js'
import MenuItem from '@mui/material/MenuItem/index.js'
import Stack from '@mui/material/Stack/index.js'

const Body = ({ children, systemInfo, setSystemInfo }) => {
  const [roster, setRoster] = useRoster()
  const confirmLeaveRoster = useConfirm(
    roster?.__.updated,
    `${roster?.__.filename} has not been saved. Are you sure you want to close it?`,
  )
  const system = useSystem()
  const [path, setPath] = usePath()

  const [open, setOpen] = useState(false)
  const [menuEl, setMenuEl] = useState(null)
  const { fs, rosterPath } = useFs()

  return (
    <div className="container">
      <Tooltip id="tooltip" />
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
        <Toolbar sx={{ display: 'flex', gap: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <Typography variant="h6">PinkScribe</Typography>
            <Typography variant="caption">{packageJson.version}</Typography>
            {roster && (
              <Box sx={{ ml: 2 }}>
                <SelectForce value={pathToForce(path)} onChange={setPath}>
                  <option value="">Manage Roster</option>
                </SelectForce>
              </Box>
            )}
          </Stack>

          {system && (
            <Stack direction="row" spacing={1} alignItems="center">
              {roster && (
                <Button variant="outlined" onClick={() => setOpen(!open)}>
                  View/Print
                </Button>
              )}
              {roster && (
                <Button variant="outlined" onClick={() => downloadRoster(roster)}>
                  Download
                </Button>
              )}
              {roster && (
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
              )}
              <Button variant="outlined" onClick={(e) => setMenuEl(e.currentTarget)}>
                Menu
              </Button>
              <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}>
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

  if (loading) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <BounceLoader color="#36d7b7" className="loading" />
      </Body>
    )
  }

  if (!systemInfo?.battleScribeVersion) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <SelectSystem setSystemInfo={setSystemInfo} setMode={setMode} previouslySelected={systemInfo} />
      </Body>
    )
  }

  if (mode === 'editSystem') {
    return <EditSystem systemInfo={systemInfo} setSystemInfo={setSystemInfo} />
  }

  const errors = validateRoster(roster, gameData)
  window.errors = errors

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
                      <SelectSystem
                        setSystemInfo={(i) => {
                          resetErrorBoundary()
                          setSystemInfo(i)
                        }}
                        setMode={setMode}
                        previouslySelected={systemInfo}
                        error={error}
                      />
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
