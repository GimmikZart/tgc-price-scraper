<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { Icon } from "@iconify/vue";
import { getCardEffectText } from "@/utilities/cardEffect";

const effectLanguageOptions = Object.freeze([
  {
    code: "en",
    label: "English",
    flagSrc: "/assets/icons/flags/united-kingdom.svg",
  },
  {
    code: "it",
    label: "Italiano",
    flagSrc: "/assets/icons/flags/italy.svg",
  },
]);

const props = defineProps({
  cards: { type: Array, required: true },
  index: { type: Number, default: 0 },
  show: { type: Boolean, default: false },
  context: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:show", "update:index", "close"]);

const currentIndex = ref(props.index);
const contextState = ref({});
const isContextLoading = ref(false);
const selectedEffectLanguage = ref("en");

let contextRunId = 0;
let touchStartX = 0;
let touchStartY = 0;

const total = computed(() => props.cards?.length ?? 0);
const current = computed(() => props.cards?.[currentIndex.value] ?? null);
const currentCardUrl = computed(() => {
  if (typeof contextState.value?.priceUrl === "string" && contextState.value.priceUrl.trim()) {
    return contextState.value.priceUrl.trim();
  }

  if (!current.value?.price) return null;
  return current.value?.slugs?.[0]?.url ?? null;
});
const resolvedPrice = computed(() => {
  if (contextState.value?.price !== undefined) return contextState.value.price;
  return current.value?.price ?? null;
});
const resolvedPriceLabel = computed(() => {
  const value = contextState.value?.priceLabel ?? props.context?.priceLabel ?? "CardTrader";
  return String(value ?? "").trim() || "CardTrader";
});
const showPriceSection = computed(() => {
  if (props.context?.showPrice === false) return false;
  return resolvedPrice.value !== null || Boolean(currentCardUrl.value);
});
const primaryActionLabel = computed(() => {
  const value = contextState.value?.primaryActionLabel ?? props.context?.primaryActionLabel ?? "";
  return String(value ?? "").trim();
});
const primaryActionDisabled = computed(() => {
  if (contextState.value?.primaryActionDisabled !== undefined) {
    return Boolean(contextState.value.primaryActionDisabled);
  }

  return Boolean(props.context?.primaryActionDisabled);
});
const primaryActionIcon = computed(() => {
  const value = contextState.value?.primaryActionIcon ?? props.context?.primaryActionIcon ?? "mdi:check-bold";
  return String(value ?? "").trim() || "mdi:check-bold";
});
const primaryActionTone = computed(() => {
  const value = contextState.value?.primaryActionTone ?? props.context?.primaryActionTone ?? "orange";
  return String(value ?? "").trim() || "orange";
});
const primaryActionHelper = computed(() => {
  const value = contextState.value?.primaryActionHelper ?? props.context?.primaryActionHelper ?? "";
  return String(value ?? "").trim();
});
const collectionCount = computed(() => {
  const explicitCount = Number(contextState.value?.collectionCount);
  if (Number.isInteger(explicitCount) && explicitCount >= 0) return explicitCount;

  const cardCount = Number(current.value?.count);
  if (Number.isInteger(cardCount) && cardCount >= 0) return cardCount;

  return 0;
});
const collectionTitle = computed(() => {
  const value = contextState.value?.collectionTitle ?? props.context?.collectionTitle ?? "Collezione";
  return String(value ?? "").trim() || "Collezione";
});
const collectionInfo = computed(() => {
  const value = contextState.value?.collectionInfo ?? props.context?.collectionInfo ?? "";
  return String(value ?? "").trim();
});
const deckCount = computed(() => {
  const explicitCount = Number(contextState.value?.deckCount);
  if (Number.isInteger(explicitCount) && explicitCount >= 0) return explicitCount;

  return 0;
});
const deckTitle = computed(() => {
  const value = contextState.value?.deckTitle ?? props.context?.deckTitle ?? "Deck";
  return String(value ?? "").trim() || "Deck";
});
const deckInfo = computed(() => {
  const value = contextState.value?.deckInfo ?? props.context?.deckInfo ?? "";
  return String(value ?? "").trim();
});
const showCollectionActions = computed(() => Boolean(props.context?.showCollectionActions));
const showDeckActions = computed(() => Boolean(props.context?.showDeckActions));
const showCollectionSection = computed(() => {
  if (props.context?.showCollectionSection) return true;
  if (showCollectionActions.value) return true;
  if (contextState.value?.collectionCount !== undefined) return true;
  return Boolean(collectionInfo.value);
});
const showCollectionCounter = computed(() => {
  if (showCollectionActions.value) return true;
  if (contextState.value?.collectionCount !== undefined) return true;

  const cardCount = Number(current.value?.count);
  return Number.isInteger(cardCount) && cardCount >= 0;
});
const showDeckSection = computed(() => {
  if (props.context?.showDeckSection) return true;
  if (showDeckActions.value) return true;
  if (contextState.value?.deckCount !== undefined) return true;
  return Boolean(deckInfo.value);
});
const currentEffectText = computed(() =>
  getCardEffectText(current.value?.effect, selectedEffectLanguage.value),
);

function hasMetaValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => String(item ?? "").trim().length > 0);
  }

  if (typeof value === "boolean") return true;
  if (typeof value === "number") return true;
  if (value === null || value === undefined) return false;

  return String(value).trim().length > 0;
}

