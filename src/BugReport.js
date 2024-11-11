import { Box, Typography, Link, Tooltip, Collapse, IconButton } from '@mui/material'
import { useState } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

const BugReport = ({ error }) => {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <Box>
      <Typography variant="body1" color="error">
        BlueScribe is having an issue validating {error.location}. This is a bug; please report it, along with a copy of
        your roster.{' '}
        <Link component="button" onClick={() => console.log(error)} underline="hover">
          Log error to console.
        </Link>
      </Typography>
      <Box mt={2}>
        <Box display="flex" alignItems="center" onClick={() => setDetailsOpen(!detailsOpen)} sx={{ cursor: 'pointer' }}>
          <Typography variant="body2">{error.message}</Typography>
          <IconButton size="small">{detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Box>
        <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
          <Box component="code" mt={2} whiteSpace="pre-wrap">
            {error.stack}
          </Box>
        </Collapse>
      </Box>
    </Box>
  )
}

export default BugReport
