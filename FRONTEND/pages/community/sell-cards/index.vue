<script setup>
import { fetchLoggedUserSellListings } from "@/api/sellListings";

const snackbar = useSnackbar();
const route = useRoute();
const router = useRouter();

const FILTER_QUERY_KEY = "open-filter";

const sellListings = ref([]);
const isLoading = ref(true);
const openFilter = ref(false);
const filteredCards = ref([]);

const cardsAvailableForFilter = computed(() => {
  const cardsMap = new Map();

  sellListings.value.forEach((listing) => {
    const card = listing?.card;
    if (!card?.id || cardsMap.has(card.id)) return;
    cardsMap.set(card.id, card);
  });

  return [...cardsMap.values()];
});

const filteredCardIds = computed(() => {
  const ids = new Set();

  filteredCards.value.forEach((card) => {
    if (!card?.id) return;
    ids.add(card.id);
  });

  return ids;
});

const visibleSellListings = computed(() => {
  if (!filteredCards.value.length) return sellListings.value;

  return sellListings.value.filter((listing) => {
    const cardId = listing?.card?.id;
    return cardId && filteredCardIds.value.has(cardId);
  });
});

const hasListings = computed(() => visibleSellListings.value.length > 0);
const hasAnyListings = computed(() => sellListings.value.length > 0);

async function loadSellListings() {
  isLoading.value = true;

  try {
    sellListings.value = await fetchLoggedUserSellListings();
  } catch (error) {
    sellListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle vendite", "error");
  } finally {
    isLoading.value = false;
  }
}

function handleFilteredUpdate(nextFilteredCards) {
  filteredCards.value = Array.isArray(nextFilteredCards) ? [...nextFilteredCards] : [];
}

function closeFilter() {
  openFilter.value = false;
}

async function clearFilterQueryParam() {
  if (!(FILTER_QUERY_KEY in route.query)) return;

  const nextQuery = { ...route.query };
  delete nextQuery[FILTER_QUERY_KEY];

  await router.replace({ query: nextQuery });
}

watch(
  () => route.query[FILTER_QUERY_KEY],
  (queryValue) => {
    if (queryValue === undefined) return;
    openFilter.value = true;
    void clearFilterQueryParam();
  },
  { immediate: true },
);

watch(openFilter, (newValue) => {
  document.documentElement.classList.toggle("overflow-hidden", newValue);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("overflow-hidden");
});

onMounted(loadSellListings);
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Vendite in Corso" fixed />

    <div class="min-h-0 flex-1 px-3 pb-24 pt-1">
      <p v-if="isLoading" class="sell-state-message">Caricamento vendite in corso...</p>
      <p v-else-if="!hasAnyListings" class="sell-state-message">Nessuna carta attualmente in vendita</p>
      <p v-else-if="!hasListings" class="sell-state-message">Nessuna carta trovata con i filtri selezionati</p>

      <div v-else class="space-y-3 pb-2">
        <CommunitySellListingCard
          v-for="listing in visibleSellListings"
          :key="listing.id"
          :listing="listing"
          show-proposals-in-header-slot
          :show-seller-identity="false"
        />
      </div>
    </div>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="cardsAvailableForFilter"
      @update:filtered="handleFilteredUpdate"
      @close="closeFilter"
    />
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
