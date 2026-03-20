<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  fetchCompletedSaleOfferListingsForLoggedUser,
  fetchLoggedUserCompletedPurchaseOfferListings,
} from "@/api/sellListings";
import {
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";

const PURCHASES_TAB = "purchases";
const SALES_TAB = "sales";
const ACTIVITY_TAB_QUERY_KEY = "tab";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();

const completedPurchaseOfferListings = ref([]);
const completedSaleOfferListings = ref([]);
const isLoadingPurchases = ref(true);
const isLoadingSales = ref(true);
const activeTab = ref(PURCHASES_TAB);

const activityTabs = computed(() => ([
  { label: "Acquisti", value: PURCHASES_TAB },
  { label: "Vendite", value: SALES_TAB },
]));

const sortedCompletedPurchaseOfferListings = computed(() => {
  return [...completedPurchaseOfferListings.value].sort((leftOfferListing, rightOfferListing) => {
    return getOfferListingCompletionTimestamp(rightOfferListing)
      - getOfferListingCompletionTimestamp(leftOfferListing);
  });
});

const sortedCompletedSaleOfferListings = computed(() => {
  return [...completedSaleOfferListings.value].sort((leftOfferListing, rightOfferListing) => {
    return getOfferListingCompletionTimestamp(rightOfferListing)
      - getOfferListingCompletionTimestamp(leftOfferListing);
  });
});

const activeOfferListings = computed(() => {
  return activeTab.value === SALES_TAB
    ? sortedCompletedSaleOfferListings.value
    : sortedCompletedPurchaseOfferListings.value;
});

const isActiveTabLoading = computed(() => {
  return activeTab.value === SALES_TAB ? isLoadingSales.value : isLoadingPurchases.value;
});

const activeEmptyMessage = computed(() => {
  return activeTab.value === SALES_TAB
    ? "Nessuna vendita conclusa al momento"
    : "Nessun acquisto concluso al momento";
});

const viewerCards = computed(() => {
  const uniqueCards = [];
  const seenCardIds = new Set();

  activeOfferListings.value.forEach((offerListing) => {
    const card = offerListing?.sellListingCard ?? null;
    if (!card) return;

    const cardId = card?.id;
    if (cardId != null && seenCardIds.has(cardId)) return;
    if (cardId != null) seenCardIds.add(cardId);
    uniqueCards.push(card);
  });

  return uniqueCards;
});

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerCards);

function parseActivityTab(value) {
  const normalizedValue = Array.isArray(value)
    ? String(value[0] ?? "")
    : String(value ?? "");

  if (["sales", "sell", "vendite"].includes(normalizedValue)) return SALES_TAB;
  return PURCHASES_TAB;
}

function getOfferListingCompletionTimestamp(offerListing) {
  const rawValue = offerListing?.received_at ?? offerListing?.delivered_at ?? offerListing?.updated_at;
  const timestamp = new Date(rawValue ?? 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function loadCompletedPurchaseOfferListings() {
  isLoadingPurchases.value = true;

  try {
    completedPurchaseOfferListings.value = await fetchLoggedUserCompletedPurchaseOfferListings();
  } catch (error) {
    completedPurchaseOfferListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero degli acquisti conclusi", "error");
  } finally {
    isLoadingPurchases.value = false;
  }
}

async function loadCompletedSaleOfferListings() {
  isLoadingSales.value = true;

  try {
    completedSaleOfferListings.value = await fetchCompletedSaleOfferListingsForLoggedUser();
  } catch (error) {
    completedSaleOfferListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle vendite concluse", "error");
  } finally {
    isLoadingSales.value = false;
  }
}

function handleOpenCard(card) {
  openViewer(card);
}

function handleTabChange(nextTab) {
  const normalizedTab = parseActivityTab(nextTab);
  if (normalizedTab === activeTab.value) return;

  activeTab.value = normalizedTab;

  const nextQuery = { ...route.query };

  if (normalizedTab === PURCHASES_TAB) {
    delete nextQuery[ACTIVITY_TAB_QUERY_KEY];
  } else {
    nextQuery[ACTIVITY_TAB_QUERY_KEY] = normalizedTab;
  }

  router.replace({ query: nextQuery });
}

definePageMeta({
  middleware: "auth",
});

watch(
  () => route.query[ACTIVITY_TAB_QUERY_KEY],
  (value) => {
    activeTab.value = parseActivityTab(value);
  },
  { immediate: true },
);

onMounted(() => {
  void Promise.all([
    loadCompletedPurchaseOfferListings(),
    loadCompletedSaleOfferListings(),
  ]);
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Attivita" fixed>
      <template #info>
        <BaseTabs
          :tabs="activityTabs"
          :active="activeTab"
          :active-class="ORANGE_ACTIVE_TAB_CLASS"
          :inactive-class="GHOST_INACTIVE_TAB_CLASS"
          @change="handleTabChange"
        />
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <div class="space-y-4 pb-2">
        <p v-if="isActiveTabLoading" class="activity-state-message">Caricamento attivita concluse...</p>
        <p v-else-if="activeOfferListings.length === 0" class="activity-state-message">{{ activeEmptyMessage }}</p>

        <div v-else class="space-y-2">
          <CommunityOfferListingRow
            v-for="offerListing in activeOfferListings"
            :key="offerListing.id"
            :offer-listing="offerListing"
            :identity-role="activeTab === SALES_TAB ? 'offerer' : 'seller'"
            :offer-amount-label="activeTab === SALES_TAB ? 'Incassato' : 'Pagato'"
            show-completion-date
          >
            <template v-if="offerListing.sellListingCard" #left>
              <Card
                :card="offerListing.sellListingCard"
                class="offer-activity-side-card"
                @open="handleOpenCard"
              />
            </template>
          </CommunityOfferListingRow>
        </div>
      </div>
    </div>

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerCards"
      @close="viewerOpen = false"
    />
  </section>
</template>

<style scoped>
.activity-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.offer-activity-side-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.72rem;
  flex: 0 0 auto;
  aspect-ratio: 5/7;
  height: 100% !important;
  min-width: 3rem;
}

.offer-activity-side-card :deep(.card-shell.card-surface) {
  position: relative;
  width: 100%;
  height: 100% !important;
  min-height: 0;
}

.offer-activity-side-card :deep(.card-image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  object-fit: cover;
}

.offer-activity-side-card :deep(.image-skeleton) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  aspect-ratio: auto;
}
</style>
