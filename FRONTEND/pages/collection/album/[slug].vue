<script setup>
import { useRoute } from "vue-router";
import { getAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const route = useRoute();
const slug = route.params.slug;
const { allCards } = await useOnePieceCards();

const {
  data: album,
  error,
  pending,
} = await useAsyncData(`album-${slug}`, () => getAlbum(slug));

const albumSlotsWithCards = computed(() => {
  const totalSlots = album.value?.slots ?? 0;
  const cardAlbumEntries = album.value?.card_album ?? [];

  if (totalSlots === 0 || !allCards.length) return [];

  // Prepara una mappa: index → entry.collection.card_id
  const cardMap = new Map();
  cardAlbumEntries.forEach((entry) => {
    if (typeof entry.index === "number" && entry.collection?.card_id) {
      cardMap.set(entry.index, entry.collection.card_id);
    }
  });

  // Costruisci lo slot array
  const slots = [];
  for (let i = 0; i < totalSlots; i++) {
    const cardId = cardMap.get(i);
    const found = allCards.find((card) => card.id === cardId);

    slots.push({
      index: i,
      card: found || null,
    });
  }

  return slots;
});
</script>

<template>
  <section class="h-full flex flex-col">
    <Toolbar :label="`Album ${album.name}`" />

    <v-container
      class="bg-stitched mt-4 px-1 h-full pa-0 grid grid-cols-2 gap-1 border-l-8 border-blue-500"
    >
      <div
        v-for="(slot, idx) in albumSlotsWithCards"
        :key="idx"
        class="w-full relative flex items-end pa-1 bg-black aspect-[5/7] border-[1px] border-white/20"
      >
        <template v-if="slot.card">
          <Card :key="ix" :card="slot.card" class="w-full h-auto" />
        </template>

        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center"
        >
          <h3 class="text-xl font-semibold mb-2">Slot {{ idx + 1 }}</h3>
          <v-btn variant="text" icon class="text-white">
            <Icon icon="heroicons:plus-16-solid" class="text-5xl"></Icon>
          </v-btn>
        </div>

        <div
          class="absolute opacity-60 plastic-card w-full h-[95%] bottom-0 left-0"
        ></div>
      </div>
    </v-container>
    <CardViewPagination
      :items="albumSlotsWithCards"
      :itemsPerPage="16"
      @update:paginated="handlePaginatedUpdate"
    />
  </section>
</template>
<style>
.bg-stitched {
  background-image: repeating-linear-gradient(
      to right,
      #2d2d2d,
      #2d2d2d 1px,
      transparent 1px,
      transparent 4px
    ),
    repeating-linear-gradient(
      to bottom,
      #2d2d2d,
      #2d2d2d 1px,
      transparent 1px,
      transparent 4px
    );
  background-size: 100% 100%;
}

.plastic-card {
  pointer-events: none;
  background-color: #1f1f1f;
  background-image: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0) 30%
  );
  box-shadow: inset 0 0 4px rgba(255, 255, 255, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(1px);
}
</style>
