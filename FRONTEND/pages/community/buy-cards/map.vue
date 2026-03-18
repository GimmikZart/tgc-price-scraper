<script setup>
import { fetchActiveSellListings } from "@/api/sellListings";
import {
  BUY_LISTINGS_RADIUS_METERS,
  DEFAULT_USER_LOCATION,
} from "@/utilities/geo";

const snackbar = useSnackbar();
const router = useRouter();

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

const sellListings = ref([]);
const isLoading = ref(true);

async function loadSellListings() {
  isLoading.value = true;

  try {
    sellListings.value = await fetchActiveSellListings({ excludeLoggedUser: true });
  } catch (error) {
    sellListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle vendite", "error");
  } finally {
    isLoading.value = false;
  }
}

function openListing(listing) {
  if (!listing?.id) return;
  router.push(`/community/offers/${listing.id}`);
}

onMounted(loadSellListings);
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Compra Carte" fixed />

    <div class="buy-cards-map-page">
      <TabsRouteTabs :tabs="sectionTabs" />

      <div class="buy-cards-map-page__map-shell">
        <CommunitySellListingsMap
          :listings="sellListings"
          :center="DEFAULT_USER_LOCATION"
          :radius-meters="BUY_LISTINGS_RADIUS_METERS"
          :loading="isLoading"
          :min-height="520"
          empty-message="Nessuna carta in vendita entro 10 km da Parma"
          @listing-click="openListing"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.buy-cards-map-page {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  height: 100%;
  padding: 0.3rem 0.75rem 0.75rem;
}

.buy-cards-map-page__map-shell {
  min-height: 0;
  flex: 1;
}
</style>