function formatMetaValue(value) {
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);

    return parts.join(" / ");
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  return String(value ?? "").trim();
}

function createMetaItem(label, value, layout = "half", options = {}) {
  if (!hasMetaValue(value)) return null;

  return {
    label,
    value: formatMetaValue(value),
    layout,
    multiline: Boolean(options.multiline),
  };
}

const metaItems = computed(() => {
  if (!current.value) return [];

  return [
    createMetaItem("Name", current.value.name, "full"),
    createMetaItem("Set Name", current.value.setName, "full"),
    createMetaItem("Color", current.value.color),
    createMetaItem("Power", current.value.power),
    createMetaItem("Code", current.value.code),
    createMetaItem("Type", current.value.type),
    createMetaItem("Rarity", current.value.rarity),
    createMetaItem("Illustration", current.value.illustration),
    createMetaItem("Life", current.value.life),
    createMetaItem("Attribute", current.value.attribute),
    createMetaItem("Counter", current.value.counter),
    createMetaItem("Family", current.value.family, "full"),
    createMetaItem("Trigger", current.value.trigger, "full", { multiline: true }),
  ].filter(Boolean);
});

function setDocumentScrollLock(locked) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("viewer-scroll-locked", locked);
  document.body.classList.toggle("viewer-scroll-locked", locked);
}

function close() {
  emit("update:show", false);
  emit("close");
}

function preload(src) {
  if (!src) return;
  const img = new Image();
  img.src = src;
}

function preloadAround() {
  if (!total.value) return;

  const currentCard = props.cards?.[currentIndex.value];
  const nextCard = props.cards?.[(currentIndex.value + 1) % total.value];
  const prevCard = props.cards?.[(currentIndex.value - 1 + total.value) % total.value];

  preload(currentCard?.image);
  preload(nextCard?.image);
  preload(prevCard?.image);
}

function next() {
  if (total.value <= 1) return;

  const nextIndex = (currentIndex.value + 1) % total.value;
  currentIndex.value = nextIndex;
  emit("update:index", nextIndex);
}

function prev() {
  if (total.value <= 1) return;

  const prevIndex = (currentIndex.value - 1 + total.value) % total.value;
  currentIndex.value = prevIndex;
  emit("update:index", prevIndex);
}

