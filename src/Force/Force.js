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
import List from '@mui/material/List/index.js'
import ListSubheader from '@mui/material/ListSubheader/index.js'
import ListItemButton from '@mui/material/ListItemButton/index.js'
import ListItemText from '@mui/material/ListItemText/index.js'
import IconButton from '@mui/material/IconButton/index.js'
import Divider from '@mui/material/Divider/index.js'
import { Trash2 } from 'lucide-react'
import { getEntry, pathParent } from '../validate.js'
import { getMinCount } from '../utils.js'

const Force = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const forcePath = pathToForce(path)
  const force = _.get(roster, forcePath)
  window.force = force
  const confirmDelete = useConfirm(true, `Delete ${force.name}?`)

  const [openSections, setOpenSections] = useState({})

  const errors = useRosterErrors()[forcePath]

  const selections = {}
  const parseSelection = (selection) => {
    const primary = _.find(selection.categories?.category, 'primary')?.entryId || '(No Category)'
    if (!primary) {
      debugger
    }
    selections[primary] = selections[primary] || []
    selections[primary].push(selection)
  }

  force.selections?.selection.forEach(parseSelection)

  // Helpers for list rendering
  const summarizeChildren = (selection, selectionPath) => {
    const children = selection.selections?.selection || []
    const counts = {}
    children.forEach((child, i) => {
      const entry = getEntry(roster, `${selectionPath}.selections.selection.${i}`, child.entryId, gameData)
      if (!entry) return
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

  const categories = force.categories.category
    .filter((category) => category.entryId !== 'Configuration')
    .map((category) => {
      if (!selections[category.entryId]) return null
      const { name } = findId(gameData, gameData.catalogues[force.catalogueId], category.entryId)
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
          {open &&
            _.sortBy(selections[category.entryId], 'name').map((selection) => {
              const selectionPath = `${forcePath}.selections.selection.${force.selections.selection.indexOf(selection)}`
              const summary = summarizeChildren(selection, selectionPath)
              const selectedRow = selectionPath === path
              const cost = costString(sumCosts(selection))
              const canDelete = canDeleteSelection(selection, selectionPath)
              return (
                <Fragment key={selection.id}>
                  <ListItemButton
                    dense
                    selected={selectedRow}
                    onClick={() => setPath(selectionPath)}
                    sx={{ px: 2, py: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          {selection.name}
                        </Typography>
                      }
                      secondary={
                        summary ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {summary}
                          </Typography>
                        ) : null
                      }
                    />
                    {cost && (
                      <Typography variant="caption" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                        {cost}
                      </Typography>
                    )}
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
                </Fragment>
              )
            })}
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
      <Box className="grid columns">
        <Box className="selections" sx={{ pr: 2, borderRight: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1 }}>
            Selections
          </Typography>
          <List sx={{ pt: 0 }}>
            <ListItemButton
              dense
              selected={path === forcePath}
              onClick={() => setPath(forcePath)}
              sx={{ px: 2, py: 1 }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight={600}>
                    Add Unit
                  </Typography>
                }
              />
            </ListItemButton>
            <Divider component="div" />
            {categories}
          </List>
        </Box>
        <Box sx={{ pl: 2 }}>{path === forcePath ? <AddUnit errors={errors} /> : <Selection errors={errors} />}</Box>
      </Box>
    </Box>
  )
}

export default Force
