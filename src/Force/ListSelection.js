import _ from 'lodash'
import { Box, Typography, Table, TableBody, TableCell, TableRow, Tooltip, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

import { costString, sumCosts, selectionName } from '../utils'
import { useRoster, useRosterErrors, usePath, useSystem } from '../Context'
import { getEntry, pathParent } from '../validate'

const ListSelection = ({ indent, selectionPath, selection }) => {
  const gameData = useSystem()
  const rosterErrors = useRosterErrors()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const selected = selectionPath === path

  const selectionErrors = _.flatten(
    Object.entries(useRosterErrors())
      .filter(([key, value]) => key === selectionPath || key.startsWith(selectionPath + '.'))
      .map(([key, value]) => value),
  )

  const upgrades = (
    selection.selections?.selection.filter((s, i) => {
      const entry = getEntry(roster, `${selectionPath}.selections.selection.${i}`, s.entryId, gameData)
      return entry && !entry.selectionEntries && !entry.selectionEntryGroups && !s.selections
    }) || []
  )
    .map(selectionName)
    .sort()
    .join(', ')

  return (
    <>
      <TableRow selected={selected} sx={{ cursor: 'pointer' }} onClick={() => setPath(selectionPath)}>
        <TableCell>
          <Tooltip title={selectionErrors.join('<br />') || ''} arrow>
            <Typography variant="body1" sx={{ ml: indent * 2 }}>
              {selectionName(selection)}
              {!!upgrades && (
                <Typography component="span" variant="body2">
                  {' - ' + upgrades}
                </Typography>
              )}
            </Typography>
          </Tooltip>
        </TableCell>
        <TableCell align="right">
          <Typography>{costString(sumCosts(selection))}</Typography>
        </TableCell>
        <TableCell align="center">
          <IconButton
            onClick={(e) => {
              const parent = _.get(roster, pathParent(selectionPath))
              _.pull(parent.selections.selection, selection)
              setRoster(roster)

              if (selected) {
                // If this entry was currently selected, the path might still be valid, but
                // now pointing to a different entry. Thus, we hop one level up.
                selectionPath = pathParent(selectionPath)
              }

              while (!_.get(roster, selectionPath)) {
                selectionPath = pathParent(selectionPath)
              }
              setPath(selectionPath)

              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      {_.sortBy(selection.selections?.selection, 'name')
        .filter((s, i) => {
          const entry = getEntry(roster, `${selectionPath}.selections.selection.${i}`, s.entryId, gameData)
          return (
            entry &&
            (entry.selectionEntries ||
              entry.selectionEntryGroups ||
              s.selections ||
              rosterErrors[`${selectionPath}.selections.selection.${selection.selections.selection.indexOf(s)}`])
          )
        })
        .map((subSelection) => (
          <ListSelection
            key={subSelection.id}
            indent={indent + 1}
            selection={subSelection}
            selectionPath={`${selectionPath}.selections.selection.${selection.selections.selection.indexOf(
              subSelection,
            )}`}
          />
        ))}
    </>
  )
}

export default ListSelection
