<script setup>
import { fetchLoggedUserPurchaseHistoryOfferListings } from "@/api/sellListings";

const snackbar = useSnackbar();

const offerListings = ref([]);
const isLoading = ref(true);

const hasOfferListings = computed(() => offerListings.value.length > 0);

async function loadPurchaseHistory() {
  isLoading.value = true;

  try {
    offerListings.value = await fetchLoggedUserPurchaseHistoryOfferListings();
  } catch (error) {
    offerListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero dello storico acquisti", "error");
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadPurchaseHistory);
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Storico" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <p v-if="isLoading" class="purchase-state-message">Caricamento storico acquisti in corso...</p>
      <p v-else-if="!hasOfferListings" class="purchase-state-message">Nessun acquisto disponibile</p>

      <div v-else class="space-y-2 pb-2">
        <CommunityOfferListingRow
          v-for="offerListing in offerListings"
          :key="offerListing.id"
          :offer-listing="offerListing"
          chat-path-base="/community/offers"
        >
          <template v-if="offerListing.sellListingCard" #left>
            <Card
              :card="offerListing.sellListingCard"
              class="offer-history-side-card"
              disable-opening
            />
          </template>
        </CommunityOfferListingRow>
      </div>
    </div>
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
