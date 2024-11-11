// src/Body.js

import { useState } from 'react'
import { Tooltip } from 'react-tooltip'
import SelectForce from './Force/SelectForce'
import SelectionModal from './Force/SelectionModal'
import ViewRoster from './ViewRoster'
import { downloadRoster, saveRoster } from './repo/rosters'
import { refreshRoster } from './utils'
import { useConfirm, usePath, useRoster, useSystem, useFs } from './Context'
import { pathToForce } from './validate'
import {
  Box,
  Button,
  Select,
  MenuItem,
  Typography,
  Container,
  Tooltip as MuiTooltip,
  Menu,
  MenuItem as MuiMenuItem,
  IconButton,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'

const Body = ({ children, systemInfo, setSystemInfo }) => {
  const [roster, setRoster] = useRoster()
  const confirmLeaveRoster = useConfirm(
    roster?.__.updated,
    `${roster?.__.filename} has not been saved. Are you sure you want to close it?`,
  )
  const system = useSystem()
  const [path, setPath] = usePath()
  const [open, setOpen] = useState(false)
  const { fs, rosterPath } = useFs()
  const [anchorEl, setAnchorEl] = useState(null)

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  return (
    <Container className="container">
      <MuiTooltip id="tooltip" />
      <Box display="flex" justifyContent="space-between" alignItems="center" py={2}>
        {roster && (
          <SelectForce value={pathToForce(path)} onChange={setPath} fullWidth>
            <MenuItem value="">Manage Roster</MenuItem>
          </SelectForce>
        )}
        {system && (
          <Box display="flex" gap={2} ml={2}>
            {roster && (
              <Button variant="outlined" onClick={() => setOpen(!open)}>
                View/Print
              </Button>
            )}
            {roster && (
              <Button variant="outlined" onClick={() => downloadRoster(roster)}>
                Download
              </Button>
            )}
            {roster && (
              <Button
                variant="outlined"
                disabled={!roster.__.updated}
                onClick={async () => {
                  await saveRoster(roster, fs, rosterPath)
                  setRoster(roster, false)
                }}
              >
                Save
              </Button>
            )}
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              {roster && (
                <MuiMenuItem
                  onClick={() => {
                    document.querySelectorAll('details').forEach((d) => d.removeAttribute('open'))
                    setRoster(refreshRoster(roster, system))
                    handleMenuClose()
                  }}
                >
                  Refresh Roster
                </MuiMenuItem>
              )}
              {roster && (
                <MuiMenuItem
                  onClick={async () => {
                    await confirmLeaveRoster(() => {
                      document.querySelectorAll('details').forEach((d) => d.removeAttribute('open'))
                      setPath('')
                      setRoster()
                      handleMenuClose()
                    })
                  }}
                >
                  Roster ({roster.__.filename.split('/').at(-1)})
                </MuiMenuItem>
              )}
              <MuiMenuItem
                onClick={async () => {
                  await confirmLeaveRoster(() => {
                    document.querySelectorAll('details').forEach((d) => d.removeAttribute('open'))
                    setPath('')
                    setRoster()
                    setSystemInfo({ name: systemInfo.name })
                    handleMenuClose()
                  })
                }}
              >
                Game System ({system?.gameSystem.name})
              </MuiMenuItem>
            </Menu>
          </Box>
        )}
      </Box>
      {children}
      <SelectionModal open={open} setOpen={setOpen}>
        {roster && <ViewRoster />}
      </SelectionModal>
    </Container>
  )
}

export default Body
