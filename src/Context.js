import { createContext, useContext } from 'react'
import _ from 'lodash'

import { sumCosts } from './utils.js'

export const FSContext = createContext(null)
export const NativeContext = createContext([])

export const GameContext = createContext(null)
export const RosterContext = createContext([])
export const RosterErrorsContext = createContext([])
export const OpenCategoriesContext = createContext([])
export const PathContext = createContext([])

export const useConfirm = (shouldPrompt, message) => {
  return async (callback) => {
    if (shouldPrompt && !(await window.confirm(message))) {
      return
    }
    callback()
  }
}

export const useRoster = () => {
  const [roster, setRoster] = useContext(RosterContext)
  const gameData = useContext(GameContext)

  return [
    roster,
    // recalcCosts: skip total roster cost recomputation for cheap edits (names/notes)
    (r, updated = true, recalcCosts = true) =>
      setRoster(
        r && {
          ...r,
          __: { ...r.__, updated, rev: (r.__?.rev || 0) + (recalcCosts ? 1 : 0) },
          ...(recalcCosts
            ? {
                costs: {
                  cost: Object.entries(sumCosts(r)).map(([name, value]) => ({
                    name,
                    value,
                    typeId: gameData.gameSystem.costTypes.find((ct) => ct.name === name).id,
                  })),
                },
              }
            : {}),
        },
      ),
  ]
}

export const useUpdateRoster = () => {
  const [roster, setRoster] = useRoster()

  return (path, value) => {
    // Heuristic: text-only edits shouldn't trigger a full cost recompute
    const cheapEdit =
      path === 'name' ||
      path === 'customNotes' ||
      /\.customName$/.test(path) ||
      path.endsWith('.page') ||
      path.endsWith('.publicationId') ||
      path.startsWith('costLimits.')
    setRoster(_.set(roster, path, value), true, !cheapEdit)
  }
}

export const useFs = () => useContext(FSContext)
export const useNative = () => useContext(NativeContext)

export const useSystem = () => useContext(GameContext)
export const usePath = () => useContext(PathContext)
export const useRosterErrors = () => useContext(RosterErrorsContext)
export const useOpenCategories = () => useContext(OpenCategoriesContext)
