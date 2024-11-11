import { useState } from 'react'
import _ from 'lodash'
import { Box, Typography, Select, MenuItem, Table, TableBody, TableRow, TableCell, Tooltip } from '@mui/material'

import { useFile } from './EditSystem'
import Category from './entryTypes/Category'

const gameSystemTypes = {
  categoryEntries: 'Categories',
  costTypes: 'Cost Types',
  entryLinks: 'Entry Links',
  forceEntries: 'Forces',
  profileTypes: 'Profile Types',
  publications: 'Publications',
  sharedProfiles: 'Shared Profiles',
  sharedRules: 'Shared Rules',
  sharedSelectionEntries: 'Shared Selections',
  sharedSelectionEntryGroups: 'Shared Selection Groups',
}

const catalogueTypes = {
  categoryEntries: 'Categories',
  catalogueLinks: 'Catalogue Links',
  entryLinks: 'Entry Links',
  forceEntries: 'Forces',
  publications: 'Publications',
  sharedProfiles: 'Shared Profiles',
  sharedRules: 'Shared Rules',
  sharedSelectionEntries: 'Shared Selections',
  sharedSelectionEntryGroups: 'Shared Selection Groups',
}

const singular = {
  ..._.mapValues(gameSystemTypes, (v) => v.slice(0, -1)),
  categoryEntries: 'Category',
}

const FileContents = ({ filename }) => {
  const [file] = useFile(filename)
  const [entryType, setEntryType] = useState('categoryEntries')
  const [selectedPath, setSelectedPath] = useState('')

  return (
    <Box className="edit-file" mb={4}>
      <Typography variant="h6" gutterBottom>
        {file.type === 'gameSystem' ? 'Game System' : 'Catalogue'}
      </Typography>
      <Box display="flex" gap={2}>
        <Box className="selections" flex={1}>
          <Select value={entryType} onChange={(e) => setEntryType(e.target.value)} fullWidth variant="outlined">
            {(file.type === 'gameSystem' ? gameSystemTypes : catalogueTypes).map(([type, name]) => (
              <MenuItem key={type} value={type}>
                {name}
              </MenuItem>
            ))}
          </Select>
          <Table>
            <TableBody>
              <TableRow
                onClick={() => setSelectedPath(entryType)}
                selected={entryType === selectedPath}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>Add {singular[entryType]}</TableCell>
              </TableRow>
              {(file[entryType] || []).map((entry, index) => (
                <TableRow
                  key={entry.id}
                  onClick={() => setSelectedPath(`${entryType}.${index}`)}
                  selected={selectedPath === `${entryType}.${index}`}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Tooltip title={entry.comment || ''} arrow>
                      <Typography>{entry.name}</Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box className="edit-entry" flex={2}>
          {entryElement(file, filename, selectedPath)}
        </Box>
      </Box>
    </Box>
  )
}

const entryElement = (file, filename, selectedPath) => {
  const entry = _.get(file, selectedPath)

  switch (selectedPath.split('.')[0]) {
    case 'categoryEntries':
      return <Category filename={filename} category={entry} />
    default:
      return `unsupported entryType: ${selectedPath}`
  }
}

export default FileContents
