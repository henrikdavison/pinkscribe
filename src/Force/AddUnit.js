import _ from 'lodash'
import { Fragment } from 'react'
import pluralize from 'pluralize'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Collapse,
} from '@mui/material'

// Import functions and hooks for roster management and game data
import { useRoster, useRosterErrors, useSystem, useOpenCategories, usePath } from '../Context'
import { costString, addSelection, findId, gatherCatalogues, getCatalogue, getMaxCount } from '../utils'
import { getEntry } from '../validate'

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
        <TableRow>
          <TableCell colSpan={2} sx={{ cursor: 'pointer' }}>
            <Typography
              variant="h6"
              data-tooltip-id="tooltip"
              data-tooltip-html={error}
              onClick={() =>
                setOpenCategories({
                  ...openCategories,
                  [category.name]: !open, // Toggle open/closed state on click
                })
              }
            >
              {category.name}
            </Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={2}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              {catEntries.map((entry) => {
                const error = hasMatchingError(rosterErrors[path], entry.name)
                return (
                  <TableRow
                    key={entry.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      addSelection(force, entry, gameData, null, catalogue) // Add entry to roster on click
                      setRoster(roster) // Update roster state
                      setPath(`${path}.selections.selection.${force.selections.selection.length - 1}`) // Update path to new selection
                    }}
                  >
                    <TableCell data-tooltip-id="tooltip" data-tooltip-html={error}>
                      {entry.name}
                    </TableCell>
                    <TableCell>
                      <Typography>{costString(sumDefaultCosts(entry))}</Typography> {/* Display entry cost */}
                    </TableCell>
                  </TableRow>
                )
              })}
            </Collapse>
          </TableCell>
        </TableRow>
      </Fragment>
    )
  })

  // Render the Add Unit section with categories and entries
  return (
    <Box>
      <Typography variant="h6">Add Unit</Typography>
      {categoryErrors.length > 0 && (
        <Box component="ul" sx={{ color: 'error.main' }}>
          {categoryErrors.map((error, index) => (
            <Box component="li" key={index}>
              {error}
            </Box>
          ))}
        </Box>
      )}
      <TableContainer component={Paper}>
        <Table aria-label="add unit table">
          <TableBody>{categories}</TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default AddUnit