function handleKey(event) {
  if (!props.show) return;

  if (event.key === "ArrowRight") {
    next();
    return;
  }

  if (event.key === "ArrowLeft") {
    prev();
    return;
  }

  if (event.key === "Escape") {
    close();
  }
}

function onTouchStart(event) {
  const touch = event.changedTouches?.[0];
  if (!touch) return;

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function onTouchEnd(event) {
  const touch = event.changedTouches?.[0];
  if (!touch) return;

  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
  deltaX < 0 ? next() : prev();
}

async function loadContextState() {
  const loader = props.context?.loadState;

  if (!props.show || !current.value || typeof loader !== "function") {
    contextRunId += 1;
    contextState.value = {};
    isContextLoading.value = false;
    return;
  }

  const runId = ++contextRunId;
  isContextLoading.value = true;

  try {
    const loadedState = await loader(current.value, currentIndex.value);

    if (runId !== contextRunId) return;
    contextState.value = loadedState && typeof loadedState === "object" ? loadedState : {};
  } catch (error) {
    if (runId !== contextRunId) return;

    contextState.value = {
      ...contextState.value,
      loadErrorMessage: error?.message || "Impossibile caricare i dettagli della carta",
    };
  } finally {
    if (runId === contextRunId) {
      isContextLoading.value = false;
    }
  }
}

async function runContextAction(handlerKey) {
  const handler = props.context?.[handlerKey];
  if (typeof handler !== "function" || !current.value) return;

  let completed = false;

  try {
    await handler(current.value, currentIndex.value, contextState.value);
    completed = true;
  } catch (error) {
    completed = false;
  }

  if (!completed) return;

  if (handlerKey === "onPrimaryAction" && props.context?.closeOnPrimaryAction) {
    close();
    return;
  }

  if (props.context?.reloadAfterAction !== false) {
    await loadContextState();
  }
}

watch(
  () => props.index,
  (nextIndex) => {
    currentIndex.value = Number.isFinite(nextIndex) ? nextIndex : 0;
  },
);

watch(
  () => current.value?.id,
  () => {
    selectedEffectLanguage.value = "en";
  },
  { immediate: true },
);

watch(
  total,
  (nextTotal) => {
    if (!nextTotal && props.show) {
      close();
      return;
    }

    if (nextTotal > 0 && currentIndex.value >= nextTotal) {
      const nextIndex = nextTotal - 1;
      currentIndex.value = nextIndex;
      emit("update:index", nextIndex);
    }
  },
  { immediate: true },
);

watch(
  () => [props.show, current.value?.id, currentIndex.value],
  async () => {
    if (!props.show) {
      contextState.value = {};
      isContextLoading.value = false;
      return;
    }

    preloadAround();
    await loadContextState();
  },
  { immediate: true },
);

watch(
  () => props.context,
  async () => {
    if (!props.show || !current.value) return;
    await loadContextState();
  },
  { deep: true },
);

watch(
  () => props.show,
  (isOpen) => {
    setDocumentScrollLock(isOpen);
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("keydown", handleKey);
  preloadAround();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKey);
  setDocumentScrollLock(false);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && current"
      class="viewer-overlay"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <div class="viewer-page">
        <button
          type="button"
          class="viewer-close"
          aria-label="Chiudi viewer"
          @click="close"
        >
          <Icon icon="carbon:close-filled" class="h-6 w-6" />
        </button>

        <div class="viewer-scroll">
          <div class="viewer-content">
            <header class="viewer-head">
              <p v-if="current.setName" class="viewer-set">{{ current.setName }}</p>
              <h2 class="viewer-name">{{ current.name }}</h2>
              <p class="viewer-meta">
                {{ current.code }}
                <span v-if="current.rarity"> | {{ current.rarity }}</span>
                <span> | {{ current.illustration ?? "Base" }}</span>
              </p>
            </header>

            <section class="viewer-image-panel">
              <NuxtImg
                :src="current.image"
                format="webp"
                loading="eager"
                :alt="current.name"
                fit="contain"
                class="viewer-image"
              />
            </section>

            <button
              v-if="primaryActionLabel"
              type="button"
              class="viewer-primary-action"
              :class="`viewer-primary-action--${primaryActionTone}`"
              :disabled="primaryActionDisabled"
              @click="runContextAction('onPrimaryAction')"
            >
              <Icon :icon="primaryActionIcon" class="viewer-primary-action__icon" />
              <span>{{ primaryActionLabel }}</span>
            </button>

            <p v-if="primaryActionHelper" class="viewer-inline-helper">
              {{ primaryActionHelper }}
            </p>

            <section v-if="showPriceSection" class="viewer-section">
              <div class="viewer-section__head">
                <p class="viewer-section__eyebrow">Mercato</p>
                <p class="viewer-section__title">Prezzo di riferimento</p>
              </div>

              <CardPriceLink
                :price="resolvedPrice"
                :href="currentCardUrl"
                :label="resolvedPriceLabel"
                :show-outer-padding="false"
              />
            </section>

            <section v-if="showCollectionSection" class="viewer-section">
              <div class="viewer-section__head">
                <p class="viewer-section__eyebrow">Collezione</p>
                <p class="viewer-section__title">{{ collectionTitle }}</p>
              </div>

              <div v-if="showCollectionActions" class="viewer-counter-panel">
                <button
                  type="button"
                  class="viewer-counter-btn viewer-counter-btn--minus"
                  aria-label="Rimuovi carta dalla collezione"
                  @click="runContextAction('onRemoveCollection')"
                >
                  <Icon icon="mdi:minus" class="h-6 w-6" />
                </button>

                <div class="viewer-counter-value viewer-counter-value--solo">
                  <span class="viewer-counter-value__amount">{{ collectionCount }}</span>
                </div>

                <button
                  type="button"
                  class="viewer-counter-btn viewer-counter-btn--plus"
                  aria-label="Aggiungi carta alla collezione"
                  @click="runContextAction('onAddCollection')"
                >
                  <Icon icon="mdi:plus" class="h-6 w-6" />
                </button>
              </div>

              <div
                v-else-if="showCollectionCounter"
                class="viewer-counter-panel viewer-counter-panel--readonly"
              >
                <div class="viewer-counter-value viewer-counter-value--solo">
                  <span class="viewer-counter-value__amount">{{ collectionCount }}</span>
                </div>
              </div>
            </section>

            <section v-if="showDeckSection" class="viewer-section">
              <div class="viewer-section__head viewer-section__head--split">
                <div>
                  <p class="viewer-section__eyebrow">Deck</p>
                  <p class="viewer-section__title">{{ deckTitle }}</p>
                </div>
                <div class="viewer-count-pill viewer-count-pill--accent">
                  {{ deckCount }}
                </div>
              </div>

              <p v-if="deckInfo" class="viewer-section__copy">
                {{ deckInfo }}
              </p>

              <div v-if="showDeckActions" class="viewer-counter-panel">
                <button
                  type="button"
                  class="viewer-counter-btn viewer-counter-btn--minus"
                  aria-label="Rimuovi carta dal deck"
                  @click="runContextAction('onRemoveDeck')"
                >
                  <Icon icon="mdi:minus" class="h-6 w-6" />
                </button>

                <div class="viewer-counter-value">
                  <span class="viewer-counter-value__label">Copie nel deck</span>
                  <span class="viewer-counter-value__amount">{{ deckCount }}</span>
                </div>

                <button
                  type="button"
                  class="viewer-counter-btn viewer-counter-btn--plus"
                  aria-label="Aggiungi carta al deck"
                  @click="runContextAction('onAddDeck')"
                >
                  <Icon icon="mdi:plus" class="h-6 w-6" />
                </button>
              </div>
            </section>

            <p
              v-if="contextState.loadErrorMessage"
              class="viewer-feedback viewer-feedback--error"
            >
              {{ contextState.loadErrorMessage }}
            </p>

            <p
              v-else-if="isContextLoading"
              class="viewer-feedback"
            >
              Caricamento dettagli contestuali...
            </p>

            <section v-if="metaItems.length > 0" class="viewer-section viewer-section--meta">
              <div class="viewer-section__head">
                <p class="viewer-section__eyebrow">Scheda</p>
                <p class="viewer-section__title">Dettagli carta</p>
              </div>

              <div class="viewer-meta-grid">
                <article
                  v-for="item in metaItems"
                  :key="item.label"
                  class="viewer-meta-card"
                  :class="[
                    item.layout === 'full' ? 'viewer-meta-card--full' : 'viewer-meta-card--half',
                    { 'viewer-meta-card--multiline': item.multiline },
                  ]"
                >
                  <p class="viewer-meta-card__label">{{ item.label }}</p>
                  <p class="viewer-meta-card__value">{{ item.value }}</p>
                </article>

                <article
                  v-if="currentEffectText"
                  class="viewer-meta-card viewer-meta-card--full viewer-meta-card--multiline viewer-effect-card"
                >
                  <p class="viewer-meta-card__label">Effect</p>
                  <p class="viewer-meta-card__value">{{ currentEffectText }}</p>

                  <div
                    class="viewer-effect-card__actions"
                    role="group"
                    aria-label="Lingua effect"
                  >
                    <button
                      v-for="language in effectLanguageOptions"
                      :key="language.code"
                      type="button"
                      class="viewer-effect-card__flag-btn"
                      :class="{
                        'viewer-effect-card__flag-btn--inactive':
                          selectedEffectLanguage !== language.code,
                      }"
                      :aria-pressed="selectedEffectLanguage === language.code"
                      :aria-label="`Mostra effect in ${language.label}`"
                      @click="selectedEffectLanguage = language.code"
                    >
                      <img
                        :src="language.flagSrc"
                        :alt="language.label"
                        class="viewer-effect-card__flag"
                      >
                    </button>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>

        <div class="viewer-float-menu-wrap">
          <div class="viewer-float-menu">
            <button
              type="button"
              class="viewer-float-menu__btn"
              :disabled="total <= 1"
              aria-label="Carta precedente"
              @click="prev"
            >
              <Icon icon="material-symbols:chevron-left-rounded" class="viewer-float-menu__icon" />
            </button>

            <div class="viewer-float-menu__index">
              {{ currentIndex + 1 }} / {{ total }}
            </div>

            <button
              type="button"
              class="viewer-float-menu__btn"
              :disabled="total <= 1"
              aria-label="Carta successiva"
              @click="next"
            >
              <Icon icon="material-symbols:chevron-right-rounded" class="viewer-float-menu__icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
