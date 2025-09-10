import _ from 'lodash'
import an from 'indefinite'
import pluralize from 'pluralize'

import { findId, gatherCatalogues, getCatalogue, randomId } from './utils.js'

// Lightweight debugging hooks to trace where validation messages come from
const recordErrorDetail = (message, detail) => {
  try {
    if (typeof window === 'undefined') return
    window.errorMap = window.errorMap || {}
    ;(window.errorMap[message] = window.errorMap[message] || []).push(detail)
    window.__explainError =
      window.__explainError ||
      ((msg) => {
        const items = window.errorMap?.[msg] || []
        console.group(`Explanation for: ${msg}`)
        items.forEach((d, i) => console.log(`#${i + 1}`, d))
        console.groupEnd()
      })
  } catch {}
}

// Collect matching selections contributing to a count, for debugging/explain output
const collectSelectionMatches = (subject, entryId, currentPath = '') => {
  const results = []
  const add = (sel, path) =>
    results.push({
      path,
      name: sel.name,
      entryId: sel.entryId,
      number: sel.number ?? 1,
      categories: (sel.categories?.category || []).map((c) => c.entryId),
    })

  if (subject?.selections?.selection) {
    subject.selections.selection.forEach((sel, i) => {
      const path = `${currentPath ? currentPath + '.' : ''}selections.selection.${i}`
      if (sel.entryId?.includes(entryId) || sel.entryGroupId?.includes(entryId) || hasCategory(sel, entryId)) {
        add(sel, path)
      }
      // Recurse to find nested matches
      results.push(...collectSelectionMatches(sel, entryId, path))
    })
  }

  if (subject?.forces?.force) {
    subject.forces.force.forEach((f, i) => {
      results.push(...collectSelectionMatches(f, entryId, `${currentPath ? currentPath + '.' : ''}forces.force.${i}`))
    })
  }

  return results
}

const arrayMerge = (dest, source) => {
  Object.entries(source).forEach(([key, value]) => {
    const existing = dest[key] || []
    // Merge and deduplicate messages to avoid duplicate keys/warnings in UI
    dest[key] = Array.from(new Set([...existing, ...value.sort()]))
  })
}

export const validateRoster = (roster, gameData) => {
  const errors = {}
  try {
    if (typeof window !== 'undefined') {
      window.errorMap = {}
    }
  } catch {}

  try {
    if (!roster.forces || roster.forces.force.length < 1) {
      errors[''] = ['A roster requires at least one Force.']
      return errors
    }

    roster.costLimits?.costLimit.forEach((cl) => {
      const cost = roster.costs?.cost.find((c) => c.typeId === cl.typeId)
      if (cost && cl.value !== -1 && cost.value > cl.value) {
        errors[''] = errors[''] || []
        errors[''].push(`Roster has ${cost.value}${cost.name}, more than the limit of ${cl.value}${cl.name}`)
      }
    })

    gameData.gameSystem.categoryEntries?.forEach((categoryEntry) => {
      const entry = getEntry(roster, '', categoryEntry.id, gameData)
      arrayMerge(errors, checkConstraints(roster, '', entry, gameData))
    })

    roster.forces?.force.forEach((force, index) => {
      arrayMerge(errors, validateForce(roster, `forces.force.${index}`, force, gameData))
    })
  } catch (e) {
    e.location = 'roster'
    errors[''] = errors[''] || []
    errors[''].push(e)
  }

  return errors
}

const validateForce = (roster, path, force, gameData) => {
  const errors = {}

  try {
    gatherCatalogues(gameData.catalogues[force.catalogueId], gameData).forEach((catalogue) => {
      catalogue.entryLinks?.forEach((selectionEntry) => {
        const entry = getEntry(roster, path, selectionEntry.id, gameData)
        arrayMerge(errors, checkConstraints(roster, path, entry, gameData))
      })

      catalogue.selectionEntries?.forEach((selectionEntry) => {
        const entry = getEntry(roster, path, selectionEntry.id, gameData)
        arrayMerge(errors, checkConstraints(roster, path, entry, gameData))
      })
    })

    const f = findId(gameData, getCatalogue(roster, path, gameData), force.entryId)
    f.categoryLinks?.forEach((categoryLink) => {
      const entry = getEntry(roster, path, categoryLink.id, gameData)
      arrayMerge(errors, checkConstraints(roster, path, entry, gameData))
    })

    force.selections?.selection.forEach((selection, index) => {
      arrayMerge(errors, validateSelection(roster, `${path}.selections.selection.${index}`, selection, gameData))
    })
  } catch (e) {
    e.path = path
    e.location = force.name
    errors[''] = errors[''] || []
    errors[''].push(e)
  }

  return errors
}

