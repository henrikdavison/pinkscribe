import _ from 'lodash'
import { useState } from 'react'
import pluralize from 'pluralize'
import {
  Box,
  Typography,
  Tooltip,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  TextField,
  Select,
  MenuItem,
} from '@mui/material'
import { DebounceInput } from 'react-debounce-input'

import { useSystem, useRoster, useRosterErrors, usePath } from '../Context'
import { getEntry, pathToForce } from '../validate'
import SelectForce from './SelectForce'
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
  copySelection,
} from '../utils'
import Profiles, { collectSelectionProfiles, collectEntryProfiles } from './Profiles'
import Rules, { collectRules } from './Rules'
import Categories, { collectCategories } from './Categories'
import SelectionModal from './SelectionModal'
import { pathParent } from '../validate'

const Selection = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const [open, setOpen] = useState(false)

  const catalogue = getCatalogue(roster, path, gameData)
  const selection = _.get(roster, path)
  const selectionEntry = getEntry(roster, path, selection.entryId, gameData)
  const forcePath = pathToForce(path)

  return (
    <Box className="selection">
      <Box component="nav" display="flex" gap={1} mb={2}>
        <Tooltip title="Move to different force">
          <SelectForce
            value={forcePath}
            onChange={(newPath) => {
              const oldForce = _.get(roster, forcePath)
              _.pull(oldForce.selections.selection, selection)

              const newForce = _.get(roster, newPath)
              newForce.selections = newForce.selections || { selection: [] }
              newForce.selections.selection.push(selection)

              setRoster(roster)
              setPath(forcePath)
            }}
          />
        </Tooltip>
        <Tooltip title="Customize">
          <IconButton onClick={() => setOpen(true)} color="primary" size="small">
            ✍
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate">
          <IconButton
            onClick={() => {
              const parent = _.get(roster, pathParent(path))
              parent.selections.selection.push(copySelection(selection))
              setRoster(roster)
            }}
            color="primary"
            size="small"
          >
            ⎘
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove">
          <IconButton
            onClick={(e) => {
              const parent = _.get(roster, pathParent(path))
              _.pull(parent.selections.selection, selection)
              setRoster(roster)

              setPath(pathParent(path))

              e.stopPropagation()
              e.preventDefault()
            }}
            color="secondary"
            size="small"
          >
            x
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="h6" onClick={() => setOpen(true)}>
        {selectionName(selection)}
      </Typography>
      {selectionEntry ? (
        <>
          {selectionEntry.selectionEntries && (
            <Box component="article">
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
            </Box>
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
                <Box component="header" mb={2}>
                  <Typography variant="h6">{selection.name}</Typography>
                </Box>
                <Categories categories={collectCategories(selection, gameData, catalogue)} />
                <Profiles profiles={collectSelectionProfiles(selection, gameData)} number={selection.number} />
                <Rules catalogue={catalogue} rules={collectRules(selection)} />
                <TextField
                  fullWidth
                  label="Custom Name"
                  variant="outlined"
                  value={selection.customName}
                  onChange={(e) => {
                    selection.customName = e.target.value
                    setRoster(roster)
                  }}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </SelectionModal>
        </>
      ) : (
        <Typography>
          {selectionName(selection)} does not exist in the game data. It may have been removed in a data update.
        </Typography>
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

const Entry = ({ catalogue, entry, path, selection, selectionEntry, entryGroup }) => {
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
}

const EntryGroup = ({ path, entryGroup, selection, selectionEntry }) => {
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
    <Box component="article" mb={2}>
      <Typography
        variant="subtitle1"
        data-tooltip-id="tooltip"
        data-tooltip-html={
          selectionErrors
            ?.filter(
              (e) => e.includes(entryGroup.name) || entryGroup.selectionEntries?.some((se) => e.includes(se.name)),
            )
            .join('<br />') || null
        }
      >
        {entryGroup.name}
        {min > 1 && ` - min ${min}`}
        {max > 1 && ` - max ${max}`}
        {entryGroup.publicationId && (
          <Typography component="small">
            {findId(gameData, catalogue, entryGroup.publicationId).name}, {entryGroup.page}
          </Typography>
        )}
      </Typography>
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
    </Box>
  )
}

const Radio = ({ catalogue, selection, entryGroup, onSelect }) => {
  const gameData = useSystem()
  const min = getMinCount(entryGroup)
  const max = getMaxCount(entryGroup)
  const entries = entryGroup.selectionEntries

  const selectedOption = selection.selections?.selection.find((s) => s.entryGroupId === entryGroup.id)

  return (
    <>
      {min === 0 && max === 1 && (
        <Box component="label">
          <input
            type="radio"
            name={entryGroup.id}
            onChange={() =>
              onSelect(
                entries.find((e) => e.id === selectedOption.entryId),
                0,
              )
            }
            checked={!selectedOption}
          />
          (None)
        </Box>
      )}
      {_.sortBy(entries, 'name').map((option, index) => {
        const cost = costString(sumCosts(option))
        const checked = selectedOption?.entryId === option.id
        if (option.hidden && !checked) {
          return null
        }
        return (
          <Box component="label" key={option.id} display="block">
            <input
              type={max === 1 && entries.length > 1 ? 'radio' : 'checkbox'}
              name={entryGroup.id}
              checked={checked}
              onChange={() => onSelect(option, (max !== 1 || entries.length > 1) && checked ? 0 : 1)}
            />
            <Typography
              component="span"
              data-tooltip-id="tooltip"
              data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
            >
              {option.name}
            </Typography>
            {cost && ` (${cost})`}
          </Box>
        )
      })}
    </>
  )
}

const Checkbox = ({ catalogue, selection, option, onSelect, entryGroup }) => {
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
    <Box component="label" display="block">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onSelect(option, checked ? 0 : 1)}
        disabled={checked && min === 1}
      />
      <Typography
        component="span"
        data-tooltip-id="tooltip"
        data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
      >
        {option.name}
      </Typography>
      {cost && ` (${cost})`}
    </Box>
  )
}

const Count = ({ catalogue, selection, option, min, max, onSelect, entryGroup }) => {
  const gameData = useSystem()

  const value = _.sum(selection.selections?.selection.map((s) => (s.entryId === option.id ? s.number : 0))) || 0
  const cost = costString(sumCosts(option))

  const numberTip =
    min === max ? `${min} ${pluralize(option.name)}` : max === -1 ? '' : `${min}-${max} ${pluralize(option.name)}`

  return (
    <Box component="label" display="block">
      <input
        type="number"
        value={value}
        min={min}
        max={max === -1 ? 1000 : max}
        step="1"
        onChange={(e) => onSelect(option, parseInt(e.target.value, 10))}
        data-tooltip-id="tooltip"
        data-tooltip-html={numberTip}
      />
      <Typography
        component="span"
        data-tooltip-id="tooltip"
        data-tooltip-html={textProfile(collectEntryProfiles(option, gameData, catalogue))}
      >
        {option.name}
      </Typography>
      {cost && ` (${cost})`}
    </Box>
  )
}
