// I Think this is just underneath Add Force, the list that is generated and the add button at the bottom
import { useState } from 'react'
import _ from 'lodash'

import { usePath, useRoster, useRosterErrors, useSystem } from '../Context'
import { addForce, costString, gatherCatalogues, sumCosts } from '../utils'
import { gatherForces } from './SelectForce'
import { Box, Typography, Select, MenuItem, Button, Tooltip, FormControl, InputLabel } from '@mui/material'

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
    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
      <Box>
        <Typography variant="h5">Forces</Typography>
        {forces.map((path) => {
          const force = _.get(roster, path)
          const forceErrors = _.flatten(
            Object.keys(errors)
              .filter((p) => p.startsWith(path))
              .map((p) => errors[p]),
          )
          const cost = costString(sumCosts(force))
          return (
            <Typography key={path} variant="h6" align="left">
              {forceErrors.length ? (
                <Tooltip title={forceErrors.join('<br />')} arrow>
                  <span className="errors">!!</span>
                </Tooltip>
              ) : null}
              <span
                onClick={() => setPath(path)}
                role="link"
                style={{ cursor: 'pointer' }}
                data-tooltip-html={cost || undefined}
              >
                {force.catalogueName}
                <small>{force.name}</small>
              </span>
            </Typography>
          )
        })}
      </Box>
      <Box>
        <Typography variant="h6">Add Force</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>Faction</InputLabel>
          <Select
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
        <FormControl fullWidth margin="normal">
          <InputLabel>Detachment</InputLabel>
          <Select value={force} onChange={(e) => setForce(e.target.value)}>
            {forceEntries.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            addForce(roster, force, faction, gameData)
            setRoster(roster)
            setPath(`forces.force.${roster.forces.force.length - 1}`)
          }}
          sx={{ mt: 2 }}
        >
          Add
        </Button>
      </Box>
    </Box>
  )
}

export default AddForce
