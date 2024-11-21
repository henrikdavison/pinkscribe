// I Think this is just underneath Add Force, the list that is generated and the add button at the bottom
import { useState } from 'react'
import _ from 'lodash'

import { usePath, useRoster, useRosterErrors, useSystem } from '../Context'
import { addForce, costString, gatherCatalogues, sumCosts, randomId, getMinForceCount } from '../utils'
import { gatherForces } from './SelectForce'
import { Box, Typography, Select, MenuItem, Button, Tooltip, FormControl, InputLabel } from '@mui/material'

const gatherForceEntries = (faction, gameData) => {
  if (!gameData?.catalogues[faction]) {
    console.warn('gatherForceEntries: Invalid faction or missing catalogue in gameData.', { faction, gameData })
    return []
  }

  const catalogues = gatherCatalogues(gameData.catalogues[faction], gameData)

  if (!catalogues || catalogues.length === 0) {
    console.warn('gatherForceEntries: Missing or empty catalogues returned.', { faction, gameData })
    return []
  }

  return _.sortBy(_.flatten(catalogues.map((c) => c.forceEntries || [])), 'name')
}

const AddForce = ({ roster, entry }) => {
  if (!roster || !entry) return null

  const minCount = getMinForceCount(roster, entry?.id || '')
  if (minCount > 0) {
    console.log(`Minimum count for this force is ${minCount}`)
  }

  const AddForce = () => {
    const gameData = useSystem()
    const errors = useRosterErrors()
    const catalogues = _.sortBy(gameData.catalogues, 'name').filter((c) => !c.library)

    const [faction, setFaction] = useState(catalogues[0]?.id || '')
    const forceEntries = gatherForceEntries(faction, gameData)

    const [force, setForce] = useState(forceEntries[0]?.id || '')
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
                const selectedFaction = e.target.value

                if (!gameData?.catalogues[selectedFaction]) {
                  console.warn('Faction selection is invalid or missing in gameData.', { selectedFaction, gameData })
                  setFaction('')
                  setForce('')
                  return
                }

                setFaction(selectedFaction)
                const newForceEntries = gatherForceEntries(selectedFaction, gameData)
                setForce(newForceEntries[0]?.id || '')
              }}
              displayEmpty
            >
              {catalogues.length > 0 ? (
                catalogues.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>
                  No factions available
                </MenuItem>
              )}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Detachment</InputLabel>
            <Select value={force} onChange={(e) => setForce(e.target.value)} displayEmpty>
              {forceEntries && forceEntries.length > 0 ? (
                forceEntries.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>
                  No detachments available
                </MenuItem>
              )}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const newForce = {
                id: randomId(),
                name: 'New Force',
                selections: { selection: [] },
                categories: { category: [] },
              }
              roster.forces.force.push(newForce)
              setRoster(roster) // Update roster with new force
              if (!roster?.forces?.force) {
                console.error('AddForce: Invalid roster structure:', roster)
                return
              }

              if (force && faction && typeof force === 'string' && typeof faction === 'string') {
                console.log('AddForce: Inputs:', { force, faction, roster, gameData })

                addForce(roster, force, faction, gameData)
                setRoster(roster)
                setPath(`forces.force.${roster.forces.force.length - 1}`)
                console.log('AddForce: Added new force and updated path.', { roster })
              } else {
                console.warn('AddForce: Invalid force or faction.', { force, faction })
              }
            }}
            sx={{ mt: 2 }}
            disabled={!force || !faction}
          >
            Add
          </Button>
        </Box>
      </Box>
    )
  }
}

export default AddForce