const validateSelection = (roster, path, selection, gameData) => {
  const errors = {}
  const entry = getEntry(roster, path, selection.entryId, gameData)

  if (!entry) {
    arrayMerge(errors, {
      [path]: [`${selection.name} does not exist in the game data. It may have been removed in a data update.`],
    })

    return errors
  }

  try {
    if (entry.hidden) {
      arrayMerge(errors, {
        [path]: [`${selection.name} is hidden and cannot be selected.`],
      })
    }

    const handleLink = (link) => {
      const linkEntry = getEntry(roster, path, link.id, gameData)
      arrayMerge(errors, checkConstraints(roster, path, linkEntry, gameData))
    }

    const handleSelection = (selectionEntry) => {
      arrayMerge(
        errors,
        checkConstraints(roster, `${path}.selections.selection.100000`, selectionEntry, gameData, true),
      )
    }

    const handleGroup = (group) => {
      if (group.hidden) {
        if (selection.selections?.selection.some((s) => s.entryGroupId === group.id)) {
          arrayMerge(errors, {
            [path]: [`${group.name} is hidden and cannot be selected.`],
          })
        }
      }
      arrayMerge(errors, checkConstraints(roster, `${path}.selections.selection.100000`, group, gameData, true))

      group.entryLinks?.forEach(handleLink)
      group.selectionEntries?.forEach(handleSelection)
      group.selectionEntryGroups?.forEach(handleGroup)
    }

    entry.entryLinks?.forEach(handleLink)
    entry.selectionEntries?.forEach(handleSelection)
    entry.selectionEntryGroups?.forEach(handleGroup)

    selection.selections?.selection.forEach((selection, index) => {
      arrayMerge(errors, validateSelection(roster, `${path}.selections.selection.${index}`, selection, gameData))
    })
  } catch (e) {
    e.path = path
    e.location = selection.name
    errors[''] = errors[''] || []
    errors[''].push(e)
    console.log(e)
  }

  return errors
}

const hasCategory = (subject, categoryId) => {
  return !!subject.categories?.category.some((c) => (c.entryId || '').includes(categoryId))
}

export const countBy = (subject, entryId, entry, groupIds) => {
  if (!subject) {
    return 0
  }
  if (entry.shared) {
    entryId = _.last(entryId.split('::'))
  }

  if (
    subject.entryId?.includes(entryId) ||
    subject.entryGroupId?.includes(entryId) ||
    groupIds?.some((groupId) => subject.entryGroupId === groupId) ||
    subject.type === entryId ||
    // Only count a direct category hit at the selection level, not for forces/roster
    (!subject.gameSystemId && !subject.catalogueId && hasCategory(subject, entryId))
  ) {
    return subject.number ?? 1
  }

  let count = subject.forces?.force.filter((force) => force.entryId === entryId).length ?? 0

  if (subject.forces) {
    if (entry.includeChildForces || entry.shared) {
      count += _.sum(subject.forces.force.map((force) => countBy(force, entryId, entry, groupIds)))
    }
  }

  if (subject.selections) {
    if (entry.includeChildSelections || entry.shared) {
      count += _.sum(subject.selections.selection.map((selection) => countBy(selection, entryId, entry, groupIds)))
    } else {
      // When counting by category or group id, include selections that have that category
      count += _.sum(
        _.map(
          subject.selections.selection.filter((selection) => {
            return (
              selection.entryId.includes(entryId) ||
              selection.entryGroupId?.includes(entryId) ||
              hasCategory(selection, entryId)
            )
          }),
          'number',
        ),
      )
    }
  }

  if (_.isNaN(count)) {
    debugger
    throw new Error('NaN while trying to countBy')
  }
  return count
}

