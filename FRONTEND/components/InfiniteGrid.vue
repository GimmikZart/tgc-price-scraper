<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  keyField: { type: String, default: 'id' },
  step: { type: Number, default: 30 },
  startBlocks: { type: Number, default: 1 },
  // rootMargin = quanto “precaricare” prima che il sentinel entri in viewport
  loadThresholdPx: { type: Number, default: 600 },
  containerClass: { type: [String, Object, Array], default: 'h-[calc(100dvh-120px)] overflow-auto pb-[70px]' },
  gridClass: { type: [String, Object, Array], default: 'grid grid-cols-2 gap-2 px-2 pt-2' },
  showStatus: { type: Boolean, default: true },
  loadingText: { type: String, default: 'Carico altre carte…' },
  endText: { type: String, default: 'Hai visto tutte le carte' },
  onChunk: { type: Function, default: null }
})

const emit = defineEmits(['update:visible', 'chunk'])

const containerRef = ref(null)
const sentinelRef  = ref(null)
const visibleItems = ref([])

const hasMore = computed(() =>
  visibleItems.value.length < (props.items?.length || 0)
)

let appending = false
let io = null

function resetBuffer() {
  const src = props.items || []
  const take = Math.min(src.length, props.step * props.startBlocks)
  visibleItems.value = take > 0 ? src.slice(0, take) : []
  emit('update:visible', visibleItems.value)
}

async function loadMore() {
  if (!hasMore.value || appending) return
  appending = true

  const src   = props.items || []
  const start = visibleItems.value.length
  const end   = Math.min(src.length, start + props.step)

  if (end > start) {
    const chunk = src.slice(start, end)
    // singola scrittura reattiva (più economica di push multipli)
    visibleItems.value = visibleItems.value.concat(chunk)
    emit('update:visible', visibleItems.value)
    emit('chunk', chunk)
    if (typeof props.onChunk === 'function') { try { props.onChunk(chunk) } catch {} }
  }

  // lascia respirare il main thread prima di consentire un altro append
  await nextTick()
  setTimeout(() => { appending = false }, 0)
}

watch(() => props.items, async (n, o) => {
  if (n === o) return
  resetBuffer()
  await nextTick()
}, { deep: false })

watch(() => props.items?.length, async () => {
  resetBuffer()
  await nextTick()
})

onMounted(async () => {
  resetBuffer()
  await nextTick()

  const rootEl = containerRef.value
  const sentinelEl = sentinelRef.value
  if (!rootEl || !sentinelEl) return

  io = new IntersectionObserver((entries) => {
    // se il sentinel entra (anche parzialmente) → carica
    if (entries.some(e => e.isIntersecting)) {
      // carica “a scatti”, evitando loop stretti
      loadMore()
    }
  }, {
    root: rootEl,
    rootMargin: `${props.loadThresholdPx}px 0px 0px 0px`,
    threshold: 0
  })

  io.observe(sentinelEl)

  // liste corte: se sentinel è già visibile, partirà subito
})

onBeforeUnmount(() => {
  io?.disconnect?.()
  io = null
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

    <div ref="sentinelRef" class="h-auto flex items-center justify-center text-xs text-gray-400">
      <template v-if="showStatus">
        <span v-if="hasMore">
          {{ loadingText }}
          <div class="loader mx-auto mt-2" style="width: 25px"></div>
        </span>
        <span v-else>{{ endText }}</span>
      </template>
    </div>
  </div>
</template>
