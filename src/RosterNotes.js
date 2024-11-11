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
        element={TextField}
        elementProps={{
          multiline: true,
          fullWidth: true,
          onChange: (e) => {
            roster.customNotes = e.target.value
            setRoster(roster)
          },
        }}
      />
    </Box>
  )
}

export default RosterNotes