// eslint-disable-next-line no-unused-vars
const countByCategory = (subject, category, entry) => {
  const categoryId = _.last(category.id.split('::'))

  let count = (!subject.catalogueId && subject.categories?.category.some((c) => c.entryId === categoryId)) ?? 0

  if (entry.includeChildSelections && subject.selections) {
    count += _.sum(subject.selections.selection.map((selection) => countByCategory(selection, category, entry)))
  } else {
    count +=
      subject.selections?.selection.filter((selection) => {
        return selection.categories?.category.some((c) => c.entryId === categoryId)
      }).length ?? 0
  }

  if (subject.forces) {
    if (entry.includeChildForces || entry.shared) {
      count += _.sum(subject.forces.force.map((force) => countByCategory(force, category, entry)))
    }
  }

  return count
}

const sumCost = (subject, entry, filterByCategory) => {
  let sum = 0

  // If we're a top-level roster, don't include the "costs" or we'll end up double-counting.
  if (!subject.gameSystemId) {
    if (filterByCategory === 'any' || subject.categories?.category.some((c) => c.entryId === filterByCategory)) {
      const v = subject.costs?.cost.find((c) => c.typeId === entry.field)?.value
      sum += typeof v === 'number' ? v : 0
    }
  }

  if ((entry.includeChildForces || filterByCategory === 'any') && subject.forces) {
    sum += _.sum(subject.forces.force.map((force) => sumCost(force, entry, filterByCategory)))
  }

  if ((entry.includeChildSelections || filterByCategory === 'any') && subject.selections) {
    sum += _.sum(subject.selections.selection.map((s) => sumCost(s, entry, filterByCategory)))
  }

  return sum
}

// Profiling showed that this function was taking quite a large amount of time during
// validation, so extra care is taken with performance here.
const collectGroupIds = _.memoize(
  (entry) => {
    const ids = []
    collectGroupIdsInternal(entry, ids)
    return ids
  },
  (e) => e.id,
)

const collectGroupIdsInternal = (entry, ids) => {
  entry.selectionEntryGroups?.forEach((group) => {
    ids.push(group.id)
    collectGroupIdsInternal(group, ids)
  })
}

const getSubjectName = (subject, constraint) => {
  switch (constraint.scope) {
    case 'roster':
      return 'Roster'
    default:
      return subject.name
  }
}

const checkConstraints = (roster, path, entry, gameData, group = false) => {
  let errors = []

  try {
    let max = Infinity
    if (entry.constraints) {
      entry.constraints?.forEach((constraint) => {
        // Respect constraint-level conditions (very common in 10e data)
        if (!checkConditions(roster, path, constraint, gameData)) {
          return
        }
        const subject = getSubject(roster, path, constraint)
        if (!subject) {
          return
        }

        const costConstraint =
          (typeof constraint.field === 'string' && constraint.field.startsWith('limit::')) ||
          isCostType(constraint.field, gameData)

        // Compute the actual measured value and the allowed threshold
        let actual
        let limit = constraint.value

        if (costConstraint) {
          // Costs: sum matching costs, optionally as a percent
          if (constraint.percentValue) {
            const denom = sumCost(subject, constraint, 'any')
            const num = sumCost(subject, constraint, false)
            actual = denom ? num / denom : 0
          } else {
            actual = sumCost(subject, constraint, false)
          }
        } else if (entry.primary !== undefined) {
          // Category entry: count by category
          actual = countByCategory(subject, entry, constraint)
        } else {
          // Selection entry: count occurrences of this entry
          actual = countBy(subject, entry.id, constraint, collectGroupIds(entry))
        }

        // Find up to 20 concrete matches for debugging (for counts only)
        const matches = costConstraint ? [] : collectSelectionMatches(subject, entry.id, path).slice(0, 20)
        const name = getSubjectName(subject, constraint)
        const entryName = entry.name.replace(/[^A-z]+$/, '')

        if (constraint.type === 'min' && limit !== -1 && !entry.hidden && actual < limit) {
          if (limit === 1) {
            const msg = `${name} must have ${an(pluralize.singular(entryName))} selection`
            errors.push(msg)
            recordErrorDetail(msg, {
              path,
              entry: entryName,
              constraint: JSON.parse(JSON.stringify(constraint)),
              occurances: actual,
              required: limit,
              subject: name,
              targetId: entry.id,
              targetName: entry.name,
              matches,
            })
          } else {
            const msg = `${name} must have ${limit - actual} more ${entryName} selection${
              limit - actual > 1 ? 's' : ''
            }`
            errors.push(msg)
            recordErrorDetail(msg, {
              path,
              entry: entryName,
              constraint: JSON.parse(JSON.stringify(constraint)),
              occurances: actual,
              required: limit,
              subject: name,
              targetId: entry.id,
              targetName: entry.name,
              matches,
            })
          }
        }

        if (constraint.type === 'max' && limit < max) {
          max = limit
        }
        const multiplicative = subject?.number ?? 1
        if (constraint.type === 'max' && limit !== -1 && actual > (costConstraint ? limit : limit * multiplicative)) {
          if (limit === 0) {
            const msg = `${name} cannot have ${an(pluralize.singular(entryName))} selection`
            errors.push(msg)
            recordErrorDetail(msg, {
              path,
              entry: entryName,
              constraint: JSON.parse(JSON.stringify(constraint)),
              occurances: actual,
              allowed: limit,
              subject: name,
              targetId: entry.id,
              targetName: entry.name,
              matches,
            })
          } else {
            const msg = `${name} has ${actual - limit} too many ${entryName} selections`
            errors.push(msg)
            recordErrorDetail(msg, {
              path,
              entry: entryName,
              constraint: JSON.parse(JSON.stringify(constraint)),
              occurances: actual,
              allowed: limit,
              subject: name,
              targetId: entry.id,
              targetName: entry.name,
              matches,
            })
          }
        }

        if (constraint.type === 'exactly' && limit !== actual) {
          const msg = `${name} must have ${limit} ${entryName}, but has ${actual}`
          errors.push(msg)
          recordErrorDetail(msg, {
            path,
            entry: entryName,
            constraint: JSON.parse(JSON.stringify(constraint)),
            occurances: actual,
            required: limit,
            subject: name,
            targetId: entry.id,
            targetName: entry.name,
            matches,
          })
        }
      })

      if (max === 0) {
        errors = errors.filter((e) => !e.match(/must have .* more|must have .* selection/))
      }
    }
  } catch (e) {
    e.path = path
    e.location = entry.name
    return { '': [e] }
  }

  return errors.length ? { [path]: errors } : {}
}

