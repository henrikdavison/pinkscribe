import SwipeableDrawer from '@mui/material/SwipeableDrawer/index.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import IconButton from '@mui/material/IconButton/index.js'
import { X } from 'lucide-react'
import AddUnit from './AddUnit.js'

const AddUnitDrawer = ({ open, onClose }) => {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableBackdropTransition
      PaperProps={{
        sx: {
          maxHeight: '75vh',
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
            Add Unit
          </Typography>
          <IconButton onClick={onClose} aria-label="Close add unit">
            <X size={18} />
          </IconButton>
        </Box>
        <AddUnit />
      </Box>
    </SwipeableDrawer>
  )
}

export default AddUnitDrawer
