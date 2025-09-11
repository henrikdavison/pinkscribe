import Dialog from '@mui/material/Dialog/index.js'
import DialogContent from '@mui/material/DialogContent/index.js'

const SelectionModal = ({ children, open, setOpen }) => {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
      <DialogContent>{children}</DialogContent>
    </Dialog>
  )
}

export default SelectionModal
