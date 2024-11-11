import _ from 'lodash'
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Select,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material'
import { findId } from '../../utils'
import { Comment, Hidden, Id, Modifiers, Name, Publication, ReferenceSelect } from './fields'
import { useFile, useSystem, gatherFiles } from '../EditSystem'

const Profile = ({ filename, on, profile }) => {
  const [file, updateFile] = useFile(filename)
  const gameData = useSystem()

  const options = []
  gatherFiles(file, gameData).forEach((file) => options.push(...(file.profileTypes || [])))

  const type = findId(gameData, file, profile.typeId)

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">{profile.name || profile.typeName}</Typography>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            if (on.profiles.length === 1) {
              delete on.profiles
            } else {
              on.profiles = _.pull(on.profiles, profile)
            }
            updateFile()
          }}
          sx={{ ml: 2 }}
        >
          -
        </Button>
      </Box>
      <Table>
        <TableBody>
          <Name entry={profile} updateFile={updateFile} />
          <Id entry={profile} updateFile={updateFile} />
          <Comment entry={profile} updateFile={updateFile} />
          <TableRow>
            <TableCell>
              <label htmlFor="profileType">Profile Type</label>
            </TableCell>
            <TableCell>
              <ReferenceSelect
                isClearable={false}
                value={findId(gameData, file, profile.typeId)}
                options={options}
                onChange={(profileType) => {
                  profile.typeId = profileType.id
                  profile.typeName = profileType.name
                  profile.characteristics = []
                  updateFile()
                }}
              />
            </TableCell>
          </TableRow>
          <Hidden entry={profile} updateFile={updateFile} />
          <Publication file={file} entry={profile} updateFile={updateFile} />
          <TableRow>
            <TableCell colSpan={2}>
              <Typography variant="subtitle1">Characteristics</Typography>
            </TableCell>
          </TableRow>
          {type.characteristicTypes.map((ct) => {
            const characteristic = profile.characteristics?.find((c) => c.typeId === ct.id)
            return (
              <TableRow key={ct.id}>
                <TableCell>
                  <label data-tooltip-id="tooltip" data-tooltip-html={ct.comment} htmlFor={ct.typeId}>
                    {ct.name}
                  </label>
                </TableCell>
                <TableCell>
                  <TextField
                    value={characteristic ? characteristic['#text'] : ''}
                    name={ct.typeId}
                    onChange={(e) => {
                      if (characteristic) {
                        characteristic['#text'] = e.target.value
                      } else {
                        profile.characteristics = profile.characteristics || []
                        profile.characteristics.push({
                          name: ct.name,
                          typeId: ct.id,
                          '#text': e.target.value,
                        })
                      }
                      updateFile()
                    }}
                    fullWidth
                  />
                </TableCell>
              </TableRow>
            )
          })}
          <Modifiers file={file} entry={profile} updateFile={updateFile} />
        </TableBody>
      </Table>
    </Box>
  )
}

export default Profile