:global(html.viewer-scroll-locked),
:global(body.viewer-scroll-locked) {
  overflow: hidden;
}

.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background:
    radial-gradient(circle at top, rgba(255, 122, 24, 0.12), transparent 26%),
    radial-gradient(circle at 84% 14%, rgba(56, 189, 248, 0.1), transparent 22%),
    linear-gradient(180deg, rgba(7, 11, 20, 0.98), rgba(2, 5, 12, 1));
  backdrop-filter: blur(10px);
}

.viewer-page {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
}

.viewer-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem 1rem 7.6rem;
}

.viewer-content {
  width: min(100%, 860px);
  margin: 0 auto;
  display: grid;
  gap: 0.95rem;
}

.viewer-close {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  box-shadow:
    0 14px 24px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.viewer-close:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 183, 124, 0.48);
}

.viewer-head {
  padding: 2.8rem 0 0.25rem;
  text-align: center;
}

.viewer-set {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 230, 210, 0.96);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 0.36rem 0.8rem;
  text-transform: uppercase;
}

.viewer-name,
.viewer-meta,
.viewer-section__eyebrow,
.viewer-section__title,
.viewer-section__copy,
.viewer-inline-helper,
.viewer-feedback,
.viewer-meta-card__label,
.viewer-meta-card__value,
.viewer-counter-value__label,
.viewer-counter-value__amount {
  margin: 0;
}

