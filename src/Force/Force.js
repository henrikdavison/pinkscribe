import _ from 'lodash'
import { Fragment, useState } from 'react'

import { useRoster, useRosterErrors, useSystem, useConfirm, usePath } from '../Context'
import AddUnit from './AddUnit'
import Selection from './Selection'
import ListSelection from './ListSelection'
import { costString, findId, sumCosts } from '../utils'
import { pathToForce } from '../validate'
import { validateDecodedRoster } from '../utils'

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Tooltip,
  Collapse,
} from '@mui/material'

const Force = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const forcePath = pathToForce(path)
  const force = _.get(roster, forcePath)

  console.log('Force: Rendering with force object:', JSON.stringify(force, null, 2))

  // Hooks that must be called unconditionally
  const confirmDelete = useConfirm(true, force ? `Delete ${force.name}?` : '')
  const [openSections, setOpenSections] = useState({})
  const errors = useRosterErrors()[forcePath]

  if (!validateDecodedRoster(roster)) {
    console.error('Force: Invalid roster structure before rendering:', JSON.stringify(roster, null, 2))
    return <div>No valid force data available.</div>
  }

  const selections = {}
  const parseSelection = (selection) => {
    const primary = _.find(selection.categories?.category, 'primary')?.entryId || '(No Category)'
    selections[primary] = selections[primary] || []
    selections[primary].push(selection)
  }

  // Process selections in the force object
  force.selections?.selection.forEach(parseSelection)

  const categories = force.categories.category
    .filter((category) => category.entryId !== 'Configuration')
    .map((category) => {
      if (!selections[category.entryId]) {
        return null
      }

      const { name } = findId(gameData, gameData.catalogues[force.catalogueId], category.entryId)
      const open = openSections[name] || openSections[name] === undefined

      return (
        <Fragment key={name}>
          <TableRow
            sx={{ cursor: 'pointer' }}
            onClick={() =>
              setOpenSections({
                ...openSections,
                [name]: !open,
              })
            }
          >
            <TableCell colSpan={3} open={open ? 'true' : 'false'}>
              <Typography variant="h6">{name}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>
              <Collapse in={open} timeout="auto" unmountOnExit>
                {_.sortBy(selections[category.entryId], 'name').map((selection) => (
                  <ListSelection
                    key={selection.id}
                    indent={1}
                    selection={selection}
                    selectionPath={`${forcePath}.selections.selection.${force.selections.selection.indexOf(selection)}`}
                  />
                ))}
              </Collapse>
            </TableCell>
          </TableRow>
        </Fragment>
      )
    })

  const globalErrors = errors?.filter((e) => !e.includes('must have'))

  const cost = costString(sumCosts(force))

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h6">
          {force.catalogueName}
          <Typography component="span" variant="subtitle1" sx={{ ml: 1 }}>
            {force.name}
          </Typography>
          {cost && (
            <Typography component="span" variant="subtitle2" sx={{ ml: 1 }}>
              {cost}
            </Typography>
          )}
          {errors && (
            <Tooltip title={errors.join('<br />')} arrow>
              <Typography component="span" variant="caption" color="error" sx={{ ml: 2 }}>
                Validation errors
              </Typography>
            </Tooltip>
          )}
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={async () => {
              await confirmDelete(() => {
                _.pull(roster.forces.force, force)
                setRoster(roster)
                setPath('')
              })
            }}
            sx={{ ml: 2 }}
          >
            Remove
          </Button>
        </Typography>
      </Box>
      {!!globalErrors?.length && (
        <Box component="ul" sx={{ color: 'error.main', mb: 2 }}>
          {globalErrors.map((e, index) => (
            <Box component="li" key={index}>
              {e}
            </Box>
          ))}
        </Box>
      )}
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
        <Box>
          <Typography variant="h6">Selections</Typography>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableBody>
                <TableRow sx={{ cursor: 'pointer' }} selected={path === forcePath} onClick={() => setPath(forcePath)}>
                  <TableCell colSpan={3}>Add Unit</TableCell>
                </TableRow>
                {categories}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        <Box>{path === forcePath ? <AddUnit errors={errors} /> : <Selection errors={errors} />}</Box>
      </Box>
    </Box>
  )
}

export default Force
