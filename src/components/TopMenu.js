import React from 'react'
import { AppBar, Toolbar, Typography, Box } from '@mui/material'
import BurgerMenu from './BurgerMenu'

function TopMenu({ toggleDarkMode, mode }) {
  return (
    <AppBar position="static" color={mode === 'light' ? 'default' : 'primary'}>
      <Toolbar>
        <BurgerMenu toggleDarkMode={toggleDarkMode} mode={mode} />
        <Typography variant="p" component="div" sx={{ flexGrow: 1, ml: 1 }}>
          Rainbowscribe
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export default TopMenu
