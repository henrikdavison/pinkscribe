import _ from 'lodash'
import {
  Box,
  Button,
  Checkbox,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material'
import { gatherFiles, useFile, useSystem } from '../EditSystem'
import { Comment, Conditions, Repeats, Text, Value } from './fields'

const types = {
  set: 'Set',
  decrement: 'Decrement',
  increment: 'Increment',
  append: 'Append',
  add: 'Add Category',
  remove: 'Remove Category',
  'set-primary': 'Set Category Primary',
  'unset-primary': 'Unset Category Primary',
}

const typeStrings = {
  set: (m) => `Set ${m.field} to ${m.value}`,
  increment: (m) => `Increment ${m.field} by ${m.value.toString()}${m.repeats ? ' repeatedly' : ''}`,
  decrement: (m) => `Decrement ${m.field} by ${m.value.toString()}${m.repeats ? ' repeatedly' : ''}`,
  append: (m) => `Append '${m.value}' to ${m.field}`,
  add: (m, gd) => `Add category ${gd.ids[m.value].name}`,
  remove: (m, gd) => `Remove category ${gd.ids[m.value].name}`,
  'set-primary': (m, gd) => `Set ${gd.ids[m.value].name} as primary category`,
  'unset-primary': (m, gd) => `Unset ${gd.ids[m.value].name} as primary category`,
}

const defaultValues = {
  boolean: false,
  number: 0.0,
  string: '',
}

const Modifier = ({ entry, on, filename, modifier }) => {
  const [file, updateFile] = useFile(filename)
  const gameData = useSystem()

  const fields = {
    hidden: { label: 'Hidden', value: 'boolean', type: ['set'] },
    name: { label: 'Name', value: 'string', type: ['append'] },
  }

  gatherFiles(file, gameData).forEach((f) =>
    f.costTypes?.forEach(
      (ct) =>
        (fields[ct.name] = {
          label: ct.name,
          value: 'number',
          type: ['set', 'increment', 'decrement'],
        }),
    ),
  )

  entry.constraints?.forEach(
    (c) =>
      (fields[c.id] = {
        label: `Constraint: ${c.scope} ${c.field} ${c.type} ${c.value}`,
        value: 'number',
        type: ['set', 'increment', 'decrement'],
      }),
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={2}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            if (on.modifiers.length === 1) {
              delete on.modifiers
            } else {
              on.modifiers = _.pull(on.modifiers, [modifier])
            }
            updateFile()
          }}
        >
          -
        </Button>
        <Typography variant="subtitle1" ml={2}>
          {typeStrings[modifier.type](modifier, gameData)}
        </Typography>
      </Box>
      <Table>
        <TableBody>
          <Comment entry={modifier} updateFile={updateFile} />
          <Conditions entry={entry} on={modifier} updateFile={updateFile} />
          <TableRow>
            <TableCell>
              <label htmlFor="type">Type</label>
            </TableCell>
            <TableCell>
              <Select
                value={modifier.type}
                name="type"
                onChange={(e) => {
                  if (!fields[modifier.field].type.includes(e.target.value)) {
                    modifier.field = Object.keys(fields).find((f) => fields[f].type.includes(e.target.value))
                    modifier.value = defaultValues[fields[modifier.field].value]
                  }
                  if (e.target.value !== 'increment' && e.target.value !== 'decrement') {
                    delete modifier.repeats
                  }
                  modifier.type = e.target.value
                  updateFile()
                }}
                fullWidth
              >
                {Object.entries(types).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <label htmlFor="field">Field</label>
            </TableCell>
            <TableCell>
              <Select
                value={modifier.field}
                name="field"
                onChange={(e) => {
                  if (fields[modifier.field].value !== fields[e.target.value].value) {
                    modifier.value = defaultValues[fields[e.target.value].value]
                  }
                  modifier.field = e.target.value
                  updateFile()
                }}
                fullWidth
              >
                {Object.keys(fields).map(
                  (field) =>
                    fields[field].type.includes(modifier.type) && (
                      <MenuItem key={field} value={field}>
                        {fields[field].label}
                      </MenuItem>
                    ),
                )}
              </Select>
            </TableCell>
          </TableRow>
          {fields[modifier.field].value === 'number' ? (
            <Value entry={modifier} updateFile={updateFile} />
          ) : fields[modifier.field].value === 'boolean' ? (
            <Checkbox
              checked={modifier.value}
              onChange={(e) => {
                modifier.value = e.target.checked
                updateFile()
              }}
              name="value"
              label="Value"
            />
          ) : (
            <Text field="value" label="Value" entry={entry} updateFile={updateFile} />
          )}
          {(modifier.type === 'increment' || modifier.type === 'decrement') && (
            <Repeats entry={entry} modifier={modifier} updateFile={updateFile} filename={filename} />
          )}
        </TableBody>
      </Table>
    </Box>
  )
}

export default Modifier
