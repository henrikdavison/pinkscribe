// src/components/BurgerMenu.js
import React, { useState } from 'react'
import { Drawer, List, ListItem, ListItemText, Box, Switch, IconButton, Typography } from '@mui/material'
import { Menu } from 'lucide-react'

function BurgerMenu({ toggleDarkMode, mode }) {
  const [open, setOpen] = useState(false)

  const handleToggle = (event) => {
    event.preventDefault() // Prevent default action for testing
    setOpen(!open)
  }

  return (
    <Box>
      <IconButton sx={{ ml: -1 }} onClick={handleToggle}>
        <Menu size={24} />
      </IconButton>
      <Drawer anchor="left" open={open} onClose={handleToggle}>
        <List sx={{ width: 300 }}>
          <ListItem button onClick={handleToggle}>
            <ListItemText primary="Prototype N" />
          </ListItem>
          <ListItem button onClick={handleToggle}>
            <ListItemText primary="Settings" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Dark Mode" />
            <Switch checked={mode === 'dark'} onChange={toggleDarkMode} />
          </ListItem>
          {/* Simplified content for testing */}
          <ListItem button onClick={handleToggle}>
            <ListItemText primary="Army Builder" />
          </ListItem>
        </List>
      </Drawer>
    </Box>
  )
}

export default BurgerMenu
