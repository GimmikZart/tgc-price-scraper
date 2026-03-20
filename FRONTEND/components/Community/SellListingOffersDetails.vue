<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
import {
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";

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
  offerAmountLabel: {
    type: String,
    default: "Offro",
  },
});
const emit = defineEmits(["listing-updated"]);

const route = useRoute();
const snackbar = useSnackbar();

const listing = ref(null);
const isLoading = ref(true);
const activeView = ref("info");

const listingId = computed(() => String(route.params.id ?? ""));
const hasListingCard = computed(() => Boolean(listing.value?.card));
const hasProposals = computed(() => props.proposals.length > 0);
const hasSellerIdentityHeader = computed(() => props.showSellerIdentityHeader && Boolean(listing.value));
const detailTabs = computed(() => ([
  { label: "Info", value: "info" },
  { label: "Offerte", value: "offers" },
]));

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

const sellerProfileTag = computed(() => {
  const value = listing.value?.sellerUserTag ?? listing.value?.sellerProfile?.user_tag;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
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

watch(
  listingId,
  () => {
    activeView.value = "info";
    loadListing();
  },
  { immediate: true },
);
</script>

<template>
  <section class="relative h-full">
    <Toolbar :label="toolbarLabel" fixed back-button>
      <template #info>
        <div class="listing-toolbar-tabs">
          <BaseTabs
            :tabs="detailTabs"
            :active="activeView"
            :active-class="ORANGE_ACTIVE_TAB_CLASS"
            :inactive-class="GHOST_INACTIVE_TAB_CLASS"
            @change="activeView = $event"
          />
        </div>
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      <template v-if="isLoading">
        <p class="sell-state-message">{{ loadingDetailsMessage }}</p>
      </template>

      <template v-else-if="!listing || !hasListingCard">
        <p class="sell-state-message">{{ notFoundMessage }}</p>
      </template>

      <template v-else-if="activeView === 'info'">
        <div class="listing-info-shell">
          <div v-if="hasSellerIdentityHeader" class="seller-identity-wrap">
            <UserIdentityHeader
              :username="sellerName"
              :user-tag="sellerTag"
              :profile-tag="sellerProfileTag"
              :avatar-url="sellerAvatarUrl"
              size="sm"
            />
          </div>

          <CommunitySellListingInfoCard
            :listing="listing"
            location-map-mode="expanded"
            :location-map-min-height="228"
            @open-card="openViewerFromSelected"
          />
        </div>
      </template>

      <template v-else>
        <p v-if="isLoading || isLoadingProposals" class="sell-state-message">{{ loadingProposalsMessage }}</p>
        <div v-else class="proposal-shell">
          <div v-if="hasProposals" class="space-y-2">
            <CommunityOfferListingRow
              v-for="offerListing in proposals"
              :key="offerListing.id"
              :offer-listing="offerListing"
              :offer-amount-label="offerAmountLabel"
              :chat-path-base="chatPathBase"
            />
          </div>
          <p v-else class="sell-state-message">{{ emptyProposalsMessage }}</p>
        </div>
      </template>
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

.listing-info-shell {
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.9rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(7, 10, 16, 0.86));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 28px rgba(2, 6, 23, 0.18);
}

.seller-identity-wrap {
  margin-bottom: 0.7rem;
}

.listing-toolbar-tabs {
  margin-top: 0.1rem;
}
</style>
