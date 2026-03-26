<script setup>
import { fetchCardCountInCollection } from "@/api/collection";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useCardSort } from "@/composables/useCardSort";

const props = defineProps({
  cards: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  sortKey: {
    type: String,
    default: "publish_date",
  },
  sortDir: {
    type: String,
    default: "desc",
  },
  errorMessage: {
    type: String,
    default: "",
  },
  selectedCardId: {
    type: [String, Number],
    default: null,
  },
  selectedCard: {
    type: Object,
    default: null,
  },
  availableCopies: {
    type: Number,
    default: 0,
  },
  activeListedCopies: {
    type: Number,
    default: 0,
  },
  invalid: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "retry"]);

const snackbar = useSnackbar();
const userAuth = useUserAuth();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();
const sort = useCardSort("publish_date", "desc");

const gridRef = ref(null);
const gridKey = ref(0);
const openFilter = ref(false);
const filteredCards = ref([]);
const visibleCards = ref([]);
const viewerOpen = ref(false);
const viewerIndex = ref(0);

const selectedCardKey = computed(() => String(props.selectedCardId ?? props.selectedCard?.id ?? ""));
const sortedCards = computed(() => sort.applySort(filteredCards.value));
const showSelectedCardOnly = computed(() => Boolean(props.selectedCard));
const selectedCardTotalCopies = computed(() => {
  const parsedCopies = Number(props.selectedCard?.copiesInCollection);
  return Number.isInteger(parsedCopies) && parsedCopies > 0 ? parsedCopies : 0;
});
const selectedCardHelperMessage = computed(() => {
  if (!showSelectedCardOnly.value) return "";

  if (props.availableCopies <= 0) {
    if (selectedCardTotalCopies.value > 0) {
      return `Tutte le ${selectedCardTotalCopies.value} copie di questa carta sono gia in vendite attive. Usa "Cambia carta" per sceglierne un'altra.`;
    }

    return "Questa carta non ha copie disponibili da mettere in vendita.";
  }

  if (props.activeListedCopies > 0) {
    return `Hai ancora ${props.availableCopies} copie disponibili per una nuova vendita. ${props.activeListedCopies} copie sono gia in annunci attivi.`;
  }

  return `Hai ${props.availableCopies} copie disponibili per una nuova vendita.`;
});
const selectedCardHelperClass = computed(() => ({
  "sell-card-selector__helper--warning": props.availableCopies <= 0,
}));
const gridClass = computed(() => {
  let classes = "grid gap-3 pb-4 ";
  if (isMobile.value) classes += "grid-cols-2 ";
  if (isTablet.value) classes += "grid-cols-4 ";
  if (isDesktop.value) classes += "grid-cols-6 ";
  return classes.trim();
});
const hasCards = computed(() => sortedCards.value.length > 0);

async function loadCountsForChunk(chunk) {
  const userId = userAuth.userLogged?.id;
  if (!userId) return;

  await Promise.all(
    chunk.map(async (card) => {
      if (card?._countLoaded) return;

      try {
        const copies = await fetchCardCountInCollection(userId, card.id);
        card.count = copies;
      } catch (error) {
        card.count = 0;
      }

      card._countLoaded = true;
    }),
  );
}

function handleFilteredUpdate(nextFilteredCards) {
  filteredCards.value = [...nextFilteredCards];
  visibleCards.value = [];
  gridKey.value += 1;

  const scroller = gridRef.value?.scrollEl ?? gridRef.value?.containerEl;
  if (scroller?.scrollTo) {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
  } else if (scroller) {
    scroller.scrollTop = 0;
  }
}

function openFilterPanel() {
  openFilter.value = true;
}

function setSort(key, dir) {
  sort.setSort(key, dir);
}

function openViewerFromItem(card) {
  const index = sortedCards.value.findIndex((item) => item.id === card.id);
  if (index < 0) return;
  viewerIndex.value = index;
  viewerOpen.value = true;
}

async function handleCardSelection(card) {
  try {
    const userId = userAuth.userLogged?.id;
    if (!userId || !card?.id) return;

    let copiesInCollection = Number(card.count);
    if (!Number.isInteger(copiesInCollection) || copiesInCollection < 0) {
      copiesInCollection = await fetchCardCountInCollection(userId, card.id);
    }

    emit("select", {
      card,
      copiesInCollection,
    });
  } catch (error) {
    snackbar.addMessage("Errore durante la selezione carta", "error", error?.message);
  }
}

watch(
  () => props.cards,
  (nextCards) => {
    filteredCards.value = Array.isArray(nextCards) ? [...nextCards] : [];
    visibleCards.value = [];
    gridKey.value += 1;
  },
  { immediate: true },
);

watch(
  () => [props.sortKey, props.sortDir],
  ([nextKey, nextDir]) => {
    sort.setSort(nextKey || "publish_date", nextDir || "desc");
  },
  { immediate: true },
);

watch(
  visibleCards,
  async () => {
    await loadCountsForChunk(visibleCards.value);
  },
  { flush: "post" },
);

watch(openFilter, (nextValue) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("overflow-hidden", nextValue);
});

onBeforeUnmount(() => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("overflow-hidden");
});

defineExpose({
  openFilterPanel,
  setSort,
});
</script>

