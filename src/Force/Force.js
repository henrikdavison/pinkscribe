import _ from 'lodash'
import { Fragment, useState } from 'react'

import { useRoster, useRosterErrors, useSystem, useConfirm, usePath } from '../Context.js'
import AddUnit from './AddUnit.js'
import Selection from './Selection.js'
import { costString, findId, sumCosts } from '../utils.js'
import { pathToForce } from '../validate.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import Button from '@mui/material/Button/index.js'
import Fab from '@mui/material/Fab/index.js'
import AddUnitDrawer from './AddUnitDrawer.js'
import useMediaQuery from '@mui/material/useMediaQuery/index.js'
import { useTheme } from '@mui/material/styles/index.js'
import { Plus, Copy } from 'lucide-react'
import List from '@mui/material/List/index.js'
import ListSubheader from '@mui/material/ListSubheader/index.js'
import ListItemButton from '@mui/material/ListItemButton/index.js'
import ListItemText from '@mui/material/ListItemText/index.js'
import IconButton from '@mui/material/IconButton/index.js'
import Divider from '@mui/material/Divider/index.js'
import { Trash2 } from 'lucide-react'
import { getEntry, pathParent } from '../validate.js'
import { getMinCount, copySelection } from '../utils.js'
import ConfigPills from './ConfigPills.js'
import Collapse from '@mui/material/Collapse/index.js'
import { TransitionGroup } from 'react-transition-group'

const Force = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const forcePath = pathToForce(path)
  const force = _.get(roster, forcePath)
  window.force = force
  const confirmDelete = useConfirm(true, `Delete ${force.name}?`)

  const [openSections, setOpenSections] = useState({})
  const [addOpen, setAddOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const errors = useRosterErrors()[forcePath]

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

  const categories = force.categories.category.map((category) => {
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
            top: (theme) => theme.spacing(8),
            zIndex: (theme) => theme.zIndex.appBar - 1,
            cursor: 'pointer',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {name}
          </Typography>
        </ListSubheader>
        {open && (
          <TransitionGroup component={null}>
            {_.sortBy(selections[category.entryId], 'name').map((selection) => {
              const idx = selectionIndex.get(selection)
              const selectionPath = `${forcePath}.selections.selection.${idx}`
              const summary = summarizeChildren(selection)
              const selectedRow = selectionPath === path
              const cost = costString(sumCosts(selection))
              const canDelete = canDeleteSelection(selection, selectionPath)
              return (
                <Collapse key={selection.id}>
                  <ListItemButton
                    dense
                    selected={selectedRow}
                    onClick={() => setPath(selectionPath)}
                    sx={{ px: 2, py: 1, alignItems: 'flex-start', display: 'flex' }}
                  >
                    <ListItemText
                      primary={selection.name}
                      primaryTypographyProps={{
                        component: 'div',
                        variant: 'subtitle1',
                        fontWeight: 600,
                        sx: { whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'normal', hyphens: 'manual' },
                      }}
                      secondary={summary || null}
                      secondaryTypographyProps={{
                        component: 'div',
                        variant: 'body2',
                        color: 'text.secondary',
                        sx: {
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          whiteSpace: 'normal',
                          wordBreak: 'keep-all',
                          overflowWrap: 'normal',
                          hyphens: 'manual',
                        },
                      }}
                    />
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
        )}
      </Fragment>
    )
  })

  const globalErrors = _.uniq(errors?.filter((e) => !e.includes('must have')))

  const cost = costString(sumCosts(force))

  return (
    <Box component="section">
      <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {force.catalogueName} <Typography component="span">{force.name}</Typography>
        {cost && (
          <Typography component="span" variant="caption">
            {cost}
          </Typography>
        )}
        {errors && (
          <Typography
            component="span"
            color="error"
            data-tooltip-id="tooltip"
            data-tooltip-html={errors.join('<br />')}
          >
            Validation errors
          </Typography>
        )}
        <Button
          size="small"
          variant="outlined"
          onClick={async () => {
            await confirmDelete(() => {
              _.pull(roster.forces.force, force)
              setRoster(roster)
              setPath('')
            })
          }}
          sx={{ ml: 'auto' }}
        >
          Remove
        </Button>
      </Typography>
      {!!globalErrors?.length && (
        <ul className="errors">
          {globalErrors.map((e, i) => (
            <li key={i}>
              {e}{' '}
              <small
                role="link"
                onClick={() => {
                  try {
                    window.__explainError && window.__explainError(e)
                  } catch {}
                }}
              >
                Explain
              </small>
              {' · '}
              <small
                role="link"
                onClick={async () => {
                  try {
                    const details = window.errorMap?.[e] || []
                    const text = JSON.stringify(details, null, 2)
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(text)
                    } else {
                      const ta = document.createElement('textarea')
                      ta.value = text
                      ta.style.position = 'fixed'
                      ta.style.opacity = '0'
                      document.body.appendChild(ta)
                      ta.focus()
                      ta.select()
                      document.execCommand('copy')
                      document.body.removeChild(ta)
                    }
                  } catch {}
                }}
              >
                Copy details
              </small>
            </li>
          ))}
        </ul>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '420px 1fr 0.8fr' }, gap: 2 }}>
        {/* Left: Add Unit (desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1 }}>
            Add Unit
          </Typography>
          <Box sx={{ px: 2 }}>
            <AddUnit />
          </Box>
        </Box>

        {/* Middle: Selections list */}
        <Box
          className="selections"
          sx={{ pr: { md: 2 }, borderRight: { md: (theme) => `1px solid ${theme.palette.divider}` } }}
        >
          <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1 }}>
            Selections
          </Typography>
          <ConfigPills forcePath={forcePath} getEntry={getEntry} />
          <List sx={{ pt: 0, pl: 0, listStyle: 'none' }}>{categories}</List>
        </Box>
        {/* Right: Unit details */}
        <Box sx={{ pl: { md: 2 } }}>{path === forcePath ? null : <Selection errors={errors} />}</Box>
      </Box>
      {isMobile && (
        <>
          <Fab
            color="primary"
            aria-label="Add unit"
            onClick={() => setAddOpen(true)}
            sx={{ position: 'fixed', bottom: theme.spacing(3), right: theme.spacing(3) }}
          >
            <Plus size={20} />
          </Fab>
          <AddUnitDrawer open={addOpen} onClose={() => setAddOpen(false)} />
        </>
      )}
    </Box>
  )
}

export default Force
