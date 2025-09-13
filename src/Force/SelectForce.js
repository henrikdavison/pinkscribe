import _ from 'lodash'

import { useRoster } from '../Context.js'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

export const gatherForces = (parent, path = '', forces = []) => {
  parent.forces?.force.forEach((f, i) => {
    const p = path ? `${path}.forces.force.${i}` : `forces.force.${i}`
    forces.push(p)
    gatherForces(f, p, forces)
  })

  return forces
}

const SelectForce = ({ children, onChange, value, label, labelId, ...props }) => {
  const [roster] = useRoster()
  const forces = gatherForces(roster)

  return (
    <Select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      labelId={labelId}
      label={label}
      {...props}
    >
      {children}
      {forces.map((path) => (
        <MenuItem value={path} key={path}>
          {'  '.repeat(path.split('.').length / 3)}
          {_.get(roster, path).catalogueName}
          {' - '}
          {_.get(roster, path).name}
        </MenuItem>
      ))}
    </Select>
  )
}

export default SelectForce
