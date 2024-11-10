// src/RosterManager.js
import { useEffect, useState } from 'react'
import BounceLoader from 'react-spinners/BounceLoader'
import { Tooltip } from 'react-tooltip'
import { ErrorBoundary } from 'react-error-boundary'
import path from 'path-browserify'
import { readFiles } from './repo'
import { validateRoster } from './validate'
import { saveRoster, downloadRoster } from './repo/rosters'
import {
  GameContext,
  RosterContext,
  RosterErrorsContext,
  OpenCategoriesContext,
  PathContext,
  useFs,
  useNative,
  useConfirm,
  usePath,
  useRoster,
  useSystem,
} from './Context'
import SelectionModal from './Force/SelectionModal'
import SelectForce from './Force/SelectForce'
import ViewRoster from './ViewRoster'
import Roster from './Roster'
import SelectSystem from './repo/SelectSystem'
import { refreshRoster } from './utils'
import Body from './Body'

function RosterManager({ systemInfo, setSystemInfo }) {
  const [roster, setRoster] = useRoster()
  const confirmLeaveRoster = useConfirm(
    roster?.__.updated,
    `${roster?.__.filename} has not been saved. Are you sure you want to close it?`,
  )
  const system = useSystem()
  const [path, setPath] = usePath()
  const [open, setOpen] = useState(false)
  const { fs, rosterPath } = useFs()

  const [loading, setLoading] = useState(false)
  const [gameData, setGameData] = useState(null)
  const [openCategories, setOpenCategories] = useState({})
  const [currentPath, setCurrentPath] = useState('')
  const { gameSystemPath } = useFs()
  const { readFilesNative } = useNative()

  useEffect(() => {
    const load = async () => {
      if (systemInfo.battleScribeVersion) {
        setLoading(true)
        try {
          const systemPath = path.join(gameSystemPath, systemInfo.name)
          const dataPath = systemInfo.externalPath || systemPath
          setGameData(await readFiles(dataPath, fs, systemPath, readFilesNative))
        } catch (e) {
          console.log(e)
          setSystemInfo({})
        }
        setLoading(false)
      }
    }
    load()
  }, [systemInfo, fs, gameSystemPath, readFilesNative])

  const errors = validateRoster(roster, gameData)

  if (loading) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <BounceLoader color="#36d7b7" className="loading" />
      </Body>
    )
  }

  if (!systemInfo?.battleScribeVersion) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <SelectSystem setSystemInfo={setSystemInfo} />
      </Body>
    )
  }

  return (
    <GameContext.Provider value={gameData}>
      <RosterContext.Provider value={[roster, setRoster]}>
        <RosterErrorsContext.Provider value={errors}>
          <OpenCategoriesContext.Provider value={[openCategories, setOpenCategories]}>
            <PathContext.Provider value={[currentPath, setCurrentPath]}>
              <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
                <Tooltip id="tooltip" />
                <header>
                  <nav>
                    <ul>
                      {roster && (
                        <li>
                          <SelectForce value={pathToForce(path)} onChange={setPath}>
                            <option value="">Manage Roster</option>
                          </SelectForce>
                        </li>
                      )}
                    </ul>
                    {system && (
                      <ul>
                        {roster && (
                          <li>
                            <button className="outline" onClick={() => setOpen(!open)}>
                              View/Print
                            </button>
                          </li>
                        )}
                        {roster && (
                          <li>
                            <button className="outline" onClick={() => downloadRoster(roster)}>
                              Download
                            </button>
                          </li>
                        )}
                        {roster && (
                          <li>
                            <button
                              className="outline"
                              disabled={!roster.__.updated}
                              onClick={async () => {
                                await saveRoster(roster, fs, rosterPath)
                                setRoster(roster, false)
                              }}
                            >
                              Save
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </nav>
                </header>
                <ErrorBoundary
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <SelectSystem
                      setSystemInfo={(info) => {
                        resetErrorBoundary()
                        setSystemInfo(info)
                      }}
                      error={error}
                    />
                  )}
                >
                  <Roster />
                </ErrorBoundary>
                <SelectionModal open={open} setOpen={setOpen}>
                  {roster && <ViewRoster />}
                </SelectionModal>
              </Body>
            </PathContext.Provider>
          </OpenCategoriesContext.Provider>
        </RosterErrorsContext.Provider>
      </RosterContext.Provider>
    </GameContext.Provider>
  )
}

export default RosterManager
