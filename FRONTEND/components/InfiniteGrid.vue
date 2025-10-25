<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  keyField: { type: String, default: 'id' },

  // Buffer
  step: { type: Number, default: 30 },
  startBlocks: { type: Number, default: 1 },

  // Scroll loader
  loadThresholdPx: { type: Number, default: 600 }, // quando mancano < X px al fondo, carica
  // Layout
  containerClass: { type: [String, Object, Array], default: 'h-[calc(100dvh-120px)] overflow-auto' },
  gridClass: { type: [String, Object, Array], default: 'grid grid-cols-2 gap-2 px-2 pt-2' },

  // UI
  showStatus: { type: Boolean, default: true },
  loadingText: { type: String, default: 'Carico altre carte…' },
  endText: { type: String, default: 'Hai visto tutte le carte' },

  // Hook sul chunk
  onChunk: { type: Function, default: null }
})

const emit = defineEmits(['update:visible', 'chunk'])

const containerRef = ref(null)
const sentinelRef = ref(null)  // lasciato per semplicità, ma non usato per IO
const visibleItems = ref([])
const hasMore = computed(() => visibleItems.value.length < (props.items?.length || 0))

let appending = false
let ticking = false

function resetBuffer() {
  const src = props.items || []
  const take = Math.min(src.length, props.step * props.startBlocks)
  visibleItems.value = take > 0 ? src.slice(0, take) : []
  emit('update:visible', visibleItems.value)
}

async function loadMore() {
  if (!hasMore.value || appending) return
  appending = true

  const src = props.items || []
  const start = visibleItems.value.length
  const end = Math.min(src.length, start + props.step)

  if (end > start) {
    const chunk = src.slice(start, end)
    visibleItems.value.push(...chunk)           // no replace
    emit('update:visible', visibleItems.value)
    emit('chunk', chunk)
    if (typeof props.onChunk === 'function') { try { props.onChunk(chunk) } catch {} }
  }

  await nextTick()
  requestAnimationFrame(() => { appending = false })
}

function needMore(el) {
  // distanza dal fondo
  const dist = el.scrollHeight - (el.scrollTop + el.clientHeight)
  return dist < props.loadThresholdPx
}

function onScroll() {
  const el = containerRef.value
  if (!el) return

  // throttle con rAF
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    if (needMore(el)) loadMore()
    ticking = false
  })
}

watch(() => props.items, async (newVal, oldVal) => {
  if (newVal === oldVal) return
  resetBuffer()
  await nextTick()
  const el = containerRef.value
  if (el && needMore(el)) loadMore()
}, { deep: false })

// (Opzionale) Se in qualche vista cambi la lunghezza senza sostituire l'array:
watch(() => props.items?.length, async () => {
  resetBuffer()
  await nextTick()
  const el = containerRef.value
  if (el && needMore(el)) loadMore()
})

onMounted(async () => {
  resetBuffer()
  await nextTick()
  const el = containerRef.value
  el?.addEventListener('scroll', onScroll, { passive: true })
  // primo check per liste corte
  if (el && needMore(el)) loadMore()
})

onBeforeUnmount(() => {
  const el = containerRef.value
  el?.removeEventListener('scroll', onScroll)
})

defineExpose({ loadMore, reset: resetBuffer, containerEl: containerRef })
</script>

<template>
  <div :class="containerClass" ref="containerRef" style="overflow-anchor: none;">
    <div :class="gridClass">
      <slot
        v-for="(item, i) in visibleItems"
        :key="item?.[keyField] ?? i"
        :item="item"
        :index="i"
      />
    </div>

    <div ref="sentinelRef" class="h-10 flex items-center justify-center text-xs text-gray-400">
      <template v-if="showStatus">
        <span v-if="hasMore">{{ loadingText }}</span>
        <span v-else>{{ endText }}</span>
      </template>
    </div>
  </div>
</template>
