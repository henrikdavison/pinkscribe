import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'

const SelectionModal = ({ children, open, setOpen }) => {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
      <DialogContent>{children}</DialogContent>
    </Dialog>
  )
}

export default SelectionModal
