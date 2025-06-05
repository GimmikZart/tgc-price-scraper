<script setup>
import { useUserAuth } from "@/stores/useUserAuth";

const { allCards } = await useOnePieceCards();

const currentPage = ref(1);
const itemsPerPage = ref(32);
const filteredCards = ref([...allCards]);
const openFilter = ref(false);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredCards.value.length / itemsPerPage.value))
);
const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredCards.value.slice(start, start + itemsPerPage.value);
});
</script>
<template>
  <section class="relative min-h-dvh">
    <Toolbar label="Lista Carte">
      <template #actions> </template>
    </Toolbar>
    <div
      class="grid grid-cols-2 gap-2 px-2 pt-2 max-sm:pb-5 lg:px-4 lg:pb-20 lg:grid-cols-8 lg:gap-4"
    >
      <Card v-for="(card, ix) in paginated" :key="ix" :card="card" />
    </div>
    <div
      class="fixed bottom-[60px] w-full right-0 z-10 p-2 bg-black | lg:bottom-0 lg:w-full lg:right-0 lg:pl-[258px] lg:py-5 rounded-t-3xl"
    >
      <div class="py-0 px-4 grid grid-cols-8 gap-5">
        <div class="col-span-6">
          <v-pagination
            density="compact"
            v-model="currentPage"
            :length="totalPages"
            class="w-full"
          ></v-pagination>
        </div>
        <div class="col-start-8 col-span-1">
          <v-btn
            class="text-white"
            variant="text"
            block
            @click="openFilter = true"
          >
            <v-icon size="30">mdi-magnify</v-icon>
          </v-btn>
        </div>
      </div>
      <CardFilter
        v-if="openFilter"
        :all-cards="allCards"
        v-model="filteredCards"
        @close="openFilter = false"
      />
    </div>
  </section>
</template>
