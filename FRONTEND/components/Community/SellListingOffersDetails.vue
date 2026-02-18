<script setup>
import { getConditionMeta } from "@/utilities/enums/conditions";

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
  proposals: {
    type: Array,
    default: () => [],
  },
  isLoadingProposals: {
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

const copiesInSale = computed(() => {
  const parsedValue = Number(listing.value?.quantity);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const listingPriceValue = computed(() => {
  const parsedValue = Number(listing.value?.price);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});

const conditionMeta = computed(() => getConditionMeta(listing.value?.condition));
const conditionColor = computed(() => conditionMeta.value?.color ?? "#607d8b");
const conditionLabel = computed(() => {
  if (conditionMeta.value?.label) return conditionMeta.value.label;

  const fallbackValue = listing.value?.condition;
  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue.trim();
  }

  return "N/D";
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

        <div v-else class="flex w-full gap-3">
          <div class="w-2/5">
            <Card :card="listing.card" @open="openViewerFromSelected" />
          </div>

          <div class="h-full w-full flex-1 flex flex-col gap-1">
            <div>
              <p class="sell-card-name line-clamp-2">{{ listing.card.name }}</p>
              <p class="sell-card-copies text-xs mb-1">{{ copiesInSale }} copie in vendita</p>
            </div>

            <v-chip size="x-small" variant="flat" label :color="conditionColor" class="w-fit font-bold">
              {{ conditionLabel }}
            </v-chip>
            <p class="text-xs font-bold">{{ listing.card.rarity }} | {{ listing.card.illustration || 'Base' }}</p>
            <p class="text-xs font-thin truncate">{{ listing.card.setName }}</p>
            <CardPriceLink
              class="mt-1"
              :price="listingPriceValue"
              :show-outer-padding="false"
              :link-enabled="false"
              label="Prezzo vendita x 1"
              currency="EUR"
            />
          </div>
        </div>
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
.sell-card-name {
  color: rgba(248, 250, 252, 0.98);
  font-weight: 700;
  line-height: 1.2;
}

.sell-card-copies {
  color: rgb(74 222 128 / 0.95);
  font-weight: 600;
}

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
</style>
