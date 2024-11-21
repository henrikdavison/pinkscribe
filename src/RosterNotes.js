import { DebounceInput } from 'react-debounce-input'
import { Box, Typography, TextField } from '@mui/material'
import { useRoster } from './Context'

const RosterNotes = () => {
  const [roster, setRoster] = useRoster()

  return (
    <Box>
      <Typography variant="h6">Notes</Typography>
      <DebounceInput
        debounceTimeout={300}
        value={roster.customNotes}
        onChange={(e) => {
          roster.customNotes = e.target.value
          setRoster(roster)
        }}
        element={(props) => <TextField {...props} multiline fullWidth />}
      />
    </Box>
  )
}

export default RosterNotes
