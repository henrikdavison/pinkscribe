import _ from 'lodash'
import { Box, Table, TableBody, TableCell, TableRow, Button } from '@mui/material'
import { useFile } from '../EditSystem'
import { Comment, Hidden, Id, Modifiers, Name, Profiles, Publication } from './fields'

const Category = ({ filename, category }) => {
  const [file, updateFile] = useFile(filename)

  /*
        "constraints": { "$ref": "#/definitions/constraints" },
        "infoLinks": { "$ref": "#/definitions/infoLinks" },
        "infoGroups": { "$ref": "#/definitions/infoGroups" },
        "modifiers": { "$ref": "#/definitions/modifiers" },
        "modifierGroups": { "$ref": "#/definitions/modifierGroups" },
        "rules": { "$ref": "#/definitions/rules" }
*/

  return (
    <Box>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Name entry={category} updateFile={updateFile} />
            </TableCell>
            <TableCell>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  if (file.categories.length === 1) {
                    delete file.categories
                  } else {
                    file.categories = _.pull(file.categories, category)
                  }
                  updateFile()
                }}
              >
                -
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Id entry={category} updateFile={updateFile} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Comment entry={category} updateFile={updateFile} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Hidden entry={category} updateFile={updateFile} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Publication file={file} entry={category} updateFile={updateFile} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Profiles filename={filename} entry={category} updateFile={updateFile} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Modifiers filename={filename} entry={category} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  )
}

export default Category
