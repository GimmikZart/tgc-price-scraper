<script setup>
import { ref } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import CardFilter from "@/components/CardFilter.vue";

const { allCards } = await useOnePieceCards();

const paginatedCards = ref([...allCards]);
</script>

<template>
  <section class="relative min-h-dvh">
    <Toolbar label="Lista Carte">
      <template #actions> </template>
    </Toolbar>

    <div
      class="grid grid-cols-2 gap-2 px-2 pt-2 max-sm:pb-5 lg:px-4 lg:pb-20 lg:grid-cols-8 lg:gap-4"
    >
      <Card v-for="(card, ix) in paginatedCards" :key="ix" :card="card" />
    </div>

    <CardFilter
      :all-cards="allCards"
      v-model="paginatedCards"
      @close="openFilter = false"
    />
  </section>
</template>
