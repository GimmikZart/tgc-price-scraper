<script setup>
import { ref, onMounted } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";

const { allCards } = await useOnePieceCards();

// Stato globale nella view
const filteredCards = ref([]); // array di carte dopo il filtro
const paginatedCards = ref([]); // array di carte paginate, da mostrare a schermo
const openFilter = ref(false);
const openMenu = ref(false);

// Quando Filter.vue emetterà “update:filtered”, aggiorno filteredCards
function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

// Quando Pagination.vue emetterà “update:paginated”, aggiorno paginatedCards
function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

// Inizialmente, allCards non è ancora caricato?
// Usiamo onMounted (o watch su allCards) per popolare filteredCards con tutte le carte
onMounted(() => {
  // Se allCards è già un array pieno, al caricamento iniziale voglio vederle tutte
  filteredCards.value = allCards;
  openMenu.value = true; // Mostro il menu mobile all'avvio
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Lista Carte">
      <template #actions> {{ filteredCards.length }} carte </template>
    </Toolbar>

    <h4
      v-if="paginatedCards.length == 0"
      class="text-center text-gray-500 my-5"
    >
      La ricerca non ha prodotto risultati
    </h4>

    <div
      class="grid grid-cols-2 gap-2 px-2 pt-2 max-sm:pb-5 lg:px-4 lg:pb-20 lg:grid-cols-8 lg:gap-4"
    >
      <Card v-for="(card, ix) in paginatedCards" :key="ix" :card="card" />
    </div>
    <CardViewPagination
      :items="filteredCards"
      :itemsPerPage="32"
      @update:paginated="handlePaginatedUpdate"
    />

    <CardViewFilter
      v-if="openFilter"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <MobilePageMenu v-if="openMenu">
      <template #buttons>
        <!--  <v-btn class="text-white" variant="text" @click="openMenu = false">
          <v-icon size="30">mdi-home</v-icon>
        </v-btn> -->
        <v-btn class="text-white" variant="text" @click="openFilter = true">
          <v-icon size="30">mdi-magnify</v-icon>
        </v-btn>
      </template>
    </MobilePageMenu>
  </section>
</template>
