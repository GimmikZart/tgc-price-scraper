<script setup>
import {
  createOfferListing,
  fetchActiveSellListingById,
  fetchOfferListingsBySellListingId,
} from "@/api/sellListings";

const userAuth = useUserAuth();
const snackbar = useSnackbar();

const listing = ref(null);
const offerQuantity = ref(1);
const offeredPrice = ref("");
const offerListings = ref([]);
const isLoadingOfferListings = ref(false);
const isSubmittingProposal = ref(false);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);

const maxOfferQuantity = computed(() => {
  const parsedQuantity = Number(listing.value?.quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return 1;
  return parsedQuantity;
});

const offerQuantityModel = computed({
  get() {
    const parsedQuantity = Number(offerQuantity.value);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return 1;
    return Math.min(parsedQuantity, maxOfferQuantity.value);
  },
  set(newValue) {
    const parsedQuantity = Number(newValue);
    const normalizedQuantity = !Number.isInteger(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
    offerQuantity.value = Math.min(normalizedQuantity, maxOfferQuantity.value);
  },
});

const isOfferEnabled = computed(() => {
  const sellerId = listing.value?.seller_uuid ?? null;
  if (!sellerId || !currentUserId.value) return false;
  return String(currentUserId.value) !== String(sellerId);
});

const recommendedOfferValue = computed(() => {
  const parsedUnitPrice = Number(listing.value?.price);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) return null;
  const parsedQuantity = Number(offerQuantityModel.value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return null;
  return (parsedUnitPrice * parsedQuantity).toFixed(2);
});

const offerPlaceholder = computed(() => {
  if (!recommendedOfferValue.value) return "Consigliato: -";
  return `Consigliato: ${recommendedOfferValue.value}`;
});

function handleListingUpdated(nextListing) {
  listing.value = nextListing ?? null;
  offerListings.value = [];

  if (!listing.value?.id) return;
  loadOfferListings(listing.value.id);
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

async function handleSubmitProposal() {
  if (isSubmittingProposal.value) return;
  if (!listing.value?.id) return;
  if (!isOfferEnabled.value) return;

  const parsedOffer = Number(offeredPrice.value);
  if (!Number.isFinite(parsedOffer) || parsedOffer <= 0) {
    snackbar.addMessage("Inserisci un importo valido per la proposta", "error");
    return;
  }

  const parsedQuantity = Number(offerQuantityModel.value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    snackbar.addMessage("Inserisci una quantita valida", "error");
    return;
  }

  isSubmittingProposal.value = true;

  try {
    await createOfferListing({
      sellListId: listing.value.id,
      quantity: parsedQuantity,
      offer: parsedOffer,
    });

    snackbar.addMessage("Proposta inviata con successo", "success");
    offerQuantity.value = 1;
    offeredPrice.value = "";
    await loadOfferListings(listing.value.id);
  } catch (error) {
    snackbar.addMessage(error.message || "Errore durante l'invio della proposta", "error");
  } finally {
    isSubmittingProposal.value = false;
  }
}

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <CommunitySellListingOffersDetails
      :fetch-listing-by-id="fetchActiveSellListingById"
      chat-path-base="/community/offers"
      :proposals="offerListings"
      :is-loading-proposals="isLoadingOfferListings"
      @listing-updated="handleListingUpdated"
    />

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <DialogsGeneric
          accept-label="Invia Proposta"
          :disabled="!isOfferEnabled || isSubmittingProposal"
          @confirm="handleSubmitProposal"
        >
          <template #button>
            <ButtonMenu
              icon="mdi:cash-fast"
              label="Fai un offerta"
              transition
              :delay="100"
              :disabled="!isOfferEnabled || isSubmittingProposal"
              :icon-color="isOfferEnabled ? 'green' : null"
            />
          </template>

          <template #title>Fai un offerta</template>

          <template #content>
            <div class="space-y-4">
              <div>
                <p class="offer-field-label mb-1">Quantita</p>
                <CardCounter v-model="offerQuantityModel" :min="1" :max="maxOfferQuantity" :outer-padding="false" />
              </div>

              <InputTextField
                v-model="offeredPrice"
                label="Offerta"
                :placeholder="offerPlaceholder"
                type="number"
                min="0.01"
                step="0.01"
              />
            </div>
          </template>
        </DialogsGeneric>
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.offer-field-label {
  color: rgba(248, 250, 252, 0.92);
  font-size: 0.82rem;
  font-weight: 600;
}
</style>
