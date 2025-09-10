import fs from 'fs'
import path from 'path'
import { listAvailableGameSystems, addGameSystem, readFiles } from '../src/repo/index.js'

async function loadSystem(name = 'wh40k') {
  const systems = await listAvailableGameSystems()
  const system = systems.find((s) => s.name === name)
  if (!system) {
    throw new Error(`System ${name} not found`)
  }
  const gameSystemPath = path.join(process.cwd(), 'downloadedGameSystems')
  await fs.promises.mkdir(gameSystemPath, { recursive: true })
  const queue = await addGameSystem(system, fs, gameSystemPath)
  queue.start()
  await queue.onIdle()
  const parsed = await readFiles(path.join(gameSystemPath, system.name), fs, gameSystemPath)
  console.log(`Loaded ${system.name} with ${Object.keys(parsed.catalogues).length} catalogues`)
}

const systemName = process.argv[2]
loadSystem(systemName).catch((e) => {
  console.error('Failed to load system:', e)
  process.exit(1)
})
