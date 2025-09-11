import { useEffect, useState } from 'react'
import path from 'path-browserify'
import { BounceLoader } from 'react-spinners'
import useStorage from 'squirrel-gill'
import { FileDrop } from 'react-file-drop'
import Box from '@mui/material/Box/index.js'
import Button from '@mui/material/Button/index.js'
import TextField from '@mui/material/TextField/index.js'
import MSelect from '@mui/material/Select/index.js'
import MenuItem from '@mui/material/MenuItem/index.js'
import Typography from '@mui/material/Typography/index.js'
import Stack from '@mui/material/Stack/index.js'

import { listRosters, loadRoster, importRoster, deleteRoster, deleteAllRosters } from './repo/rosters.js'
import { useFs, useNative, useRoster, useSystem, useConfirm } from './Context.js'
import { createRoster } from './utils.js'

const SelectRoster = () => {
  const [, setRoster] = useRoster()
  const [rosters, setRosters] = useState(null)
  const [selected, setSelected] = useStorage(localStorage, 'selectedRoster', '')
  const [newName, setNewFilename] = useState('Roster')
  const gameData = useSystem()
  const confirmDelete = useConfirm(true, `Delete ${selected}?`)
  const { fs, rosterPath } = useFs()
  const { shellOpen } = useNative()

  useEffect(() => {
    const load = async () => {
      const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
      const r = await listRosters(gameData.gameSystem, fs, systemRosterPath)
      setRosters(r)
      if (!r[selected]) {
        setSelected(Object.keys(r)[0] || 'New')
      }
      if (r[newName]) {
        let i = 1
        while (r['Roster ' + i]) {
          i++
        }
        setNewFilename('Roster ' + i)
      }
    }

    if (!rosters && gameData) {
      load()
    }
  }, [rosters, gameData, newName, selected, setSelected, fs, rosterPath])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Select Roster
      </Typography>
      <FileDrop
        onFrameDrop={async (event) => {
          if (event.dataTransfer?.items[0]?.kind === 'file') {
            const file = event.dataTransfer.items[0].getAsFile()
            const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
            await importRoster(file, fs, systemRosterPath)
            setSelected(file.name)
            setRosters(null)
          }
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          To import a .rosz SELECT ROSTER file, drop it anywhere on the page, or{' '}
          <Button variant="text" size="small" onClick={() => document.getElementById('import-roster').click()}>
            choose a file
          </Button>
        </Typography>
        <input
          type="file"
          accept=".rosz,.ros"
          id="import-roster"
          onChange={async (e) => {
            const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
            await importRoster(e.target.files[0], fs, systemRosterPath)
            setSelected(e.target.files[0].name)
            setRosters(null)
          }}
        />
      </FileDrop>
      {rosters ? (
        <>
          <MSelect
            size="small"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            sx={{ mb: 2, minWidth: 320 }}
          >
            {Object.entries(rosters).map(([roster, name]) => (
              <MenuItem key={roster} value={roster}>
                {roster} - {typeof name === 'string' ? name : 'Error'}
              </MenuItem>
            ))}
            <MenuItem value="New">New</MenuItem>
          </MSelect>
          {selected === 'New' ? (
            <Stack spacing={1} direction="row" alignItems="center" sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Filename"
                value={newName}
                onChange={(e) => setNewFilename(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={async () => {
                  const roster = await createRoster(newName, gameData.gameSystem)
                  setRoster(roster)
                }}
              >
                Create {newName}.rosz
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1} direction="row" sx={{ mb: 2 }}>
              {typeof rosters[selected] !== 'string' && (
                <Typography color="error">
                  PinkScribe is having trouble parsing {selected}. It may not be a valid roster file, or this could be a
                  bug.
                </Typography>
              )}
              <Button
                variant="contained"
                disabled={typeof rosters[selected] !== 'string'}
                onClick={async () => {
                  const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                  setRoster(await loadRoster(selected, fs, systemRosterPath), false)
                }}
              >
                Load
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={async () =>
                  await confirmDelete(async () => {
                    const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                    await deleteRoster(selected, fs, systemRosterPath)
                    setRosters(null)
                  })
                }
              >
                Delete
              </Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                  await deleteAllRosters(fs, systemRosterPath)
                  setRosters(null)
                }}
              >
                Delete all (this system)
              </Button>
            </Stack>
          )}
          {!!shellOpen && (
            <Button
              variant="outlined"
              onClick={async () => {
                const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                await shellOpen(systemRosterPath)
              }}
            >
              Open roster directory
            </Button>
          )}
        </>
      ) : (
        <BounceLoader color="#36d7b7" className="loading" />
      )}
    </Box>
  )
}

export default SelectRoster
