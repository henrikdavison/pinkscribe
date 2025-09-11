import { useRoster } from './Context.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import TextField from '@mui/material/TextField/index.js'

const RosterNotes = () => {
  const [roster, setRoster] = useRoster()
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Notes
      </Typography>
      <TextField
        multiline
        minRows={3}
        fullWidth
        value={roster.customNotes || ''}
        onChange={(e) => {
          roster.customNotes = e.target.value
          setRoster(roster)
        }}
      />
    </Box>
  )
}

export default RosterNotes
