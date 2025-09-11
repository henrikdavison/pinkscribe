import _ from 'lodash'

import { costString, sumCosts, selectionName, getMinCount } from '../utils.js'
import { useRoster, useRosterErrors, usePath, useSystem } from '../Context.js'
import { getEntry, pathParent } from '../validate.js'
import TableRow from '@mui/material/TableRow/index.js'
import TableCell from '@mui/material/TableCell/index.js'
import Typography from '@mui/material/Typography/index.js'

const ListSelection = ({ indent, selectionPath, selection }) => {
  const gameData = useSystem()
  const rosterErrors = useRosterErrors()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const selected = selectionPath === path ? 'selected' : ''

  const selectionErrors = _.flatten(
    Object.entries(useRosterErrors())
      .filter(([key, value]) => key === selectionPath || key.startsWith(selectionPath + '.'))
      .map(([key, value]) => value),
  )

  // Build a concise summary of immediate children only (indent 2).
  // Do NOT include deeper data to keep this view uncluttered.
  const upgrades = (() => {
    const children = selection.selections?.selection || []
    const counts = {}
    children.forEach((child, i) => {
      const entry = getEntry(roster, `${selectionPath}.selections.selection.${i}`, child.entryId, gameData)
      if (!entry) return
      const name = child.name
      const amount = typeof child.number === 'number' ? child.number : 1
      counts[name] = (counts[name] || 0) + amount
    })
    return Object.entries(counts)
      .map(([name, n]) => (n > 1 ? `${n}x ${name}` : name))
      .sort()
      .join(' · ')
  })()

  // Determine whether this selection can be deleted without violating min constraints
  const parent = _.get(roster, pathParent(selectionPath))
  const entry = getEntry(roster, `${selectionPath}`, selection.entryId, gameData)
  const groupEntry = selection.entryGroupId
    ? getEntry(roster, `${selectionPath}`, selection.entryGroupId, gameData)
    : null
  const entryMin = entry ? getMinCount(entry) : 0
  const groupMin = groupEntry ? getMinCount(groupEntry) : 0
  const siblings = parent?.selections?.selection || []

  let canDelete = true
  if (groupEntry && groupMin > 0) {
    const groupCount = siblings.filter((s) => s.entryGroupId === selection.entryGroupId).length
    canDelete = groupCount > groupMin
  } else if (entry && entryMin > 0) {
    if (entry.collective) {
      const total = _.sum(
        siblings
          .filter((s) => s.entryId === selection.entryId)
          .map((s) => (typeof s.number === 'number' ? s.number : 1)),
      )
      canDelete = total > entryMin
    } else {
      const count = siblings.filter((s) => s.entryId === selection.entryId).length
      canDelete = count > entryMin
    }
  }

  return (
    <>
      <TableRow
        hover
        has-error={selectionErrors.length || undefined}
        className={selected}
        onClick={() => setPath(selectionPath)}
        data-indent={indent}
      >
        <TableCell data-tooltip-id="tooltip" data-tooltip-html={selectionErrors.join('<br />') || undefined}>
          <Typography variant="subtitle1" fontWeight={600}>
            {selectionName(selection)}
          </Typography>
          {!!upgrades && (
            <Typography variant="body2" color="text.secondary" className="clamp-2">
              {upgrades}
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{costString(sumCosts(selection))}</TableCell>
        <TableCell align="right">
          {canDelete && (
            <span
              role="link"
              onClick={(e) => {
                const parent = _.get(roster, pathParent(selectionPath))
                _.pull(parent.selections.selection, selection)
                setRoster(roster)

                if (selected) {
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
              x
            </span>
          )}
        </TableCell>
      </TableRow>
      {null}
    </>
  )
}

export default ListSelection
