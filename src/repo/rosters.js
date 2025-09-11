import path from 'path-browserify'
import containerTags from 'bsd-schema/containerTags.json'

import { readXML, xmlData } from './index.js'

const systemFolder = (rosterPath, systemId) => path.join(rosterPath, systemId)

export const listRosters = async (gameSystem, fs, rosterPath) => {
  const rosters = {}
  // New location: /rosters/<systemId>
  const sysPath = systemFolder(rosterPath, gameSystem.id)
  try {
    await fs.promises.mkdir(sysPath, { recursive: true })
  } catch {}

  // Read rosters in the system folder
  const files = await fs.promises.readdir(sysPath).catch(() => [])
  await Promise.all(
    files.map(async (file) => {
      try {
        const roster = await loadRoster(file, fs, sysPath)
        rosters[file] = roster.name
      } catch (e) {
        rosters[file] = e
      }
    }),
  )

  // Backward-compat: also scan legacy root folder and include matching system rosters
  const legacyFiles = await fs.promises.readdir(rosterPath).catch(() => [])
  await Promise.all(
    legacyFiles.map(async (file) => {
      if (rosters[file]) return
      try {
        const roster = await loadRoster(file, fs, rosterPath)
        if (roster.gameSystemId === gameSystem.id) {
          rosters[file] = roster.name
        }
      } catch {}
    }),
  )
  return rosters
}

export const loadRoster = async (file, fs, rosterPath) => {
  const roster = await readXML(path.join(rosterPath, file), fs)
  roster.__ = {
    filename: file,
    updated: false,
  }

  function normalize(x) {
    for (let attr in x) {
      if (x[attr] === '') {
        delete x[attr]
      } else if (containerTags[attr] && x[attr][containerTags[attr]]) {
        x[attr][containerTags[attr]].forEach(normalize)
      }
    }
  }

  normalize(roster)

  return roster
}

export const saveRoster = async (roster, fs, rosterPath) => {
  const {
    __: { filename },
    ...contents
  } = roster

  const data = await xmlData({ roster: contents }, filename)
  const sysPath = systemFolder(rosterPath, roster.gameSystemId)
  try {
    await fs.promises.mkdir(sysPath, { recursive: true })
  } catch {}
  await fs.promises.writeFile(path.join(sysPath, filename), data)
}

export const importRoster = async (file, fs, rosterPath) => {
  const data = await file.arrayBuffer()
  console.log('writing', path.join(rosterPath, file.name))
  await fs.promises.writeFile(path.join(rosterPath, file.name), data)
}

export const downloadRoster = async (roster) => {
  const {
    __: { filename },
    ...contents
  } = roster

  const data = await xmlData({ roster: contents }, filename)
  const blob = new Blob([data], { type: 'application/zip' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.download = filename.replace('/', '')
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const deleteRoster = async (file, fs, rosterPath) => {
  await fs.promises.unlink(path.join(rosterPath, file))
}

export const deleteAllRosters = async (fs, rosterPath) => {
  try {
    const files = await fs.promises.readdir(rosterPath)
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(rosterPath, f))))
  } catch {}
}
