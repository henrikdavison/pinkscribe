import { usePath, useRoster, useSystem, useRosterErrors, useUpdateRoster } from './Context.js'
import CostLimits from './CostLimits.js'
import RosterNotes from './RosterNotes.js'
import Force from './Force/Force.js'
import AddForce from './Force/AddForce.js'
import BugReport from './BugReport.js'
import SelectRoster from './SelectRoster.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import TextField from '@mui/material/TextField/index.js'

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
        <Box className="errors" component="ul" sx={{ color: '#cd3232' }}>
          {errors[''].map((e, i) => (
            <li key={i}>{e instanceof Error ? <BugReport error={e} /> : e}</li>
          ))}
        </Box>
      )}
      {path === '' ? (
        <Box component="section">
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Roster
          </Typography>
          <TextField
            size="small"
            fullWidth
            sx={{ mb: 2 }}
            label="Name"
            value={roster.name}
            onChange={(e) => updateRoster('name', e.target.value)}
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
