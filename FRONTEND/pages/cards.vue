<script setup>
import { ref, onMounted } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";

const { allCards } = await useOnePieceCards();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();

const filteredCards = ref([]);
const paginatedCards = ref([]);
const openFilter = ref(false);
const editCollection = ref(false);

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

const gridSystem = computed(() => {
  return {
    "grid-cols-2 px-2 pb-5 gap-2": isMobile.value,
    "grid-cols-4": isTablet.value,
    "grid-cols-8 px-4 pb-20": isDesktop.value,
  };
});

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

onMounted(() => {
  filteredCards.value = allCards;
  mobileFloatMenu.open();
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Lista Carte">
      <template #actions>
        <span class="font-bold text-lg">
          {{ filteredCards.length }} carte
        </span>
        <v-btn
          v-if="isDesktop"
          class="text-white"
          variant="text"
          @click="openFilter = true"
        >
          <v-icon size="30">mdi-magnify</v-icon>
        </v-btn>
      </template>
    </Toolbar>

    <h4
      v-if="paginatedCards.length == 0"
      class="text-center text-gray-500 my-5"
    >
      La ricerca non ha prodotto risultati
    </h4>

    <div class="grid px-2 pt-2" :class="gridSystem">
      <Card
        v-for="(card, ix) in paginatedCards"
        :key="ix"
        :card="card"
        :edit-collection="editCollection"
      />
    </div>
    <CardViewPagination
      :items="filteredCards"
      :itemsPerPage="32"
      @update:paginated="handlePaginatedUpdate"
    />

    <CardViewFilter
      v-show="openFilter"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <MobileFloatMenu>
      <template #buttons>
        <v-btn class="text-white" variant="text" @click="editCollection = true">
          <v-icon size="30">mdi-list-status</v-icon>
        </v-btn>
        <v-btn class="text-white" variant="text" @click="openFilter = true">
          <v-icon size="30">mdi-magnify</v-icon>
        </v-btn>
      </template>
    </MobileFloatMenu>
  </section>
</template>
