<script setup>
import { fetchActiveSellListings } from "@/api/sellListings";

const snackbar = useSnackbar();

const sellListings = ref([]);
const isLoading = ref(true);

const hasListings = computed(() => sellListings.value.length > 0);

async function loadSellListings() {
  isLoading.value = true;

  try {
    sellListings.value = await fetchActiveSellListings();
  } catch (error) {
    sellListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle vendite", "error");
  } finally {
    isLoading.value = false;
  }
}

definePageMeta({
  middleware: "auth",
});

onMounted(loadSellListings);
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Compra Carte" fixed />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <p v-if="isLoading" class="sell-state-message">Caricamento vendite in corso...</p>
      <p v-else-if="!hasListings" class="sell-state-message">Nessuna carta attualmente in vendita</p>

      <div v-else class="grid grid-cols-2 gap-3 pb-2">
        <CommunitySellListingCard
          v-for="listing in sellListings"
          :key="listing.id"
          :listing="listing"
          details-path-base="/community/offers"
        />
      </div>
    </div>
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
</style>
