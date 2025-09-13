import path from 'path-browserify'
import containerTags from 'bsd-schema/containerTags.json'

import { readXML, xmlData } from './index.js'

const systemFolder = (rosterPath, systemId) => path.join(rosterPath, systemId)
const indexPath = (dir) => path.join(dir, 'index.json')

const readIndex = async (dir, fs) => {
  try {
    const raw = await fs.promises.readFile(indexPath(dir))
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const writeIndex = async (dir, fs, data) => {
  try {
    await fs.promises.writeFile(indexPath(dir), JSON.stringify(data))
  } catch {}
}

const summarizeRoster = (roster) => {
  const pts = roster?.costs?.cost?.find?.((c) => c.name === 'pts')?.value ?? null
  const forces = roster?.forces?.force?.map?.((f) => ({ name: f?.name, catalogueName: f?.catalogueName })) || []
  return { name: roster?.name || 'Roster', pts, forces }
}

export const listRosters = async (gameSystem, fs, rosterPath) => {
  // Returns a lightweight summary for each roster to keep the
  // roster list view performant. A summary contains:
  // { name, pts, forces: [{ name, catalogueName }], updatedAt }
  const rosters = {}
  // New location: /rosters/<systemId>
  const sysPath = systemFolder(rosterPath, gameSystem.id)
  try {
    await fs.promises.mkdir(sysPath, { recursive: true })
  } catch {}

  // Load index and fill summaries from it. Fallback to parsing only for missing entries.
  const index = await readIndex(sysPath, fs)

  // Read rosters in the system folder
  const files = (await fs.promises.readdir(sysPath).catch(() => [])).filter(
    (f) => f.endsWith('.ros') || f.endsWith('.rosz'),
  )

  await Promise.all(
    files.map(async (file) => {
      if (index[file]) {
        rosters[file] = index[file]
        return
      }
      try {
        const roster = await loadRoster(file, fs, sysPath)
        const summary = summarizeRoster(roster)
        try {
          const stat = await fs.promises.stat(path.join(sysPath, file))
          summary.updatedAt = new Date(stat.mtime).toISOString()
        } catch {
          summary.updatedAt = new Date().toISOString()
        }
        rosters[file] = index[file] = summary
      } catch (e) {
        rosters[file] = { error: e?.message || String(e) }
      }
    }),
  )

  // Persist any new entries parsed during fallback
  await writeIndex(sysPath, fs, index)
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

// Sanitize a name into a safe filename (without extension)
const sanitizeBase = (name) =>
  (name || 'Roster')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .slice(0, 120) || 'Roster'

const fileExists = async (fs, fullPath) => {
  try {
    await fs.promises.stat(fullPath)
    return true
  } catch {
    return false
  }
}

const uniqueFilename = async (fs, dir, base, ext) => {
  let candidate = `${base}${ext}`
  let i = 2
  while (await fileExists(fs, path.join(dir, candidate))) {
    candidate = `${base} (${i++})${ext}`
  }
  return candidate
}

export const saveRoster = async (roster, fs, rosterPath) => {
  // Ensure a unique, system-scoped filename for unsaved/new rosters
  const sysPath = systemFolder(rosterPath, roster.gameSystemId)
  try {
    await fs.promises.mkdir(sysPath, { recursive: true })
  } catch {}

  // Decide filename: if it's the default placeholder or missing, derive from roster.name
  let filename = roster.__?.filename
  const isPlaceholder = !filename || /^roster\.rosz?$/i.test(filename)
  if (isPlaceholder) {
    const base = sanitizeBase(roster?.name)
    filename = await uniqueFilename(fs, sysPath, base, '.rosz')
    roster.__.filename = filename
  }

  // Write file
  const { __: _meta, ...contents } = roster
  const data = await xmlData({ roster: contents }, filename)
  await fs.promises.writeFile(path.join(sysPath, filename), data)

  // Update index with latest summary and timestamp
  const index = await readIndex(sysPath, fs)
  const summary = summarizeRoster(roster)
  try {
    const stat = await fs.promises.stat(path.join(sysPath, filename))
    summary.updatedAt = new Date(stat.mtime).toISOString()
  } catch {
    summary.updatedAt = new Date().toISOString()
  }
  index[filename] = summary
  await writeIndex(sysPath, fs, index)
}

export const importRoster = async (file, fs, rosterPath) => {
  const data = await file.arrayBuffer()
  console.log('writing', path.join(rosterPath, file.name))
  await fs.promises.writeFile(path.join(rosterPath, file.name), data)

  // After writing, parse and cache summary into index for fast listing
  try {
    const roster = await loadRoster(file.name, fs, rosterPath)
    const index = await readIndex(rosterPath, fs)
    const summary = summarizeRoster(roster)
    try {
      const stat = await fs.promises.stat(path.join(rosterPath, file.name))
      summary.updatedAt = new Date(stat.mtime).toISOString()
    } catch {
      summary.updatedAt = new Date().toISOString()
    }
    index[file.name] = summary
    await writeIndex(rosterPath, fs, index)
  } catch (e) {
    console.warn('Failed to index imported roster:', e)
  }
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
  try {
    const index = await readIndex(rosterPath, fs)
    delete index[file]
    await writeIndex(rosterPath, fs, index)
  } catch {}
}

export const deleteAllRosters = async (fs, rosterPath) => {
  try {
    const files = await fs.promises.readdir(rosterPath)
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(rosterPath, f))))
    // Remove index as well
    try {
      await fs.promises.unlink(indexPath(rosterPath))
    } catch {}
  } catch {}
}

export const duplicateRoster = async (file, fs, rosterPath) => {
  // Load the existing roster
  const original = await loadRoster(file, fs, rosterPath)
  const originalName = original?.name || 'Roster'

  // New name and unique filename
  const newName = `Copy of (${originalName})`
  const base = sanitizeBase(newName)
  const newFilename = await uniqueFilename(fs, rosterPath, base, '.rosz')

  // Prepare cloned roster object
  const clone = JSON.parse(JSON.stringify(original))
  clone.name = newName
  clone.__ = { filename: newFilename, updated: false }

  // Persist cloned roster in the same system folder
  const { __: _meta, ...contents } = clone
  const data = await xmlData({ roster: contents }, newFilename)
  await fs.promises.writeFile(path.join(rosterPath, newFilename), data)

  // Update index (system folder level)
  const index = await readIndex(rosterPath, fs)
  const summary = summarizeRoster(clone)
  try {
    const stat = await fs.promises.stat(path.join(rosterPath, newFilename))
    summary.updatedAt = new Date(stat.mtime).toISOString()
  } catch {
    summary.updatedAt = new Date().toISOString()
  }
  index[newFilename] = summary
  await writeIndex(rosterPath, fs, index)

  return newFilename
}
