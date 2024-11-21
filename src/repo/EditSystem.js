import { useState, useEffect, createContext, useContext } from 'react'
import path from 'path-browserify'
import BounceLoader from 'react-spinners/BounceLoader'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import _ from 'lodash'

import containerTags from './bsd-schema/containerTags.json'

import { readRawFiles } from './index'
import EditFile from './EditFile'
import { useFs } from '../Context'
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Input,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemText,
  Drawer,
  Container,
  Tooltip,
  Collapse,
  IconButton as MuiIconButton,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

export const SystemContext = createContext(null)
export const SetSystemContext = createContext(null)
export const useSystem = () => useContext(SystemContext)
export const useSetSystem = () => useContext(SetSystemContext)

export const useFile = (filename) => {
  const gameData = useSystem()
  const setGameData = useSetSystem()
  return [
    gameData[filename],
    () => {
      gameData[filename].__updated = true
      setGameData({ ...gameData })
    },
  ]
}

const AddFile = () => {
  return null
}

const buildIndex = (gameData) => {
  const ids = {}

  function coallate(x, file) {
    if (x.id) {
      ids[x.id] = x
      file.ids = file.ids || {}
      file.ids[x.id] = x
    }

    for (let attr in x) {
      if (x[attr] instanceof Array) {
        x[attr].forEach((x) => {
          x.__type = containerTags[attr]
          coallate(x, file)
        })
      }
    }
  }

  Object.values(_.omit(gameData, ['gameSystem', 'ids'])).forEach((x) => coallate(x, x))

  return ids
}

export const gatherFiles = (file, gameData, files = [gameData[gameData.gameSystem]]) => {
  if (files.includes(file)) {
    return files
  }

  files.push(file)

  file.catalogueLinks?.forEach((link) => {
    gatherFiles(gameData.catalogues[link.targetId], gameData, files)
  })

  return files
}

const EditSystem = ({ systemInfo, setSystemInfo }) => {
  const [gameData, setGameData] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const { fs, gameSystemPath } = useFs()
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!gameData) {
      readRawFiles(path.join(gameSystemPath, systemInfo.name), fs).then((data) => {
        data.ids = buildIndex(data)
        setGameData(data)
        setSelectedFile(data.gameSystem)
      })
    }
  }, [systemInfo, gameData, fs, gameSystemPath])

  return (
    <SystemContext.Provider value={gameData}>
      <SetSystemContext.Provider value={setGameData}>
        <Container>
          <Tooltip id="tooltip" />
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6">BlueScribe</Typography>
              {gameData && (
                <Select value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)} sx={{ ml: 2 }}>
                  <MenuItem value={gameData.gameSystem}>
                    {gameData[gameData.gameSystem].name}
                    {gameData[gameData.gameSystem].__updated && ' *'}
                  </MenuItem>
                  {Object.keys(_.omit(gameData, ['gameSystem', gameData.gameSystem, 'ids']))
                    .sort()
                    .map((filename) => (
                      <MenuItem key={filename} value={filename}>
                        &nbsp;&nbsp;&nbsp;&nbsp;{gameData[filename].name}
                        {gameData[filename].__updated && ' *'}
                      </MenuItem>
                    ))}
                  <MenuItem value="addNew">Add New Catalogue</MenuItem>
                </Select>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Box>
                <MuiIconButton onClick={() => setDetailsOpen(!detailsOpen)}>
                  {detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </MuiIconButton>
              </Box>
            </Toolbar>
          </AppBar>
          <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
            <List>
              <ListItem>
                <ListItemText
                  primary={systemInfo.name}
                  data-tooltip-id="tooltip"
                  data-tooltip-html="Change game system"
                  onClick={() => setSystemInfo({})}
                />
              </ListItem>
            </List>
          </Collapse>
          {!gameData ? (
            <BounceLoader color="#36d7b7" className="loading" />
          ) : selectedFile === 'addNew' ? (
            <AddFile />
          ) : (
            <EditFile filename={selectedFile} setSelectedFile={setSelectedFile} />
          )}
        </Container>
      </SetSystemContext.Provider>
    </SystemContext.Provider>
  )
}

export default EditSystem
