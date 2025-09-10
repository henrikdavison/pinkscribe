import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { addGameSystem, readFiles, listAvailableGameSystems } from '../src/repo/index.js'

// disable any configured proxies so axios can reach GitHub directly
axios.defaults.proxy = false
delete process.env.HTTP_PROXY
delete process.env.http_proxy
delete process.env.HTTPS_PROXY
delete process.env.https_proxy
delete process.env.ALL_PROXY
delete process.env.all_proxy

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
