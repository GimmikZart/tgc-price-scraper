export function useOnePieceCards() {
  const modules = import.meta.glob(
    '~/data/cards/one_piece_tgc/*.json',
    { eager: true, as: 'json' }
  )

  const allCards = []
  Object.values(modules).forEach(mod => {
    if (Array.isArray(mod.default)) {
      allCards.push(...mod.default)
    }
  })

  const setNameSet       = new Set()
  const typeSet          = new Set()
  const familySet        = new Set()
  const raritySet        = new Set()
  const colorSet         = new Set()
  const expansionCodeSet = new Set()
  const abilityKwSet     = new Set()

  allCards.forEach(card => {
    if (card.setName)       setNameSet.add(card.setName)
    if (card.type)          typeSet.add(card.type)
    if (card.rarity)        raritySet.add(card.rarity)
    if (card.expansionCode) expansionCodeSet.add(card.expansionCode)

    if (Array.isArray(card.family)) {
      card.family.forEach(fam => { if (fam) familySet.add(fam) })
    }

    if (Array.isArray(card.color)) {
      card.color.forEach(col => { if (col) colorSet.add(col) })
    }

    if (Array.isArray(card.abilityKeywords)) {
      card.abilityKeywords.forEach(kw => { if (kw) abilityKwSet.add(kw) })
    }
  })

  const setNameList       = Array.from(setNameSet).sort()
  const typeList          = Array.from(typeSet).sort()
  const familyList        = Array.from(familySet).sort()
  const rarityList        = Array.from(raritySet).sort()
  const colorList         = Array.from(colorSet).sort()
  const expansionCodeList = Array.from(expansionCodeSet).sort()
  const abilityKwList     = Array.from(abilityKwSet).sort()

  return {
    allCards,
    setNameList,
    typeList,
    familyList,
    rarityList,
    colorList,
    expansionCodeList,
    abilityKwList
  }
}
