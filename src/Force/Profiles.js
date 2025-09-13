import _ from 'lodash'

import { findId, getMinCount } from '../utils.js'
import { useSystem } from '../Context.js'
import { getPresentationPolicy } from '../system/presentation.js'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableCell from '@mui/material/TableCell'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const Profiles = ({ profiles, number, rules = {}, titleVariant = 'subtitle1' }) => {
  const gameData = useSystem()
  const policy = getPresentationPolicy(gameData)

  const renderTable = (name, characteristicTypes) => (
    <Table size="small" className="profile" key={name}>
      <TableHead>
        <TableRow>
          <TableCell>{name}</TableCell>
          {characteristicTypes.map((ct) => (
            <TableCell key={ct.name}>{ct.name}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {_.sortBy(profiles[name], '1.name').map(([count, profile]) => (
          <TableRow key={profile.id}>
            <TableCell>
              {count > 1 ? `x${count} ` : ''}
              {profile.name}
            </TableCell>
            {profile.characteristics?.characteristic.map((c) => (
              <TableCell className="profile" key={c.name}>
                {c['#text']}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const renderCards = (name, characteristicTypes) => {
    // Special case: Ability-like types → vertical list
    if (getPresentationPolicy(gameData).isAbilityType(name, characteristicTypes)) {
      const items = _.sortBy(profiles[name], '1.name')
      return (
        <Box key={name} sx={{ my: 1 }}>
          {policy.showSectionTitle(name, characteristicTypes) && (
            <Typography variant={titleVariant} fontWeight={700} sx={{ mb: 0.5 }}>
              {policy.sectionTitle(name, characteristicTypes)}
            </Typography>
          )}
          <Stack spacing={0.75}>
            {items.map(([count, profile]) => {
              const charMap = Object.fromEntries(
                (profile.characteristics?.characteristic || []).map((c) => [c.name, c['#text']]),
              )
              const text = charMap['Description'] || charMap['Ability Details'] || charMap['Abilities'] || ''
              return (
                <Box key={profile.id} sx={{ maxWidth: 'var(--content-max-width)' }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {count > 1 ? `x${count} ` : ''}
                    {profile.name}
                  </Typography>
                  {text && (
                    <Typography variant="body2" color="text.secondary">
                      {text}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Stack>
        </Box>
      )
    }

    // Default: Name above compact stat grid with fixed, equally spaced columns
    return (
      <Box key={name} sx={{ my: 1 }}>
        {policy.showSectionTitle(name, characteristicTypes) && (
          <Typography variant={titleVariant} fontWeight={700} sx={{ mb: 0.5 }}>
            {policy.sectionTitle(name, characteristicTypes)}
          </Typography>
        )}
        <Stack spacing={1}>
          {_.sortBy(profiles[name], '1.name').map(([count, profile]) => {
            const charMap = Object.fromEntries(
              (profile.characteristics?.characteristic || []).map((c) => [c.name, c['#text']]),
            )
            const keywordsTokens = policy.tokenize('Keywords', charMap['Keywords'])
            // Use normalized order and exclude Keywords from the grid
            const dataColumns = policy.columnOrder(name, characteristicTypes).filter((label) => !/keyword/i.test(label))
            return (
              <Paper key={profile.id} variant="outlined" sx={{ p: 2, width: '100%' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.25, lineHeight: 1.25 }}>
                  {count > 1 ? `x${count} ` : ''}
                  {profile.name}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(1, dataColumns.length)}, 1fr)`,
                    columnGap: 1,
                    rowGap: 0.5,
                  }}
                >
                  {dataColumns.map((label) => {
                    const value = charMap[label]
                    const tokens = policy.tokenize(label, value)
                    return (
                      <Box key={label} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {label}
                        </Typography>
                        {tokens.length ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {tokens.map((t, idx) => (
                              <Chip
                                key={idx}
                                size="small"
                                label={t}
                                variant="outlined"
                                tabIndex={0}
                                data-tooltip-id="tooltip"
                                data-tooltip-html={lookupRuleTooltip(t, rules)}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {value}
                          </Typography>
                        )}
                      </Box>
                    )
                  })}
                </Box>
                {!!keywordsTokens?.length && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                    {keywordsTokens.map((t, idx) => (
                      <Chip
                        key={idx}
                        size="small"
                        label={t}
                        variant="outlined"
                        tabIndex={0}
                        data-tooltip-id="tooltip"
                        data-tooltip-html={lookupRuleTooltip(t, rules)}
                      />
                    ))}
                  </Stack>
                )}
              </Paper>
            )
          })}
        </Stack>
      </Box>
    )
  }

  // Always use cards if policy dictates; tables are kept for potential future toggle
  const useCards = policy.useCardsEverywhere

  // Build an ordered list of types present for this selection
  const presentTypes = (gameData.gameSystem.profileTypes || [])
    .filter(({ name }) => profiles[name])
    .map((pt) => ({ ...pt, kind: policy.classifyType(pt.name, pt.characteristicTypes) }))

  const order = { unit: 0, ranged: 1, melee: 2, other: 3, ability: 4 }
  const sorted = presentTypes.sort((a, b) => (order[a.kind] ?? 10) - (order[b.kind] ?? 10))

  return (
    <>
      {sorted.map(({ name, characteristicTypes }) =>
        useCards ? renderCards(name, characteristicTypes) : renderTable(name, characteristicTypes),
      )}
    </>
  )
}

export default Profiles

// Utilities
// Deprecated local helpers were moved to src/system/presentation.js

const normalizeRuleKey = (token) => {
  if (!token) return ''
  let t = String(token).trim()
  // Generic patterns with values (e.g., "Rapid Fire 1", "Sustained Hits 2", "Feel No Pain 6+")
  t = t.replace(/\s*\d+\+?$/i, '')
  // Anti-X 4+ → Anti-
  if (/^anti-/i.test(t)) return 'Anti-'
  return t.trim()
}

const lookupRuleTooltip = (token, rules) => {
  const base = normalizeRuleKey(token)
  const r = rules?.[base]
  return r?.description || undefined
}

export const collectSelectionProfiles = (selection, gameData, profiles = {}) => {
  selection.profiles?.profile.forEach((profile) => {
    profiles[profile.typeName] = profiles[profile.typeName] || []
    const previous = profiles[profile.typeName].find((p) => p[1].name === profile.name)
    if (previous) {
      previous[0] += selection.number
    } else {
      profiles[profile.typeName].push([selection.number, profile])
    }
  })

  selection.selections?.selection.forEach((s) => collectSelectionProfiles(s, gameData, profiles))

  return profiles
}

export const collectEntryProfiles = (entry, gameData, catalogue, profiles = {}, baseNumber) => {
  const number = getMinCount(entry) * (baseNumber || 1)
  entry.infoLinks?.forEach((infoLink) => {
    if (infoLink.type !== 'profile') {
      return
    }
    const profile = findId(gameData, catalogue, infoLink.targetId)
    profiles[profile.typeName] = profiles[profile.typeName] || []
    profiles[profile.typeName].push([number, profile])
  })

  entry.profiles?.forEach((profile) => {
    profiles[profile.typeName] = profiles[profile.typeName] || []
    profiles[profile.typeName].push([number, profile])
  })

  entry.selectionEntries?.forEach((selection) => collectEntryProfiles(selection, gameData, catalogue, profiles, number))
  entry.selectionEntryGroups?.forEach((selection) =>
    collectEntryProfiles(selection, gameData, catalogue, profiles, number),
  )

  return profiles
}
