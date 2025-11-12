// composables/useOnePieceCards.js
// Aggiunge alle carte locali: price (euro) + priceLastUpdate (ms) usando
// prima /api/prices (Supabase Storage) e in fallback ~/data/prices/one-piece.min.json

import localPriceIndexRaw from '~/data/prices/one-piece.min.json'

function normalizePriceArray(raw) {
  const arr = Array.isArray(raw?.default) ? raw.default : (Array.isArray(raw) ? raw : [])
  return arr.filter(p => p && typeof p.id === 'string')
}

export function useOnePieceCards() {
  // 1) prezzi runtime da API (SSR-safe)
  const { data: runtimePrices } = useAsyncData(
    'price-index',
    () => $fetch('/api/prices').catch(() => []),
    { server: true, default: () => [] }
  )

  // 2) fallback al file locale se l’API non restituisce nulla
  const priceArray = computed(() => {
    const fromApi = Array.isArray(runtimePrices.value) ? runtimePrices.value : []
    if (fromApi.length) return fromApi
    return normalizePriceArray(localPriceIndexRaw)
  })

  // 3) mappa id -> { priceCents, lastUpdate }
  const priceMap = computed(() => {
    const map = new Map()
    for (const p of priceArray.value) {
      map.set(p.id, {
        price: typeof p.price === 'number' ? p.price : null,           // centesimi
        lastUpdate: typeof p.lastUpdate === 'number' ? p.lastUpdate : null,
      })
    }
    return map
  })

  // 4) importa tutte le card locali e merga i prezzi
  const modules = import.meta.glob('~/data/cards/one_piece_tgc/*.json', {
    eager: true,
    as: 'json',
  })

  const allCards = []
  Object.values(modules).forEach((mod) => {
    const cards = Array.isArray(mod.default) ? mod.default : []
    for (const card of cards) {
      const p = priceMap.value.get(card.id)
      allCards.push({
        ...card,
        price: p && typeof p.price === 'number' ? p.price / 100 : null,   // euro
        priceLastUpdate: p ? p.lastUpdate : null,                         // ms
      })
    }
  })

  // Filtri/liste come prima
  const leaderCards = allCards.filter(
    (card) => card.type && card.type.toLowerCase().includes('leader')
  )

  const setNameSet = new Set()
  const typeSet = new Set()
  const familySet = new Set()
  const raritySet = new Set()
  const colorSet = new Set()
  const expansionCodeSet = new Set()
  const abilityKwSet = new Set()
  const nameSet = new Set()
  const powerSet = new Set()
  const counterSet = new Set()
  const attributeSet = new Set()
  const illustrationSet = new Set()

  for (const card of allCards) {
    if (card.setName) setNameSet.add(card.setName)
    if (card.type) typeSet.add(card.type)
    if (card.rarity) raritySet.add(card.rarity)
    if (card.expansionCode) expansionCodeSet.add(card.expansionCode)
    if (card.name) nameSet.add(card.name)
    if (card.power) powerSet.add(card.power)
    if (card.counter) counterSet.add(card.counter)
    if (card.attribute) attributeSet.add(card.attribute)
    if (Array.isArray(card.family)) card.family.forEach(f => f && familySet.add(f))
    if (Array.isArray(card.color)) card.color.forEach(c => c && colorSet.add(c))
    if (Array.isArray(card.abilityKeywords)) card.abilityKeywords.forEach(k => k && abilityKwSet.add(k))
    if (card.illustration) illustrationSet.add(card.illustration)
  }

  const nameList = Array.from(nameSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
  const setNameList = Array.from(setNameSet).sort()
  const typeList = Array.from(typeSet).sort()
  const familyList = Array.from(familySet).sort()
  const rarityList = Array.from(raritySet).sort()
  const colorList = Array.from(colorSet).sort()
  const expansionCodeList = Array.from(expansionCodeSet).sort()
  const abilityKwList = Array.from(abilityKwSet).sort()
  const counterList = Array.from(counterSet).sort((a, b) => a - b)
  const attributeList = Array.from(attributeSet).sort()
  const illustrationList = Array.from(illustrationSet).sort()

  const powerLimits = {
    min: 0,
    max: powerSet.size ? Math.max(...powerSet) : 0,
  }

  return {
    allCards,            // ora con { price, priceLastUpdate }
    leaderCards,
    setNameList,
    typeList,
    familyList,
    rarityList,
    colorList,
    expansionCodeList,
    abilityKwList,
    nameList,
    powerLimits,
    counterList,
    attributeList,
    illustrationList,
  }
}