const settable = {
  description: true,
  hidden: true,
  name: true,
  page: true,
}

const numberRegex = /-?\d+([.]\d+)?/
const stringIncrement = (string, value) => string.replace(numberRegex, (match) => parseFloat(match) + value)

const modifierAttributes = [
  'costs',
  'categoryLinks',
  'constraints',
  'infoLinks',
  'infoGroups',
  'profiles',
  'rules',
  'selectionEntries',
  'selectionEntryGroups',
]

const applyModifiers = (roster, path, entry, gameData, catalogue) => {
  let ids
  function index(x, path = '') {
    if (typeof x == 'object') {
      const value = x['#text'] ? '.#text' : '.value'
      if (x.id && !ids[x.id]) {
        ids[x.id] = path + value
      }

      if (x.typeId && !ids[x.typeId]) {
        ids[x.typeId] = path + value
      }

      for (let attr of modifierAttributes) {
        x[attr]?.forEach((item, i) => index(item, `${path ? path + '.' : ''}${attr}.${i}`))
      }
    }
  }

  const applyModifier = (modifier) => {
    if (!checkConditions(roster, path, modifier, gameData)) {
      return
    }

    if (!ids) {
      ids = {}
      index(entry)
    }

    const target =
      settable[modifier.field] || entry[modifier.field] !== undefined ? modifier.field : `${ids[modifier.field]}`

    if (target === 'undefined' && modifier.value === true) {
      debugger
    }

    if (modifier.type === 'set') {
      if (_.isNaN(modifier.value)) {
        debugger
        throw new Error('NaN modifier.value')
      }
      _.set(entry, target, modifier.value)
    } else if (modifier.type === 'increment' || modifier.type === 'decrement') {
      let times = 1
      if (modifier.repeats) {
        const repeat = modifier.repeats[0]

        const subject = getSubject(roster, path, repeat)
        const value = getValue(repeat, subject, gameData, catalogue)
        const round = repeat.roundUp ? Math.ceil : Math.floor

        times = repeat.repeats * round(value / modifier.repeats[0].value)
        if (_.isNaN(times)) {
          debugger
        }
      }

      if (modifier.type === 'decrement') {
        times *= -1
      }

      const oldValue = _.get(entry, target)

      if (_.isString(oldValue)) {
        _.set(entry, target, stringIncrement(oldValue, modifier.value * times))
      } else {
        _.set(entry, target, oldValue + modifier.value * times)
      }
    } else if (modifier.type === 'append') {
      entry[modifier.field] += modifier.value
    } else if (modifier.type === 'floor' || modifier.type === 'ceil' || modifier.type === 'round') {
      const oldValue = _.get(entry, target)
      const roundFn = modifier.type === 'ceil' ? Math.ceil : modifier.type === 'floor' ? Math.floor : Math.round
      if (_.isString(oldValue)) {
        _.set(
          entry,
          target,
          oldValue.replace(numberRegex, (match) => String(roundFn(parseFloat(match)))),
        )
      } else if (_.isNumber(oldValue)) {
        _.set(entry, target, roundFn(oldValue))
      } else {
        // If target is not a number/number string, ignore safely
      }
    } else if (modifier.type === 'replace') {
      const oldValue = _.get(entry, target)
      // Common shapes seen in BSData: find/replace, from/to, pattern/value
      const find = modifier.find ?? modifier.from ?? (modifier.value && modifier.value.find) ?? modifier.pattern
      const replacement =
        modifier.replace ?? modifier.to ?? (modifier.value && (modifier.value.replace ?? modifier.value.value)) ?? ''
      const flags = modifier.flags || modifier.regexFlags || 'g'
      if (_.isString(oldValue)) {
        let newVal
        if (modifier.regex || (typeof find === 'string' && find.startsWith('^')) || find instanceof RegExp) {
          const regex = find instanceof RegExp ? find : new RegExp(String(find), flags)
          newVal = oldValue.replace(regex, String(replacement))
        } else if (find !== undefined) {
          newVal = oldValue.split(String(find)).join(String(replacement))
        } else {
          // If only replacement given, set directly
          newVal = String(replacement)
        }
        _.set(entry, target, newVal)
      } else if (_.isNumber(oldValue) && find !== undefined) {
        // Numeric equality replacement
        _.set(entry, target, Number(oldValue) === Number(find) ? Number(replacement) : oldValue)
      }
    } else if (modifier.type === 'add') {
      if (modifier.field !== 'category') {
        debugger
        throw new Error("modifier.type === 'add' while modifier.field !== 'category'")
      }

      entry.categoryLinks = entry.categoryLinks || []
      entry.categoryLinks.push({
        id: randomId(),
        hidden: false,
        name: 'New CategoryLink',
        primary: false,
        targetId: modifier.value,
      })
    } else if (modifier.type === 'remove') {
      if (modifier.field !== 'category') {
        debugger
        throw new Error("modifier.type === 'remove' while modifier.field !== 'category'")
      }

      entry.categoryLinks = entry.categoryLinks.filter((link) => link.targetId !== modifier.value)
    } else if (modifier.type === 'set-primary' || modifier.type === 'unset-primary') {
      if (modifier.field !== 'category') {
        debugger
        throw new Error(`modifier.type === ${modifier.type} while modifier.field !== 'category'`)
      }
      entry.categoryLinks = entry.categoryLinks || []
      let category = entry.categoryLinks.find((cat) => cat.targetId === modifier.value)
      if (category) {
        category.primary = modifier.type === 'set-primary'
      } else {
        entry.categoryLinks.push({
          id: randomId(),
          hidden: false,
          name: 'New CategoryLink',
          primary: modifier.type === 'set-primary',
          targetId: modifier.value,
        })
      }
    } else {
      debugger
      throw new Error(`Unknown modifier.type: ${modifier.type}`)
    }
  }

  const applyModifierGroup = (group) => {
    if (!checkConditions(roster, path, group, gameData)) {
      return
    }
    group.modifiers?.forEach(applyModifier)
    group.modifierGroups?.forEach(applyModifierGroup)
  }

  entry.modifiers?.forEach(applyModifier)
  entry.modifierGroups?.forEach(applyModifierGroup)
}

