import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import Button from '@mui/material/Button/index.js'

const BugReport = ({ error }) => {
  return (
    <Box sx={{ my: 1 }}>
      <Typography color="error" sx={{ mb: 1 }}>
        PinkScribe is having an issue validating {error.location}. This is a bug; please report it, along with a copy of
        your roster.
      </Typography>
      <Button size="small" variant="outlined" onClick={() => console.log(error)}>
        Log error to console
      </Button>
      <details>
        <summary>{error.message}</summary>
        <code>{error.stack}</code>
      </details>
    </Box>
  )
}
export default BugReport
