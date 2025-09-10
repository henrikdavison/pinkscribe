import { DebounceInput } from 'react-debounce-input'

import { usePath, useRoster, useSystem, useRosterErrors, useUpdateRoster } from './Context.js'
import CostLimits from './CostLimits.js'
import RosterNotes from './RosterNotes.js'
import Force from './Force/Force.js'
import AddForce from './Force/AddForce.js'
import BugReport from './BugReport.js'
import SelectRoster from './SelectRoster.js'

const Roster = ({ currentForce, setCurrentForce }) => {
  const [roster] = useRoster()
  const updateRoster = useUpdateRoster()
  const errors = useRosterErrors()
  const gameData = useSystem()
  const [path] = usePath()
  window.roster = roster

  if (!roster || !gameData) {
    return <SelectRoster />
  }

  window.errors = errors

  return (
    <article>
      {errors[''] && (
        <ul className="errors">
          {errors[''].map((e, i) => (
            <li key={i}>{e instanceof Error ? <BugReport error={e} /> : e}</li>
          ))}
        </ul>
      )}
      {path === '' ? (
        <section>
          <DebounceInput
            minLength={2}
            debounceTimeout={300}
            value={roster.name}
            onChange={(e) => updateRoster('name', e.target.value)}
          />
          <CostLimits />
          <AddForce />
          <RosterNotes />
        </section>
      ) : (
        <Force />
      )}
    </article>
  )
}

export default Roster
