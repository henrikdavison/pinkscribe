import { Fragment, useEffect } from 'react'
import _ from 'lodash'
import useStorage from 'squirrel-gill'
import {
  Box,
  Typography,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  Container,
  Tooltip,
} from '@mui/material'

import { useRoster, useSystem } from './Context'
import { costString, findId, sumCosts } from './utils'
import Profiles, { collectSelectionProfiles } from './Force/Profiles'
import Rules, { collectRules } from './Force/Rules'
import Categories, { collectCategories } from './Force/Categories'

const ViewRoster = () => {
  const gameData = useSystem()
  const [roster] = useRoster()
  const [type, setType] = useStorage(localStorage, 'viewRosterType', 'full')
  const [options, setOptions] = useStorage(localStorage, 'viewRosterOptions', {})

  useEffect(() => {
    const listener = () => {
      document.body.querySelectorAll('details').forEach((details) => {
        details.open = !!details.closest('.print-open')
      })
    }

    window.addEventListener('beforeprint', listener)
    return () => {
      window.removeEventListener('beforeprint', listener)
    }
  }, [])

  let rules
  if (roster?.forces?.force) {
    rules = roster.forces.force.map((force) => (
      <Rules catalogue={gameData.catalogues[force.catalogueId]} rules={collectRules(force)} key={force.id} />
    ))
  } else {
    console.error('Invalid roster structure:', roster)
    rules = null // Or provide a default value like an empty array or message
  }

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Box component="fieldset">
          <Typography variant="subtitle1">View roster as</Typography>
          <RadioGroup value={type} onChange={(e) => setType(e.target.value)} row>
            <FormControlLabel value="full" control={<Radio />} label="Full" />
            <FormControlLabel value="text" control={<Radio />} label="Text" />
          </RadioGroup>
        </Box>
        <Box component="fieldset">
          {type === 'full' && (
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!options.onePerPage}
                    onChange={() => setOptions({ ...options, onePerPage: !options.onePerPage })}
                  />
                }
                label="One entry per page"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!options.printRules}
                    onChange={() => setOptions({ ...options, printRules: !options.printRules })}
                  />
                }
                label="Print rules text"
              />
            </FormGroup>
          )}
          <Button variant="outlined" onClick={() => window.print()} sx={{ mt: 2 }}>
            Print
          </Button>
        </Box>
      </Box>
      {type === 'text' && (
        <Box component="code" className="text-roster">
          +++ {roster.name} ({roster.gameSystemName}) [{costString(sumCosts(roster))}] +++
          {roster.forces?.force.map((force) => (
            <ViewForceText force={force} key={force.id} />
          ))}
        </Box>
      )}
      {type === 'full' && (
        <Box className={'view-roster ' + Object.keys(_.pickBy(options, Boolean)).join(' ')}>
          <Typography variant="h4" gutterBottom>
            {roster.name} ({roster.gameSystemName}) [{costString(sumCosts(roster))}]
          </Typography>
          {roster.forces?.force.map((force) => (
            <ViewForce force={force} key={force.id} />
          ))}
          {options.printRules && (
            <Box component="article" className="print-open">
              {rules}
            </Box>
          )}
        </Box>
      )}
    </Container>
  )
}

const ViewForce = ({ force }) => {
  const gameData = useSystem()
  return (
    <Box mb={4}>
      <Typography variant="h5" gutterBottom>
        {force.name} ({force.catalogueName}){maybeCost(force)}
      </Typography>
      {force.selections?.selection.map((selection) => (
        <ViewSelection key={selection.id} selection={selection} catalogue={gameData.catalogues[force.catalogueId]} />
      ))}
    </Box>
  )
}

const ViewSelection = ({ catalogue, selection }) => {
  const gameData = useSystem()

  return (
    <Box component="article" mb={3}>
      <Typography variant="h6" gutterBottom>
        {selection.name}
      </Typography>
      <Categories categories={collectCategories(selection, gameData, catalogue)} />
      <Profiles profiles={collectSelectionProfiles(selection, gameData)} number={selection.number} />
      <Rules catalogue={catalogue} rules={collectRules(selection)} />
    </Box>
  )
}

const ViewForceText = ({ force }) => {
  const gameData = useSystem()

  const selections = {}
  const parseSelection = (selection) => {
    const primary = _.find(selection.categories?.category, 'primary')?.entryId || '(No Category)'
    selections[primary] = selections[primary] || []
    selections[primary].push(selection)
  }

  force.selections?.selection.forEach(parseSelection)

  return (
    <Fragment key={force.id}>
      {'\n\n'}
      {'++ '}
      {force.name} ({force.catalogueName}){maybeCost(force)} ++
      {force.categories?.category.map((category) => {
        if (!selections[category.entryId]) {
          return null
        }

        const fakeSelection = {
          selections: { selection: selections[category.entryId] },
        }

        return (
          <Fragment key={category.id}>
            {'\n\n'}
            {'  + '}
            {findId(gameData, gameData.catalogues[force.catalogueId], category.entryId).name}
            {maybeCost(fakeSelection)} +{'\n\n'}
            {_.sortBy(selections[category.entryId], 'name')
              .map((s) => '    ' + viewSelectionText(s, 6))
              .join('\n\n')}
          </Fragment>
        )
      })}
    </Fragment>
  )
}

const maybeCost = (selection) => {
  const cost = costString(sumCosts(selection))
  return cost && ' [' + cost + ']'
}

export const viewSelectionText = (selection, indent) => {
  return [
    `${selection.name}${maybeCost(selection)}`,
    ...(selection.selections?.selection.map((s) => viewSelectionText(s, indent + 2)) || []),
  ].join('\n' + _.repeat(' ', indent))
}

export default ViewRoster
