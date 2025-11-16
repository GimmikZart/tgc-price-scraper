<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { Icon } from "@iconify/vue";
import { getShortSetName } from "@/utilities/cardsFieldsParser";

const props = defineProps({
  cards: { type: Array, required: true },   // array di carte ordinate (es. paginatedCards)
  index: { type: Number, default: 0 },      // indice iniziale
  show: { type: Boolean, default: false },  // visibilità
});

const emit = defineEmits(["update:show", "update:index", "close"]);

const currentIndex = ref(props.index);
watch(() => props.index, (v) => (currentIndex.value = v));

const current = computed(() => props.cards?.[currentIndex.value]);
const total = computed(() => props.cards?.length ?? 0);

function close() {
  emit("update:show", false);
  emit("close");
}

function next() {
  if (!total.value) return;
  const nextIndex = (currentIndex.value + 1) % total.value;
  currentIndex.value = nextIndex;
  emit("update:index", nextIndex);
  preloadAround();
}

function prev() {
  if (!total.value) return;
  const prevIndex = (currentIndex.value - 1 + total.value) % total.value;
  currentIndex.value = prevIndex;
  emit("update:index", prevIndex);
  preloadAround();
}

// Preload immagine corrente, next e prev per fluidità
function preload(src) {
  if (!src) return;
  const img = new Image();
  img.src = src;
}
function preloadAround() {
  const cur = props.cards?.[currentIndex.value];
  const n = props.cards?.[(currentIndex.value + 1) % total.value];
  const p = props.cards?.[(currentIndex.value - 1 + total.value) % total.value];
  preload(cur?.image);
  preload(n?.image);
  preload(p?.image);
}

// Keyboard: ArrowLeft/Right, Escape
function handleKey(e) {
  if (!props.show) return;
  if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "Escape") close();
}

onMounted(() => {
  window.addEventListener("keydown", handleKey);
  preloadAround();
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKey);
});

// Touch swipe
let touchStartX = 0;
function onTouchStart(e) {
  touchStartX = e.changedTouches[0].clientX;
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    dx < 0 ? next() : prev();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && current"
      class="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center px-10 sm:px-8 py-10 cursor-zoom-out"
      @click.self="close"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- Header -->
      <div class="text-center mb-4 select-none">
        <h3 class="text-white/80 bg-black/50 px-2 py-1 rounded-lg font-light text-xs sm:text-sm inline-block">
          {{ current.setName }}
        </h3>
        <h3 class="text-white font-bold text-2xl sm:text-3xl mt-1">
          {{ current.name }}
        </h3>
        <h4 class="text-white/80 text-sm">{{ current.code }} | {{ current.illustration ?? 'Base' }}</h4>
      </div>

      <!-- Image area -->
      <div class="relative flex flex-col justify-center w-full h-auto">
        <!-- Close -->
        <button
          class="absolute -right-4 -top-4 bg-white text-black rounded-full shadow-lg p-1"
          aria-label="Close"
          @click="close"
        >
          <Icon icon="carbon:close-filled" class="text-3xl" />
        </button>

        <!-- Image -->
        <NuxtImg
          :src="current.image"
          format="webp"
          loading="eager"
          :alt="current.name"
          fit="contain"
        />

        <div class="w-full p-1">
        <a class="w-full rounded-lg bg-black/70 flex flex-col justify-between gap-1 text-black items-center px-4 py-1 block text-white text-center" :href="current.price ? current.slugs[0].url : '#'" target="_blank" rel="noopener noreferrer">
          <span class="text-xs">CardTrader</span>
          <div class="w-full text-center font-bold text-xs">{{ current.price ?? '---' }} €</div>
        </a>
      </div>
      </div>
      
      <div v-if="current.count" class="mt-4 text-white text-5xl font-bold select-none">
        x {{ current.count }}
      </div>

      <!-- Footer slot (counter, extra info, ecc.) -->
      <div class="w-full flex items-center justify-around py-5 h-auto absolute bottom-0 left-0 mt-4 text-white/80 text-sm select-none">
        <!-- Prev -->
        <button
          class="text-white rounded-full"
          aria-label="Previous"
          @click="prev"
        >
          <Icon icon="material-symbols:chevron-left" class="text-5xl" />
        </button>

        <span class="text-xl">{{ currentIndex + 1 }} / {{ total }}</span>
        
        <!-- Next -->
        <button
          class="text-white rounded-full"
          aria-label="Next"
          @click="next"
        >
          <Icon icon="material-symbols:chevron-right" class="text-5xl" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
