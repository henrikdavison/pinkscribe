import React, { useState } from 'react'
import _ from 'lodash'
import Box from '@mui/material/Box/index.js'
import Button from '@mui/material/Button/index.js'
import Typography from '@mui/material/Typography/index.js'
import IconButton from '@mui/material/IconButton/index.js'
import Menu from '@mui/material/Menu/index.js'
import MenuItem from '@mui/material/MenuItem/index.js'
import { MoreVertical } from 'lucide-react'
import { usePath, useRoster, useSystem } from '../Context.js'
import { addSelection, refreshSelection, getCatalogue, getMaxCount } from '../utils.js'
import config from '../config/configPills.json'

const summarizeChildren = (roster, selection, selectionPath, gameData, getEntry) => {
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

const ConfigPills = ({ forcePath, getEntry }) => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [, setPath] = usePath()
  const [menu, setMenu] = useState({ anchor: null, selPath: null, selection: null, options: [] })

  const force = _.get(roster, forcePath)
  if (!force) return null

  // Per-system config: map names to ids; fall back to default
  const sysId = gameData?.gameSystem?.id
  const sysName = gameData?.gameSystem?.name
  const sysCfg = config[sysId] ||
    config[sysName] ||
    config.default || { enabled: true, categoryNames: ['Configuration'] }
  if (!sysCfg.enabled) return null
  const categoryNames = sysCfg.categoryNames || ['Configuration']
  const categoryIds = (gameData.gameSystem.categoryEntries || [])
    .filter((c) => categoryNames.includes(c.name))
    .map((c) => c.id)

  const configSelections = (force.selections?.selection || [])
    .map((s, i) => ({ s, path: `${forcePath}.selections.selection.${i}` }))
    .filter(({ s }) => s.categories?.category?.some((c) => categoryIds.includes(c.entryId)))

  if (!configSelections.length) return null

  const openMenu = (anchorEl, selection, selPath) => {
    const entry = getEntry(roster, selPath, selection.entryId, gameData)
    const groups = entry?.selectionEntryGroups || []
    const radioGroups = groups.filter((g) => getMaxCount(g) === 1 && (g.selectionEntries || []).length)
    const options = radioGroups.flatMap((g) => (g.selectionEntries || []).map((opt) => ({ group: g, option: opt })))
    setMenu({ anchor: anchorEl, selPath, selection, options })
  }

  const handleChoose = ({ group, option }) => {
    const { selection, selPath } = menu
    const catalogue = getCatalogue(roster, selPath, gameData)
    selection.selections = selection.selections || { selection: [] }
    selection.selections.selection = (selection.selections.selection || []).filter((s) => s.entryGroupId !== group.id)
    addSelection(selection, option, gameData, group, catalogue, 1)
    refreshSelection(roster, selPath, selection, gameData)
    setRoster(roster)
    setMenu({ anchor: null, selPath: null, selection: null, options: [] })
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 2, pb: 1 }}>
      {configSelections.map(({ s, path: selPath }) => {
        const summary = summarizeChildren(roster, s, selPath, gameData, getEntry)
        return (
          <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPath(selPath)}
              sx={{ borderRadius: 3, px: 1.5, py: 0.5, textTransform: 'none' }}
            >
              <Typography variant="body2" fontWeight={600} component="span">
                {s.name}
              </Typography>
              {summary && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                  {summary}
                </Typography>
              )}
            </Button>
            {sysCfg.inlineEdit !== false && (
              <IconButton
                size="small"
                onClick={(e) => {
                  const anchorEl = e.currentTarget.parentElement?.querySelector('button') || e.currentTarget
                  openMenu(anchorEl, s, selPath)
                }}
                aria-label={`Edit ${s.name}`}
              >
                <MoreVertical size={16} />
              </IconButton>
            )}
          </Box>
        )
      })}
      <Menu
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={() => setMenu({ anchor: null, selPath: null, selection: null, options: [] })}
      >
        {menu.options.length ? (
          menu.options.map(({ group, option }) => (
            <MenuItem key={option.id} onClick={() => handleChoose({ group, option })}>
              {group.name ? `${group.name}: ${option.name}` : option.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No quick options</MenuItem>
        )}
      </Menu>
    </Box>
  )
}

export default ConfigPills
