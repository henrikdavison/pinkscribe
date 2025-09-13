// Smoke validator for WH40K: iterates all catalogues, adds one force,
// then adds each non-upgrade unit with minimum options and validates.
// Usage: node scripts/smoke-40k.mjs [path-to-40k-dir]

import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { readFiles } from '../src/repo/index.js'
import {
  createRoster,
  addForce,
  addSelection,
  getMinCount,
  getMaxCount,
  isCollective,
  refreshSelection,
} from '../src/utils.js'
import { getEntry } from '../src/validate.js'
import { validateRoster } from '../src/validate.js'

const resolveDir = () => {
  const arg = process.argv[2]
  if (arg) return path.resolve(arg)
  return path.resolve('src/__tests__/downloadedGameSystems/wh40k')
}

const main = async () => {
  const dir = resolveDir()
  if (!fs.existsSync(dir)) {
    console.error('Directory not found:', dir)
    process.exit(1)
  }

  console.log('Loading 40k data from', dir)
  const gameData = await readFiles(dir, { promises: fs.promises }, dir)
  if (!gameData?.gameSystem) {
    console.error('No gameSystem.gst found in directory. Ensure 40k data is present (gst + cat files).')
    process.exit(1)
  }

  const problems = []
  const catalogues = Object.values(gameData.catalogues || {}).filter((c) => !c.library)

  for (const cat of _.sortBy(catalogues, 'name')) {
    const forces = cat.forceEntries || []
    if (!forces.length) continue
    const forceEntry = forces[0]
    const roster = createRoster(`Smoke ${cat.name}`, gameData.gameSystem)
    addForce(roster, forceEntry.id, cat.id, gameData)
    const force = roster.forces.force[0]

    // Consider entries that look like units (exclude pure upgrades)
    const entries = (cat.selectionEntries || []).filter((e) => (e.type || '').toLowerCase() !== 'upgrade')
    for (const e of _.sortBy(entries, 'name')) {
      try {
        addSelection(force, e, gameData, null, cat)
        // Index of the added selection and its path
        const selIdx = (force.selections?.selection || []).length - 1
        const selPath = `forces.force.0.selections.selection.${selIdx}`
        const selection = force.selections.selection[selIdx]

        // Validate baseline
        const baselineMsgs = collectSelectionErrors(roster, gameData, selPath)
        if (baselineMsgs.length)
          problems.push({ catalogue: cat.name, unit: e.name, messages: baselineMsgs.slice(0, 6) })

        // Try toggling options within groups and direct entries
        await exerciseOptions(cat, gameData, roster, force, selection, selPath)

        // Remove the selection for next iteration
        force.selections.selection.pop()
      } catch (err) {
        problems.push({ catalogue: cat.name, unit: e.name, messages: [String(err?.message || err)] })
      }
    }
  }

  if (!problems.length) {
    console.log('All units validated without errors (with minimum options).')
    return
  }

  console.log(`\nFound ${problems.length} units with validation issues:`)
  problems.slice(0, 200).forEach((p) => {
    console.log(`\n[${p.catalogue}] ${p.unit}`)
    p.messages.forEach((m) => console.log('  -', m))
  })
  if (problems.length > 200) {
    console.log(`\n…and ${problems.length - 200} more.`)
  }
}

// Helpers
const collectSelectionErrors = (roster, gameData, selPath) => {
  const errors = validateRoster(roster, gameData)
  const keys = Object.keys(errors).filter((k) => k === selPath || k.startsWith(selPath + '.'))
  return _.uniq(keys.flatMap((k) => errors[k] || []).map((m) => (m?.message ? m.message : String(m))))
}

const setCount = (roster, gameData, selection, selPath, option, entryGroup, number, catalogue) => {
  selection.selections = selection.selections || { selection: [] }
  const cs = selection.selections.selection
  let current = cs.filter((s) => s.entryId === option.id)
  if (number < current.length) {
    while (current.length > number) {
      cs.splice(cs.indexOf(_.last(current)), 1)
      current = cs.filter((s) => s.entryId === option.id)
    }
  } else if (isCollective(option) && current.length) {
    current[0].selections?.selection.forEach((s) => (s.number = (s.number / current[0].number) * number))
    current[0].number = number
  } else {
    addSelection(selection, option, gameData, entryGroup || null, catalogue, number - current.length)
  }
  refreshSelection(roster, selPath, selection, gameData)
}

const exerciseOptions = async (catalogue, gameData, roster, force, selection, selPath) => {
  const entry = getEntry(roster, selPath, selection.entryId, gameData)
  // 1) Direct selectionEntries (checkbox or counts)
  for (const opt of _.sortBy(entry.selectionEntries || [], 'name').slice(0, 4)) {
    const min = getMinCount(opt) * selection.number
    const max = getMaxCount(opt) * selection.number
    // Try on then off (if allowed), staying within bounds
    const target = Math.min(max === -1 ? 1 : Math.max(1, Math.min(1, max)), 1)
    setCount(roster, gameData, selection, selPath, opt, null, target, catalogue)
    const msgsOn = collectSelectionErrors(roster, gameData, selPath)
    if (msgsOn.length) throw new Error(`Option '${opt.name}' caused errors: ${msgsOn[0]}`)
    if (min === 0) {
      setCount(roster, gameData, selection, selPath, opt, null, 0, catalogue)
      const msgsOff = collectSelectionErrors(roster, gameData, selPath)
      if (msgsOff.length) throw new Error(`Removing '${opt.name}' caused errors: ${msgsOff[0]}`)
    }
  }

  // 2) Grouped options (radio or counts)
  for (const group of _.sortBy(entry.selectionEntryGroups || [], 'name').slice(0, 4)) {
    const gmin = getMinCount(group) * selection.number
    const gmax = getMaxCount(group) * selection.number
    const opts = _.sortBy(group.selectionEntries || [], 'name')
    if (!opts.length) continue
    // Radio-like
    if (gmax === 1) {
      for (const opt of opts.slice(0, 2)) {
        setCount(roster, gameData, selection, selPath, opt, group, 1, catalogue)
        const msgs = collectSelectionErrors(roster, gameData, selPath)
        if (msgs.length) throw new Error(`Selecting '${opt.name}' in '${group.name}' caused errors: ${msgs[0]}`)
      }
      if (gmin === 0) {
        // Clear selection in this group
        selection.selections.selection = (selection.selections.selection || []).filter(
          (s) => s.entryGroupId !== group.id,
        )
        refreshSelection(roster, selPath, selection, gameData)
        const msgs = collectSelectionErrors(roster, gameData, selPath)
        if (msgs.length) throw new Error(`Clearing group '${group.name}' caused errors: ${msgs[0]}`)
      }
    } else {
      // Counted group: set first option up to allowed (cap at 2 to keep tests light)
      const first = opts[0]
      const target = Math.min(gmax === -1 ? 2 : Math.min(gmax, 2))
      setCount(roster, gameData, selection, selPath, first, group, target, catalogue)
      const msgs = collectSelectionErrors(roster, gameData, selPath)
      if (msgs.length)
        throw new Error(`Setting '${first.name}' to ${target} in '${group.name}' caused errors: ${msgs[0]}`)
      // Reset to 0 if allowed
      if (gmin === 0) {
        setCount(roster, gameData, selection, selPath, first, group, 0, catalogue)
        const msgs2 = collectSelectionErrors(roster, gameData, selPath)
        if (msgs2.length) throw new Error(`Reset '${first.name}' to 0 in '${group.name}' caused errors: ${msgs2[0]}`)
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
