<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const snackbar = useSnackbar()
const files = ref([])
const selectedFile = ref(null)
const rawData = ref(null)
const cards = ref([])
const modified = ref(false)

// array dinamico dei servizi
const services = ["Card Trader" /*, "Cardmarket" */]

watch(selectedFile, (newFile) => {
  if (newFile) {
    loadFile(newFile)
  } else {
    rawData.value = null
    cards.value = []
    modified.value = false
  }
})

// === HELPERS ===
// minuscole + rimuove caratteri speciali → trattini
function slugify(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/[\s._/()"']+/g, '-')  // converte spazi, punti, underscore, slash, parentesi e virgolette in trattino
    .replace(/[^a-z0-9-]/g, '')     // elimina tutto ciò che non è a-z, 0-9 o "-"
    .replace(/-+/g, '-')            // comprime trattini multipli
    .replace(/^-|-$/g, '')          // rimuove trattini iniziali/finali
}


// normalizza codice set: "OP05" → "op-05", "ST13" → "st-13"
function normalizeSetCode(code) {
  if (!code) return ''
  const c = String(code).trim().toLowerCase()
  const m = c.match(/^([a-z]+)-?(\d{1,3})$/) // lettere + opzionale "-" + numeri
  if (m) {
    const letters = m[1]
    const digits = m[2].padStart(2, '0')
    return `${letters}-${digits}`
  }
  return c.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// estrae il codice tra [] e lo mette davanti (normalizzato)
function formatSetName(setName) {
  if (!setName) return ''
  if(setName == 'ONE PIECE CARD THE BEST [PRB-01]') return 'prb-01-the-best-premium-booster'
  if(setName == 'ONE PIECE CARD THE BEST vol.2 [PRB-02]') return 'prb-02-the-best-2-premium-booster'
  const match = setName.match(/\[([^\]]+)\]/)
  const code = match ? normalizeSetCode(match[1]) : ''
  const text = setName
    .replace(/\[[^\]]+\]/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return code ? `${code}-${text}` : text
}

// placeholder per la manipolazione in base all’illustration
function getRaritySlug(rarity) {
  if (!rarity) return ''
  switch (rarity.toLowerCase()) {
    case 'sec': return 'secret-rare'
    case 'sp card' || 'SPECIAL' || 'SP': return 'special-rare'
    case 'tr' : return 'treasure-rare'
    default: return null
  }
}

function getIllustrationSlug(illustration) {
  if (!illustration) return ''
  switch (illustration.toLowerCase()) {
    case 'wanted': return 'wanted'
    case 'manga': return 'manga-panel-alternate-art'
    case 'alternate-art': return 'alternate-art'
    case 'jolly-roger-foil': return 'jolly-roger-foil'
    default: return illustration
  }
}

// === FILE HANDLING ===
onMounted(async () => {
  files.value = await $fetch('/api/get-json-files')
})

async function loadFile(name) {
  selectedFile.value = name
  rawData.value = await $fetch('/api/get-single-json-file', { params: { name } })
  cards.value = Array.isArray(rawData.value)
    ? rawData.value
    : (rawData.value.cards || [])
  modified.value = false
}

// === GENERAZIONE URL ===
function generateSlug(card, service) {
  if (!card.slugs) card.slugs = []

  const nameSlug = slugify(card.name)
  const setSlug = formatSetName(card.setName)
  const illustrationSlug = getIllustrationSlug(card.illustration)
  const raritySlug = getRaritySlug(card.rarity)

  let url = ''
  if (service === 'Card Trader') {
    url = `https://www.cardtrader.com/cards/${nameSlug}`
    if( raritySlug) url += `-${raritySlug}`
    if (illustrationSlug) url += `-${illustrationSlug}`
    if (setSlug) url += `-${setSlug}`
  }

  const existing = card.slugs.find(s => s.service === service)
  if (existing) {
    existing.url = url
  } else {
    card.slugs.push({ service, url, verified: false })
  }

  modified.value = true
}

// === NUOVO: GENERA TUTTI GLI SLUG ===
function generateAllSlugs(service) {
  if (!cards.value?.length) return

  let changed = 0
  for (const card of cards.value) {
    if (!card.slugs) card.slugs = []

    const existing = card.slugs.find(s => s.service === service)

    // non sovrascrivo se già verificato
    if (existing?.verified) continue

    const before = existing?.url || null
    generateSlug(card, service)
    const after = card.slugs.find(s => s.service === service)?.url || null

    if (before !== after) changed++
  }

  if (changed > 0) {
    modified.value = true
    alert(`Generati/aggiornati ${changed} slug per ${service} ✅`)
  } else {
    alert(`Nessuno slug da aggiornare per ${service} — tutto già a posto ✅`)
  }
}

async function saveAll() {
  if (!selectedFile.value) return
  const output = Array.isArray(rawData.value)
    ? cards.value
    : { ...rawData.value, cards: cards.value }

  await $fetch('/api/update-json-file', {
    method: 'POST',
    body: { name: selectedFile.value, data: output }
  })

  modified.value = false
  snackbar.addMessage(
      "File salvato ✅",
      "success",
    );
}

const savingIndex = ref(null)
async function saveThis(i) {
  if (!selectedFile.value) return
  try {
    savingIndex.value = i

    // 1) rileggo il file "pulito" dal server per evitare di sovrascrivere altre carte
    const fresh = await $fetch('/api/get-single-json-file', { params: { name: selectedFile.value } })

    // 2) preparo la struttura aggiornata sostituendo SOLO la carta i-esima
    let output
    if (Array.isArray(fresh)) {
      const next = [...fresh]
      next[i] = cards.value[i]
      output = next
    } else {
      const freshCards = Array.isArray(fresh.cards) ? [...fresh.cards] : []
      freshCards[i] = cards.value[i]
      output = { ...fresh, cards: freshCards }
    }

    // 3) salvo
    await $fetch('/api/update-json-file', {
      method: 'POST',
      body: { name: selectedFile.value, data: output }
    })

    snackbar.addMessage(`Carta #${i + 1} salvata ✅`, 'success')
  } catch (err) {
    console.error(err)
    snackbar.addMessage('Errore nel salvataggio della carta', 'error')
  } finally {
    savingIndex.value = null
  }
}

const scraping = ref(false)
</script>

<template>
  <div class="p-6 space-y-6">
    <Toolbar label="Set Card Slugs" />
    <div class="w-full flex items-center gap-3 flex-wrap">
      <v-select label="Seleziona file" :items="files" class="border rounded px-2 py-1" v-model="selectedFile" />

      <v-btn
        color="black"
        v-if="selectedFile && cards.length" 
        @click="saveAll"
      >
        💾 Save All
      </v-btn>

      <!-- NEW: genera per tutte le carte -->
      <template v-if="selectedFile && cards.length">
        <v-btn
          v-for="service in services"
          :key="'genall-' + service"
          color="black"
          @click="generateAllSlugs(service)"
        >
          ⚙️ Genera tutti — {{ service }}
        </v-btn>
      </template>
    </div>

    <!-- Cards -->
    <div v-if="cards.length" class="grid grid-cols-5 gap-5">
      <div v-for="(card, i) in cards" :key="i" class="border rounded p-4 bg-gray-50 dark:bg-gray-800">
        <Card :card="card" class="w-full"/>
        <h3 class="text-lg font-bold mb-2">{{ card.name }}</h3>
        <p class="text-sm opacity-70 mb-3">{{ card.setName }}</p>

        <div class="flex flex-col gap-2 mb-3">
          <div v-for="service in services" :key="service" class="flex flex-col bg-black p-3 rounded-lg items-center gap-2">
            <v-btn
              v-if="card.slugs?.some(s => s.service === service)"
              class="px-3 py-1 rounded border"
              :href="card.slugs.find(s => s.service === service)?.url"
              target="_blank"
            >
              Testa {{ service }}
            </v-btn>
            <v-btn
              v-else
              class="px-3 py-1 rounded border"
              @click="generateSlug(card, service)"
            >
              Genera {{ service }}
            </v-btn>

            <v-checkbox
              v-if="card.slugs?.some(s => s.service === service)"
              hide-details
              label="Verificato"
              v-model="card.slugs.find(s => s.service === service).verified"
              @update:modelValue="() => saveThis(i)"
              :disabled="savingIndex === i"
            />

            <div class="w-full" v-if="card.slugs?.some(s => s.service === service)">
              <v-text-field clearable v-model="card.slugs.find(s => s.service === service).url" label="Slug" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* aggiusta colori o spaziatura se vuoi */
</style>
