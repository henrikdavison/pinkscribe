import _ from 'lodash'

import { usePath, useRoster, useRosterErrors } from '../Context.js'
import { costString, sumCosts } from '../utils.js'
import { gatherForces } from './SelectForce.js'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import AddForceForm from './AddForceForm.js'

const AddForce = () => {
  const errors = useRosterErrors()
  const [roster] = useRoster()
  const [, setPath] = usePath()

  const forces = gatherForces(roster)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Forces
        </Typography>
        <Stack spacing={1}>
          {forces.map((p) => {
            const f = _.get(roster, p)
            const forceErrors = _.flatten(
              Object.keys(errors)
                .filter((key) => key.startsWith(p))
                .map((key) => errors[key]),
            )
            const cost = costString(sumCosts(f))
            return (
              <Typography
                key={p}
                variant="subtitle2"
                sx={{ cursor: 'pointer' }}
                color={forceErrors.length ? 'error' : 'inherit'}
                data-tooltip-id="tooltip"
                data-tooltip-html={forceErrors.length ? forceErrors.join('<br />') : cost || undefined}
                onClick={() => setPath(p)}
              >
                {f.catalogueName} <Typography component="span">{f.name}</Typography>
              </Typography>
            )
          })}
        </Stack>
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Add Force
        </Typography>
        <AddForceForm />
      </Box>
    </Box>
  )
}

export default AddForce
