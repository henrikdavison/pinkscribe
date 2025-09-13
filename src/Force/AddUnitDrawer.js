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
        {/* Handle (sticky) */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (t) => t.zIndex.appBar + 2,
            bgcolor: 'background.default',
            pt: 0.5,
            pb: 1,
          }}
        >
          <Box sx={{ width: 36, height: 4, bgcolor: 'text.disabled', borderRadius: 2, mx: 'auto' }} />
        </Box>
        <AddUnit />
      </Box>
      {/* Bottom action bar */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          pt: 1,
          px: 1,
          pb: (t) => `calc(${t.spacing(1)} + env(safe-area-inset-bottom, 0px))`,
          bgcolor: 'background.default',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
          zIndex: (t) => t.zIndex.appBar + 2,
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
