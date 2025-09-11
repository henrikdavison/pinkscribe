import { useEffect, useState } from 'react'
import path from 'path-browserify'
import { BounceLoader } from 'react-spinners'
import useStorage from 'squirrel-gill'
import { FileDrop } from 'react-file-drop'

import { listRosters, loadRoster, importRoster, deleteRoster, deleteAllRosters } from './repo/rosters.js'
import { useFs, useNative, useRoster, useSystem, useConfirm } from './Context.js'
import { createRoster } from './utils.js'

const SelectRoster = () => {
  const [, setRoster] = useRoster()
  const [rosters, setRosters] = useState(null)
  const [selected, setSelected] = useStorage(localStorage, 'selectedRoster', '')
  const [newName, setNewFilename] = useState('Roster')
  const gameData = useSystem()
  const confirmDelete = useConfirm(true, `Delete ${selected}?`)
  const { fs, rosterPath } = useFs()
  const { shellOpen } = useNative()

  useEffect(() => {
    const load = async () => {
      const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
      const r = await listRosters(gameData.gameSystem, fs, systemRosterPath)
      setRosters(r)
      if (!r[selected]) {
        setSelected(Object.keys(r)[0] || 'New')
      }
      if (r[newName]) {
        let i = 1
        while (r['Roster ' + i]) {
          i++
        }
        setNewFilename('Roster ' + i)
      }
    }

    if (!rosters && gameData) {
      load()
    }
  }, [rosters, gameData, newName, selected, setSelected, fs, rosterPath])

  return (
    <>
      <h2>Select Roster</h2>
      <FileDrop
        onFrameDrop={async (event) => {
          if (event.dataTransfer?.items[0]?.kind === 'file') {
            const file = event.dataTransfer.items[0].getAsFile()
            const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
            await importRoster(file, fs, systemRosterPath)
            setSelected(file.name)
            setRosters(null)
          }
        }}
      >
        <p>
          To import a <code>.rosz</code> SELECT ROSTER file, drop it anywhere on the page, or{' '}
          <span role="link" onClick={() => document.getElementById('import-roster').click()}>
            click here to select one
          </span>
          .
        </p>
        <input
          type="file"
          accept=".rosz,.ros"
          id="import-roster"
          onChange={async (e) => {
            const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
            await importRoster(e.target.files[0], fs, systemRosterPath)
            setSelected(e.target.files[0].name)
            setRosters(null)
          }}
        />
      </FileDrop>
      {rosters ? (
        <>
          <select onChange={(e) => setSelected(e.target.value)} value={selected}>
            {Object.entries(rosters).map(([roster, name]) => (
              <option key={roster} value={roster}>
                {roster} - {typeof name === 'string' ? name : 'Error'}
              </option>
            ))}
            <option key="new" value="New">
              New
            </option>
          </select>
          {selected === 'New' ? (
            <>
              <label>
                Filename
                <input value={newName} onChange={(e) => setNewFilename(e.target.value)} />
              </label>
              <button
                onClick={async () => {
                  const roster = await createRoster(newName, gameData.gameSystem)
                  setRoster(roster)
                }}
              >
                Create <code>{newName}.rosz</code>
              </button>
            </>
          ) : (
            <>
              {typeof rosters[selected] !== 'string' && (
                <ul>
                  BlueScribe is having trouble parsing <code>{selected}</code>. It may not be a valid roster file, or
                  this could be a bug.
                </ul>
              )}
              <button
                disabled={typeof rosters[selected] !== 'string'}
                onClick={async () => {
                  const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                  setRoster(await loadRoster(selected, fs, systemRosterPath), false)
                }}
              >
                Load
              </button>
              <button
                className="secondary outline"
                onClick={async () =>
                  await confirmDelete(async () => {
                    const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                    await deleteRoster(selected, fs, systemRosterPath)
                    setRosters(null)
                  })
                }
              >
                Delete
              </button>
              <button
                className="secondary outline"
                onClick={async () => {
                  const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                  await deleteAllRosters(fs, systemRosterPath)
                  setRosters(null)
                }}
              >
                Delete all (this system)
              </button>
            </>
          )}
          {!!shellOpen && (
            <button
              className="secondary outline"
              onClick={async () => {
                const systemRosterPath = path.join(rosterPath, gameData.gameSystem.id)
                await shellOpen(systemRosterPath)
              }}
            >
              Open roster directory
            </button>
          )}
        </>
      ) : (
        <BounceLoader color="#36d7b7" className="loading" />
      )}
    </>
  )
}

export default SelectRoster