.viewer-name {
  margin-top: 0.9rem;
  color: #f8fafc;
  font-size: clamp(1.9rem, 6vw, 3.1rem);
  font-weight: 900;
  line-height: 0.98;
}

.viewer-meta {
  margin-top: 0.45rem;
  color: rgba(203, 213, 225, 0.84);
  font-size: 0.88rem;
  line-height: 1.4;
}

.viewer-image-panel,
.viewer-section {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.9rem;
  background:
    radial-gradient(circle at top right, rgba(255, 122, 24, 0.12), transparent 30%),
    linear-gradient(145deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 42px rgba(0, 0, 0, 0.28);
}

.viewer-image-panel {
  padding: 1rem;
}

.viewer-image {
  width: min(100%, 620px);
  margin: 0 auto;
  display: block;
  object-fit: contain;
  border-radius: 1.3rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 24px 36px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.viewer-primary-action {
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 3.9rem;
  border-radius: 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff7f0;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  box-shadow:
    0 20px 34px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
}

.viewer-primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.viewer-primary-action:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.viewer-primary-action--orange {
  background: linear-gradient(145deg, rgba(255, 122, 24, 0.96), rgba(173, 72, 11, 0.96));
}

.viewer-primary-action--green {
  background: linear-gradient(145deg, rgba(34, 197, 94, 0.94), rgba(21, 128, 61, 0.96));
}

.viewer-primary-action__icon {
  width: 1.2rem;
  height: 1.2rem;
}

.viewer-inline-helper,
.viewer-feedback {
  color: rgba(203, 213, 225, 0.82);
  font-size: 0.82rem;
  line-height: 1.5;
  text-align: center;
}

.viewer-feedback--error {
  color: rgba(254, 202, 202, 0.96);
}

.viewer-section {
  padding: 1rem;
}

.viewer-section__head {
  display: grid;
  gap: 0.18rem;
}

.viewer-section__head--split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.viewer-section__eyebrow {
  color: #ffb77c;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.viewer-section__title {
  color: rgba(248, 250, 252, 0.98);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.2;
}

.viewer-section__copy {
  margin-top: 0.8rem;
  color: rgba(203, 213, 225, 0.82);
  font-size: 0.88rem;
  line-height: 1.55;
}

.viewer-count-pill {
  flex-shrink: 0;
  min-width: 2.75rem;
  text-align: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 183, 124, 0.28);
  background: rgba(255, 122, 24, 0.12);
  color: #ffe4cb;
  font-size: 0.96rem;
  font-weight: 900;
  padding: 0.42rem 0.8rem;
}

.viewer-count-pill--accent {
  border-color: rgba(96, 165, 250, 0.24);
  background: rgba(59, 130, 246, 0.12);
  color: rgba(219, 234, 254, 0.96);
}

.viewer-counter-panel {
  --viewer-counter-height: 4.15rem;
  margin-top: 0.95rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: center;
}

.viewer-counter-panel--readonly {
  grid-template-columns: minmax(0, 1fr);
}

.viewer-counter-btn {
  display: grid;
  place-items: center;
  width: 3.9rem;
  height: var(--viewer-counter-height);
  border-radius: 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 18px rgba(0, 0, 0, 0.24);
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.viewer-counter-btn:hover {
  transform: translateY(-1px);
}

.viewer-counter-btn--minus {
  color: rgba(254, 178, 178, 0.98);
}

.viewer-counter-btn--minus:hover {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(248, 113, 113, 0.08);
}

.viewer-counter-btn--plus {
  color: rgba(187, 247, 208, 0.98);
}

.viewer-counter-btn--plus:hover {
  border-color: rgba(74, 222, 128, 0.3);
  background: rgba(34, 197, 94, 0.08);
}

.viewer-counter-value {
  min-width: 0;
  min-height: var(--viewer-counter-height);
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.9rem 1rem;
  text-align: center;
}

.viewer-counter-value--solo {
  align-items: center;
}

.viewer-counter-value__label {
  color: rgba(203, 213, 225, 0.74);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.viewer-counter-value__amount {
  margin-top: 0.28rem;
  color: rgba(248, 250, 252, 0.98);
  font-size: clamp(1.6rem, 5vw, 2.35rem);
  font-weight: 900;
  line-height: 1;
}

.viewer-counter-value--solo .viewer-counter-value__amount {
  margin-top: 0;
}

.viewer-meta-grid {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.viewer-meta-card {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.85rem 0.9rem;
}

.viewer-meta-card--full {
  grid-column: 1 / -1;
}

.viewer-meta-card__label {
  color: rgba(203, 213, 225, 0.68);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.viewer-meta-card__value {
  margin-top: 0.35rem;
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
}

.viewer-meta-card--multiline .viewer-meta-card__value {
  white-space: pre-line;
}

.viewer-effect-card {
  position: relative;
  padding-bottom: 3.45rem;
}

.viewer-effect-card__actions {
  position: absolute;
  right: 0.85rem;
  bottom: 0.85rem;
  display: flex;
  gap: 0.45rem;
}

.viewer-effect-card__flag-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  box-shadow:
    0 10px 18px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: transform 0.18s ease, opacity 0.18s ease, border-color 0.18s ease;
}

.viewer-effect-card__flag-btn:hover {
  transform: translateY(-1px);
}

.viewer-effect-card__flag-btn--inactive {
  opacity: 0.6;
}

.viewer-effect-card__flag-btn:not(.viewer-effect-card__flag-btn--inactive) {
  border-color: rgba(255, 183, 124, 0.42);
}

.viewer-effect-card__flag {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 999px;
  object-fit: cover;
}

.viewer-float-menu-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
  display: flex;
  justify-content: center;
  padding: 0 0.8rem 0.9rem;
  pointer-events: none;
}

.viewer-float-menu {
  pointer-events: auto;
  width: min(100%, 520px);
  display: grid;
  grid-template-columns: 72px 1fr 72px;
  align-items: center;
  gap: 0.65rem;
  border-radius: 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(12, 20, 33, 0.84);
  box-shadow:
    0 20px 44px rgba(0, 0, 0, 0.58),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(18px);
  padding: 0.7rem;
}

.viewer-float-menu__btn {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 3.2rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(248, 250, 252, 0.96);
  transition: transform 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}

.viewer-float-menu__btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 183, 124, 0.34);
}

.viewer-float-menu__btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.viewer-float-menu__icon {
  width: 1.9rem;
  height: 1.9rem;
}

.viewer-float-menu__index {
  min-width: 0;
  text-align: center;
  color: rgba(248, 250, 252, 0.94);
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.05em;
}

@media (min-width: 900px) {
  .viewer-scroll {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-bottom: 8rem;
  }

  .viewer-section {
    padding: 1.1rem 1.15rem;
  }
}

@media (max-width: 640px) {
  .viewer-scroll {
    padding: 0.8rem 0.8rem 7.2rem;
  }

  .viewer-head {
    padding-top: 3.1rem;
  }

  .viewer-image-panel,
  .viewer-section {
    border-radius: 1.55rem;
  }

  .viewer-counter-panel {
    gap: 0.65rem;
    grid-template-columns: 64px 1fr 64px;
  }

  .viewer-counter-panel--readonly {
    grid-template-columns: minmax(0, 1fr);
  }

  .viewer-counter-btn {
    width: 100%;
    height: var(--viewer-counter-height);
    border-radius: 1rem;
  }
}
</style>