<template>
  <div class="sell-card-selector">
    <div class="space-y-3">
      <div class="space-y-2">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ffb77c]">Step 1</p>
        <h1 class="text-[clamp(2rem,6vw,2.8rem)] font-black leading-none text-slate-50">Scegli la carta da vendere</h1>
        <p class="max-w-xl text-[0.96rem] leading-7 text-slate-300/80">
          Peschiamo solo dalla tua collezione: seleziona la carta giusta e poi definiremo quantità, prezzo e condizione.
        </p>
      </div>

      <div
        v-if="showSelectedCardOnly"
        class="sell-card-selector__selected"
      >
        <p class="sell-card-selector__selected-eyebrow">Carta selezionata</p>
        <CommunitySellDraftCardSummary :card="selectedCard" @open="openViewerFromItem" />
      </div>

      <div v-if="!showSelectedCardOnly" class="sell-card-selector__counter">
        <span>{{ sortedCards.length }} carte visibili</span>
        <span>{{ props.cards.length }} totali in collezione</span>
      </div>
    </div>

    <div v-if="loading && !showSelectedCardOnly" class="sell-card-selector__state">
      <p>Carico la tua collezione...</p>
      <div class="loader mx-auto mt-3" style="width: 28px" />
    </div>

    <div v-else-if="errorMessage && !showSelectedCardOnly" class="sell-card-selector__state sell-card-selector__state--error">
      <p>{{ errorMessage }}</p>
      <v-btn
        color="orange"
        variant="flat"
        class="sell-card-selector__retry"
        @click="$emit('retry')"
      >
        Riprova
      </v-btn>
    </div>

    <div v-else-if="!hasCards && !showSelectedCardOnly" class="sell-card-selector__state">
      <p>Non hai ancora carte disponibili in collezione da mettere in vendita.</p>
    </div>

    <div v-else-if="showSelectedCardOnly" class="sell-card-selector__selected-shell">
      <p
        class="sell-card-selector__helper"
        :class="selectedCardHelperClass"
      >
        {{ selectedCardHelperMessage }}
      </p>
    </div>

    <div v-else class="sell-card-selector__list-shell">
      <InfiniteGrid
        ref="gridRef"
        :key="gridKey"
        :items="sortedCards"
        container-class="pb-6"
        :grid-class="gridClass"
        scroll-root-mode="nearest-parent"
        @update:visible="visibleCards = $event"
      >
        <template #default="{ item }">
          <div
            class="sell-card-selector__item"
            :class="{ 'sell-card-selector__item--selected': String(item.id) === selectedCardKey }"
          >
            <Card
              :card="item"
              :show-price="true"
              :show-count="true"
              :card-count="item.count"
              :choose-card="true"
              @choose-card="handleCardSelection(item)"
              @open="openViewerFromItem"
            />

            <div
              v-if="String(item.id) === selectedCardKey"
              class="sell-card-selector__selected-badge"
            >
              Selezionata
            </div>
          </div>
        </template>
      </InfiniteGrid>
    </div>

    <p
      v-if="invalid && !showSelectedCardOnly"
      class="sell-card-selector__invalid"
    >
      Seleziona una carta per continuare.
    </p>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="props.cards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="sortedCards"
      @close="viewerOpen = false"
    />
  </div>
</template>

<style scoped>
.sell-card-selector {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 1rem;
}

.sell-card-selector__selected {
  border: 1px solid rgba(255, 183, 124, 0.28);
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top right, rgba(255, 122, 24, 0.14), transparent 34%),
    linear-gradient(145deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 22px 36px rgba(0, 0, 0, 0.26);
  padding: 0.9rem;
}

.sell-card-selector__selected-eyebrow {
  margin: 0 0 0.7rem;
  color: #ffb77c;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sell-card-selector__counter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: rgba(203, 213, 225, 0.74);
  font-size: 0.78rem;
  font-weight: 700;
}

.sell-card-selector__selected-shell {
  display: grid;
  gap: 0.75rem;
}

.sell-card-selector__helper,
.sell-card-selector__invalid {
  margin: 0;
}

.sell-card-selector__helper {
  color: rgba(203, 213, 225, 0.78);
  font-size: 0.82rem;
  line-height: 1.5;
}

.sell-card-selector__helper--warning {
  color: rgba(254, 202, 202, 0.96);
  font-weight: 700;
}

.sell-card-selector__invalid {
  color: rgba(254, 202, 202, 0.96);
  font-size: 0.78rem;
  font-weight: 800;
}

.sell-card-selector__state {
  display: grid;
  place-items: center;
  gap: 0.75rem;
  min-height: 14rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.7rem;
  background: linear-gradient(145deg, rgba(14, 20, 34, 0.94), rgba(6, 10, 18, 0.98));
  color: rgba(226, 232, 240, 0.84);
  font-size: 0.95rem;
  text-align: center;
  padding: 1.4rem;
}

.sell-card-selector__state--error {
  border-color: rgba(252, 165, 165, 0.26);
}

.sell-card-selector__retry {
  min-height: 2.8rem !important;
  border-radius: 0.95rem !important;
  color: #fff7f0 !important;
  font-weight: 800 !important;
  text-transform: none !important;
}

.sell-card-selector__list-shell {
  min-height: 18rem;
}

.sell-card-selector__item {
  position: relative;
  border-radius: 1rem;
  padding: 0.2rem;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.sell-card-selector__item--selected {
  background: rgba(255, 122, 24, 0.08);
  box-shadow:
    0 0 0 1px rgba(255, 178, 125, 0.26),
    0 14px 22px rgba(255, 122, 24, 0.16);
}

.sell-card-selector__selected-badge {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  z-index: 10;
  transform: translateX(-50%);
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 999px;
  background: rgba(22, 163, 74, 0.18);
  color: rgba(220, 252, 231, 0.96);
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.24rem 0.55rem;
}
</style>
