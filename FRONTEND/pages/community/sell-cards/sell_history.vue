<script setup>
import { fetchAcceptedOfferListingsForLoggedUser } from "@/api/sellListings";

const snackbar = useSnackbar();

const acceptedOfferListings = ref([]);
const isLoading = ref(true);

const hasOfferHistory = computed(() => acceptedOfferListings.value.length > 0);
const viewerCards = computed(() => {
  const uniqueCards = [];
  const seenCardIds = new Set();

  acceptedOfferListings.value.forEach((offerListing) => {
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

async function loadAcceptedOfferHistory() {
  isLoading.value = true;

  try {
    acceptedOfferListings.value = await fetchAcceptedOfferListingsForLoggedUser();
  } catch (error) {
    acceptedOfferListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero dello storico vendite", "error");
  } finally {
    isLoading.value = false;
  }
}

definePageMeta({
  middleware: "auth",
});

onMounted(loadAcceptedOfferHistory);

function handleOpenCard(card) {
  openViewer(card);
}
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Storico" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1">
      <p v-if="isLoading" class="sell-state-message">Caricamento storico vendite...</p>
      <p v-else-if="!hasOfferHistory" class="sell-state-message">Nessuna offerta accettata al momento</p>

      <div v-else class="space-y-2 pb-2">
        <CommunityOfferListingRow
          v-for="offerListing in acceptedOfferListings"
          :key="offerListing.id"
          :offer-listing="offerListing"
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

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="viewerCards"
      @close="viewerOpen = false"
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
