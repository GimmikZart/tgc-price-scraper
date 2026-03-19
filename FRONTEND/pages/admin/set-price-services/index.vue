<script setup>
import { onMounted, ref, watch } from 'vue'
import { CARD_TRADER_SERVICE_NAME, createCardTraderSlugEntry } from '@/utilities/cardTraderSlug'

const snackbar = useSnackbar()
const files = ref([])
const selectedFile = ref(null)
const rawData = ref(null)
const cards = ref([])
const modified = ref(false)
const savingIndex = ref(null)

const services = [CARD_TRADER_SERVICE_NAME]

watch(selectedFile, (newFile) => {
  if (newFile) {
    loadFile(newFile)
    return
  }

  rawData.value = null
  cards.value = []
  modified.value = false
})

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

function hasServiceEntry(card, service) {
  return Array.isArray(card?.slugs)
    && card.slugs.some((slug) => slug?.service === service)
}

function hasServiceUrl(card, service) {
  return Array.isArray(card?.slugs)
    && card.slugs.some((slug) => slug?.service === service && String(slug?.url || '').trim())
}

function ensureServiceEntry(card, service) {
  if (!card || service !== CARD_TRADER_SERVICE_NAME) return
  if (!Array.isArray(card.slugs)) card.slugs = []
  if (hasServiceEntry(card, service)) return

  card.slugs.push(createCardTraderSlugEntry())
  modified.value = true
}

function ensureAllServiceEntries(service) {
  if (!cards.value?.length) return

  let changed = 0
  for (const card of cards.value) {
    if (hasServiceEntry(card, service)) continue
    ensureServiceEntry(card, service)
    changed += 1
  }

  if (changed > 0) {
    modified.value = true
    alert(`Preparate ${changed} entry per ${service} ✅`)
    return
  }

  alert(`Nessuna entry da aggiungere per ${service} — tutto già pronto ✅`)
}

async function saveAll() {
  if (!selectedFile.value) return

  const output = Array.isArray(rawData.value)
    ? cards.value
    : { ...rawData.value, cards: cards.value }

  await $fetch('/api/update-json-file', {
    method: 'POST',
    body: { name: selectedFile.value, data: output },
  })

  modified.value = false
  snackbar.addMessage('File salvato ✅', 'success')
}

async function saveThis(i) {
  if (!selectedFile.value) return

  try {
    savingIndex.value = i

    const fresh = await $fetch('/api/get-single-json-file', {
      params: { name: selectedFile.value },
    })

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

    await $fetch('/api/update-json-file', {
      method: 'POST',
      body: { name: selectedFile.value, data: output },
    })

    snackbar.addMessage(`Carta #${i + 1} salvata ✅`, 'success')
  } catch (err) {
    console.error(err)
    snackbar.addMessage('Errore nel salvataggio della carta', 'error')
  } finally {
    savingIndex.value = null
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <Toolbar label="Set Card Slugs" />
    <div class="w-full flex items-center gap-3 flex-wrap">
      <v-select
        v-model="selectedFile"
        label="Seleziona file"
        :items="files"
        class="border rounded px-2 py-1"
      />

      <v-btn
        v-if="selectedFile && cards.length"
        color="black"
        @click="saveAll"
      >
        Save All
      </v-btn>

      <template v-if="selectedFile && cards.length">
        <v-btn
          v-for="service in services"
          :key="`prepare-all-${service}`"
          color="black"
          @click="ensureAllServiceEntries(service)"
        >
          Prepara tutti — {{ service }}
        </v-btn>
      </template>
    </div>

    <div v-if="cards.length" class="grid grid-cols-5 gap-5">
      <div
        v-for="(card, i) in cards"
        :key="i"
        class="border rounded p-4 bg-gray-50 dark:bg-gray-800"
      >
        <Card :card="card" class="w-full" />
        <h3 class="text-lg font-bold mb-2">{{ card.name }}</h3>
        <p class="text-sm opacity-70 mb-3">{{ card.setName }}</p>

        <div class="flex flex-col gap-2 mb-3">
          <div
            v-for="service in services"
            :key="service"
            class="flex flex-col bg-black p-3 rounded-lg items-center gap-2"
          >
            <v-btn
              v-if="hasServiceUrl(card, service)"
              class="px-3 py-1 rounded border"
              :href="card.slugs.find((s) => s.service === service)?.url"
              target="_blank"
            >
              Testa {{ service }}
            </v-btn>

            <v-btn
              v-else-if="!hasServiceEntry(card, service)"
              class="px-3 py-1 rounded border"
              @click="ensureServiceEntry(card, service)"
            >
              Aggiungi {{ service }}
            </v-btn>

            <div
              v-else
              class="text-white text-sm text-center"
            >
              Entry pronta, URL da compilare manualmente
            </div>

            <v-checkbox
              v-if="hasServiceEntry(card, service)"
              v-model="card.slugs.find((s) => s.service === service).verified"
              hide-details
              label="Verificato"
              :disabled="savingIndex === i"
              @update:modelValue="() => saveThis(i)"
            />

            <div v-if="hasServiceEntry(card, service)" class="w-full">
              <v-text-field
                v-model="card.slugs.find((s) => s.service === service).url"
                clearable
                label="Slug"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
