<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const files = ref([])
const selectedFile = ref(null)

const rawData = ref(null)
const cards = ref([])
const onlyPxCards = ref([])
const currentIndex = ref(0)
const modifiedIds = ref(new Set())

const illustrationTypes = [
  'wanted', 'manga', 'alternate-art', 'red-manga', 'gold-manga', 'special'
]

// match _p<number>_  (es: _p1_, _p12_)
const pxRegex = /_p\d+_/i

onMounted(async () => {
  files.value = await $fetch('/api/get-json-files')
})

async function loadFile(name) {
  if (!name) return
  selectedFile.value = name
  currentIndex.value = 0
  modifiedIds.value = new Set()

  rawData.value = await $fetch('/api/get-single-json-file', { params: { name } })

  const list = Array.isArray(rawData.value)
    ? rawData.value
    : (rawData.value && rawData.value.cards ? rawData.value.cards : [])

  cards.value = list
  onlyPxCards.value = list.filter(c => typeof c.id === 'string' && pxRegex.test(c.id))
}

const total = computed(() => onlyPxCards.value.length)
const currentCard = computed(() => onlyPxCards.value[currentIndex.value] || null)

function setIllustration(type) {
  const card = currentCard.value
  if (!card) return
  card.illustration = type
  modifiedIds.value.add(card.id)
  next()
}

function next() {
  if (currentIndex.value < total.value - 1) currentIndex.value++
}
function prev() {
  if (currentIndex.value > 0) currentIndex.value--
}

watch(selectedFile, (newFile) => {
  loadFile(newFile)
})

const progress = computed(() => {
  if (!total.value) return 0
  return Math.round((modifiedIds.value.size / total.value) * 100)
})

async function saveOverwrite() {
  if (!selectedFile.value) return
  const output = Array.isArray(rawData.value)
    ? cards.value
    : { ...rawData.value, cards: cards.value }

  await $fetch('/api/update-json-file', {
    method: 'POST',
    body: { name: selectedFile.value, data: output }
  })
  alert('File salvato ✅')
}

function downloadJson() {
  const output = Array.isArray(rawData.value)
    ? cards.value
    : { ...rawData.value, cards: cards.value }

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const suffix = '-with-illustration'
  a.download = selectedFile.value
    ? selectedFile.value.replace('.json', `${suffix}.json`)
    : 'cards-with-illustration.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function onKey(e) {
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="p-6 space-y-6">
    <Toolbar label="Set illustration type" />

    <!-- Select file -->
    <div class="flex items-center gap-3">
      <v-select label="Select JSON" :items="files" v-model="selectedFile" @change="loadFile(selectedFile)" />

      <div v-if="total" class="ml-auto text-sm opacity-70">
        {{ modifiedIds.size }}/{{ total }} ({{ progress }}%)
      </div>
    </div>

    <!-- Viewer -->
    <div v-if="currentCard" class="grid md:grid-cols-2 gap-6">
      <div class="space-y-2 w-1/2">
        <Card :card="currentCard" />
        <h2 class="text-xl font-bold">{{ currentCard.name || currentCard.id }}</h2>
        <p class="text-sm opacity-70">ID: {{ currentCard.id }}</p>
        <p v-if="currentCard.illustration" class="text-sm">
          Current illustration: <b>{{ currentCard.illustration }}</b>
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <v-btn
            v-for="t in illustrationTypes"
            :key="t"
            class="px-3 py-2 rounded border hover:opacity-80"
            @click="setIllustration(t)"
          >
            {{ t }}
          </v-btn>
        </div>

        <div class="flex items-center gap-2 pt-3">
          <button class="px-3 py-2 rounded border" @click="prev" :disabled="currentIndex===0">Prev</button>
          <span class="text-sm opacity-70">Card {{ currentIndex + 1 }} / {{ total }}</span>
          <button class="px-3 py-2 rounded border" @click="next" :disabled="currentIndex===total-1">Next</button>
        </div>
      </div>
    </div>

    <!-- Azioni finali -->
    <div v-if="selectedFile" class="flex items-center gap-3 pt-4 border-t">
      <v-btn class="px-3 py-2 rounded border" @click="saveOverwrite">💾 Save (overwrite)</v-btn>
      <v-btn class="px-3 py-2 rounded border" @click="downloadJson">⬇️ Download new JSON</v-btn>
    </div>
  </div>
</template>

<style scoped>
/* stile minimo; sostituisci con i tuoi */
</style>
