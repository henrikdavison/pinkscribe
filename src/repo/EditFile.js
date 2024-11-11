import { useFile, useSystem, useSetSystem } from './EditSystem'
import FileContents from './FileContents'
import { Box, Typography, TextField, Checkbox, Button, Collapse, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useState } from 'react'

const EditFile = ({ filename, setSelectedFile }) => {
  return (
    <Box component="article">
      <FileDetails filename={filename} setSelectedFile={setSelectedFile} />
      <FileContents filename={filename} />
    </Box>
  )
}

export default EditFile

const FileDetails = ({ filename, setSelectedFile }) => {
  const [file, updateFile] = useFile(filename)
  const system = useSystem()
  const setSystem = useSetSystem()
  const [open, setOpen] = useState(false)

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center">
        <Typography variant="h6" onClick={() => setOpen(!open)} sx={{ cursor: 'pointer' }}>
          {filename}
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Typography>
        <Typography
          variant="body2"
          ml={2}
          data-tooltip-id="tooltip"
          data-tooltip-html="Revision is automatically updated when a file is saved"
        >
          Revision {file.revision}
        </Typography>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box display="grid" gap={2} mt={2}>
          <Box>
            <Typography variant="subtitle1">Filename</Typography>
            <TextField
              fullWidth
              value={filename}
              onChange={(e) => {
                delete system[filename]
                file.__updated = true
                system[e.target.value] = file
                if (file.type === 'gameSystem') {
                  system.gameSystem = e.target.value
                }
                setSystem({ ...system })
                setSelectedFile(e.target.value)
              }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle1">{file.type === 'gameSystem' ? 'Game System' : 'Catalogue'}</Typography>
            {file.type !== 'gameSystem' && (
              <Box display="flex" alignItems="center" gap={1}>
                <Checkbox
                  checked={file.library}
                  onChange={(e) => {
                    file.library = e.target.checked
                    updateFile()
                  }}
                />
                <Typography>Library?</Typography>
              </Box>
            )}
            <TextField
              fullWidth
              value={file.name}
              onChange={(e) => {
                file.name = e.target.value
                updateFile()
              }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle1">Readme</Typography>
            <TextField
              fullWidth
              value={file.readme}
              onChange={(e) => {
                file.readme = e.target.value
                updateFile()
              }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle1">Author Details</Typography>
            <TextField
              fullWidth
              label="Author Name"
              value={file.authorName}
              onChange={(e) => {
                file.authorName = e.target.value
                updateFile()
              }}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Author Contact"
              value={file.authorContact}
              onChange={(e) => {
                file.authorContact = e.target.value
                updateFile()
              }}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Author URL"
              value={file.authorUrl}
              onChange={(e) => {
                file.authorUrl = e.target.value
                updateFile()
              }}
              sx={{ mt: 2 }}
            />
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
