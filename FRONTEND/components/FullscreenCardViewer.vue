<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  cards: { type: Array, required: true },
  index: { type: Number, default: 0 },
  show: { type: Boolean, default: false },
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
      class="viewer-overlay fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 lg:p-8 cursor-zoom-out"
      @click.self="close"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <div class="viewer-shell relative w-full max-w-[760px] select-none" @click.stop>
        <button
          class="viewer-close absolute right-3 top-3 z-20"
          aria-label="Close"
          @click="close"
        >
          <Icon icon="carbon:close-filled" class="text-[30px]" />
        </button>

        <div class="viewer-head px-5 pt-6 pb-3 sm:px-7">
          <h3 class="viewer-set truncate">
            {{ current.setName }}
          </h3>
          <h3 class="viewer-name">
            {{ current.name }}
          </h3>
          <h4 class="viewer-meta">{{ current.code }} | {{ current.illustration ?? "Base" }}</h4>
        </div>

        <div class="viewer-image-wrap px-4 sm:px-6">
          <NuxtImg
            :src="current.image"
            format="webp"
            loading="eager"
            :alt="current.name"
            fit="contain"
            class="viewer-image"
          />
        </div>

        <div class="px-5 pb-2 pt-3 sm:px-7">
          <a
            class="viewer-price-link block w-full"
            :href="current.price ? current.slugs[0].url : null"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="text-[10px] uppercase tracking-[0.08em] text-[#ffd8b1]/88">CardTrader</span>
            <div class="w-full text-center text-sm font-bold">{{ current.price ?? "---" }} EUR</div>
          </a>
        </div>

        <div v-if="current.count" class="viewer-count mt-1">
          x {{ current.count }}
        </div>

        <div class="viewer-footer mt-2 px-4 pb-4 sm:px-6 sm:pb-6">
          <button
            class="viewer-nav-btn"
            aria-label="Previous"
            @click="prev"
          >
            <Icon icon="material-symbols:chevron-left" class="text-[40px] sm:text-[44px]" />
          </button>

          <span class="viewer-index">{{ currentIndex + 1 }} / {{ total }}</span>

          <button
            class="viewer-nav-btn"
            aria-label="Next"
            @click="next"
          >
            <Icon icon="material-symbols:chevron-right" class="text-[40px] sm:text-[44px]" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.viewer-overlay {
  background:
    radial-gradient(110% 100% at 10% 95%, rgba(255, 122, 24, 0.2) 0%, rgba(255, 122, 24, 0.06) 30%, rgba(3, 5, 11, 0.88) 65%),
    radial-gradient(90% 90% at 85% 12%, rgba(99, 123, 160, 0.18) 0%, rgba(14, 20, 35, 0.9) 45%, rgba(2, 3, 8, 0.95) 100%);
  backdrop-filter: blur(8px);
}

.viewer-shell {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 1.2rem;
  overflow: hidden;
  background:
    radial-gradient(140% 90% at 50% -8%, rgba(255, 147, 68, 0.22) 0%, rgba(255, 147, 68, 0.05) 38%, transparent 62%),
    linear-gradient(135deg, rgba(13, 19, 31, 0.95) 0%, rgba(7, 10, 18, 0.98) 55%, rgba(5, 7, 12, 0.98) 100%);
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.65),
    0 0 28px rgba(255, 122, 24, 0.17),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.viewer-head {
  text-align: center;
}

.viewer-set {
  display: inline-block;
  max-width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-radius: 999px;
  border: 1px solid rgba(255, 186, 133, 0.3);
  color: rgba(255, 222, 194, 0.95);
  background: rgba(255, 122, 24, 0.12);
  padding: 0.24rem 0.66rem;
}

.viewer-name {
  margin-top: 0.7rem;
  color: #f6f7fb;
  font-size: clamp(1.2rem, 3.6vw, 1.9rem);
  font-weight: 700;
  line-height: 1.15;
}

.viewer-meta {
  margin-top: 0.2rem;
  color: rgba(224, 231, 243, 0.76);
  font-size: 0.78rem;
}

.viewer-image-wrap {
  display: flex;
  justify-content: center;
}

.viewer-image {
  width: min(100%, 420px);
  max-height: 62vh;
  object-fit: contain;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 22px 34px rgba(0, 0, 0, 0.58),
    0 0 20px rgba(255, 122, 24, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.viewer-close {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  color: #f2f6fc;
  border: 1px solid rgba(255, 255, 255, 0.23);
  background: rgba(6, 10, 18, 0.72);
  backdrop-filter: blur(6px);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.viewer-close:hover {
  transform: scale(1.04);
  border-color: rgba(255, 188, 138, 0.52);
}

.viewer-price-link {
  border-radius: 0.7rem;
  border: 1px solid rgba(255, 182, 125, 0.5);
  background: linear-gradient(120deg, rgba(255, 122, 24, 0.18), rgba(14, 20, 33, 0.88));
  color: #f3f6fb;
  padding: 0.36rem 0.8rem 0.42rem;
  text-align: center;
  transition: transform 0.18s ease, border-color 0.18s ease, filter 0.18s ease;
}

.viewer-price-link:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 205, 164, 0.65);
  filter: brightness(1.05);
}

.viewer-count {
  text-align: center;
  color: #f0f5ff;
  font-size: clamp(1.9rem, 6vw, 2.8rem);
  font-weight: 700;
}

.viewer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.viewer-nav-btn {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  color: #f6f8fd;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(120deg, rgba(23, 31, 47, 0.85), rgba(9, 13, 23, 0.93));
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.36);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.viewer-nav-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 183, 126, 0.5);
}

.viewer-index {
  flex: 1;
  text-align: center;
  color: rgba(230, 237, 247, 0.86);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

@media (max-width: 640px) {
  .viewer-shell {
    border-radius: 1rem;
  }

  .viewer-image {
    max-height: 54vh;
  }
}
</style>
