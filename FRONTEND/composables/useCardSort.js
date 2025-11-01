import { ref, computed } from 'vue'

function normalizeName(v) {
  return String(v ?? '').toLocaleLowerCase()
}

function cmpStrings(a, b, dir) {
  const r = a.localeCompare(b, undefined, { sensitivity: 'base', numeric: false })
  return dir === 'asc' ? r : -r
}

function cmpNumbers(a, b, dir) {
  // 🔧 qui normalizziamo i null come 0 (minimo)
  const av = a == null ? 0 : a
  const bv = b == null ? 0 : b

  const r = av === bv ? 0 : (av < bv ? -1 : 1)
  return dir === 'asc' ? r : -r
}

export function useCardSort(initialKey = 'name', initialDir = 'asc') {
  const sortKey = ref(initialKey)
  const sortDir = ref(initialDir)

  const labelMap = {
    name: 'Nome',
    cost: 'Costo',
    power: 'Power',
  }

  const iconFor = (key, dir) => {
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
      if (key === 'name') return cmpStrings(normalizeName(a.name), normalizeName(b.name), dir)
      if (key === 'cost') return cmpNumbers(a.cost, b.cost, dir)
      if (key === 'power') return cmpNumbers(a.power, b.power, dir)
      return 0
    })
  }

  const options = [
    { key: 'name',  dir: 'asc',  label: 'Nome A→Z', icon: 'mdi-sort-alphabetical-ascending' },
    { key: 'name',  dir: 'desc', label: 'Nome Z→A', icon: 'mdi-sort-alphabetical-descending' },
    { key: 'cost',  dir: 'asc',  label: 'Costo',  icon: 'mdi-sort-numeric-ascending' },
    { key: 'cost',  dir: 'desc', label: 'Costo',  icon: 'mdi-sort-numeric-descending' },
    { key: 'power', dir: 'asc',  label: 'Power',  icon: 'mdi-sort-numeric-ascending' },
    { key: 'power', dir: 'desc', label: 'Power',  icon: 'mdi-sort-numeric-descending' },
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
