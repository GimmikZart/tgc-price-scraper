<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** Esegui append fuori dal frame di paint/scroll */
const ric = typeof window !== 'undefined' && window.requestIdleCallback
  ? window.requestIdleCallback
  : (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 16)

const props = defineProps({
  items: { type: Array, required: true },
  keyField: { type: String, default: 'id' },

  // Buffer
  step: { type: Number, default: 30 },
  startBlocks: { type: Number, default: 1 },

  // Precaricamento (equivalente al tuo rootMargin)
  loadThresholdPx: { type: Number, default: 100 },

  // Layout
  containerClass: { type: [String, Object, Array], default: 'h-[calc(100dvh-120px)] overflow-scroll pb-[70px]' },
  gridClass: { type: [String, Object, Array], default: 'grid grid-cols-2 overflow-scroll gap-2 px-2 pt-2' },

  // UI
  showStatus: { type: Boolean, default: true },
  loadingText: { type: String, default: 'Carico altre carte…' },
  endText: { type: String, default: 'Hai visto tutte le carte' },

  // Hook
  onChunk: { type: Function, default: null }
})

const emit = defineEmits(['update:visible', 'chunk'])

const containerRef = ref(null)
const sentinelRef  = ref(null)
const visibleItems = ref([])

const hasMore = computed(() =>
  visibleItems.value.length < (props.items?.length || 0)
)

let appending = false          // append in corso
let io = null
let ioBusy = false            // evita re-entrance IO
let pendingTrigger = false    // IO arrivato mentre appending=true

function resetBuffer() {
  const src = props.items || []
  const take = Math.min(src.length, props.step * props.startBlocks)
  const slice = take > 0 ? src.slice(0, take) : []

  visibleItems.value = slice
  emit('update:visible', visibleItems.value)

  if (slice.length) {
    emit('chunk', slice)
    if (typeof props.onChunk === 'function') {
      try { props.onChunk(slice) } catch {}
    }
  }
}

/** Controllo manuale post-append: se vicino al fondo, carica */
function manualCheckNearBottom() {
  const rootEl = containerRef.value
  if (!rootEl || !hasMore.value) return
  const dist = rootEl.scrollHeight - (rootEl.scrollTop + rootEl.clientHeight)
  if (dist <= props.loadThresholdPx) {
    // non chiamiamo direttamente loadMore se è già in corso
    if (!appending) loadMore()
  }
}

function scheduleAppend(fn) { ric(() => fn()) }

async function loadMore() {
  if (!hasMore.value || appending) return
  appending = true

  const src   = props.items || []
  const start = visibleItems.value.length
  const end   = Math.min(src.length, start + props.step)

  if (end > start) {
    const chunk = src.slice(start, end)

    scheduleAppend(() => {
      visibleItems.value.push(...chunk)  // una sola mutazione
      emit('update:visible', visibleItems.value)
      emit('chunk', chunk)
      if (typeof props.onChunk === 'function') { try { props.onChunk(chunk) } catch {} }

      // chiudi l'append, poi—se avevi pending—ricontrolla il fondo
      setTimeout(async () => {
        appending = false
        await nextTick()
        if (pendingTrigger) {
          pendingTrigger = false
          manualCheckNearBottom()
        }
      }, 0)
    })
  } else {
    // nulla da aggiungere
    setTimeout(async () => {
      appending = false
      await nextTick()
      if (pendingTrigger) {
        pendingTrigger = false
        manualCheckNearBottom()
      }
    }, 0)
  }
}

async function onIO(entries, observer) {
  if (!entries.some(e => e.isIntersecting)) return

  // Se sto già appendendo, NON carico: segno che c'è un trigger pendente
  if (appending) {
    pendingTrigger = true
    return
  }

  if (ioBusy) return
  ioBusy = true

  const el = sentinelRef.value
  if (el) observer.unobserve(el)

  await loadMore()
  await nextTick()

  if (el && hasMore.value) observer.observe(el)
  ioBusy = false
}

watch(() => props.items, async (n, o) => {
  if (n === o) return
  resetBuffer()
  await nextTick()
  // dopo un reset, se siamo già vicini al fondo, carica
  manualCheckNearBottom()
}, { deep: false })

onMounted(async () => {
  resetBuffer()
  await nextTick()

  const rootEl = containerRef.value
  const sentinelEl = sentinelRef.value
  if (!rootEl || !sentinelEl) return

  io = new IntersectionObserver(onIO, {
    root: rootEl,
    rootMargin: `${props.loadThresholdPx}px 0px 0px 0px`,
    threshold: 0
  })
  io.observe(sentinelEl)

  // liste corte: primo check
  manualCheckNearBottom()
})

onBeforeUnmount(() => {
  io?.disconnect?.()
  io = null
})

defineExpose({ loadMore, reset: resetBuffer, containerEl: containerRef })
</script>

<template>
  <div
    :class="containerClass"
    ref="containerRef"
  >
    <div :class="gridClass">
      <slot
        v-for="(item, i) in visibleItems"
        :key="item?.[keyField] ?? i"
        :item="item"
        :index="i"
      />
    </div>

    <div ref="sentinelRef" class="min-h-10 flex items-center justify-center text-xs text-gray-400 select-none">
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