const checkConditions = (roster, path, entry, gameData) => {
  const results = [
    ...(entry.conditions?.map((c) => checkCondition(roster, path, c, gameData)) || []),
    ...(entry.conditionGroups?.map((cg) => checkConditions(roster, path, cg, gameData)) || []),
  ]

  if (entry.type === 'or') {
    return results.some(Boolean)
  }

  // Not a group, or _type === 'and'
  return results.every(Boolean)
}

const findByEntryId = (subject, entryId) => {
  if (typeof subject === 'object') {
    if (subject.entryId?.includes(entryId)) {
      return subject
    }
    for (let attr in subject) {
      const found = findByEntryId(subject[attr], entryId)
      if (found) {
        return found
      }
    }
  }
}

export const pathToForce = (path) => path.replace(/.selections.*/, '')

export const pathParent = (path) => path.replace(/.selections.selection.\d+$/, '')
const pathAncestors = (path) => {
  const ancestors = [path]
  while (pathParent(path) !== path) {
    path = pathParent(path)
    ancestors.push(path)
  }
  return ancestors
}

const getSubject = (roster, path, condition) => {
  switch (condition.scope) {
    case 'self':
      return _.get(roster, path)
    case 'parent':
      return _.get(roster, pathParent(path))
    case 'force':
      return _.get(roster, pathToForce(path))
    case 'roster':
      return roster
    case 'ancestor':
      return pathAncestors(path).map((ancestor) => _.get(roster, ancestor))
    case 'primary-catalogue':
      return {
        entryId: _.get(roster, pathToForce(path) || 'forces.force.0')?.catalogueId,
      }
    default: {
      const directAncestor = pathAncestors(path).find((startingPoint) =>
        _.get(roster, startingPoint)?.entryId?.includes(condition.scope),
      )
      if (directAncestor) {
        return _.get(roster, directAncestor)
      }

      const startingPoint = condition.shared ? roster : _.get(roster, path)
      return findByEntryId(startingPoint, condition.scope)
    }
  }
}

