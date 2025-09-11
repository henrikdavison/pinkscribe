import { useEffect, useState } from 'react'
import path from 'path-browserify'
import { BounceLoader } from 'react-spinners'
import _ from 'lodash'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import Button from '@mui/material/Button/index.js'
import Select from '@mui/material/Select/index.js'
import MenuItem from '@mui/material/MenuItem/index.js'
import Stack from '@mui/material/Stack/index.js'

import {
  listGameSystems,
  listAvailableGameSystems,
  addGameSystem,
  addLocalGameSystem,
  addExternalGameSystem,
  clearGameSystem,
} from './index.js'
import { useFs, useNative } from '../Context.js'

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

  // Ensure `selected` always points at a valid installed system key
  useEffect(() => {
    if (!systems) return
    if (selected !== 'Add New' && !systems[selected]) {
      const fallback = _.reverse(_.sortBy(Object.values(systems), 'lastUpdated'))[0]?.name || 'Add New'
      setSelected(fallback)
    }
  }, [systems, selected])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Select Game System
      </Typography>
      {systems ? (
        <>
          <Select
            size="small"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            sx={{ mb: 2, minWidth: 320 }}
          >
            {_.reverse(_.sortBy(Object.values(systems), 'lastUpdated')).map((system) => (
              <MenuItem key={system.name} value={system.name}>
                {system.description} - {system.version}
              </MenuItem>
            ))}
            <MenuItem value="Add New">Add New</MenuItem>
          </Select>
          {selected === 'Add New' ? (
            <Box>
              {available ? (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Select size="small" value={selectedAvailable} onChange={(e) => setSelectedAvailable(e.target.value)}>
                    {available.map((system, index) => (
                      <MenuItem key={system.name} value={index}>
                        {system.description}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="body2">
                    Or{' '}
                    <Button size="small" onClick={() => document.getElementById('import-system').click()}>
                      select a folder
                    </Button>{' '}
                    containing a .gst and .cat files.
                  </Typography>
                  {!isOffline ? (
                    <input
                      type="file"
                      id="import-system"
                      webkitdirectory="true"
                      onChange={async (e) => {
                        const system = await addLocalGameSystem([...e.target.files], fs, gameSystemPath)
                        setSystemInfo(system)
                      }}
                    />
                  ) : (
                    <Box
                      id="import-system"
                      onClick={async () => {
                        const externalDir = await selectDirectory()
                        if (externalDir === null) return null
                        const system = await addExternalGameSystem(externalDir, fs, gameSystemPath)
                        if (system) setSystemInfo(system)
                      }}
                    />
                  )}
                </Stack>
              ) : (
                <BounceLoader color="#36d7b7" className="loading" />
              )}
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              {error && previouslySelected.name === selected && (
                <Box className="errors">
                  <Typography color="error">
                    PinkScribe is having an issue loading this data. This is a bug; please report it.
                  </Typography>
                </Box>
              )}
              <Typography variant="h6">{systems[selected]?.description || selected}</Typography>
              <Typography variant="body2">
                Version {systems[selected]?.version || '—'} - {systems[selected]?.lastUpdateDescription || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Last updated{' '}
                {systems[selected]?.lastUpdated && !isNaN(Date.parse(systems[selected].lastUpdated))
                  ? new Date(Date.parse(systems[selected]?.lastUpdated)).toLocaleDateString()
                  : 'Unknown'}
                .{' '}
                {systems[selected]?.bugTrackerUrl && (
                  <>
                    <a target="_blank" rel="noreferrer" href={systems[selected]?.bugTrackerUrl}>
                      Repository
                    </a>
                    {' | '}
                  </>
                )}
                {systems[selected]?.reportBugUrl && (
                  <>
                    <a target="_blank" rel="noreferrer" href={systems[selected]?.reportBugUrl}>
                      Report a bug
                    </a>
                  </>
                )}{' '}
                <Button
                  size="small"
                  onClick={() => clearGameSystem(systems[selected], fs, gameSystemPath).then(() => setSystems(null))}
                >
                  Clear data
                </Button>
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
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

                // Ensure UI proceeds by including battleScribeVersion and fresh metadata
                setSystemInfo({
                  ...available[selectedAvailable],
                  battleScribeVersion: 'ready',
                  lastUpdated: new Date().toISOString(),
                  lastUpdateDescription: 'Downloaded',
                })
                setUpdatingSystem(false)
              } else {
                // In case stored metadata lacks this field, add a ready marker
                setSystemInfo({
                  ...systems[selected],
                  battleScribeVersion: systems[selected].battleScribeVersion || 'ready',
                })
              }
            }}
          >
            {updatingSystem ? `${updatingSystem.done} files downloaded` : 'Load'}
          </Button>
          {selected !== 'Add New' && !updatingSystem && !systems[selected].externalPath && (
            <Button
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
              variant="outlined"
            >
              Update data
            </Button>
          )}
          {selected !== 'Add New' && !updatingSystem && (
            <Button
              onClick={async () => {
                try {
                  const cacheFile = path.join(gameSystemPath, systems[selected].name, 'cache.json')
                  await fs.promises.unlink(cacheFile)
                } catch {
                  // Cache file doesn't exist
                }
              }}
              variant="outlined"
            >
              Clear cache
            </Button>
          )}
          {false && selected !== 'Add New' && !updatingSystem && (
            <Button
              onClick={async () => {
                setMode('editSystem')
                setSystemInfo(systems[selected])
              }}
              variant="outlined"
            >
              Edit data
            </Button>
          )}
        </>
      ) : (
        <BounceLoader color="#36d7b7" className="loading" />
      )}
    </Box>
  )
}

export default SelectSystem
