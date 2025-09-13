// Presentation policies for different game systems.
// Centralizes small differences in how we present data so components stay clean.

// Helper tokenizers
const splitChips = (text) =>
  (text || '')
    .split(/[\n;•]|,(?=(?:[^()]*\([^()]*\))*[^()]*$)/g)
    .map((s) => s.trim())
    .filter((s) => s && s !== '-')

const splitKeywords = (text) =>
  (text || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '-' && s !== '—' && s !== '–' && s.toLowerCase() !== 'n/a')

const defaultIsAbilityType = (name, characteristicTypes) => {
  const n = String(name || '').toLowerCase()
  const labels = (characteristicTypes || []).map((c) => c.name.toLowerCase())
  return (
    n.includes('abilities') ||
    n.includes('ability') ||
    labels.includes('description') ||
    labels.includes('ability details')
  )
}

const defaultPolicy = {
  // Always use card/vertical layouts for consistency everywhere
  useCardsEverywhere: true,
  isAbilityType: defaultIsAbilityType,
  // Returns an array of tokens for a characteristic label/value, or empty if not tokenized
  tokenize(label, value) {
    if (!value) return []
    const l = String(label || '')
    if (/keyword/i.test(l)) return splitKeywords(value)
    if (/abilities?/i.test(l) || /ability details/i.test(l)) return splitChips(value)
    return []
  },
}

// Example overrides per system; extend as needed
const systemOverrides = {
  'Warhammer 40,000': {
    // 40k keeps same defaults; placeholder for future tweaks
  },
  'Age of Sigmar': {
    // AoS uses "Unit Abilities" and often a single "Ability Details" characteristic
    isAbilityType: (name, cts) => defaultIsAbilityType(name, cts),
  },
}

export const getPresentationPolicy = (gameData) => {
  const systemName = gameData?.gameSystem?.name
  const base = { ...defaultPolicy, ...(systemName && systemOverrides[systemName]) }

  // Shared helpers exposed on the policy for consumers
  return {
    ...base,
    // Classify profile type into semantic buckets for ordering and layout tweaks
    classifyType(name, characteristicTypes = []) {
      const n = String(name || '').toLowerCase()
      const labels = (characteristicTypes || []).map((c) => (c?.name || '').toLowerCase())
      if (n === 'unit') return 'unit'
      if (n.includes('ranged') || labels.includes('bs')) return 'ranged'
      if (n.includes('melee') || labels.includes('ws')) return 'melee'
      if (base.isAbilityType(name, characteristicTypes)) return 'ability'
      return 'other'
    },
    // Return normalized characteristic order for known types; fallback to given order
    columnOrder(name, characteristicTypes = []) {
      const kind = this.classifyType(name, characteristicTypes)
      const names = characteristicTypes.map((c) => c.name)
      const only = (wanted) => wanted.filter((w) => names.includes(w))
      if (kind === 'unit') return only(['M', 'T', 'SV', 'W', 'LD', 'OC'])
      if (kind === 'ranged') return only(['Range', 'A', 'BS', 'S', 'AP', 'D'])
      if (kind === 'melee') return only(['Range', 'A', 'WS', 'S', 'AP', 'D'])
      return names
    },
    // Section title visibility; Unit heading not needed
    showSectionTitle(name, characteristicTypes = []) {
      return this.classifyType(name, characteristicTypes) !== 'unit'
    },
    // Section title override for known types (for consistency)
    sectionTitle(name, characteristicTypes = []) {
      const kind = this.classifyType(name, characteristicTypes)
      if (kind === 'ranged') return 'Ranged Weapons'
      if (kind === 'melee') return 'Melee Weapons'
      return name
    },
  }
}

export default getPresentationPolicy
