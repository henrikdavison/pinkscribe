import { DebounceInput } from 'react-debounce-input'
import { Box, Typography, TextField, List, ListItem, Button } from '@mui/material'
import { usePath, useRoster, useSystem, useRosterErrors, useUpdateRoster } from './Context'
import CostLimits from './CostLimits'
import RosterNotes from './RosterNotes'
import Force from './Force/Force'
import AddForce from './Force/AddForce'
import BugReport from './BugReport'
import SelectRoster from './SelectRoster'

const Roster = ({ currentForce, setCurrentForce }) => {
  const [roster] = useRoster()
  const updateRoster = useUpdateRoster()
  const errors = useRosterErrors()
  const gameData = useSystem()
  const [path] = usePath()
  window.roster = roster

  if (!roster || !gameData) {
    return <SelectRoster />
  }

  window.errors = errors

  return (
    <Box component="article">
      {errors[''] && (
        <List className="errors">
          {errors[''].map((e, i) => (
            <ListItem key={i}>{e instanceof Error ? <BugReport error={e} /> : e}</ListItem>
          ))}
        </List>
      )}
      {path === '' ? (
        <Box component="section">
          <TextField
            fullWidth
            variant="outlined"
            label="Roster Name"
            value={roster.name}
            onChange={(e) => updateRoster('name', e.target.value)}
            sx={{ mb: 2 }}
          />
          <CostLimits />
          <AddForce />
          <RosterNotes />
        </Box>
      ) : (
        <Force />
      )}
    </Box>
  )
}

export default Roster
