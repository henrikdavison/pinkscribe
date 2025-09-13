import _ from 'lodash'

import { findId, getMinCount } from '../utils.js'
import { useSystem } from '../Context.js'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableCell from '@mui/material/TableCell'

const Profiles = ({ profiles, number }) => {
  const gameData = useSystem()

  return (
    <>
      {gameData.gameSystem.profileTypes?.map(({ name, characteristicTypes = [] }) =>
        profiles[name] ? (
          <Table size="small" className="profile" key={name}>
            <TableHead>
              <TableRow>
                <TableCell>{name}</TableCell>
                {characteristicTypes.map((ct) => (
                  <TableCell key={ct.name}>{ct.name}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {_.sortBy(profiles[name], '1.name').map(([number, profile]) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    {number > 1 ? `x${number} ` : ''}
                    {profile.name}
                  </TableCell>
                  {profile.characteristics?.characteristic.map((c) => (
                    <TableCell className="profile" key={c.name}>
                      {c['#text']}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null,
      )}
    </>
  )
}

export default Profiles

export const collectSelectionProfiles = (selection, gameData, profiles = {}) => {
  selection.profiles?.profile.forEach((profile) => {
    profiles[profile.typeName] = profiles[profile.typeName] || []
    const previous = profiles[profile.typeName].find((p) => p[1].name === profile.name)
    if (previous) {
      previous[0] += selection.number
    } else {
      profiles[profile.typeName].push([selection.number, profile])
    }
  })

  selection.selections?.selection.forEach((s) => collectSelectionProfiles(s, gameData, profiles))

  return profiles
}

export const collectEntryProfiles = (entry, gameData, catalogue, profiles = {}, baseNumber) => {
  const number = getMinCount(entry) * (baseNumber || 1)
  entry.infoLinks?.forEach((infoLink) => {
    if (infoLink.type !== 'profile') {
      return
    }
    const profile = findId(gameData, catalogue, infoLink.targetId)
    profiles[profile.typeName] = profiles[profile.typeName] || []
    profiles[profile.typeName].push([number, profile])
  })

  entry.profiles?.forEach((profile) => {
    profiles[profile.typeName] = profiles[profile.typeName] || []
    profiles[profile.typeName].push([number, profile])
  })

  entry.selectionEntries?.forEach((selection) => collectEntryProfiles(selection, gameData, catalogue, profiles, number))
  entry.selectionEntryGroups?.forEach((selection) =>
    collectEntryProfiles(selection, gameData, catalogue, profiles, number),
  )

  return profiles
}
