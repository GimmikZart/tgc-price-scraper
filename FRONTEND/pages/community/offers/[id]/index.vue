<script setup>
import { fetchOfferListingHasUnreadMessages } from "@/api/offerListingChat";
import {
  createOfferListing,
  fetchActiveSellListingById,
  fetchOfferListingsBySellListingId,
} from "@/api/sellListings";
import { useRouter } from "vue-router";

const router = useRouter();
const userAuth = useUserAuth();
const snackbar = useSnackbar();

const listing = ref(null);
const offerQuantity = ref(1);
const offeredPrice = ref("");
const offerListings = ref([]);
const isLoadingOfferListings = ref(false);
const isSubmittingProposal = ref(false);
const hasUnreadMessagesOnOwnOffer = ref(false);
const isLoadingOwnOfferUnread = ref(false);
let unreadStateRequestToken = 0;

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const loggedUserOfferListing = computed(() => {
  if (!currentUserId.value) return null;

  return offerListings.value.find((offerListing) => {
    return String(offerListing?.offerer_id ?? "") === String(currentUserId.value);
  }) ?? null;
});
const visibleOfferListings = computed(() => {
  if (!currentUserId.value) return offerListings.value;

  return offerListings.value.filter((offerListing) => {
    return String(offerListing?.offerer_id ?? "") !== String(currentUserId.value);
  });
});

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

const canSubmitOffer = computed(() => {
  if (!isOfferEnabled.value) return false;
  return !loggedUserOfferListing.value;
});

const ownOfferChatPath = computed(() => {
  const parsedOfferListingId = Number(loggedUserOfferListing.value?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return null;
  return `/community/offers/${parsedOfferListingId}/chat`;
});
const canOpenOwnOfferChat = computed(() => Boolean(ownOfferChatPath.value));

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
  hasUnreadMessagesOnOwnOffer.value = false;
  isLoadingOwnOfferUnread.value = false;
  unreadStateRequestToken += 1;

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

async function loadOwnOfferUnreadState() {
  unreadStateRequestToken += 1;
  const currentRequestToken = unreadStateRequestToken;
  const offerListingId = Number(loggedUserOfferListing.value?.id);

  if (!Number.isInteger(offerListingId) || offerListingId <= 0) {
    hasUnreadMessagesOnOwnOffer.value = false;
    isLoadingOwnOfferUnread.value = false;
    return;
  }

  isLoadingOwnOfferUnread.value = true;

  try {
    const hasUnreadMessages = await fetchOfferListingHasUnreadMessages(offerListingId);
    if (currentRequestToken !== unreadStateRequestToken) return;
    hasUnreadMessagesOnOwnOffer.value = hasUnreadMessages;
  } catch (error) {
    if (currentRequestToken !== unreadStateRequestToken) return;
    hasUnreadMessagesOnOwnOffer.value = false;
    snackbar.addMessage(error.message || "Errore durante il recupero dei messaggi non letti", "error");
  } finally {
    if (currentRequestToken !== unreadStateRequestToken) return;
    isLoadingOwnOfferUnread.value = false;
  }
}

function openOwnOfferChat() {
  if (!canOpenOwnOfferChat.value) return;
  router.push(ownOfferChatPath.value);
}

async function handleSubmitProposal() {
  if (isSubmittingProposal.value) return;
  if (!listing.value?.id) return;
  if (!canSubmitOffer.value) {
    if (loggedUserOfferListing.value) {
      snackbar.addMessage("Hai gia inviato un'offerta per questa vendita", "warning");
    }
    return;
  }

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

watch(
  () => loggedUserOfferListing.value?.id,
  () => {
    loadOwnOfferUnreadState();
  },
  { immediate: true },
);
</script>

<template>
  <section class="relative h-full">
    <CommunitySellListingOffersDetails
      :fetch-listing-by-id="fetchActiveSellListingById"
      :proposals="visibleOfferListings"
      :is-loading-proposals="isLoadingOfferListings"
      show-seller-identity-header
      @listing-updated="handleListingUpdated"
    />

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <div v-if="loggedUserOfferListing" class="own-offer-entry">
          <CommunityOfferListingRow :offer-listing="loggedUserOfferListing" class="w-full">
            <template #right>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="own-offer-chat-btn"
                  :disabled="!canOpenOwnOfferChat"
                  @click.stop="openOwnOfferChat"
                >
                  <v-icon size="19">mdi-chat-processing</v-icon>
                  <span
                    v-if="hasUnreadMessagesOnOwnOffer && !isLoadingOwnOfferUnread"
                    class="own-offer-chat-btn-unread-dot"
                  />
                </button>
              </div>
            </template>
          </CommunityOfferListingRow>
        </div>

        <DialogsGeneric
          v-else
          accept-label="Invia Proposta"
          :disabled="!canSubmitOffer || isSubmittingProposal"
          @confirm="handleSubmitProposal"
        >
          <template #button>
            <ButtonMenu
              icon="mdi:cash-fast"
              label="Fai un offerta"
              transition
              :delay="100"
              :disabled="!canSubmitOffer || isSubmittingProposal"
              :icon-color="canSubmitOffer ? 'green' : null"
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

.own-offer-entry {
  width: 100%;
}

.own-offer-label {
  margin-bottom: 0.4rem;
  color: rgba(241, 245, 249, 0.78);
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.own-offer-chat-btn {
  position: relative;
  display: grid;
  place-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(145deg, rgba(255, 157, 82, 0.24), rgba(255, 122, 24, 0.35));
  color: rgba(248, 250, 252, 0.95);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 18px rgba(0, 0, 0, 0.32);
  transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
}

.own-offer-chat-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.own-offer-chat-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.own-offer-chat-btn-unread-dot {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 9999px;
  background-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(7, 10, 16, 0.95);
}
</style>
