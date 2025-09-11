import { useState } from 'react'
import _ from 'lodash'

import { usePath, useRoster, useRosterErrors, useSystem } from '../Context.js'
import { addForce, costString, gatherCatalogues, sumCosts } from '../utils.js'
import { gatherForces } from './SelectForce.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import FormControl from '@mui/material/FormControl/index.js'
import InputLabel from '@mui/material/InputLabel/index.js'
import Select from '@mui/material/Select/index.js'
import MenuItem from '@mui/material/MenuItem/index.js'
import Button from '@mui/material/Button/index.js'
import Stack from '@mui/material/Stack/index.js'

const gatherForceEntries = (faction, gameData) =>
  _.sortBy(_.flatten(gatherCatalogues(gameData.catalogues[faction], gameData).map((c) => c.forceEntries || [])), 'name')

const AddForce = () => {
  const gameData = useSystem()
  const errors = useRosterErrors()
  const catalogues = _.sortBy(gameData.catalogues, 'name').filter((c) => !c.library)

  const [faction, setFaction] = useState(catalogues[0].id)
  const forceEntries = gatherForceEntries(faction, gameData)

  const [force, setForce] = useState(forceEntries[0].id)
  const [roster, setRoster] = useRoster()
  const [, setPath] = usePath()

  const forces = gatherForces(roster)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Forces
        </Typography>
        <Stack spacing={1}>
          {forces.map((p) => {
            const f = _.get(roster, p)
            const forceErrors = _.flatten(
              Object.keys(errors)
                .filter((key) => key.startsWith(p))
                .map((key) => errors[key]),
            )
            const cost = costString(sumCosts(f))
            return (
              <Typography
                key={p}
                variant="subtitle2"
                sx={{ cursor: 'pointer' }}
                color={forceErrors.length ? 'error' : 'inherit'}
                data-tooltip-id="tooltip"
                data-tooltip-html={forceErrors.length ? forceErrors.join('<br />') : cost || undefined}
                onClick={() => setPath(p)}
              >
                {f.catalogueName} <Typography component="span">{f.name}</Typography>
              </Typography>
            )
          })}
        </Stack>
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Add Force
        </Typography>
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="faction-label">Faction</InputLabel>
            <Select
              labelId="faction-label"
              label="Faction"
              value={faction}
              onChange={(e) => {
                setFaction(e.target.value)
                setForce(gatherForceEntries(e.target.value, gameData)[0].id)
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
            <InputLabel id="detachment-label">Detachment</InputLabel>
            <Select
              labelId="detachment-label"
              label="Detachment"
              value={force}
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
              variant="contained"
              onClick={() => {
                addForce(roster, force, faction, gameData)
                setRoster(roster)
                setPath(`forces.force.${roster.forces.force.length - 1}`)
              }}
            >
              Add
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

export default AddForce
