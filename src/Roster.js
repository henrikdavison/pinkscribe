import { DebounceInput } from 'react-debounce-input'
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
    <Box>
      {errors[''] && errors[''].length > 0 && (
        <Accordion defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography color="error">Errors</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List className="errors">
              {errors[''].map((e, i) => (
                <ListItem key={i}>{e instanceof Error ? <BugReport error={e} /> : e}</ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
      {path === '' ? (
        <Box>
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
