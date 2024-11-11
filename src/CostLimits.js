import _ from 'lodash'
import { Box, Typography, TextField } from '@mui/material'
import { useRoster, useSystem, useUpdateRoster } from './Context'

const CostLimits = () => {
  const gameData = useSystem()
  const [roster, setRoster] = useRoster()
  const updateRoster = useUpdateRoster()

  return (
    <Box>
      <Typography variant="h6">Cost Limits</Typography>
      <Box className="grid">
        {gameData.gameSystem.costTypes?.map((type) => {
          const index = _.findIndex(roster.costLimits?.costLimit, ['typeId', type.id])
          if (index !== -1) {
            return (
              <Box key={type.id} mb={2}>
                <Typography variant="body1" component="label" htmlFor={`cost-limit-${type.id}`}>
                  {type.name}
                </Typography>
                <TextField
                  id={`cost-limit-${type.id}`}
                  type="number"
                  inputProps={{ min: -1, step: 1 }}
                  value={roster.costLimits.costLimit[index].value}
                  onChange={(e) => {
                    if (e.target.value > -1) {
                      updateRoster(`costLimits.costLimit.${index}.value`, e.target.value)
                    } else {
                      roster.costLimits.costLimit.splice(index, 1)
                      setRoster(roster)
                    }
                  }}
                  fullWidth
                />
              </Box>
            )
          }
          return (
            <Box key={type.id} mb={2}>
              <Typography variant="body1" component="label" htmlFor={`cost-limit-${type.id}`}>
                {type.name}
              </Typography>
              <TextField
                id={`cost-limit-${type.id}`}
                type="number"
                inputProps={{ min: -1, step: 1 }}
                value="-1"
                onChange={(e) => {
                  roster.costLimits = roster.costLimits || { costLimit: [] }
                  roster.costLimits.costLimit.push({
                    typeId: type.id,
                    name: type.name,
                    value: e.target.value,
                  })
                  setRoster(roster)
                }}
                fullWidth
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default CostLimits
