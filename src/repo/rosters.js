import path from 'path-browserify'
import containerTags from 'bsd-schema/containerTags.json'

import { readXML, xmlData } from './index.js'

export const listRosters = async (gameSystem, fs, rosterPath) => {
  const rosters = {}
  // Ensure the directory exists and handle first-run cases gracefully
  try {
    await fs.promises.mkdir(rosterPath, { recursive: true })
  } catch {}
  const files = await fs.promises.readdir(rosterPath).catch(() => [])
  await Promise.all(
    files.map(async (file) => {
      try {
        const roster = await loadRoster(file, fs, rosterPath)
        if (roster.gameSystemId === gameSystem.id) {
          rosters[file] = roster.name
        }
      } catch (e) {
        rosters[file] = e
      }
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
  await fs.promises.writeFile(path.join(rosterPath, filename), data)
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
