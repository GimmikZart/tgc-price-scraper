// composables/useOnePieceCards.js
// Aggiunge alle carte locali il campo "price" (in euro) e "priceLastUpdate" se disponibile

import priceIndexRaw from '~/data/prices/one-piece.min.json'

// Normalizza il JSON importato
const priceIndex = Array.isArray(priceIndexRaw?.default)
  ? priceIndexRaw.default
  : (Array.isArray(priceIndexRaw) ? priceIndexRaw : [])

// Crea una mappa id → { priceCents, lastUpdate }
function buildPriceMap() {
  return new Map(
    priceIndex.map(p => [
      p.id,
      {
        price: typeof p.price === 'number' ? p.price : null,
        lastUpdate: typeof p.lastUpdate === 'number' ? p.lastUpdate : null,
      },
    ])
  )
}

export function useOnePieceCards() {
  const modules = import.meta.glob('~/data/cards/one_piece_tgc/*.json', {
    eager: true,
    as: 'json',
  })

  const priceMap = buildPriceMap()
  const allCards = []

  // Unisce i prezzi alle carte
  Object.values(modules).forEach((mod) => {
    const cards = Array.isArray(mod.default) ? mod.default : []
    for (const card of cards) {
      const p = priceMap.get(card.id)
      allCards.push({
        ...card,
        price: p ? p.price / 100 : null,          // in euro
        priceLastUpdate: p ? p.lastUpdate : null, // timestamp ms
      })
    }
  })

  // Leader cards
  const leaderCards = allCards.filter(
    (card) => card.type && card.type.toLowerCase().includes('leader')
  )

  // Liste/filtri
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

  allCards.forEach((card) => {
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
  })

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

  const powerLimits = {
    min: 0,
    max: powerSet.size ? Math.max(...powerSet) : 0,
  }

  return {
    allCards, // ogni carta ha { price, priceLastUpdate }
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
  }
}
