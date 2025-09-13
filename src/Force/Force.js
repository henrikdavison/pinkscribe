import _ from 'lodash'
import { Fragment, useState } from 'react'

import { useRoster, useRosterErrors, useSystem, usePath } from '../Context.js'
import AddUnit from './AddUnit.js'
import Selection from './Selection.js'
import { costString, findId, sumCosts } from '../utils.js'
import { pathToForce } from '../validate.js'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import AddUnitDrawer from './AddUnitDrawer.js'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme, alpha } from '@mui/material/styles'
import { Plus, Copy, AlertTriangle, ChevronDown } from 'lucide-react'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItemButton from '@mui/material/ListItemButton'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import { Trash2 } from 'lucide-react'
import { getEntry, pathParent } from '../validate.js'
import { getMinCount, copySelection } from '../utils.js'
import ConfigPills from './ConfigPills.js'
import Collapse from '@mui/material/Collapse'
import { TransitionGroup } from 'react-transition-group'
import Fade from '@mui/material/Fade'
import pluralize from 'pluralize'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

const Force = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const forcePath = pathToForce(path)
  const force = _.get(roster, forcePath)
  window.force = force

  const [openSections, setOpenSections] = useState({})
  const [addOpen, setAddOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const errorsMap = useRosterErrors()
  const errorsForce = errorsMap[forcePath]

  if (!force) {
    return null
  }

  // Build grouping fresh so UI reflects immediate add/remove without relying on array identity
  const selectionIndex = new Map()
  const selections = {}
  force.selections?.selection?.forEach((s, i) => {
    selectionIndex.set(s, i)
    const primary = _.find(s.categories?.category, 'primary')?.entryId || '(No Category)'
    selections[primary] = selections[primary] || []
    selections[primary].push(s)
  })

  // Helpers for list rendering
  const summarizeChildren = (selection /*, selectionPath */) => {
    const children = selection.selections?.selection || []
    const counts = {}
    children.forEach((child) => {
      const amount = typeof child.number === 'number' ? child.number : 1
      counts[child.name] = (counts[child.name] || 0) + amount
    })
    return Object.entries(counts)
      .map(([name, n]) => (n > 1 ? `${n}x ${name}` : name))
      .sort()
      .join(' · ')
  }

  const canDeleteSelection = (selection, selectionPath) => {
    const parent = _.get(roster, pathParent(selectionPath))
    const entry = getEntry(roster, `${selectionPath}`, selection.entryId, gameData)
    const groupEntry = selection.entryGroupId
      ? getEntry(roster, `${selectionPath}`, selection.entryGroupId, gameData)
      : null
    const entryMin = entry ? getMinCount(entry) : 0
    const groupMin = groupEntry ? getMinCount(groupEntry) : 0
    const siblings = parent?.selections?.selection || []
    if (groupEntry && groupMin > 0) {
      const groupCount = siblings.filter((s) => s.entryGroupId === selection.entryGroupId).length
      return groupCount > groupMin
    } else if (entry && entryMin > 0) {
      if (entry.collective) {
        const total = _.sum(
          siblings
            .filter((s) => s.entryId === selection.entryId)
            .map((s) => (typeof s.number === 'number' ? s.number : 1)),
        )
        return total > entryMin
      } else {
        const count = siblings.filter((s) => s.entryId === selection.entryId).length
        return count > entryMin
      }
    }
    return true
  }

  const categories = (force.categories?.category || []).map((category) => {
    if (!selections[category.entryId]) return null
    const { name } = findId(gameData, gameData.catalogues[force.catalogueId], category.entryId)
    if (name === 'Configuration') return null
    const open = openSections[name] || openSections[name] === undefined
    return (
      <Fragment key={name}>
        <ListSubheader
          component="div"
          onClick={() => setOpenSections({ ...openSections, [name]: !open })}
          sx={{
            position: 'sticky',
            // Stay below AppBar + roster header
            top: { xs: 112, md: 120 },
            zIndex: (t) => t.zIndex.appBar - 2,
            cursor: 'pointer',
            bgcolor: 'background.default',
            px: 2,
            py: 0.75,
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.1, color: 'text.secondary' }}>
              {name}
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
          <TransitionGroup component={null}>
            {_.sortBy(selections[category.entryId], 'name').map((selection) => {
              const idx = selectionIndex.get(selection)
              const selectionPath = `${forcePath}.selections.selection.${idx}`
              const summary = summarizeChildren(selection)
              const selectedRow = selectionPath === path
              const cost = costString(sumCosts(selection))
              const canDelete = canDeleteSelection(selection, selectionPath)

              // Collect selection-specific issues
              const selectionPathIssues = _.flatten(
                Object.entries(errorsMap)
                  .filter(([key]) => key === selectionPath || key.startsWith(selectionPath + '.'))
                  .map(([, value]) => value || []),
              )
              const forceLevelMatches = (errorsForce || []).filter(
                (e) =>
                  typeof e === 'string' &&
                  (e.includes(selection.name) ||
                    e.includes(pluralize(selection.name)) ||
                    e.includes(pluralize.singular(selection.name))),
              )
              const selectionIssues = _.uniq([
                ...selectionPathIssues.map((e) => (typeof e === 'string' ? e : e?.message || String(e))),
                ...forceLevelMatches,
              ])
              const selectionTooltip = selectionIssues.length ? selectionIssues.join('<br />') : null
              return (
                <Collapse key={selection.id}>
                  <ListItemButton
                    dense
                    selected={selectedRow}
                    onClick={() => setPath(selectionPath)}
                    sx={{
                      px: 2,
                      py: 1,
                      alignItems: 'flex-start',
                      display: 'flex',
                      bgcolor:
                        selectionIssues.length > 0
                          ? (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.14 : 0.08)
                          : 'transparent',
                      transition: 'background-color 160ms ease',
                    }}
                  >
                    <Box sx={{ position: 'relative', flex: 1, minWidth: 0, mr: 1 }}>
                      {/* Primary line wrapper so icon can center against title, not the whole block */}
                      <Box sx={{ position: 'relative', display: 'block' }}>
                        <Fade in={selectionIssues.length > 0} mountOnEnter unmountOnExit timeout={160}>
                          <IconButton
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                            disableRipple
                            disableFocusRipple
                            data-tooltip-id="tooltip"
                            data-tooltip-html={selectionTooltip}
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
                          component="div"
                          variant="subtitle2"
                          fontWeight={600}
                          noWrap
                          sx={{
                            pr: 1,
                            pl: selectionIssues.length > 0 ? 3 : 0,
                            transition: 'padding-left 160ms ease',
                            minWidth: 0,
                          }}
                        >
                          {selection.name}
                        </Typography>
                      </Box>
                      <Typography
                        component="div"
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          whiteSpace: 'normal',
                          wordBreak: 'keep-all',
                          overflowWrap: 'normal',
                          hyphens: 'manual',
                          pr: 1,
                        }}
                      >
                        {summary || null}
                      </Typography>
                    </Box>
                    {cost && (
                      <Typography variant="caption" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                        {cost}
                      </Typography>
                    )}
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label="duplicate"
                      onClick={(e) => {
                        e.stopPropagation()
                        const parent = _.get(roster, pathParent(selectionPath))
                        parent.selections = parent.selections || { selection: [] }
                        parent.selections.selection.push(copySelection(selection))
                        setRoster(roster)
                        const newIdx = parent.selections.selection.length - 1
                        const basePath = pathParent(selectionPath)
                        setPath(`${basePath}.selections.selection.${newIdx}`)
                      }}
                      sx={{ ml: 1 }}
                    >
                      <Copy size={18} />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label="delete"
                      disabled={!canDelete}
                      onClick={(e) => {
                        e.stopPropagation()
                        const parent = _.get(roster, pathParent(selectionPath))
                        _.pull(parent.selections.selection, selection)
                        setRoster(roster)
                        let newPath = selectionPath
                        while (!_.get(roster, newPath)) newPath = pathParent(newPath)
                        setPath(newPath)
                      }}
                      sx={{ ml: 1 }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </ListItemButton>
                  <Divider component="div" />
                </Collapse>
              )
            })}
          </TransitionGroup>
        </Collapse>
      </Fragment>
    )
  })

  // Global error list replaced by chip tooltip; keep UI subtle

  const selectionOpen = isMobile && path !== forcePath
  const currentSelection = selectionOpen ? _.get(roster, path) : null
  const currentCanDelete = currentSelection ? canDeleteSelection(currentSelection, path) : false

  return (
    <Box component="section">
      {/* Force-level details list removed in favor of softer chip/tooltip */}
      {/* Row-level gutters: none on mobile, 24px on desktop */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '420px 1fr 0.8fr' },
          gap: 2,
          px: { xs: 0, md: 3 },
        }}
      >
        {/* Left: Add Unit (desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box>
            <AddUnit />
          </Box>
        </Box>

        {/* Middle: Selections list */}
        <Box className="selections">
          {isMobile ? (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1 }}>
                Selections
              </Typography>
              <ConfigPills forcePath={forcePath} getEntry={getEntry} />
              <List sx={{ pt: 0, pl: 0, listStyle: 'none' }}>{categories}</List>
            </Box>
          ) : (
            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1 }}>
                  Selections
                </Typography>
                <ConfigPills forcePath={forcePath} getEntry={getEntry} />
                <List sx={{ pt: 0, pl: 0, listStyle: 'none' }}>{categories}</List>
              </CardContent>
            </Card>
          )}
        </Box>
        {/* Right: Unit details (desktop only) */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {!isMobile && path !== forcePath ? (
            <Card variant="outlined">
              <CardContent>
                <Selection />
              </CardContent>
            </Card>
          ) : null}
        </Box>
      </Box>
      {isMobile && (
        <>
          <Fab
            color="primary"
            variant="extended"
            aria-label="Add unit"
            onClick={() => setAddOpen(true)}
            sx={{
              position: 'fixed',
              // Respect safe-area on mobile browsers (iOS Safari etc)
              bottom: {
                xs: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                sm: theme.spacing(3),
              },
              right: {
                xs: 'calc(env(safe-area-inset-right, 0px) + 16px)',
                sm: theme.spacing(3),
              },
              height: 48,
              // Ensure icon sits optically centered
              '& svg': { marginRight: 8 },
            }}
          >
            <Plus size={18} />
            Add unit
          </Fab>
          <AddUnitDrawer open={addOpen} onClose={() => setAddOpen(false)} />
          {/* Mobile selection panel in a bottom drawer */}
          <SwipeableDrawer
            anchor="bottom"
            open={selectionOpen}
            onClose={() => setPath(forcePath)}
            onOpen={() => {}}
            disableBackdropTransition
            PaperProps={{
              elevation: 0,
              sx: {
                maxHeight: '85vh',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
                bgcolor: 'background.default',
              },
            }}
          >
            <Box sx={{ pt: 1, pb: 8, px: 2 }}>
              {/* Handle */}
              <Box sx={{ width: 36, height: 4, bgcolor: 'text.disabled', borderRadius: 2, mx: 'auto', mb: 1 }} />
              {selectionOpen ? <Selection /> : null}
            </Box>
            {/* Bottom actions */}
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                borderTop: (t) => `1px solid ${t.palette.divider}`,
                bgcolor: 'background.default',
                p: 1.25,
                display: 'flex',
                gap: 1,
                justifyContent: 'space-between',
              }}
            >
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={18} />}
                disabled={!currentCanDelete}
                onClick={() => {
                  const parent = _.get(roster, pathParent(path))
                  if (!currentSelection || !parent) return
                  _.pull(parent.selections.selection, currentSelection)
                  setRoster(roster)
                  setPath(forcePath)
                }}
                sx={{ minWidth: 120 }}
              >
                Delete
              </Button>
              <Button variant="contained" onClick={() => setPath(forcePath)} sx={{ minWidth: 120 }}>
                Done
              </Button>
            </Box>
          </SwipeableDrawer>
        </>
      )}
    </Box>
  )
}

export default Force
