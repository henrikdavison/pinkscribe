import _ from 'lodash'
import { Fragment, useMemo } from 'react'
import pluralize from 'pluralize'

// Import functions and hooks for roster management and game data
import { useRoster, useRosterErrors, useSystem, useOpenCategories, usePath } from '../Context.js'
import { costString, addSelection, findId, gatherCatalogues, getCatalogue, getMaxCount } from '../utils.js'
import { getEntry, pathToForce } from '../validate.js'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItemButton from '@mui/material/ListItemButton'
import IconButton from '@mui/material/IconButton'
import Fade from '@mui/material/Fade'
import { Plus, AlertTriangle, ChevronDown } from 'lucide-react'
import { alpha } from '@mui/material/styles'
import Collapse from '@mui/material/Collapse'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import config from '../config/configPills.json'

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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const forcePath = pathToForce(path)
  const force = _.get(roster, forcePath) // Always resolve to force, even when a selection is focused
  const catalogue = getCatalogue(roster, path, gameData) // Get the catalogue associated with this force
  // no transition here — update list synchronously for immediate feedback

  const entries = useMemo(() => {
    const map = {}
    const cats = new Set()
    const parseEntry = (entryLink) => {
      try {
        const entry = getEntry(roster, path, entryLink.id, gameData)
        if (!entry.hidden && getMaxCount(entry) !== 0) {
          let primary = _.find(entry.categoryLinks, 'primary')?.targetId || '(No Category)'
          map[primary] = map[primary] || []
          map[primary].push(entry)
          cats.add(primary)
        }
      } catch {}
    }
    gatherCatalogues(catalogue, gameData).forEach((c) => {
      c.entryLinks?.forEach(parseEntry)
      c.selectionEntries?.forEach(parseEntry)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, gameData, force?.id])

  // Create list sections per category (expand non-configuration by default)
  const categories = force.categories.category.map((category) => {
    if (!entries[category.entryId]) {
      return null // Skip if no entries exist for this category
    }

    const catEntries = _.sortBy(entries[category.entryId], 'name') // Sort entries alphabetically
    category = findId(gameData, catalogue, category.entryId) || category // Find category details from game data

    const sysId = gameData?.gameSystem?.id
    const sysName = gameData?.gameSystem?.name
    const sysCfg = config[sysId] ||
      config[sysName] ||
      config.default || { enabled: true, categoryNames: ['Configuration'] }
    const isConfig = (sysCfg.categoryNames || ['Configuration']).includes(category.name)
    const open = openCategories[category.name] ?? !isConfig // default open unless config
    const error = hasMatchingError(rosterErrors[path], category.name) // Check if there’s an error for this category
    return (
      <Fragment key={category.name}>
        <ListSubheader
          component="div"
          data-tooltip-id="tooltip"
          data-tooltip-html={error}
          onClick={() =>
            setOpenCategories({
              ...openCategories,
              [category.name]: !open,
            })
          }
          sx={{
            position: 'sticky',
            top: 8,
            zIndex: (t) => t.zIndex.appBar + 2,
            cursor: 'pointer',
            bgcolor: 'background.default',
            boxShadow: (t) => `0 1px 0 ${t.palette.divider}`,
            px: 2,
            py: 0.75,
            borderBottom: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.1, color: 'text.secondary' }}>
              {category.name}
            </Typography>
            <IconButton
              size="small"
              aria-label={open ? 'Collapse' : 'Expand'}
              sx={{
                ml: 'auto',
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 160ms ease',
              }}
            >
              <ChevronDown size={18} />
            </IconButton>
          </Box>
        </ListSubheader>
        <Collapse in={open} timeout="auto" unmountOnExit>
          {catEntries.map((entry) => {
            const error = hasMatchingError(rosterErrors[path], entry.name)
            const costsObj = sumDefaultCosts(entry)
            const cost = costString(costsObj)
            const perUnitCost = Object.values(costsObj).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
            const count =
              force.selections?.selection?.filter(
                (s) => _.last((s.entryId || '').split('::')) === _.last((entry.id || '').split('::')),
              ).length || 0
            const secondary =
              count > 0 ? `${count} selected${perUnitCost ? ` • ${count * perUnitCost} pts total` : ''}` : null
            const selected = count > 0
            return (
              <ListItemButton
                key={entry.id}
                dense
                onClick={() => {
                  addSelection(force, entry, gameData, null, catalogue)
                  setRoster(roster)
                  if (!isMobile) {
                    setPath(`${forcePath}.selections.selection.${force.selections.selection.length - 1}`)
                  }
                }}
                data-tooltip-id="tooltip"
                data-tooltip-html={error}
                selected={selected}
                sx={{
                  zIndex: 0,
                  px: 2,
                  py: 1,
                  alignItems: 'center',
                  bgcolor: error
                    ? (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.14 : 0.08)
                    : selected
                    ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.24 : 0.12)
                    : 'transparent',
                  transition: 'background-color 160ms ease, color 160ms ease',
                  '&.Mui-selected': {
                    bgcolor: (t) =>
                      `${alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.24 : 0.12)} !important`,
                  },
                }}
              >
                <Box sx={{ position: 'relative', flex: 1, minWidth: 0, mr: 1 }}>
                  {/* Primary line wrapper so icon centers on title */}
                  <Box sx={{ position: 'relative', display: 'block' }}>
                    <Fade in={!!error} mountOnEnter unmountOnExit timeout={160}>
                      <IconButton
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        disableRipple
                        disableFocusRipple
                        data-tooltip-id="tooltip"
                        data-tooltip-html={error}
                        sx={{
                          color: (t) => t.palette.warning.main,
                          p: 0.25,
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        aria-label="Show issues"
                        component="span"
                      >
                        <AlertTriangle size={16} />
                      </IconButton>
                    </Fade>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      noWrap
                      sx={{ pl: error ? 3 : 0, pr: 1, transition: 'padding-left 160ms ease', minWidth: 0 }}
                    >
                      {entry.name}
                    </Typography>
                  </Box>
                  <Collapse in={!!secondary} timeout={160} unmountOnExit>
                    <Typography variant="body2" color="text.secondary">
                      {secondary}
                    </Typography>
                  </Collapse>
                </Box>
                {cost && (
                  <Typography variant="caption" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                    {cost}
                  </Typography>
                )}
                <IconButton edge="end" size="small" aria-label="Add">
                  <Plus size={18} />
                </IconButton>
              </ListItemButton>
            )
          })}
        </Collapse>
      </Fragment>
    )
  })

  // Render the Add Unit list with sticky subheaders
  return (
    <Box>
      {/* Reserved for category-level errors */}
      <List sx={{ pt: 0, pl: 0, listStyle: 'none' }}>{categories}</List>
    </Box>
  )
}

export default AddUnit
