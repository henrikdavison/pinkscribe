// src/RosterManager.js
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import path from 'path-browserify'
import { readFiles } from './repo'
import { validateRoster } from './validate'
import {
  GameContext,
  RosterContext,
  RosterErrorsContext,
  OpenCategoriesContext,
  PathContext,
  useFs,
  useNative,
} from './Context'
import Roster from './Roster'
import AddForce from './Force/AddForce'
import SelectSystem from './repo/SelectSystem'
import Body from './Body'
import { Box, CircularProgress, Typography, Button } from '@mui/material'

function RosterManager({ systemInfo, setSystemInfo, setMode }) {
  const [loading, setLoading] = useState(false)
  const [gameData, setGameData] = useState(null)
  const [roster, setRoster] = useState(null)
  const [openCategories, setOpenCategories] = useState({})
  const [currentPath, setCurrentPath] = useState('')
  const { fs, gameSystemPath } = useFs()
  const { readFilesNative } = useNative()

  useEffect(() => {
    const load = async () => {
      try {
        const systemPath = path.join(gameSystemPath, systemInfo.name)
        const dataPath = systemInfo.externalPath || systemPath
        setGameData(await readFiles(dataPath, fs, systemPath, readFilesNative))
      } catch (e) {
        console.log(e)
        setSystemInfo({})
      }
      setLoading(false)
    }

    if (systemInfo.battleScribeVersion) {
      setLoading(true)
      load()
    }
  }, [systemInfo, fs, gameSystemPath, readFilesNative, setSystemInfo])

  const errors = validateRoster(roster, gameData)

  if (loading) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress color="primary" />
        </Box>
      </Body>
    )
  }

  if (!systemInfo?.battleScribeVersion) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <SelectSystem setSystemInfo={setSystemInfo} setMode={setMode} />
      </Body>
    )
  }

  return (
    <GameContext.Provider value={gameData}>
      <RosterContext.Provider value={[roster, setRoster]}>
        <RosterErrorsContext.Provider value={errors}>
          <OpenCategoriesContext.Provider value={[openCategories, setOpenCategories]}>
            <PathContext.Provider value={[currentPath, setCurrentPath]}>
              <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
                <ErrorBoundary
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <Box>
                      <Typography variant="h6" color="error">
                        Something went wrong:
                      </Typography>
                      <Typography variant="body1" color="textSecondary">
                        {error.message}
                      </Typography>
                      <Button variant="outlined" onClick={resetErrorBoundary} sx={{ mt: 2 }}>
                        Try again
                      </Button>
                    </Box>
                  )}
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

export default RosterManager
