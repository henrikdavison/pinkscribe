// Ensure all exports are at the top level

export const buildIdIndex = (gameData) => {
  const index = {}

  const indexCatalogue = (catalogue, catalogueId) => {
    Object.entries(catalogue.ids || {}).forEach(([id, entry]) => {
      index[id] = { entry, catalogueId }
    })
    ;(catalogue.catalogueLinks || []).forEach((link) => {
      const linkedCatalogue = gameData.catalogues?.[link.targetId]
      if (linkedCatalogue) {
        indexCatalogue(linkedCatalogue, link.targetId)
      }
    })
  }

  if (gameData.gameSystem?.ids) {
    Object.entries(gameData.gameSystem.ids).forEach(([id, entry]) => {
      index[id] = { entry, catalogueId: 'gameSystem' }
    })
  }

  Object.entries(gameData.catalogues || {}).forEach(([catalogueId, catalogue]) => {
    indexCatalogue(catalogue, catalogueId)
  })

  console.log('buildIdIndex: Built index', { index })
  return index
}

const cache = {}

export const findId = (idIndex, id, options = {}) => {
  const { includeLinked = true } = options

  console.log('findId: Checking ID', { id })
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.warn('findId: Invalid ID provided. Returning undefined.', { id })
    return undefined
  }

  const result = idIndex[id]
  if (result) {
    console.log('findId: Found entry', { id, result })
    return result.entry
  }

  if (!includeLinked) {
    console.warn(`findId: ID ${id} not found in index.`)
    return null
  }

  console.warn(`findId: ID ${id} not found and no linked search allowed.`)
  return null
}

export const cachedFindId = (idIndex, id, options = {}) => {
  console.log('cachedFindId: Accessing cache for ID', { id })

  if (cache[id]) {
    console.log('cachedFindId: Cache hit', { id, result: cache[id] })
    return cache[id]
  }

  const result = findId(idIndex, id, options)
  if (result) {
    cache[id] = result
    console.log('cachedFindId: Cache updated for ID', { id, result })
  } else {
    console.warn('cachedFindId: No result for ID, not caching', { id })
  }

  return result
}
