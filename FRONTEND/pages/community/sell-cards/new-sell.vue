<script setup>
import Card from "@/components/Card.vue";

const router = useRouter();
const sellListingDraftStore = useSellListingDraftStore();
const { selectedCard, hasSelectedCard } = storeToRefs(sellListingDraftStore);

const COLLECTION_SELL_MODE_PATH = "/me/collection?sell-mode";

function goToCollectionInSellMode() {
  router.push(COLLECTION_SELL_MODE_PATH);
}
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Nuova Vendita" />

    <div class="px-3 pt-4 pb-20">
      <v-btn color="orange-darken-1" block @click="goToCollectionInSellMode">
        Seleziona carta
      </v-btn>

      <div v-if="hasSelectedCard" class="mt-4">
        <p class="mb-2 text-sm text-white/80">Carta selezionata</p>

        <Card
          :card="selectedCard"
          :card-count="selectedCard.copiesInCollection"
          show-count
          disable-opening
        />

        <p class="mt-2 text-xs text-white/70">
          Copie in collezione: {{ selectedCard.copiesInCollection }}
        </p>
      </div>
    </div>
  </section>
</template>
