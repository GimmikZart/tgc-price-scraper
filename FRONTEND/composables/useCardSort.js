import { ref, computed } from 'vue'

const LETTER_START_REGEX = /^\p{L}/u
const DON_TYPE = 'Don!!'

function normalizeName(v) {
  return String(v ?? '').toLocaleLowerCase()
}

function normalizeDate(v) {
  const value = String(v ?? '').trim()
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (match) {
    const [, day, month, year] = match
    return Date.UTC(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function cmpStrings(a, b, dir) {
  const r = a.localeCompare(b, undefined, { sensitivity: 'base', numeric: false })
  return dir === 'asc' ? r : -r
}

function cmpNumbers(a, b, dir) {
  const av = a == null ? 0 : a
  const bv = b == null ? 0 : b

  const r = av === bv ? 0 : (av < bv ? -1 : 1)
  return dir === 'asc' ? r : -r
}

function cmpDates(a, b, dir) {
  const av = normalizeDate(a)
  const bv = normalizeDate(b)

  if (av == null && bv == null) return 0
  if (av == null) return dir === 'asc' ? -1 : 1
  if (bv == null) return dir === 'asc' ? 1 : -1

  const r = av === bv ? 0 : (av < bv ? -1 : 1)
  return dir === 'asc' ? r : -r
}

function namePriority(card) {
  const rawName = String(card?.name ?? '').trim()
  if (!rawName) return 2
  if (LETTER_START_REGEX.test(rawName)) return 0
  return 1
}

function compareNamePriority(a, b) {
  const ap = namePriority(a)
  const bp = namePriority(b)
  if (ap === bp) return 0
  return ap < bp ? -1 : 1
}

function compareByName(a, b, dir = 'asc') {
  const priorityResult = compareNamePriority(a, b)
  if (priorityResult !== 0) return priorityResult
  return cmpStrings(normalizeName(a?.name), normalizeName(b?.name), dir)
}

function compareDonLast(a, b) {
  const aIsDon = String(a?.type ?? '') === DON_TYPE
  const bIsDon = String(b?.type ?? '') === DON_TYPE
  if (aIsDon === bIsDon) return 0
  return aIsDon ? 1 : -1
}

export function useCardSort(initialKey = 'publish_date', initialDir = 'desc') {
  const sortKey = ref(initialKey)
  const sortDir = ref(initialDir)

  const labelMap = {
    publish_date: 'Data Uscita',
    name: 'Nome',
    cost: 'Costo',
    power: 'Power',
    price: 'Prezzo',
  }

  const iconFor = (key, dir) => {
    if (key === 'publish_date') return 'mdi-calendar-blank-outline'
    if (key === 'name') return dir === 'asc' ? 'mdi-sort-alphabetical-ascending' : 'mdi-sort-alphabetical-descending'
    return dir === 'asc' ? 'mdi-sort-numeric-ascending' : 'mdi-sort-numeric-descending'
  }

  const sortLabel = computed(() => labelMap[sortKey.value])
  const sortIcon = computed(() => iconFor(sortKey.value, sortDir.value))

  function setSort(key, dir) {
    sortKey.value = key
    sortDir.value = dir
  }

  function toggleDir() {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }

  function applySort(list) {
    const key = sortKey.value
    const dir = sortDir.value
    const arr = [...list]

    return arr.sort((a, b) => {
      if (key === 'publish_date') return cmpDates(a.publish_date, b.publish_date, dir) || compareDonLast(a, b) || compareByName(a, b, 'asc')
      if (key === 'name') return compareByName(a, b, dir)
      if (key === 'cost') return cmpNumbers(a.cost, b.cost, dir) || compareByName(a, b, 'asc')
      if (key === 'power') return cmpNumbers(a.power, b.power, dir) || compareByName(a, b, 'asc')
      if (key === 'price') return cmpNumbers(a.price, b.price, dir) || compareByName(a, b, 'asc')
      return compareByName(a, b, 'asc')
    })
  }

  const options = [
    { key: 'publish_date', dir: 'desc', label: 'Data Uscita recenti', icon: 'mdi-calendar-blank-outline' },
    { key: 'publish_date', dir: 'asc', label: 'Data Uscita vecchie', icon: 'mdi-calendar-blank-outline' },
    { key: 'name', dir: 'asc', label: 'Nome A-Z', icon: 'mdi-sort-alphabetical-ascending' },
    { key: 'name', dir: 'desc', label: 'Nome Z-A', icon: 'mdi-sort-alphabetical-descending' },
    { key: 'cost', dir: 'asc', label: 'Costo', icon: 'mdi-sort-numeric-ascending' },
    { key: 'cost', dir: 'desc', label: 'Costo', icon: 'mdi-sort-numeric-descending' },
    { key: 'power', dir: 'asc', label: 'Power', icon: 'mdi-sort-numeric-ascending' },
    { key: 'power', dir: 'desc', label: 'Power', icon: 'mdi-sort-numeric-descending' },
    { key: 'price', dir: 'asc', label: 'Prezzo', icon: 'mdi-sort-numeric-ascending' },
    { key: 'price', dir: 'desc', label: 'Prezzo', icon: 'mdi-sort-numeric-descending' },
  ]

  return {
    sortKey,
    sortDir,
    sortLabel,
    sortIcon,
    options,
    setSort,
    toggleDir,
    applySort,
  }
}
