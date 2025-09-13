import { useState } from 'react'
import _ from 'lodash'

import { usePath, useRoster, useSystem } from '../Context.js'
import { addForce, gatherCatalogues } from '../utils.js'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

const gatherForceEntries = (faction, gameData) =>
  _.sortBy(_.flatten(gatherCatalogues(gameData.catalogues[faction], gameData).map((c) => c.forceEntries || [])), 'name')

// Compact Add Force form for popovers and centered card
const AddForceForm = ({ onAdded }) => {
  const gameData = useSystem()
  const catalogues = _.sortBy(gameData.catalogues, 'name').filter((c) => !c.library)

  const [faction, setFaction] = useState(catalogues[0]?.id)
  const forceEntries = gatherForceEntries(faction, gameData)
  const [force, setForce] = useState(forceEntries[0]?.id)

  const [roster, setRoster] = useRoster()
  const [, setPath] = usePath()

  return (
    <Stack spacing={2} sx={{ minWidth: 320 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="faction-label-inline">Faction</InputLabel>
        <Select
          labelId="faction-label-inline"
          label="Faction"
          value={faction || ''}
          onChange={(e) => {
            const id = e.target.value
            setFaction(id)
            const first = gatherForceEntries(id, gameData)[0]
            setForce(first?.id)
          }}
        >
          {catalogues.map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="detachment-label-inline">Detachment</InputLabel>
        <Select
          labelId="detachment-label-inline"
          label="Detachment"
          value={force || ''}
          onChange={(e) => setForce(e.target.value)}
        >
          {forceEntries.map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            addForce(roster, force, faction, gameData)
            setRoster(roster)
            setPath(`forces.force.${roster.forces.force.length - 1}`)
            onAdded && onAdded()
          }}
          disabled={!faction || !force}
        >
          Add
        </Button>
      </Box>
    </Stack>
  )
}

export default AddForceForm