const getValue = (condition, subject, gameData, catalogue) => {
  const childId = findId(gameData, catalogue, condition.childId)?.targetId || condition.childId

  if (!subject) {
    return 0
  }
  switch (condition.field) {
    case 'selections':
      return countBy(subject, childId, condition)
    case 'forces':
      return countBy(subject, childId, condition)
    default: {
      let cost = sumCost(subject, condition, childId)
      if (condition.percentValue) {
        cost /= sumCost(subject, condition, 'any')
      }

      return cost
    }
  }
}

const isCostType = (field, gameData) => {
  // If the field matches a declared cost type (by id or name), it's a cost constraint
  return !!gameData?.gameSystem?.costTypes?.find((ct) => ct.id === field || ct.name === field || ct.typeId === field)
}

const getConstraintValue = (constraint, entryId, subject, gameData) => {
  switch (constraint.field) {
    case 'selections':
      return constraint.value
    case 'forces':
      return constraint.value
    default: {
      // In BS data, a max with negative value means "no limit"
      if (constraint.type === 'max' && constraint.value < 0) {
        return -1
      }
      // If the field references a roster limit, compute from limits
      if (typeof constraint.field === 'string' && constraint.field.startsWith('limit::')) {
        const limit = subject.costLimits?.costLimit.find((cl) => `limit::${cl.id}` === constraint.field)
        return (limit ?? -1) * constraint.value
      }

      // If the field is a known cost type, compute based on costs
      if (isCostType(constraint.field, gameData)) {
        let cost = sumCost(subject, constraint, false)
        if (constraint.percentValue) {
          cost /= sumCost(subject, constraint, 'any')
          if (!Number.isFinite(cost)) cost = 0
        }
        return cost * constraint.value
      }

      // Otherwise, treat as a selection count style constraint where the number is explicit
      return constraint.value
    }
  }
}

const checkCondition = (roster, path, condition, gameData) => {
  const subject = getSubject(roster, path, condition)
  const catalogue = getCatalogue(roster, path, gameData)

  switch (condition.type) {
    case 'greaterThan':
      return getValue(condition, subject, gameData, catalogue) > condition.value
    case 'lessThan':
      return getValue(condition, subject, gameData, catalogue) < condition.value
    case 'atMost':
      return getValue(condition, subject, gameData, catalogue) <= condition.value
    case 'atLeast':
      return getValue(condition, subject, gameData, catalogue) >= condition.value
    case 'equalTo':
      return getValue(condition, subject, gameData, catalogue) === condition.value
    case 'notEqualTo':
      return getValue(condition, subject, gameData, catalogue) !== condition.value
    case 'instanceOf':
      return []
        .concat(subject)
        .filter(Boolean)
        .some((s) => s.entryId?.endsWith(condition.childId) || hasCategory(s, condition.childId))
    case 'notInstanceOf':
      return ![]
        .concat(subject)
        .filter(Boolean)
        .some((s) => s.entryId?.endsWith(condition.childId) || hasCategory(s, condition.childId))
    default: {
      debugger
      throw new Error('Unknown condition.type: ' + condition.type)
    }
  }
}

