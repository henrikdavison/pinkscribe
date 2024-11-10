import { useState, useCallback } from 'react'
import useStorage from 'squirrel-gill'
import RosterManager from './RosterManager'
import '@picocss/pico'
import './App.css'

function App() {
  const [systemInfo, setSystemInfo] = useState(JSON.parse(localStorage.system || '{}'))
  const [, setMode] = useStorage(localStorage, 'dataMode', 'editRoster')

  const setSystemInfoHandler = useCallback((info) => {
    localStorage.system = JSON.stringify(info)
    setSystemInfo(info)
  }, [])

  return <RosterManager systemInfo={systemInfo} setSystemInfo={setSystemInfoHandler} setMode={setMode} />
}

export default App
