import _ from 'lodash'
import { Box, Table, TableBody, TableCell, TableRow, TextField, Typography } from '@mui/material'
import { findId } from '../../utils'
import { gatherFiles, useFile, useSystem } from '../EditSystem'
import { Comment, Checkbox, ReferenceSelect, Value } from './fields'

const Repeat = ({ entry, filename, modifier }) => {
  const [file, updateFile] = useFile(filename)
  const gameData = useSystem()
  const repeat = modifier.repeats[0]

  const files = gatherFiles(file, gameData)

  const scopeOptions = [
    { id: 'self', name: '-- Self' },
    { id: 'parent', name: '-- Parent' },
    { id: 'force', name: '-- Force' },
    { id: 'roster', name: '-- Roster' },
    { id: 'ancestor', name: '-- Ancestor' },
    { id: 'primary-catalogue', name: '-- Primary Catalogue' },
  ]
  files.forEach((file) =>
    scopeOptions.push(
      ...Object.values(file.ids).filter(
        (x) => x.__type === 'selectionEntry' || x.__type === 'selectionEntryGroup' || x.__type === 'entryLink',
      ),
    ),
  )

  const childIdOptions = []
  files.forEach((file) =>
    childIdOptions.push(
      ...Object.values(file.ids).filter(
        (x) => x.__type === 'selectionEntry' || x.__type === 'selectionEntryGroup' || x.__type === 'category',
      ),
    ),
  )

  return (
    <Box>
      <Comment entry={repeat} updateFile={updateFile} sx={{ mb: 2 }} />
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Typography variant="body1" component="label" htmlFor="scope">
                Scope
              </Typography>
            </TableCell>
            <TableCell>
              <ReferenceSelect
                name="scope"
                isClearable={false}
                value={scopeOptions.find((o) => o.id === repeat.scope)}
                options={scopeOptions}
                onChange={(option) => {
                  repeat.scope = option.id
                  updateFile()
                }}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body1" component="label" htmlFor="field">
                Field
              </Typography>
            </TableCell>
            <TableCell>
              <Select
                value={repeat.field}
                onChange={(e) => {
                  repeat.field = e.target.value
                  updateFile()
                }}
                fullWidth
              >
                <MenuItem value="selections">Selections</MenuItem>
                <MenuItem value="forces">Forces</MenuItem>
                {_.flatten(
                  files.map((f) =>
                    f.costTypes?.map((ct) => (
                      <MenuItem key={ct.typeId} value={ct.typeId}>
                        {ct.name}
                      </MenuItem>
                    )),
                  ),
                )}
              </Select>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body1" component="label" htmlFor="childId">
                Child ID
              </Typography>
            </TableCell>
            <TableCell>
              <ReferenceSelect
                name="childId"
                isClearable={false}
                value={childIdOptions.find((o) => o.id === repeat.childId)}
                options={childIdOptions}
                onChange={(option) => {
                  repeat.childId = option.id
                  updateFile()
                }}
              />
            </TableCell>
          </TableRow>
          <Checkbox entry={repeat} field="shared" label="Shared" updateFile={updateFile} defaultValue={true} />
          <Checkbox entry={repeat} field="includeChildForces" label="Include child Forces" updateFile={updateFile} />
          <Checkbox
            entry={repeat}
            field="includeChildSelections"
            label="Include child Selections"
            updateFile={updateFile}
          />
          <TableRow>
            <TableCell>
              <Typography variant="body1" component="label" htmlFor="repeats">
                Repeat
              </Typography>
            </TableCell>
            <TableCell>
              <TextField
                type="number"
                value={repeat.repeats}
                name="repeats"
                onChange={(e) => {
                  repeat.repeats = e.target.value
                  updateFile()
                }}
                fullWidth
              />
            </TableCell>
          </TableRow>
          <Value entry={repeat} updateFile={updateFile} />
          <Checkbox entry={repeat} field="percentValue" label="Percent" updateFile={updateFile} />
          <Checkbox entry={repeat} field="roundUp" label="Round up" updateFile={updateFile} />
        </TableBody>
      </Table>
    </Box>
  )
}

export default Repeat

export const repeatToString = (repeat, gameData, file) => {
  const extra = `${repeat.includeChildSelections ? ' including child selections' : ''}$
    {repeat.roundUp ? ', rounding up' : ''}`

  if (repeat.percentValue) {
    const field =
      repeat.field === 'selections'
        ? 'selections'
        : repeat.field === 'forces'
        ? 'forces'
        : `${findId(gameData, file, repeat.field).name}`
    return `Repeat ${repeat.repeats} times for every ${repeat.value}% of the ${field} in $
      {findId(gameData, file, repeat.scope)?.name || repeat.scope} that are ${
        findId(gameData, file, repeat.childId).name
      }${extra}`
  } else {
    const field =
      repeat.field === 'selections'
        ? 'selection of'
        : repeat.field === 'forces'
        ? 'force matching'
        : `${findId(gameData, file, repeat.field).name} of`
    return `Repeat ${repeat.repeats} times for every ${repeat.value} ${field} $
      {findId(gameData, file, repeat.childId)?.name || ''} in ${
        findId(gameData, file, repeat.scope)?.name || repeat.scope
      }${extra}`
  }
}
