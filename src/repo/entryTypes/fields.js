import _ from 'lodash'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Button,
  TextField,
  Checkbox,
  IconButton,
  Tooltip,
  Autocomplete,
} from '@mui/material'
import { findId, randomId } from '../../utils'
import { useFile, useSystem } from '../EditSystem'
import Profile from './Profile'
import Modifier from './Modifier'
import ModifierGroup from './ModifierGroup'
import Repeat, { repeatToString } from './Repeat'

export const CheckboxField = ({ entry, field, label, updateFile, defaultValue = false, ...props }) => (
  <TableRow {...props}>
    <TableCell>
      <label htmlFor={field}>{label}</label>
    </TableCell>
    <TableCell>
      <Checkbox
        checked={entry[field] ?? defaultValue}
        name={field}
        onChange={(e) => {
          if (e.target.checked === defaultValue) {
            delete entry[field]
          } else {
            entry[field] = e.target.checked
          }
          updateFile()
        }}
      />
    </TableCell>
  </TableRow>
)

export const TextFieldComponent = ({ entry, field, label, updateFile, ...props }) => (
  <TableRow {...props}>
    <TableCell>
      <label htmlFor={field}>{label}</label>
    </TableCell>
    <TableCell>
      <TextField
        value={entry[field] || ''}
        name={field}
        onChange={(e) => {
          entry[field] = e.target.value
          updateFile()
        }}
        fullWidth
      />
    </TableCell>
  </TableRow>
)

export const NameField = ({ entry, updateFile, children, ...props }) => (
  <TableRow {...props}>
    <TableCell colSpan={2}>
      {children}
      <h6>
        <TextField
          value={entry.name || ''}
          onChange={(e) => {
            entry.name = e.target.value
            updateFile()
          }}
          fullWidth
        />
      </h6>
    </TableCell>
  </TableRow>
)

export const IdField = ({ entry, updateFile, ...props }) => (
  <TableRow {...props}>
    <TableCell>Id</TableCell>
    <TableCell>
      <Tooltip title="Generate new id">
        <IconButton
          onClick={() => {
            entry.id = randomId()
            updateFile()
          }}
        >
          ⟳
        </IconButton>
      </Tooltip>
      <TextField value={entry.id} disabled fullWidth />
    </TableCell>
  </TableRow>
)

export const HiddenField = ({ entry, updateFile, ...props }) => (
  <CheckboxField entry={entry} field="hidden" label="Hidden" updateFile={updateFile} {...props} />
)

export const CommentField = ({ entry, updateFile, ...props }) => (
  <TextFieldComponent field="comment" label="Comment" entry={entry} updateFile={updateFile} {...props} />
)

export const ValueField = ({ entry, updateFile, ...props }) => (
  <TableRow {...props}>
    <TableCell>
      <label htmlFor="value">Value</label>
    </TableCell>
    <TableCell>
      <TextField
        type="number"
        value={entry.value}
        name="value"
        onChange={(e) => {
          entry.value = e.target.value
          updateFile()
        }}
        fullWidth
      />
    </TableCell>
  </TableRow>
)

export const ReferenceSelect = ({ value, options, onChange, isClearable = true, isSearchable = true }) => {
  return (
    <Autocomplete
      value={value || null}
      options={_.sortBy(_.uniq(_.flatten(options)), 'name')}
      getOptionLabel={(option) => option.name || ''}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      onChange={(e, newValue) => onChange(newValue)}
      renderInput={(params) => <TextField {...params} label={isClearable ? 'None' : ''} fullWidth />}
      fullWidth
    />
  )
}

export const PublicationField = ({ file, entry, updateFile, ...props }) => {
  const gameData = useSystem()

  const options = [
    ...(file.publications || []),
    ...(gameData[gameData.gameSystem].publications || []),
    ...(file.catalogueLinks?.map((link) => gameData.catalogues[link.targetId].publications) || []),
  ]

  return (
    <TableRow {...props}>
      <TableCell>
        <label htmlFor="publication">Publication</label>
      </TableCell>
      <TableCell>
        <TextField
          value={entry.page || ''}
          name="page"
          placeholder="Page"
          onChange={(e) => {
            entry.page = e.target.value
            updateFile()
          }}
          fullWidth
        />
        <ReferenceSelect
          value={findId(gameData, file, entry.publicationId)}
          options={options}
          onChange={(publication) => {
            entry.publicationId = publication?.id
            updateFile()
          }}
        />
      </TableCell>
    </TableRow>
  )
}

export const ProfilesField = ({ filename, entry, updateFile, ...props }) => {
  const gameData = useSystem()
  const system = gameData[gameData.gameSystem]

  return (
    <>
      <TableRow {...props}>
        <TableCell colSpan={2}>
          <Tooltip title="Add profile">
            <IconButton
              onClick={() => {
                entry.profiles = entry.profiles || []
                entry.profiles.push({
                  id: randomId(),
                  typeId: system.profileTypes[0].id,
                  typeName: system.profileTypes[0].name,
                })
                updateFile()
              }}
              disabled={!(system.profileTypes?.length > 0)}
            >
              +
            </IconButton>
          </Tooltip>
          Profiles
        </TableCell>
      </TableRow>
      {entry.profiles?.map((profile) => (
        <TableRow key={profile.id} {...props}>
          <TableCell colSpan={2}>
            <Profile profile={profile} filename={filename} on={entry} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export const ModifiersField = ({ filename, entry, on = entry, ...props }) => {
  const [, updateFile] = useFile(filename)
  return (
    <>
      <TableRow {...props}>
        <TableCell colSpan={2}>
          <Tooltip title="Add modifier group">
            <IconButton
              onClick={() => {
                entry.modifierGroups = entry.modifierGroups || []
                entry.modifierGroups.push({})
                updateFile()
              }}
            >
              ±
            </IconButton>
          </Tooltip>
          <Tooltip title="Add modifier">
            <IconButton
              onClick={() => {
                entry.modifiers = entry.modifiers || []
                entry.modifiers.push({
                  field: 'hidden',
                  type: 'set',
                  value: true,
                })
                updateFile()
              }}
            >
              +
            </IconButton>
          </Tooltip>
          Modifiers
        </TableCell>
      </TableRow>
      {on.modifiers?.map((modifier, i) => (
        <TableRow key={i} {...props}>
          <TableCell colSpan={2}>
            <Modifier entry={entry} on={on} modifier={modifier} filename={filename} />
          </TableCell>
        </TableRow>
      ))}
      {on.modifierGroups?.map((modifierGroup, i) => (
        <TableRow key={'group-' + i} {...props}>
          <TableCell colSpan={2}>
            <ModifierGroup entry={entry} on={on} modifierGroup={modifierGroup} filename={filename} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export const RepeatsField = ({ entry, filename, modifier, updateFile, ...props }) => {
  const [file] = useFile(filename)
  const gameData = useSystem()
  return (
    <>
      <TableRow {...props}>
        <TableCell colSpan={2}>
          <Tooltip title="Make modifier repeatable">
            <IconButton
              onClick={() => {
                if (entry.repeats) {
                  delete entry.repeats
                } else {
                  entry.repeats = [
                    {
                      scope: 'self',
                      field: 'selections',
                      value: 1,
                    },
                  ]
                }
                updateFile()
              }}
            >
              {entry.repeats ? '-' : '+'}
            </IconButton>
          </Tooltip>
          {entry.repeats ? repeatToString(entry.repeats[0], gameData, file) : 'Does not repeat'}
        </TableCell>
      </TableRow>
      {entry.repeats?.length && <Repeat entry={entry} filename={filename} modifier={modifier} {...props} />}
    </>
  )
}
