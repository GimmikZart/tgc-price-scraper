// server/utils/fetch-cards.js
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

async function fetchRawCards() {
  const API_KEY = process.env.API_TCG_KEY || '046f9a484e0e948988b5f5257a438f0a662f50b76b59114c8c1b6dad40ce5c68'
  const BASE_URL = 'https://apitcg.com/api/one-piece/cards'
  const allCards = []

  const primoRisultato = await $fetch(BASE_URL, {
    method: 'GET',
    headers: { 'x-api-key': API_KEY },
    query: { limit: 100, page: 1 }
  })
  if (!primoRisultato) {
    throw new Error('Nessuna risposta dalla prima chiamata API')
  }

  const totalPages = primoRisultato.totalPages || 1
  if (Array.isArray(primoRisultato.data)) {
    allCards.push(...primoRisultato.data)
  } else {
    console.warn('Attenzione: primoRisultato.data non è un array')
  }

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const risultatoPagina = await $fetch(BASE_URL, {
        method: 'GET',
        headers: { 'x-api-key': API_KEY },
        query: { limit: 100, page }
      })
      if (risultatoPagina && Array.isArray(risultatoPagina.data)) {
        allCards.push(...risultatoPagina.data)
      } else {
        console.warn(`Pagina ${page} tornata senza \"data\", skip.`)
      }
    }
  }

  return allCards
}

function mapCardData(cards) {
  return cards.map(card => {
    const rawSetName = card.set?.name || ''
    const match = rawSetName.match(/^[-]+(.*?)[-]+\s*(\[.*\])\s*$/)
    const cleanedSetName = match
      ? `${match[1].trim()} ${match[2].trim()}`
      : rawSetName.trim()

    const rawAbility = card.ability || ''
    const matches = [...rawAbility.matchAll(/\[([^\]]+)\]/g)]
    const abilityKey = matches.map(m => m[1].trim())

    return {
      id: card.id,
      code: card.code,
      setCode: card.code.includes('-') ? card.code.split('-')[0] : card.code,
      rarity: card.rarity,
      type: card.type,
      name: card.name,
      images: card.images,
      cost: card.cost,
      attribute: card.attribute,
      power: card.power,
      counter: card.counter,
      color: card.color ? card.color.split('/').map(c => c.trim()) : [],
      familiy: card.family ? card.family.split('/').map(f => f.trim()) : [],
      ability: card.ability,
      abilityKey: abilityKey.length > 0 ? abilityKey : null,
      trigger: card.trigger,
      setName: cleanedSetName,
      notes: card.notes,
      banned: false
    }
  })
}

async function mapAndSaveCards(rawCards) {
  const mappedCards = mapCardData(rawCards)
  const outputDir = join(process.cwd(), 'public', 'data', 'cards')
  await mkdir(outputDir, { recursive: true })
  const outputPath = join(outputDir, 'cards.json')
  const jsonString = JSON.stringify(mappedCards, null, 2)
  await writeFile(outputPath, jsonString, 'utf-8')
  console.log(`File JSON delle carte salvato in: ${outputPath}`)
  return mappedCards
}

async function generateAndSaveFilters(mappedCards) {
  const raritiesSet    = new Set()
  const typesSet       = new Set()
  const attributesSet  = new Set()
  const colorsSet      = new Set()
  const familiesSet    = new Set()
  const abilityKeysSet = new Set()
  const setNamesSet    = new Set()

  for (const card of mappedCards) {
    if (card.rarity) {
      raritiesSet.add(card.rarity)
    }
    if (card.type) {
      typesSet.add(card.type)
    }
    if (card.attribute && card.attribute.name) {
      attributesSet.add(card.attribute.name)
    }
    if (Array.isArray(card.color)) {
      for (const c of card.color) {
        if (c) colorsSet.add(c)
      }
    }
    if (Array.isArray(card.familiy)) {
      for (const f of card.familiy) {
        if (f) familiesSet.add(f)
      }
    }
    if (Array.isArray(card.abilityKey)) {
      for (const ak of card.abilityKey) {
        if (ak) abilityKeysSet.add(ak)
      }
    }
    if (card.setName) {
      setNamesSet.add(card.setName)
    }
  }

  const raritiesArr    = Array.from(raritiesSet).sort()
  const typesArr       = Array.from(typesSet).sort()
  const attributesArr  = Array.from(attributesSet).sort()
  const colorsArr      = Array.from(colorsSet).sort()
  const familiesArr    = Array.from(familiesSet).sort()
  const abilityKeysArr = Array.from(abilityKeysSet).sort()
  const setNamesArr    = Array.from(setNamesSet).sort()

  const outputDir = join(process.cwd(), 'public', 'data', 'filters')
  await mkdir(outputDir, { recursive: true })

  const writeOps = [
    writeFile(join(outputDir, 'rarities.json'),    JSON.stringify(raritiesArr,    null, 2), 'utf-8'),
    writeFile(join(outputDir, 'types.json'),       JSON.stringify(typesArr,       null, 2), 'utf-8'),
    writeFile(join(outputDir, 'attributes.json'),  JSON.stringify(attributesArr,  null, 2), 'utf-8'),
    writeFile(join(outputDir, 'colors.json'),      JSON.stringify(colorsArr,      null, 2), 'utf-8'),
    writeFile(join(outputDir, 'families.json'),    JSON.stringify(familiesArr,    null, 2), 'utf-8'),
    writeFile(join(outputDir, 'abilityKeys.json'), JSON.stringify(abilityKeysArr, null, 2), 'utf-8'),
    writeFile(join(outputDir, 'setNames.json'),    JSON.stringify(setNamesArr,    null, 2), 'utf-8')
  ]

  await Promise.all(writeOps)
  console.log('File JSON dei filtri salvati in:', outputDir)
}

export default async function fetchCardsList() {
  const rawCards = await fetchRawCards()

  const mapped = await mapAndSaveCards(rawCards)

  await generateAndSaveFilters(mapped)

  return { success: true }
}
