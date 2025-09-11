import _ from 'lodash'
import { Fragment } from 'react'
import pluralize from 'pluralize'

// Import functions and hooks for roster management and game data
import { useRoster, useRosterErrors, useSystem, useOpenCategories, usePath } from '../Context.js'
import { costString, addSelection, findId, gatherCatalogues, getCatalogue, getMaxCount } from '../utils.js'
import { getEntry } from '../validate.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import Table from '@mui/material/Table/index.js'
import TableBody from '@mui/material/TableBody/index.js'
import TableRow from '@mui/material/TableRow/index.js'
import TableCell from '@mui/material/TableCell/index.js'

// Helper function to check if there’s a validation error for a given category name
const hasMatchingError = (errors, name) => {
  return errors?.find(
    (e) =>
      e.includes(' have ') && (e.includes(name) || e.includes(pluralize(name)) || e.includes(pluralize.singular(name))),
  )
}

// Function to sum default costs for an entry and its child selections
const sumDefaultCosts = (entry, costs = {}) => {
  // Add the cost for each entry directly
  entry.costs?.forEach((cost) => (costs[cost.name] = (costs[cost.name] | 0) + cost.value))

  // Process each selection entry to add default costs based on constraints
  entry.selectionEntries?.forEach((selection) => {
    const count = selection.constraints?.find((c) => c.type === 'min' && c.scope === 'parent')?.value | 0
    selection.costs?.forEach((cost) => {
      if (cost.value && count) {
        costs[cost.name] = (costs[cost.name] | 0) + count * cost.value
      }
    })
  })

  // Handle grouped selection entries and add default costs
  entry.selectionEntryGroups?.forEach((selectionGroup) => {
    if (selectionGroup.defaultSelectionEntryId) {
      const count = selectionGroup.constraints?.find((c) => c.type === 'min' && c.scope === 'parent')?.value | 0
      const defaultEntry = selectionGroup.selectionEntries.find((e) =>
        e.id.includes(selectionGroup.defaultSelectionEntryId),
      )
      defaultEntry?.costs?.forEach((cost) => {
        if (cost.value && count) {
          costs[cost.name] = (costs[cost.name] | 0) + count * cost.value
        }
      })
    }
  })

  return costs
}

// Component to display the "Add Unit" section, allowing users to add units to the roster
const AddUnit = () => {
  const gameData = useSystem() // Fetch game data context
  const [roster, setRoster] = useRoster() // Get and update roster state
  const [path, setPath] = usePath() // Current path in roster for editing
  const rosterErrors = useRosterErrors() // Validation errors for the roster
  const [openCategories, setOpenCategories] = useOpenCategories() // Track open/closed state of categories

  const force = _.get(roster, path) // Get the current force in the roster based on path
  const catalogue = getCatalogue(roster, path, gameData) // Get the catalogue associated with this force

  const entries = {} // Object to store entries by category
  const categoryErrors = [] // Array to store errors related to categories

  // Parse each entry link and add it to `entries` if it’s valid
  const parseEntry = (entryLink) => {
    try {
      const entry = getEntry(roster, path, entryLink.id, gameData)

      // Only add entries that are visible and have a non-zero max count
      if (!entry.hidden && getMaxCount(entry) !== 0) {
        let primary = _.find(entry.categoryLinks, 'primary')?.targetId || '(No Category)'
        entries[primary] = entries[primary] || []
        entries[primary].push(entry)
      }
    } catch {}
  }

  // Gather all catalogues associated with this force and parse each entry
  gatherCatalogues(catalogue, gameData).forEach((c) => {
    c.entryLinks?.forEach(parseEntry)
    c.selectionEntries?.forEach(parseEntry)
  })

  // Create category rows to display available units for each category in the UI
  const categories = force.categories.category.map((category) => {
    if (!entries[category.entryId]) {
      return null // Skip if no entries exist for this category
    }

    const catEntries = _.sortBy(entries[category.entryId], 'name') // Sort entries alphabetically
    category = findId(gameData, catalogue, category.entryId) || category // Find category details from game data

    const open = openCategories[category.name] // Check if this category is open in the UI
    const error = hasMatchingError(rosterErrors[path], category.name) // Check if there’s an error for this category
    return (
      <Fragment key={category.name}>
        <TableRow has-error={error} className="category">
          <TableCell
            colSpan={2}
            data-tooltip-id="tooltip"
            data-tooltip-html={error}
            open={open}
            onClick={() =>
              setOpenCategories({
                ...openCategories,
                [category.name]: !open,
              })
            }
          >
            {category.name}
          </TableCell>
        </TableRow>
        {open &&
          catEntries.map((entry) => {
            const error = hasMatchingError(rosterErrors[path], entry.name)
            return (
              <TableRow
                has-error={error}
                key={entry.id}
                className="add-unit"
                onClick={() => {
                  addSelection(force, entry, gameData, null, catalogue)
                  setRoster(roster)
                  setPath(`${path}.selections.selection.${force.selections.selection.length - 1}`)
                }}
              >
                <TableCell data-tooltip-id="tooltip" data-tooltip-html={error}>
                  {entry.name}
                </TableCell>
                <TableCell className="cost">{costString(sumDefaultCosts(entry))}</TableCell>
              </TableRow>
            )
          })}
      </Fragment>
    )
  })

  // Render the Add Unit section with categories and entries
  return (
    <Box className="selections">
      <Typography variant="subtitle1" fontWeight={600}>
        Add Unit
      </Typography>
      {categoryErrors.length > 0 && <ul className="errors">{categoryErrors}</ul>}
      <Table size="small" role="grid">
        <TableBody>{categories}</TableBody>
      </Table>
    </Box>
  )
}

export default AddUnit
