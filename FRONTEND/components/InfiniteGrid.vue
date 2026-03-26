<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const ric = typeof window !== "undefined" && window.requestIdleCallback
  ? window.requestIdleCallback
  : (callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 16);

const props = defineProps({
  items: { type: Array, required: true },
  keyField: { type: String, default: "id" },
  step: { type: Number, default: 30 },
  startBlocks: { type: Number, default: 1 },
  loadThresholdPx: { type: Number, default: 100 },
  containerClass: { type: [String, Object, Array], default: "h-[calc(100dvh-120px)] overflow-scroll pb-[70px]" },
  gridClass: { type: [String, Object, Array], default: "grid grid-cols-2 overflow-scroll gap-2 px-2 pt-2" },
  scrollRootMode: {
    type: String,
    default: "self",
    validator: (value) => ["self", "nearest-parent"].includes(value),
  },
  showStatus: { type: Boolean, default: true },
  loadingText: { type: String, default: "Carico altre carte..." },
  endText: { type: String, default: "Hai visto tutte le carte" },
  onChunk: { type: Function, default: null },
});

const emit = defineEmits(["update:visible", "chunk"]);

const containerRef = ref(null);
const sentinelRef = ref(null);
const visibleItems = ref([]);
const scrollRootRef = ref(null);

const hasMore = computed(() => visibleItems.value.length < (props.items?.length || 0));

let appending = false;
let io = null;
let ioBusy = false;
let pendingTrigger = false;

function isScrollableElement(element) {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  return /(auto|scroll|overlay)/.test(overflowY);
}

function resolveNearestScrollParent(element) {
  if (typeof window === "undefined") return null;

  let currentElement = element instanceof HTMLElement ? element : null;
  while (currentElement) {
    if (isScrollableElement(currentElement)) {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  return window;
}

function getScrollMetrics() {
  const rootElement = scrollRootRef.value;
  if (!rootElement) return null;

  if (rootElement === window) {
    const scrollingElement = document.scrollingElement || document.documentElement;
    return {
      scrollHeight: Number(scrollingElement?.scrollHeight || 0),
      scrollTop: Number(window.scrollY ?? scrollingElement?.scrollTop ?? 0),
      clientHeight: Number(window.innerHeight || scrollingElement?.clientHeight || 0),
    };
  }

  return {
    scrollHeight: Number(rootElement.scrollHeight || 0),
    scrollTop: Number(rootElement.scrollTop || 0),
    clientHeight: Number(rootElement.clientHeight || 0),
  };
}

function resolveScrollRoot() {
  if (props.scrollRootMode === "nearest-parent") {
    return resolveNearestScrollParent(containerRef.value?.parentElement ?? containerRef.value);
  }

  return containerRef.value;
}

function emitChunk(chunk) {
  if (!chunk.length) return;

  emit("chunk", chunk);

  if (typeof props.onChunk === "function") {
    try {
      props.onChunk(chunk);
    } catch {
      // Ignore consumer-side errors so the grid can keep rendering.
    }
  }
}

function resetBuffer() {
  const sourceItems = props.items || [];
  const take = Math.min(sourceItems.length, props.step * props.startBlocks);
  const slice = take > 0 ? sourceItems.slice(0, take) : [];

  visibleItems.value = slice;
  emit("update:visible", visibleItems.value);
  emitChunk(slice);
}

function manualCheckNearBottom() {
  const metrics = getScrollMetrics();
  if (!metrics || !hasMore.value) return;

  const distanceFromBottom = metrics.scrollHeight - (metrics.scrollTop + metrics.clientHeight);
  if (distanceFromBottom <= props.loadThresholdPx && !appending) {
    loadMore();
  }
}

function scheduleAppend(callback) {
  ric(() => callback());
}

async function finalizeAppend() {
  appending = false;
  await nextTick();

  if (pendingTrigger) {
    pendingTrigger = false;
    manualCheckNearBottom();
  }
}

async function loadMore() {
  if (!hasMore.value || appending) return;
  appending = true;

  const sourceItems = props.items || [];
  const start = visibleItems.value.length;
  const end = Math.min(sourceItems.length, start + props.step);

  if (end > start) {
    const chunk = sourceItems.slice(start, end);

    scheduleAppend(() => {
      visibleItems.value.push(...chunk);
      emit("update:visible", visibleItems.value);
      emitChunk(chunk);

      setTimeout(() => {
        void finalizeAppend();
      }, 0);
    });

    return;
  }

  setTimeout(() => {
    void finalizeAppend();
  }, 0);
}

async function onIntersection(entries, observer) {
  if (!entries.some((entry) => entry.isIntersecting)) return;

  if (appending) {
    pendingTrigger = true;
    return;
  }

  if (ioBusy) return;
  ioBusy = true;

  const sentinelElement = sentinelRef.value;
  if (sentinelElement) observer.unobserve(sentinelElement);

  await loadMore();
  await nextTick();

  if (sentinelElement && hasMore.value) {
    observer.observe(sentinelElement);
  }

  ioBusy = false;
}

watch(
  () => props.items,
  async (nextItems, previousItems) => {
    if (nextItems === previousItems) return;

    resetBuffer();
    await nextTick();
    manualCheckNearBottom();
  },
  { deep: false },
);

onMounted(async () => {
  resetBuffer();
  await nextTick();

  scrollRootRef.value = resolveScrollRoot();

  const sentinelElement = sentinelRef.value;
  if (!scrollRootRef.value || !sentinelElement) return;

  io = new IntersectionObserver(onIntersection, {
    root: scrollRootRef.value === window ? null : scrollRootRef.value,
    rootMargin: `${props.loadThresholdPx}px 0px 0px 0px`,
    threshold: 0,
  });
  io.observe(sentinelElement);

  manualCheckNearBottom();
});

onBeforeUnmount(() => {
  io?.disconnect?.();
  io = null;
});

defineExpose({
  loadMore,
  reset: resetBuffer,
  containerEl: containerRef,
  scrollEl: scrollRootRef,
});
</script>

<template>
  <div ref="containerRef" :class="containerClass">
    <div :class="gridClass">
      <slot
        v-for="(item, index) in visibleItems"
        :key="item?.[keyField] ?? index"
        :item="item"
        :index="index"
      />
    </div>

    <div ref="sentinelRef" class="min-h-10 flex select-none items-center justify-center text-xs text-gray-400">
      <template v-if="showStatus">
        <span v-if="hasMore">
          {{ loadingText }}
          <div class="loader mx-auto mt-2" style="width: 25px" />
        </span>
        <span v-else>{{ endText }}</span>
      </template>
    </div>
  </div>
</template>
