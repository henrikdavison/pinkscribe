// Smoke validator for WH40K: iterates all catalogues, adds one force,
// then adds each non-upgrade unit with minimum options and validates.
// Usage: node scripts/smoke-40k.mjs [path-to-40k-dir]

import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { readFiles } from '../src/repo/index.js'
import { createRoster, addForce, addSelection } from '../src/utils.js'
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
        const errors = validateRoster(roster, gameData)
        // Collect selection-scoped errors
        const keys = Object.keys(errors).filter((k) => k.startsWith('forces.force.0.selections.selection'))
        const msgs = _.uniq(keys.flatMap((k) => errors[k] || []).map((m) => (m?.message ? m.message : String(m))))
        if (msgs.length) {
          problems.push({ catalogue: cat.name, unit: e.name, messages: msgs.slice(0, 6) })
        }
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
