import _ from 'lodash'
import { useMemo, useState, useEffect, memo } from 'react'
import pluralize from 'pluralize'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { AlertTriangle, Trash2, SlidersHorizontal, ScrollText } from 'lucide-react'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import { TransitionGroup } from 'react-transition-group'
import FormControlLabel from '@mui/material/FormControlLabel'
import MuiRadio from '@mui/material/Radio'
import MuiCheckbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { useSystem, useRoster, useRosterErrors, usePath } from '../Context.js'
import { getEntry, pathParent } from '../validate.js'
import {
  costString,
  findId,
  getCatalogue,
  sumCosts,
  textProfile,
  addSelection,
  refreshSelection,
  getMinCount,
  getMaxCount,
  isCollective,
  selectionName,
} from '../utils.js'
import Profiles, { collectSelectionProfiles, collectEntryProfiles } from './Profiles.js'
import Rules, { collectRules } from './Rules.js'
import Categories, { collectCategories } from './Categories.js'
import SelectionModal from './SelectionModal.js'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

const Selection = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('options')
  const errorsMap = useRosterErrors()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const catalogue = getCatalogue(roster, path, gameData)
  const selection = _.get(roster, path)

  // Build concise summary at top-level to satisfy hooks rules
  const summary = useMemo(() => {
    if (!selection) return ''
    // Show all leaf options (including default weapons) to mirror list view
    const leaves = (selection.selections?.selection || []).map((s, i) => ({
      s,
      entry: getEntry(roster, `${path}.selections.selection.${i}`, s.entryId, gameData),
    }))
    const leafOptions = leaves.filter(({ entry }) => entry && !(entry.selectionEntries || entry.selectionEntryGroups))
    const counts = {}
    leafOptions.forEach(({ s }) => {
      const name = s.name
      counts[name] = (counts[name] || 0) + (typeof s.number === 'number' ? s.number : 1)
    })
    return Object.entries(counts)
      .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
      .sort()
      .join(', ')
  }, [gameData, path, roster, selection])

  // Desktop-only delete control (mobile handled in Force.js dialog). Must be before any early return.
  const canDelete = useMemo(() => {
    if (!selection || !selection.entryId) return false
    const parent = _.get(roster, pathParent(path))
    const entry = getEntry(roster, `${path}`, selection.entryId, gameData)
    const groupEntry = selection.entryGroupId ? getEntry(roster, `${path}`, selection.entryGroupId, gameData) : null
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
  }, [gameData, path, roster, selection])

  if (!selection || !selection.entryId) {
    return (
      <div className="selection">
        <Typography variant="body2" color="text.secondary">
          Select a unit to see its details.
        </Typography>
      </div>
    )
  }
  const selectionEntry = getEntry(roster, path, selection.entryId, gameData)

  // Local tab state already declared above to satisfy hooks rules

  // Collect errors relevant to this selection: exact path, descendants, and force-level messages that name it
  const selectionErrors = (() => {
    const direct = Object.entries(errorsMap)
      .filter(([key]) => key === path || key.startsWith(path + '.'))
      .flatMap(([, value]) => value || [])
      .map((e) => (typeof e === 'string' ? e : e?.message || String(e)))
    const forcePath = path.replace(/\.selections.*/, '')
    const forceLevel = (errorsMap[forcePath] || []).filter(
      (e) => typeof e === 'string' && (e.includes(selection.name) || e.includes(selectionEntry?.name || '')),
    )
    return Array.from(new Set([...direct, ...forceLevel]))
  })()

  // summary already computed

  return (
    <Box className="selection" sx={{ maxHeight: 'calc(100vh - 7em)', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h5" fontWeight={700} onClick={() => setOpen(true)} sx={{ flex: 1 }}>
          {selectionName(selection)}
        </Typography>
        {!isMobile && (
          <IconButton
            size="small"
            aria-label="delete selection"
            disabled={!canDelete}
            onClick={() => {
              const parent = _.get(roster, pathParent(path))
              _.pull(parent.selections?.selection || [], selection)
              setRoster(roster)
              let newPath = path
              while (!_.get(roster, newPath)) newPath = pathParent(newPath)
              setPath(newPath)
            }}
          >
            <Trash2 size={18} />
          </IconButton>
        )}
      </Box>
      {!!summary && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {summary}
        </Typography>
      )}
      {/* Tabs: Options | Rules */}
      <Box sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}`, mb: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="options"
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <SlidersHorizontal size={16} />
                <span>Options</span>
              </Box>
            }
          />
          <Tab
            value="rules"
            label={
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <ScrollText size={16} />
                <span>Rules</span>
              </Box>
            }
          />
        </Tabs>
      </Box>

      {selectionEntry ? (
        <>
          {activeTab === 'options' && (
            <>
              {!!selectionErrors.length && (
                <Stack spacing={1} sx={{ mb: 1 }}>
                  <TransitionGroup>
                    {selectionErrors.map((e, i) => (
                      <Collapse key={e + i}>
                        <Alert
                          variant="outlined"
                          severity="warning"
                          icon={<AlertTriangle size={16} />}
                          sx={{ py: 0.5, alignItems: 'center' }}
                        >
                          <Typography variant="body2">{e}</Typography>
                        </Alert>
                      </Collapse>
                    ))}
                  </TransitionGroup>
                </Stack>
              )}
              {selectionEntry.selectionEntries && (
                <article>
                  {_.sortBy(selectionEntry.selectionEntries, 'name').map((entry) => (
                    <Entry
                      key={entry.id}
                      entry={entry}
                      path={path}
                      selection={selection}
                      selectionEntry={selectionEntry}
                      entryGroup={null}
                      catalogue={catalogue}
                    />
                  ))}
                </article>
              )}
              {selectionEntry.selectionEntryGroups &&
                _.sortBy(selectionEntry.selectionEntryGroups, 'name').map((entryGroup) => (
                  <EntryGroup
                    key={entryGroup.id}
                    path={path}
                    entryGroup={entryGroup}
                    selection={selection}
                    selectionEntry={selectionEntry}
                  />
                ))}
            </>
          )}

          {activeTab === 'rules' && (
            <Box sx={{ pt: 0.5 }}>
              <Categories categories={collectCategories(selection, gameData, catalogue)} />
              <Profiles profiles={collectSelectionProfiles(selection, gameData)} number={selection.number} />
              <Rules catalogue={catalogue} rules={collectRules(selection)} />
            </Box>
          )}

          {/* Keep the existing modal view for extended info */}
          <SelectionModal open={open} setOpen={setOpen}>
            {open && (
              <>
                <header>
                  <h6>{selection.name}</h6>
                </header>
                <Categories categories={collectCategories(selection, gameData, catalogue)} />
                <Profiles profiles={collectSelectionProfiles(selection, gameData)} number={selection.number} />
                <Rules catalogue={catalogue} rules={collectRules(selection)} />
              </>
            )}
          </SelectionModal>
        </>
      ) : (
        <>{selectionName(selection)} does not exist in the game data. It may have been removed in a data update.</>
      )}
    </Box>
  )
}

export default Selection

const useOnSelect = (path, selection, entryGroup) => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()

  return (option, number) => {
    selection.selections = selection.selections || { selection: [] }

    const cs = selection.selections.selection
    let current = cs.filter((s) => s.entryId === option.id)

    if (number < current.length) {
      while (current.length > number) {
        cs.splice(cs.indexOf(_.last(current)), 1)
        current = cs.filter((s) => s.entryId === option.id)
      }
    } else if (isCollective(option) && current.length) {
      current[0].selections?.selection.forEach((s) => (s.number = (s.number / current[0].number) * number))
      current[0].number = number
    } else {
      addSelection(
        selection,
        option,
        gameData,
        entryGroup,
        getCatalogue(roster, path, gameData),
        number - current.length,
      )
    }

    refreshSelection(roster, path, selection, gameData)
    setRoster(roster)
  }
}

const Entry = memo(({ catalogue, entry, path, selection, selectionEntry, entryGroup }) => {
  const onSelect = useOnSelect(path, selection, entryGroup)

  const min = getMinCount(entry) * selection.number
  const max = getMaxCount(entry) * selection.number

  if (entry.hidden) {
    return null
  }

  return max === 1 ? (
    <Checkbox selection={selection} option={entry} onSelect={onSelect} entryGroup={entryGroup} catalogue={catalogue} />
  ) : (
    <Count
      selection={selection}
      option={entry}
      onSelect={onSelect}
      min={min}
      max={max}
      entryGroup={entryGroup}
      catalogue={catalogue}
    />
  )
})

const EntryGroup = memo(({ path, entryGroup, selection, selectionEntry }) => {
  const gameData = useSystem()
  const [roster] = useRoster()
  const onSelect = useOnSelect(path, selection, entryGroup)

  const catalogue = getCatalogue(roster, path, gameData)
  const selectionErrors = _.flatten(
    Object.entries(useRosterErrors())
      .filter(([key, value]) => key === path || key.startsWith(path + '.'))
      .map(([key, value]) => value),
  )
  const min = getMinCount(entryGroup) * selection.number
  const max = getMaxCount(entryGroup) * selection.number

  const hasVisibleOptions = (entryGroup.selectionEntries || []).some((e) => !e.hidden)
  const hasSelectedOption = (selection.selections?.selection || []).some((s) => s.entryGroupId === entryGroup.id)
  if (entryGroup.hidden || (!hasVisibleOptions && !hasSelectedOption)) {
    return null
  }

  return (
    <Accordion defaultExpanded disableGutters>
      <AccordionSummary
        data-tooltip-id="tooltip"
        data-tooltip-html={
          selectionErrors
            ?.filter(
              (e) => e.includes(entryGroup.name) || entryGroup.selectionEntries?.some((se) => e.includes(se.name)),
            )
            .join('<br />') || null
        }
      >
        <Typography sx={{ mr: 1 }}>{entryGroup.name}</Typography>
        {min > 1 && <Typography variant="caption">{` - min ${min}`}</Typography>}
        {max > 1 && <Typography variant="caption">{` - max ${max}`}</Typography>}
        {entryGroup.publicationId && (
          <Typography variant="caption" sx={{ ml: 1 }}>
            {findId(gameData, catalogue, entryGroup.publicationId).name}, {entryGroup.page}
          </Typography>
        )}
      </AccordionSummary>
      <AccordionDetails>
        {max === 1 && !entryGroup.selectionEntryGroups ? (
          <Radio selection={selection} entryGroup={entryGroup} onSelect={onSelect} catalogue={catalogue} />
        ) : (
          _.sortBy(entryGroup.selectionEntries || [], 'name').map((subEntry) => (
            <Entry
              key={subEntry.id}
              entry={subEntry}
              path={path}
              selection={selection}
              selectionEntry={selectionEntry}
              entryGroup={entryGroup}
              catalogue={catalogue}
            />
          ))
        )}
        {entryGroup.selectionEntryGroups?.map((subGroup) => (
          <EntryGroup
            key={subGroup.id}
            path={path}
            entryGroup={subGroup}
            selection={selection}
            selectionEntry={selectionEntry}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  )
})

const Radio = memo(({ catalogue, selection, entryGroup, onSelect }) => {
  const gameData = useSystem()
  const min = getMinCount(entryGroup)
  const max = getMaxCount(entryGroup)
  const entries = entryGroup.selectionEntries

  const selectedOption = selection.selections?.selection.find((s) => s.entryGroupId === entryGroup.id)

  return (
    <>
      {min === 0 && max === 1 && (
        <FormControlLabel
          control={
            <MuiRadio
              checked={!selectedOption}
              onChange={() =>
                onSelect(
                  entries.find((e) => e.id === selectedOption?.entryId),
                  0,
                )
              }
              name={entryGroup.id}
            />
          }
          sx={{ display: 'block', m: 0, py: 0.25 }}
          label="(None)"
        />
      )}
      {_.sortBy(entries, 'name').map((option) => {
        const cost = costString(sumCosts(option))
        const checked = selectedOption?.entryId === option.id
        if (option.hidden && !checked) return null
        const isRadio = max === 1 && entries.length > 1
        const control = isRadio ? (
          <MuiRadio
            checked={checked}
            onChange={() => onSelect(option, !isRadio && checked ? 0 : 1)}
            name={entryGroup.id}
          />
        ) : (
          <MuiCheckbox checked={checked} onChange={() => onSelect(option, !isRadio && checked ? 0 : 1)} />
        )
        return (
          <FormControlLabel
            key={option.id}
            control={control}
            sx={{ display: 'block', m: 0, py: 0.25 }}
            label={
              <>
                <span
                  data-tooltip-id="tooltip"
                  data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
                >
                  {option.name}
                </span>
                {cost && ` (${cost})`}
              </>
            }
          />
        )
      })}
    </>
  )
})

const Checkbox = memo(({ catalogue, selection, option, onSelect, entryGroup }) => {
  const gameData = useSystem()

  const cost = costString(sumCosts(option))
  const checked = !!selection.selections?.selection.find(
    (s) => _.last(s.entryId.split('::')) === _.last(option.id.split('::')),
  )
  const min = getMinCount(option)

  if (checked && min === 1) {
    return null
  }

  return (
    <FormControlLabel
      control={
        <MuiCheckbox
          checked={checked}
          onChange={() => onSelect(option, checked ? 0 : 1)}
          disabled={checked && min === 1}
        />
      }
      sx={{ display: 'block', m: 0, py: 0.25 }}
      label={
        <>
          <span
            data-tooltip-id="tooltip"
            data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
          >
            {option.name}
          </span>
          {cost && ` (${cost})`}
        </>
      }
    />
  )
})

const Count = memo(({ catalogue, selection, option, min, max, onSelect, entryGroup }) => {
  const gameData = useSystem()

  const all = selection.selections?.selection || []
  const value = _.sum(all.map((s) => (s.entryId === option.id ? s.number : 0))) || 0
  const [inputValue, setInputValue] = useState(value)
  const cost = costString(sumCosts(option))

  // Keep local input in sync when underlying value changes externally
  useEffect(() => setInputValue(value), [value])

  // If this option belongs to a group with its own max, cap the effective max by the remaining allowance.
  const groupMax = entryGroup ? getMaxCount(entryGroup) * selection.number : -1
  const groupTotal = entryGroup
    ? _.sum(
        all.filter((s) => s.entryGroupId === entryGroup.id).map((s) => (typeof s.number === 'number' ? s.number : 1)),
      )
    : 0
  const remainingInGroup = groupMax === -1 ? Infinity : Math.max(0, groupMax - (groupTotal - value))
  const effectiveMax = Math.min(max === -1 ? Infinity : max, remainingInGroup)

  const numberTip =
    min === effectiveMax
      ? `${min} ${pluralize(option.name)}`
      : effectiveMax === Infinity
      ? ''
      : `${min}-${effectiveMax} ${pluralize(option.name)}`

  // Debounce committing number changes to reduce churn
  const commit = useMemo(
    () =>
      _.debounce((n) => {
        const clamped = Math.max(min, Math.min(n, effectiveMax === Infinity ? n : effectiveMax))
        onSelect(option, clamped)
      }, 150),
    [onSelect, option, min, effectiveMax],
  )

  useEffect(() => () => commit.cancel(), [commit])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25, flexWrap: 'wrap' }}>
      <TextField
        type="number"
        size="small"
        value={inputValue}
        inputProps={{ min, max: effectiveMax === Infinity ? 1000 : effectiveMax, step: 1 }}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          setInputValue(Number.isNaN(n) ? '' : n)
          if (!Number.isNaN(n)) commit(n)
        }}
        onBlur={() => {
          const n = parseInt(inputValue, 10)
          if (!Number.isNaN(n)) {
            const clamped = Math.max(min, Math.min(n, effectiveMax === Infinity ? n : effectiveMax))
            onSelect(option, clamped)
          }
        }}
        data-tooltip-id="tooltip"
        data-tooltip-html={numberTip}
        sx={{ width: 86 }}
      />
      <span
        data-tooltip-id="tooltip"
        data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
      >
        {option.name}
      </span>
      {cost && ` (${cost})`}
    </Box>
  )
})
