import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
        elevation: 0,
        sx: {
          maxHeight: '75vh',
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ pt: 1, pb: 8, px: 2 }}>
        {/* Handle */}
        <Box sx={{ width: 36, height: 4, bgcolor: 'text.disabled', borderRadius: 2, mx: 'auto', mb: 1 }} />
        <AddUnit />
      </Box>
      {/* Bottom action bar */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          p: 1,
          bgcolor: 'background.default',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Button fullWidth variant="contained" onClick={onClose}>
          Close
        </Button>
      </Box>
    </SwipeableDrawer>
  )
}

export default AddUnitDrawer
