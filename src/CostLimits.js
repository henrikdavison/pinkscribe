import _ from 'lodash'

import { useRoster, useSystem, useUpdateRoster } from './Context.js'
import Box from '@mui/material/Box/index.js'
import Typography from '@mui/material/Typography/index.js'
import TextField from '@mui/material/TextField/index.js'

const CostLimits = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const updateRoster = useUpdateRoster()

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Cost Limits
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {gameData.gameSystem.costTypes?.map((type) => {
          const index = _.findIndex(roster.costLimits?.costLimit, ['typeId', type.id])
          const value = index !== -1 ? roster.costLimits.costLimit[index].value : -1
          return (
            <TextField
              key={type.id}
              size="small"
              type="number"
              label={type.name}
              value={value}
              inputProps={{ min: -1, step: 1 }}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (Number.isNaN(v) || v < 0) {
                  if (index !== -1) {
                    roster.costLimits.costLimit.splice(index, 1)
                    setRoster(roster)
                  }
                } else if (index !== -1) {
                  updateRoster(`costLimits.costLimit.${index}.value`, v)
                } else {
                  roster.costLimits = roster.costLimits || { costLimit: [] }
                  roster.costLimits.costLimit.push({ typeId: type.id, name: type.name, value: v })
                  setRoster(roster)
                }
              }}
            />
          )
        })}
      </Box>
    </Box>
  )
}

export default CostLimits
