<script setup>
/**
 * InfiniteGrid.vue
 * - Mostra items a griglia (decidi tu le colonne via :grid-class)
 * - Aggiunge elementi a scaglioni (step) quando l'utente scorre
 * - Espone @update:visible con l'array attualmente visibile (opzionale)
 * - Chiama onChunk(newItems[]) ogni volta che aggiunge un blocco (opzionale)
 * - Nessuna dipendenza esterna, usa IntersectionObserver
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  keyField: { type: String, default: 'id' },

  // Buffer config
  step: { type: Number, default: 30 },        // quanti item per blocco
  startBlocks: { type: Number, default: 1 },  // blocchi iniziali caricati

  // IO config
  root: { type: String, default: 'self' },    // 'self' (container) | 'window'
  rootMargin: { type: String, default: '800px 0px' },
  threshold: { type: Number, default: 0.01 },

  // Layout className pass-through (usa Tailwind o le tue classi)
  containerClass: { type: [String, Object, Array], default: 'h-[calc(100dvh-140px)] overflow-auto' },
  gridClass: { type: [String, Object, Array], default: 'grid grid-cols-2 gap-2 px-2 pt-2 ooooooo' },

  // UI di stato (facoltativa)
  showStatus: { type: Boolean, default: true },
  loadingText: { type: String, default: 'Carico altre carte…' },
  endText: { type: String, default: 'Hai visto tutte le carte' },

  // Hook opzionale chiamato ad ogni chunk aggiunto
  onChunk: { type: Function, default: null }
})

const emit = defineEmits(['update:visible', 'chunk'])

const containerRef = ref(null)
const sentinelRef = ref(null)
const visibleItems = ref([])
const hasMore = computed(() => visibleItems.value.length < (props.items?.length || 0))

let io = null
let lastLen = 0

function resetBuffer() {
  const src = props.items || []
  const take = Math.min(src.length, props.step * props.startBlocks)
  visibleItems.value = take > 0 ? src.slice(0, take) : []
  lastLen = visibleItems.value.length
  emit('update:visible', visibleItems.value)
}

function loadMore() {
  if (!hasMore.value) return
  const src = props.items || []
  const start = visibleItems.value.length
  const end = Math.min(src.length, start + props.step)
  if (end > start) {
    const chunk = src.slice(start, end)
    visibleItems.value = visibleItems.value.concat(chunk)
    // notify parent (opzionale)
    emit('update:visible', visibleItems.value)
    emit('chunk', chunk)
    if (typeof props.onChunk === 'function') {
      // non await per non bloccare lo scroll
      try { props.onChunk(chunk) } catch {}
    }
  }
}

function ensureObserver() {
  // SSR / no-IO guard
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  if (!sentinelRef.value) return

  destroyObserver()

  io = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry?.isIntersecting) {
      loadMore()
    }
  }, {
    root: props.root === 'window' ? null : (containerRef.value || null),
    rootMargin: props.rootMargin,
    threshold: props.threshold
  })

  io.observe(sentinelRef.value)
}

function destroyObserver() {
  if (io) {
    io.disconnect()
    io = null
  }
}

// Reset quando cambia l'elenco (filtri/applicazioni)
watch(() => props.items, async () => {
  resetBuffer()
  await nextTick()
  ensureObserver()
}, { deep: true })

onMounted(async () => {
  resetBuffer()
  await nextTick()
  ensureObserver()
})

onBeforeUnmount(() => {
  destroyObserver()
})

// Espone metodi utili (opzionali)
defineExpose({
  loadMore,
  reset: resetBuffer,
  containerEl: containerRef,
})
</script>

<template>
  <div :class="containerClass" ref="containerRef">
    <div :class="gridClass">
      <slot
        v-for="(item, i) in visibleItems"
        :key="item?.[keyField] ?? i"
        :item="item"
        :index="i"
      />
    </div>

    <!-- Sentinel + stato -->
    <div ref="sentinelRef" class="h-10 flex items-center justify-center text-xs text-gray-400">
      <template v-if="showStatus">
        <span v-if="hasMore">{{ loadingText }}</span>
        <span v-else>{{ endText }}</span>
      </template>
    </div>
  </div>
</template>