let lastRoster
let cache = {}
window.cacheHits = 0
window.cacheMisses = 0

export const getEntry = (roster, path, id, gameData, ignoreCache) => {
  if (id[0] === ':') {
    id = id.slice(2)
  }

  const cachePath = `${path}-${id}`
  if (roster !== lastRoster) {
    cache = {}
    lastRoster = roster
  } else if (!ignoreCache && cache[cachePath]) {
    window.cacheHits++
    return cache[cachePath]
  }

  const catalogue = getCatalogue(roster, path, gameData)
  const entry = _.cloneDeep(findId(gameData, catalogue, _.last(id.split('::'))))

  if (!entry) {
    return null
  }

  if (entry.targetId) {
    return getEntry(roster, path, `${id}::${entry.targetId}`, gameData, ignoreCache)
  }

  const baseId = id.split('::').slice(0, -1).join('::')

  const base = findId(gameData, catalogue, _.last(baseId.split('::')))
  if (base?.targetId === entry.id) {
    Object.keys(base).forEach((key) => {
      if (entry[key] === undefined) {
        entry[key] = _.cloneDeep(base[key])
      } else if (entry[key] instanceof Array) {
        entry[key].push(..._.cloneDeep(base[key]))
      }
    })

    entry.hidden = base.hidden || entry.hidden
  }

  if (entry.modifiers || entry.modifierGroups) {
    applyModifiers(roster, path, entry, gameData, catalogue)
  }

  entry.id = id

  entry.entryLinks?.forEach((link) => {
    switch (link.type) {
      case 'selectionEntry': {
        entry.selectionEntries = entry.selectionEntries || []
        entry.selectionEntries.push(link)
        return
      }
      case 'selectionEntryGroup': {
        entry.selectionEntryGroups = entry.selectionEntryGroups || []
        entry.selectionEntryGroups.push(link)
        return
      }
      default: {
        debugger
        throw new Error(`Unknown entryLink type: ${link.type}`)
      }
    }
  })
  delete entry.entryLinks

  const handleLink = (link) => {
    switch (link.type) {
      case 'profile': {
        entry.profiles = entry.profiles || []
        entry.profiles.push(link)
        return
      }
      case 'rule': {
        entry.rules = entry.rules || []
        entry.rules.push(link)
        return
      }
      case 'infoGroup': {
        link = getEntry(roster, path, `${baseId}::${link.id}`, gameData)

        link.profiles?.forEach((profile) => {
          entry.profiles = entry.profiles || []
          entry.profiles.push(profile)
        })

        link.rules?.forEach((rule) => {
          entry.rules = entry.rules || []
          entry.rules.push(rule)
        })

        return
      }
      default: {
        debugger
        throw new Error(`Unknown infoLink type: ${link.type}`)
      }
    }
  }

  entry.infoLinks?.forEach(handleLink)
  delete entry.infoLinks

  entry.selectionEntries?.forEach((selectionEntry, index) => {
    Object.defineProperty(entry.selectionEntries, index, {
      get: () =>
        getEntry(
          roster,
          `${path}.selections.selection.10000`,
          `${baseId}::${selectionEntry.id}`,
          gameData,
          ignoreCache,
        ),
    })
  })

  entry.selectionEntryGroups?.forEach((selectionEntryGroup, index) => {
    Object.defineProperty(entry.selectionEntryGroups, index, {
      get: () => getEntry(roster, path, `${baseId}::${selectionEntryGroup.id}`, gameData, ignoreCache),
    })
  })

  entry.profiles?.forEach((profile, index) => {
    Object.defineProperty(entry.profiles, index, {
      get: () => getEntry(roster, path, `${baseId}::${profile.id}`, gameData, ignoreCache),
    })
  })

  entry.rules?.forEach((rule, index) => {
    Object.defineProperty(entry.rules, index, {
      get: () => getEntry(roster, path, `${baseId}::${rule.id}`, gameData, ignoreCache),
    })
  })

  cache[cachePath] = entry
  window.cacheMisses++

  return entry
}
