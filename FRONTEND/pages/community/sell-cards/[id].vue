<script setup>
import {
  fetchLoggedUserSellListingById,
  fetchOfferListingsBySellListingId,
  deleteSellListing,
} from "@/api/sellListings";

const snackbar = useSnackbar();
const router = useRouter();
const offerListings = ref([]);
const isLoadingOfferListings = ref(false);
const currentListingId = ref(null);
const isClosingListing = ref(false);

function handleListingUpdated(listing) {
  currentListingId.value = listing?.id ?? null;
  offerListings.value = [];

  if (!currentListingId.value) return;
  loadOfferListings(currentListingId.value);
}

async function loadOfferListings(sellListingId) {
  isLoadingOfferListings.value = true;

  try {
    offerListings.value = await fetchOfferListingsBySellListingId(sellListingId);
  } catch (error) {
    offerListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle proposte", "error");
  } finally {
    isLoadingOfferListings.value = false;
  }
}

async function handleCloseListing() {
  if (isClosingListing.value) return;
  if (!currentListingId.value) {
    snackbar.addMessage("Vendita non disponibile per la chiusura", "warning");
    return;
  }

  isClosingListing.value = true;

  try {
    await deleteSellListing(currentListingId.value);
    snackbar.addMessage("Vendita chiusa correttamente", "success");
    await router.push("/community/sell-cards");
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante la chiusura della vendita", "error");
  } finally {
    isClosingListing.value = false;
  }
}
</script>

<template>
  <section class="relative h-full">
    <CommunitySellListingOffersDetails
      :fetch-listing-by-id="fetchLoggedUserSellListingById"
      chat-path-base="/community/sell-cards/current-sells"
      offer-amount-label="Offre"
      :proposals="offerListings"
      :is-loading-proposals="isLoadingOfferListings"
      @listing-updated="handleListingUpdated"
    />

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <div class="close-sale-dialog">
          <div class="close-sale-button-shell">
            <DialogsGeneric
              accept-label="Procedi comunque"
              accept-color="error"
              :disabled="isClosingListing"
              @confirm="handleCloseListing"
            >
              <template #button>
                <ButtonMenu
                  icon="mdi:close-box-outline"
                  label="Chiudi Vendita"
                  transition
                  :delay="120"
                  :disabled="isClosingListing"
                  :icon-color="'red'"
                  class="close-sale-button"
                />
              </template>

              <template #title>Sei sicuro di voler chiudere la vendita?</template>

              <template #content>
                <p class="close-sale-content">
                  Chiudendo la vendita manterrai salvate le vendite concluse, ma eliminerai tutte le offerte sospese e rifiutate.
                </p>
              </template>
            </DialogsGeneric>
          </div>
        </div>
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.close-sale-dialog {
  width: 100%;
}

.close-sale-dialog ::v-deep #dialog-generic .v-card {
  background: linear-gradient(135deg, #2c050e, #140207);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 22px 45px rgba(0, 0, 0, 0.8);
}

.close-sale-dialog ::v-deep #dialog-generic h5 {
  border-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, #5c1320, #2c050e);
  color: #ffecec;
}

.close-sale-dialog ::v-deep #dialog-generic .v-card-text {
  color: rgba(255, 255, 255, 0.92);
}

.close-sale-dialog ::v-deep #dialog-generic .close-sale-content {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.close-sale-dialog ::v-deep #dialog-generic .v-card-actions {
  border-color: rgba(255, 255, 255, 0.08);
  background-color: rgba(0, 0, 0, 0.3);
}

.close-sale-dialog ::v-deep #dialog-generic .generic-btn--accept {
  background: linear-gradient(135deg, #a3131a, #7a0c11);
  color: #ffecec !important;
}

.close-sale-dialog ::v-deep #dialog-generic .generic-btn--cancel {
  color: rgba(255, 255, 255, 0.85) !important;
}

.close-sale-button-shell {
  width: 100%;
  display: flex;
  justify-content: center;
}

.close-sale-button ::v-deep button > span svg {
  width: 1.35rem !important;
  height: 1.35rem !important;
}
</style>
