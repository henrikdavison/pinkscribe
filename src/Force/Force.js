import _ from 'lodash'
import { Fragment, useState } from 'react'

import { useRoster, useRosterErrors, useSystem, useConfirm, usePath } from '../Context.js'
import AddUnit from './AddUnit.js'
import Selection from './Selection.js'
import ListSelection from './ListSelection.js'
import { costString, findId, sumCosts } from '../utils.js'
import { pathToForce } from '../validate.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import Button from '@mui/material/Button/index.js'
import Table from '@mui/material/Table/index.js'
import TableBody from '@mui/material/TableBody/index.js'
import TableRow from '@mui/material/TableRow/index.js'
import TableCell from '@mui/material/TableCell/index.js'

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

  const categories = force.categories.category
    .filter((category) => category.entryId !== 'Configuration') // Exclude "Configuration" from rendering
    .map((category) => {
      if (!selections[category.entryId]) {
        return null // Skip if no selections exist for this category
      }

      const { name } = findId(gameData, gameData.catalogues[force.catalogueId], category.entryId)
      const open = openSections[name] || openSections[name] === undefined

      return (
        <Fragment key={name}>
          <tr
            className="category"
            onClick={() =>
              setOpenSections({
                ...openSections,
                [name]: !open, // Toggle open/closed state
              })
            }
          >
            <th colSpan="3" open={open}>
              {name}
            </th>
          </tr>
          {open &&
            _.sortBy(selections[category.entryId], 'name').map((selection) => (
              <ListSelection
                key={selection.id}
                indent={1}
                selection={selection}
                selectionPath={`${forcePath}.selections.selection.${force.selections.selection.indexOf(selection)}`}
              />
            ))}
        </Fragment>
      )
    }) // Ensure this semicolon ends the statement

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
        <Box className="selections">
          <Typography variant="subtitle1" fontWeight={600}>
            Selections
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow className={path === forcePath ? 'selected' : ''} onClick={() => setPath(forcePath)}>
                <TableCell colSpan={3}>Add Unit</TableCell>
              </TableRow>
              {categories}
            </TableBody>
          </Table>
        </Box>
        {path === forcePath ? <AddUnit errors={errors} /> : <Selection errors={errors} />}
      </Box>
    </Box>
  )
}

export default Force
