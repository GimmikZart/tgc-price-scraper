<script setup>
import { fetchLoggedUserPendingPurchaseOfferListings } from "@/api/sellListings";

const BUY_CARDS_BASE_PATH = "/community/buy-cards";
const BUY_CARDS_MAP_PATH = `${BUY_CARDS_BASE_PATH}/map`;
const BUY_PENDING_PURCHASES_PATH = `${BUY_CARDS_BASE_PATH}/current_purchases`;
const BUY_PURCHASE_HISTORY_PATH = `${BUY_CARDS_BASE_PATH}/purchase_history`;

const sectionTabs = Object.freeze([
  { label: "Lista", path: BUY_CARDS_BASE_PATH },
  { label: "Mappa", path: BUY_CARDS_MAP_PATH },
  { label: "In corso", path: BUY_PENDING_PURCHASES_PATH },
  { label: "Storico", path: BUY_PURCHASE_HISTORY_PATH },
]);

const snackbar = useSnackbar();

const offerListings = ref([]);
const isLoading = ref(true);

const hasOfferListings = computed(() => offerListings.value.length > 0);
const viewerCards = computed(() => {
  const uniqueCards = [];
  const seenCardIds = new Set();

  offerListings.value.forEach((offerListing) => {
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

async function loadPendingPurchaseOfferListings() {
  isLoading.value = true;

  try {
    offerListings.value = await fetchLoggedUserPendingPurchaseOfferListings();
  } catch (error) {
    offerListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero degli acquisti in corso", "error");
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadPendingPurchaseOfferListings);

function handleOpenCard(card) {
  openViewer(card);
}
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Acquisti in corso" fixed />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <div class="space-y-4 pb-2">
        <TabsRouteTabs :tabs="sectionTabs" />

        <p v-if="isLoading" class="purchase-state-message">Caricamento acquisti in corso...</p>
        <p v-else-if="!hasOfferListings" class="purchase-state-message">Nessuna offerta in corso</p>

        <div v-else class="space-y-2">
          <CommunityOfferListingRow
            v-for="offerListing in offerListings"
            :key="offerListing.id"
            :offer-listing="offerListing"
            identity-role="seller"
            offer-amount-label="Offro"
            chat-path-base="/community/offers"
          >
            <template v-if="offerListing.sellListingCard" #left>
              <Card
                :card="offerListing.sellListingCard"
                class="offer-history-side-card"
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
.purchase-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.offer-history-side-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.72rem;
  flex: 0 0 auto;
  aspect-ratio: 5/7;
  height: 100% !important;
  min-width: 3rem;
}

.offer-history-side-card :deep(.card-shell.card-surface) {
  position: relative;
  width: 100%;
  height: 100% !important;
  min-height: 0;
}

.offer-history-side-card :deep(.card-image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  object-fit: cover;
}

.offer-history-side-card :deep(.image-skeleton) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100% !important;
  aspect-ratio: auto;
}
</style>
