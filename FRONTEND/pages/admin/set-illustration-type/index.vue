<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
const snackbar = useSnackbar()

const files = ref([])
const selectedFile = ref(null)

const rawData = ref(null)
const cards = ref([])
const onlyPxCards = ref([])
const currentIndex = ref(0)
const modifiedIds = ref(new Set())

const illustrationTypes = [
  'jolly-roger-foil', 'pirate-foil', 'full-art', 'alternate-art', 'reprint', 'non-foil-reprint', /* 'wanted', 'special', */ 'treasure-rare', 'manga', /* 'red-manga', 'gold-manga', */ /* 'reprint-missing-pen-symbol-next-to-the-artist-name' */ 'textured-foil', 'other'
]

// match _p<number>_  (es: _p1_, _p12_)
const pxRegex = /-\d{3}_.+/

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
  console.log({list});
  
  onlyPxCards.value = list.filter(c => typeof c.imageId === 'string' && pxRegex.test(c.imageId))
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
  snackbar.addMessage(
      "File salvato ✅",
      "success",
    );
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
  <section class="relative h-full">
    <Toolbar label="Set illustration type" />
    <div class="h-full overflow-auto">
      <!-- Select file -->
      <div class="flex pb-10 flex-col md:flex-row items-center gap-2">
        <v-select label="Select JSON" hide-details :items="files" v-model="selectedFile" @change="loadFile(selectedFile)" />

        <div v-if="total" class="text-sm text-center opacity-70">
          {{ modifiedIds.size }}/{{ total }} ({{ progress }}%)
        </div>
      </div>

      <!-- Viewer -->
      <div v-if="currentCard" class="grid grid-cols-2 gap-6 px-2 pb-10">
        <div class="space-y-2 w-full md:w-1/2">
          <Card :card="currentCard" />
          <div class="w-full text-center">
            <v-chip color="orange">{{ currentCard.illustration || 'none' }}</v-chip>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 px-3">
          <v-btn
            v-for="t in illustrationTypes"
            :key="t"
            class="px-3 py-2 rounded border hover:opacity-80"
            @click="setIllustration(t)"
          >
            {{ t }}
          </v-btn>
        </div>
      </div>

      <div class="flex w-full justify-center items-center gap-2 pt-3 pb-10">
        <v-btn density="compact" class="rounded border" @click="prev" :disabled="currentIndex===0">Prev</v-btn>
        <span class="text-sm opacity-70">Card {{ currentIndex + 1 }} / {{ total }}</span>
        <v-btn density="compact" class="rounded border" @click="next" :disabled="currentIndex===total-1">Next</v-btn>
      </div>

      <!-- Azioni finali -->
      <div v-if="selectedFile" class="flex flex-col md:flex-row items-center gap-5 pt-4 border-t">
        <v-btn class="px-3 py-2 rounded border" @click="saveOverwrite">💾 Save (overwrite)</v-btn>
        <v-btn class="px-3 py-2 rounded border" @click="downloadJson">⬇️ Download new JSON</v-btn>
      </div>
    </div>
    
  </section>
    
</template>

<style scoped>
/* stile minimo; sostituisci con i tuoi */
</style>
