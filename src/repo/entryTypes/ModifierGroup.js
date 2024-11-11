import _ from 'lodash'
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Tooltip,
  Collapse,
  IconButton,
} from '@mui/material'
import { Comment, Conditions, Modifiers, Repeats } from './fields'
import { useFile } from '../EditSystem'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useState } from 'react'

const ModifierGroup = ({ entry, on, filename, modifierGroup }) => {
  const [file, updateFile] = useFile(filename)
  const [open, setOpen] = useState(false)

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center">
        <IconButton
          onClick={() => {
            if (on.modifierGroups.length === 1) {
              delete on.modifierGroups
            } else {
              on.modifierGroups = _.pull(on.modifierGroups, modifierGroup)
            }
            updateFile()
          }}
          color="secondary"
        >
          -
        </IconButton>
        <Typography variant="h6" ml={2} onClick={() => setOpen(!open)} sx={{ cursor: 'pointer' }}>
          {modifierGroup.comment || 'Modifier Group'}
          <IconButton size="small">{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Typography>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2}>
                <Comment entry={modifierGroup} updateFile={updateFile} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2}>
                <Conditions entry={entry} on={modifierGroup} updateFile={updateFile} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2}>
                <Repeats entry={entry} on={modifierGroup} updateFile={updateFile} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2}>
                <Modifiers file={file} entry={entry} on={modifierGroup} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Collapse>
    </Box>
  )
}

export default ModifierGroup
