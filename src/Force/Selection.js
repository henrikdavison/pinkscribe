import _ from 'lodash'
import { useMemo, useState, useEffect, memo } from 'react'
import pluralize from 'pluralize'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import FormControlLabel from '@mui/material/FormControlLabel/index.js'
import MuiRadio from '@mui/material/Radio/index.js'
import MuiCheckbox from '@mui/material/Checkbox/index.js'
import TextField from '@mui/material/TextField/index.js'

import { useSystem, useRoster, useRosterErrors, usePath } from '../Context.js'
import { getEntry, pathToForce } from '../validate.js'
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
import { pathParent } from '../validate.js'
import Accordion from '@mui/material/Accordion/index.js'
import AccordionSummary from '@mui/material/AccordionSummary/index.js'
import AccordionDetails from '@mui/material/AccordionDetails/index.js'

const Selection = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const [open, setOpen] = useState(false)

  const catalogue = getCatalogue(roster, path, gameData)
  const selection = _.get(roster, path)

  // Build concise summary at top-level to satisfy hooks rules
  const summary = useMemo(() => {
    if (!selection) return ''
    const leaves = (selection.selections?.selection || []).map((s, i) => ({
      s,
      entry: getEntry(roster, `${path}.selections.selection.${i}`, s.entryId, gameData),
    }))
    const important = leaves.filter(({ entry }) => {
      if (!entry) return false
      if (entry.selectionEntries || entry.selectionEntryGroups) return false
      const costs = Object.values(sumCosts(entry))
      const hasCost = costs.some((v) => v)
      const hasRules = (entry.rules || []).length > 0
      const profileTypes = (entry.profiles || []).map((p) => (p.typeName || '').toLowerCase())
      const onlyWeapons = profileTypes.length > 0 && profileTypes.every((t) => t.includes('weapon'))
      const hasNonWeaponProfile = profileTypes.some((t) => t && !t.includes('weapon'))
      const categoryHints = (entry.categoryLinks || []).some((c) =>
        /enhance|relic|warlord|trait|psych|power|spell|artefact|upgrade/i.test(c.name || ''),
      )
      return hasCost || hasRules || hasNonWeaponProfile || categoryHints || !onlyWeapons
    })
    const counts = {}
    important.forEach(({ s }) => {
      const name = s.name
      counts[name] = (counts[name] || 0) + (typeof s.number === 'number' ? s.number : 1)
    })
    return Object.entries(counts)
      .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
      .sort()
      .join(', ')
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

  // summary already computed

  // Deletion gating not needed in this pane (removed actions)

  return (
    <Box className="selection" sx={{ maxHeight: 'calc(100vh - 7em)', overflow: 'auto' }}>
      <Typography variant="subtitle1" fontWeight={600} onClick={() => setOpen(true)}>
        {selectionName(selection)}
      </Typography>
      {!!summary && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {summary}
        </Typography>
      )}
      {selectionEntry ? (
        <>
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

  if (entryGroup.hidden || entryGroup.selectionEntries?.filter((e) => !e.hidden).length === 0) {
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

  if (option.name === 'Litany of Hate (Aura)') {
    debugger
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

  const value = _.sum(selection.selections?.selection.map((s) => (s.entryId === option.id ? s.number : 0))) || 0
  const [inputValue, setInputValue] = useState(value)
  const cost = costString(sumCosts(option))

  // Keep local input in sync when underlying value changes externally
  useEffect(() => setInputValue(value), [value])

  const numberTip =
    min === max ? `${min} ${pluralize(option.name)}` : max === -1 ? '' : `${min}-${max} ${pluralize(option.name)}`

  // Debounce committing number changes to reduce churn
  const commit = useMemo(() => _.debounce((n) => onSelect(option, n), 150), [onSelect, option])

  useEffect(() => () => commit.cancel(), [commit])

  return (
    <>
      <TextField
        type="number"
        size="small"
        value={inputValue}
        inputProps={{ min, max: max === -1 ? 1000 : max, step: 1 }}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          setInputValue(Number.isNaN(n) ? '' : n)
          if (!Number.isNaN(n)) commit(n)
        }}
        onBlur={() => {
          const n = parseInt(inputValue, 10)
          if (!Number.isNaN(n)) onSelect(option, n)
        }}
        data-tooltip-id="tooltip"
        data-tooltip-html={numberTip}
        sx={{ width: 90, mr: 1 }}
      />
      <span
        data-tooltip-id="tooltip"
        data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
      >
        {option.name}
      </span>
      {cost && ` (${cost})`}
    </>
  )
})
