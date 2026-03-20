<script setup>
import { fetchActiveSellListings } from "@/api/sellListings";

const snackbar = useSnackbar();

const sellListings = ref([]);
const isLoading = ref(true);
const openFilter = ref(false);
const filteredCardIds = ref(null);
const priceSortDirection = ref("desc");
const { sectionTabs, refreshPendingPurchaseOffersCount } = useBuyCardsTabs();

const listingCards = computed(() => {
  const cardsById = new Map();

  sellListings.value.forEach((listing) => {
    const card = listing?.card;
    const cardId = card?.id;

    if (cardId == null || cardsById.has(cardId)) return;
    cardsById.set(cardId, card);
  });

  return [...cardsById.values()];
});

const visibleSellListings = computed(() => {
  if (!(filteredCardIds.value instanceof Set)) return sellListings.value;

  return sellListings.value.filter((listing) => {
    const cardId = listing?.card?.id;
    return cardId != null && filteredCardIds.value.has(cardId);
  });
});
const isPriceSortAscending = computed(() => priceSortDirection.value === "asc");
const priceSortButtonLabel = computed(() => (isPriceSortAscending.value ? "Prezzo ASC" : "Prezzo DESC"));
const priceSortButtonIcon = computed(() => (
  isPriceSortAscending.value
    ? "mdi:sort-numeric-ascending"
    : "mdi:sort-numeric-descending"
));
const sortedVisibleSellListings = computed(() => {
  const sortedListings = [...visibleSellListings.value];

  sortedListings.sort((listingA, listingB) => {
    const parsedPriceA = Number(listingA?.price);
    const parsedPriceB = Number(listingB?.price);
    const priceA = Number.isFinite(parsedPriceA)
      ? parsedPriceA
      : (isPriceSortAscending.value ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const priceB = Number.isFinite(parsedPriceB)
      ? parsedPriceB
      : (isPriceSortAscending.value ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

    return isPriceSortAscending.value ? priceA - priceB : priceB - priceA;
  });

  return sortedListings;
});

const hasListings = computed(() => sellListings.value.length > 0);
const hasVisibleListings = computed(() => sortedVisibleSellListings.value.length > 0);

const isFilterActive = computed(() => {
  if (!(filteredCardIds.value instanceof Set)) return false;

  const availableCardIds = listingCards.value
    .map((card) => card?.id)
    .filter((cardId) => cardId != null);

  if (filteredCardIds.value.size !== availableCardIds.length) return true;
  return availableCardIds.some((cardId) => !filteredCardIds.value.has(cardId));
});

watch(openFilter, (isOpen) => {
  document.documentElement.classList.toggle("overflow-hidden", isOpen);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("overflow-hidden");
});

function handleFilteredCardsUpdate(filteredCards = []) {
  const nextFilteredCardIds = new Set();

  filteredCards.forEach((card) => {
    const cardId = card?.id;
    if (cardId == null) return;
    nextFilteredCardIds.add(cardId);
  });

  filteredCardIds.value = nextFilteredCardIds;
}

function togglePriceSortDirection() {
  priceSortDirection.value = isPriceSortAscending.value ? "desc" : "asc";
}

async function loadSellListings() {
  isLoading.value = true;
  filteredCardIds.value = null;

  try {
    sellListings.value = await fetchActiveSellListings({ excludeLoggedUser: true });
  } catch (error) {
    sellListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle vendite", "error");
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void refreshPendingPurchaseOffersCount();
  void loadSellListings();
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Compra Carte" fixed>
      <template #info>
        <TabsRouteTabs :tabs="sectionTabs" />
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <div class="space-y-4 pb-2">
        <p v-if="isLoading" class="sell-state-message">Caricamento vendite in corso...</p>
        <p v-else-if="!hasListings" class="sell-state-message">Nessuna carta attualmente in vendita</p>
        <p v-else-if="!hasVisibleListings" class="sell-state-message">La ricerca non ha prodotto risultati</p>

        <div v-else class="space-y-3">
          <CommunitySellListingCard
            v-for="listing in sortedVisibleSellListings"
            :key="listing.id"
            :listing="listing"
            details-path-base="/community/offers"
            show-proposals-in-header-slot
            show-location-map-toggle
          />
        </div>
      </div>
    </div>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="listingCards"
      @update:filtered="handleFilteredCardsUpdate"
      @close="openFilter = false"
    />

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonMenu
          :icon="priceSortButtonIcon"
          :label="priceSortButtonLabel"
          transition
          :delay="100"
          icon-color="orange"
          @click="togglePriceSortDirection"
        />

        <ButtonMenu
          icon="material-symbols:search-rounded"
          label="Filtra"
          transition
          :delay="100"
          :icon-color="isFilterActive ? 'orange' : null"
          @click="openFilter = true"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.sell-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
