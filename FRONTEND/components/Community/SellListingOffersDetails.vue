<script setup>
const props = defineProps({
  fetchListingById: {
    type: Function,
    required: true,
  },
  toolbarLabel: {
    type: String,
    default: "Offerte per",
  },
  loadingDetailsMessage: {
    type: String,
    default: "Caricamento dettagli vendita...",
  },
  loadingProposalsMessage: {
    type: String,
    default: "Caricamento proposte in acquisto...",
  },
  notFoundMessage: {
    type: String,
    default: "Vendita non trovata",
  },
  emptyProposalsMessage: {
    type: String,
    default: "Nessuna proposta disponibile al momento",
  },
  chatPathBase: {
    type: String,
    default: null,
  },
  proposals: {
    type: Array,
    default: () => [],
  },
  isLoadingProposals: {
    type: Boolean,
    default: false,
  },
  showSellerIdentityHeader: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["listing-updated"]);

const route = useRoute();
const snackbar = useSnackbar();

const listing = ref(null);
const isLoading = ref(true);

const listingId = computed(() => String(route.params.id ?? ""));
const hasListingCard = computed(() => Boolean(listing.value?.card));
const hasProposals = computed(() => props.proposals.length > 0);
const hasSellerIdentityHeader = computed(() => props.showSellerIdentityHeader && Boolean(listing.value));

const sellerName = computed(() => {
  const value = listing.value?.sellerDisplayName ??
    listing.value?.sellerUsername ??
    listing.value?.sellerProfile?.display_name ??
    listing.value?.sellerProfile?.username;

  if (typeof value === "string" && value.trim()) return value.trim();
  return "Venditore";
});

const sellerTag = computed(() => {
  const value = listing.value?.sellerUserTag ?? listing.value?.sellerProfile?.user_tag;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "@venditore";
});

const sellerAvatarUrl = computed(() => {
  const value = listing.value?.sellerAvatarUrl ?? listing.value?.sellerProfile?.avatar_url;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
});

const viewerCards = computed(() => (hasListingCard.value ? [listing.value.card] : []));
const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(viewerCards);

async function loadListing() {
  isLoading.value = true;

  try {
    listing.value = await props.fetchListingById(listingId.value);
    emit("listing-updated", listing.value);
  } catch (error) {
    listing.value = null;
    emit("listing-updated", null);
    snackbar.addMessage(error.message || "Errore durante il recupero della vendita", "error");
  } finally {
    isLoading.value = false;
  }
}

function openViewerFromSelected(card) {
  openViewer(card);
}

watch(listingId, loadListing, { immediate: true });
</script>

<template>
  <section class="relative h-full">
    <Toolbar :label="toolbarLabel" fixed back-button>
      <template #info>
        <p v-if="isLoading" class="sell-state-message">{{ loadingDetailsMessage }}</p>
        <p v-else-if="!listing || !hasListingCard" class="sell-state-message">{{ notFoundMessage }}</p>

        <template v-else>
          <div v-if="hasSellerIdentityHeader" class="seller-identity-wrap">
            <UserIdentityHeader :username="sellerName" :user-tag="sellerTag" :avatar-url="sellerAvatarUrl" size="sm"/>
          </div>

          <CommunitySellListingInfoCard :listing="listing" @open-card="openViewerFromSelected" />
        </template>
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      <p v-if="isLoading || isLoadingProposals" class="sell-state-message">{{ loadingProposalsMessage }}</p>
      <div v-else class="proposal-shell">
        <div v-if="hasProposals" class="space-y-2">
          <CommunityOfferListingRow
            v-for="offerListing in proposals"
            :key="offerListing.id"
            :offer-listing="offerListing"
            :chat-path-base="chatPathBase"
          />
        </div>
        <p v-else class="sell-state-message">{{ emptyProposalsMessage }}</p>
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
  margin-top: 0.35rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.88rem;
  font-weight: 600;
}

.proposal-shell {
  border-radius: 0.9rem;
  padding: 0.9rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(7, 10, 16, 0.86));
}

.seller-identity-wrap {
  margin-top: 0.35rem;
  margin-bottom: 0.45rem;
}
</style>
