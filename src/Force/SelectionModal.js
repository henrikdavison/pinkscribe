import { useRef, useEffect } from 'react'
import { Dialog, DialogContent, Box, useTheme } from '@mui/material'

const SelectionModal = ({ children, open, setOpen }) => {
  const ref = useRef()
  const theme = useTheme()

  useEffect(() => {
    if (open) {
      document.lastChild.classList.add('modal-is-open')
    } else {
      document.lastChild.classList.remove('modal-is-open')
    }

    const listener = (event) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }

      setOpen(false)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, setOpen, open])

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        <Box ref={ref} sx={{ ...theme.mixins.gutters }}>
          {children}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SelectionModal
