import { useEffect, useState } from 'react'
import path from 'path-browserify'
import _ from 'lodash'
import { Box, Typography, Select, MenuItem, Button, Input, Link, CircularProgress } from '@mui/material'
import {
  listGameSystems,
  listAvailableGameSystems,
  addGameSystem,
  addLocalGameSystem,
  addExternalGameSystem,
  clearGameSystem,
} from './'
import { useFs, useNative } from '../Context'

const SelectSystem = ({ setSystemInfo, setMode, previouslySelected, error }) => {
  const [systems, setSystems] = useState(null)
  const [available, setAvailable] = useState(null)
  const [selectedAvailable, setSelectedAvailable] = useState(0)
  const [selected, setSelected] = useState(null)
  const [updatingSystem, setUpdatingSystem] = useState(false)
  const { fs, gameSystemPath } = useFs()
  const { selectDirectory } = useNative()

  const isOffline = !!selectDirectory

  useEffect(() => {
    const load = async () => {
      const s = await listGameSystems(fs, gameSystemPath)
      setSystems(s)
      setSelected(
        previouslySelected?.name || _.reverse(_.sortBy(Object.values(s), 'lastUpdated'))[0]?.name || 'Add New',
      )
    }

    if (!systems) {
      load()
    }
  }, [systems, previouslySelected, fs, gameSystemPath])

  useEffect(() => {
    if (selected === 'Add New' && !available) {
      listAvailableGameSystems().then((a) => {
        setAvailable(a)
        setSelectedAvailable(0)
      })
    }
  }, [selected, available])

  return (
    <Box>
      <Typography variant="h5">Select Game System</Typography>
      {systems ? (
        <>
          <Select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
            }}
            fullWidth
          >
            {_.reverse(_.sortBy(Object.values(systems), 'lastUpdated')).map((system) => (
              <MenuItem key={system.name} value={system.name}>
                {system.description} - {system.version}
              </MenuItem>
            ))}
            <MenuItem value="Add New">Add New</MenuItem>
          </Select>
          {selected === 'Add New' ? (
            <Box mt={2}>
              {available ? (
                <>
                  <Select value={selectedAvailable} onChange={(e) => setSelectedAvailable(e.target.value)} fullWidth>
                    {available.map((system, index) => (
                      <MenuItem key={system.name} value={index}>
                        {system.description}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography mt={2}>
                    Or{' '}
                    <Link component="button" onClick={() => document.getElementById('import-system').click()}>
                      select a folder
                    </Link>{' '}
                    containing a <code>.gst</code> and <code>.cat</code> files.
                  </Typography>
                  {!isOffline ? (
                    <Input
                      type="file"
                      id="import-system"
                      inputProps={{ webkitdirectory: 'true' }}
                      onChange={async (e) => {
                        const system = await addLocalGameSystem([...e.target.files], fs, gameSystemPath)
                        setSystemInfo(system)
                      }}
                      sx={{ display: 'none' }}
                    />
                  ) : (
                    <Box
                      id="import-system"
                      onClick={async () => {
                        const externalDir = await selectDirectory()
                        if (externalDir === null) {
                          return null
                        }
                        const system = await addExternalGameSystem(externalDir, fs, gameSystemPath)
                        if (system) {
                          setSystemInfo(system)
                        }
                      }}
                      sx={{ cursor: 'pointer', mt: 2 }}
                    />
                  )}
                </>
              ) : (
                <CircularProgress color="primary" />
              )}
            </Box>
          ) : (
            <>
              {error && previouslySelected.name === selected && (
                <Box mt={2}>
                  <Typography color="error">
                    BlueScribe is having an issue loading this data. This is a bug; please report it.{' '}
                    <Link component="button" onClick={() => console.log(error)}>
                      Log error to console.
                    </Link>
                  </Typography>
                  <details>
                    <summary>{error.message}</summary>
                    <code>{error.stack}</code>
                  </details>
                </Box>
              )}
              <Box mt={2}>
                <Typography variant="h6">{systems[selected].description}</Typography>
                <Typography>
                  Version {systems[selected].version} - {systems[selected].lastUpdateDescription}
                </Typography>
                <Typography>
                  Last updated {new Date(Date.parse(systems[selected].lastUpdated)).toLocaleDateString()}.{' '}
                  {systems[selected].bugTrackerUrl && (
                    <>
                      <Link target="_blank" rel="noreferrer" href={systems[selected].bugTrackerUrl}>
                        Repository
                      </Link>
                      {' | '}
                    </>
                  )}
                  {systems[selected].reportBugUrl && (
                    <>
                      <Link target="_blank" rel="noreferrer" href={systems[selected].reportBugUrl}>
                        Report a bug
                      </Link>
                      {' | '}
                    </>
                  )}
                  <Link
                    component="button"
                    onClick={() => {
                      clearGameSystem(systems[selected], fs, gameSystemPath).then(() => {
                        setSystems(null)
                      })
                    }}
                  >
                    Clear data
                  </Link>
                </Typography>
              </Box>
            </>
          )}
          <Button
            variant="contained"
            color="primary"
            disabled={updatingSystem ? true : undefined}
            onClick={async () => {
              setMode('editRoster')
              if (selected === 'Add New') {
                if (updatingSystem) {
                  return
                }

                const queue = await addGameSystem(available[selectedAvailable], fs, gameSystemPath)
                let done = 0
                setUpdatingSystem({ done })
                queue.start()
                queue.on('completed', () => {
                  done++
                  setUpdatingSystem({ done })
                })

                await queue.onIdle()

                setSystemInfo(available[selectedAvailable])
                setUpdatingSystem(false)
              } else {
                setSystemInfo(systems[selected])
              }
            }}
            sx={{ mt: 2 }}
          >
            {updatingSystem ? `${updatingSystem.done} files downloaded` : 'Load'}
          </Button>
          {selected !== 'Add New' && !updatingSystem && !systems[selected].externalPath && (
            <Button
              variant="outlined"
              color="primary"
              onClick={async () => {
                if (updatingSystem) {
                  return
                }
                const queue = await addGameSystem(systems[selected], fs, gameSystemPath)

                const count = queue.size
                let done = 0
                setUpdatingSystem({ count, done })
                queue.start()
                queue.on('completed', () => {
                  done++
                  setUpdatingSystem({ count: queue.size, done })
                })

                await queue.onIdle()

                setSystems(null)
                setUpdatingSystem(false)
              }}
              sx={{ mt: 2 }}
            >
              Update data
            </Button>
          )}
          {selected !== 'Add New' && !updatingSystem && (
            <Button
              variant="outlined"
              color="primary"
              onClick={async () => {
                try {
                  const cacheFile = path.join(gameSystemPath, systems[selected].name, 'cache.json')
                  await fs.promises.unlink(cacheFile)
                } catch {
                  // Cache file doesn't exist
                }
              }}
              sx={{ mt: 2 }}
            >
              Clear cache
            </Button>
          )}
          {false && selected !== 'Add New' && !updatingSystem && (
            <Button
              variant="outlined"
              color="primary"
              onClick={async () => {
                setMode('editSystem')
                setSystemInfo(systems[selected])
              }}
              sx={{ mt: 2 }}
            >
              Edit data
            </Button>
          )}
        </>
      ) : (
        <CircularProgress color="primary" />
      )}
    </Box>
  )
}

export default SelectSystem
