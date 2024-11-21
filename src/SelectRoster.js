import { useEffect, useState } from 'react'
import useStorage from 'squirrel-gill'
import { FileDrop } from 'react-file-drop'
import { Box, Typography, Button, TextField, Select, MenuItem, CircularProgress, Link } from '@mui/material'

import { listRosters, loadRoster, importRoster, deleteRoster } from './repo/rosters'
import { useFs, useNative, useRoster, useSystem, useConfirm } from './Context'
import { createRoster } from './utils'

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
      const r = await listRosters(gameData.gameSystem, fs, rosterPath)
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
      <Typography variant="h4" gutterBottom>
        Select Roster
      </Typography>
      <FileDrop
        onFrameDrop={async (event) => {
          if (event.dataTransfer?.items[0]?.kind === 'file') {
            const file = event.dataTransfer.items[0].getAsFile()
            await importRoster(file, fs, rosterPath)
            setSelected(file.name)
            setRosters(null)
          }
        }}
      >
        <Typography>
          To import a <code>.rosz</code> SELECT ROSTER file, drop it anywhere on the page, or{' '}
          <Link component="button" onClick={() => document.getElementById('import-roster').click()} underline="hover">
            click here to select one
          </Link>
          .
        </Typography>
        <input
          type="file"
          accept=".rosz,.ros"
          id="import-roster"
          onChange={async (e) => {
            await importRoster(e.target.files[0], fs, rosterPath)
            setSelected(e.target.files[0].name)
            setRosters(null)
          }}
          style={{ display: 'none' }}
        />
      </FileDrop>
      {rosters ? (
        <Box mt={4}>
          <Select
            fullWidth
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
            }}
            variant="outlined"
            displayEmpty
          >
            <MenuItem value="" disabled>
              Select a roster
            </MenuItem>
            {Object.entries(rosters).map(([roster, name]) => (
              <MenuItem key={roster} value={roster}>
                {roster} - {typeof name === 'string' ? name : 'Error'}
              </MenuItem>
            ))}
            <MenuItem key="new" value="New">
              New
            </MenuItem>
          </Select>
          {selected === 'New' ? (
            <Box mt={2}>
              <TextField
                label="Filename"
                fullWidth
                value={newName}
                onChange={(e) => setNewFilename(e.target.value)}
                variant="outlined"
              />
              <Button
                variant="contained"
                onClick={async () => {
                  const roster = await createRoster(newName, gameData.gameSystem)
                  setRoster(roster)
                }}
                sx={{ mt: 2 }}
              >
                Create <code>{newName}.rosz</code>
              </Button>
            </Box>
          ) : (
            <Box mt={2}>
              {typeof rosters[selected] !== 'string' && (
                <Typography color="error">
                  BlueScribe is having trouble parsing <code>{selected}</code>. It may not be a valid roster file, or
                  this could be a bug.
                </Typography>
              )}
              <Button
                variant="contained"
                disabled={typeof rosters[selected] !== 'string'}
                onClick={async () => {
                  setRoster(await loadRoster(selected, fs, rosterPath), false)
                }}
                sx={{ mt: 2, mr: 2 }}
              >
                Load
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={async () =>
                  await confirmDelete(async () => {
                    await deleteRoster(selected, fs, rosterPath)
                    setRosters(null)
                  })
                }
                sx={{ mt: 2 }}
              >
                Delete
              </Button>
            </Box>
          )}
          {!!shellOpen && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={async () => {
                await shellOpen(rosterPath)
              }}
              sx={{ mt: 2 }}
            >
              Open roster directory
            </Button>
          )}
        </Box>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress color="primary" />
        </Box>
      )}
    </Box>
  )
}

export default SelectRoster
