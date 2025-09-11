import _ from 'lodash'

import { costString, sumCosts, selectionName, getMinCount } from '../utils.js'
import { useRoster, useRosterErrors, usePath, useSystem } from '../Context.js'
import { getEntry, pathParent } from '../validate.js'
import TableRow from '@mui/material/TableRow/index.js'
import TableCell from '@mui/material/TableCell/index.js'

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

  // Build a concise summary of leaf choices; duplicates are aggregated (Name ×N)
  const upgrades = (() => {
    const items = (selection.selections?.selection || [])
      .map((s, i) => ({
        s,
        entry: getEntry(roster, `${selectionPath}.selections.selection.${i}`, s.entryId, gameData),
      }))
      .filter(
        ({ s, entry }) =>
          entry && !entry.selectionEntries && !entry.selectionEntryGroups && !s.selections?.selection?.length,
      )

    // Aggregate duplicates: "Name ×N"
    const counts = {}
    items.forEach(({ s }) => {
      const name = s.name
      counts[name] = (counts[name] || 0) + (typeof s.number === 'number' ? s.number : 1)
    })
    return Object.entries(counts)
      .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
      .sort()
      .join(', ')
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
          {selectionName(selection)}
          {!!upgrades && <small>{' - ' + upgrades}</small>}
        </TableCell>
        <TableCell className="cost">{costString(sumCosts(selection))}</TableCell>
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
      {_.sortBy(selection.selections?.selection, 'name')
        .filter((s, i) => {
          const entry = getEntry(roster, `${selectionPath}.selections.selection.${i}`, s.entryId, gameData)
          const isLeaf =
            entry && !entry.selectionEntries && !entry.selectionEntryGroups && !s.selections?.selection?.length
          const hasError =
            rosterErrors[`${selectionPath}.selections.selection.${selection.selections.selection.indexOf(s)}`]
          // Only render non-leaf children (or any with errors). Leaves are summarized in the parent row.
          return entry && (!isLeaf || hasError)
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
