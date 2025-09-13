import React from 'react'
import _ from 'lodash'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { usePath, useRoster, useSystem } from '../Context.js'
// no quick-edit menu; chips navigate to selection for editing
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
  const [roster] = useRoster()
  const [, setPath] = usePath()

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

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 2, pb: 1 }}>
      {configSelections.map(({ s, path: selPath }) => {
        const summary = summarizeChildren(roster, s, selPath, gameData, getEntry)
        return (
          <Box key={s.id}>
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
          </Box>
        )
      })}
    </Box>
  )
}

export default ConfigPills
