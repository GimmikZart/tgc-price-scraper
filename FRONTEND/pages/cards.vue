<script setup>
import { ref } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import CardFilter from "@/components/CardFilter.vue";

//const { allCards } = await useOnePieceCards();

const paginatedCards = ref([]);
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Lista Carte">
      <template #actions> </template>
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

    <CardFilter v-model="paginatedCards" />
  </section>
</template>
