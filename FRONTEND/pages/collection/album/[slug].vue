<script setup>
import { useRoute } from "vue-router";
import { getAlbum, removeCardFromAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const route = useRoute();
const router = useRouter();
const slug = route.params.slug;
const removeCardMode = ref(false);
const { allCards } = await useOnePieceCards();

const {
  data: album,
  error,
  refresh: refreshAlbum,
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

async function removeCard(idx) {
  await removeCardFromAlbum(album.value, idx);
  refreshAlbum();
}
function goToSelectCard(idx) {
  router.push({
    path: "/collection/all",
    query: {
      album: album.value.slug,
      index: idx,
    },
  });
}
</script>

<template>
  <section class="h-full flex flex-col">
    <Toolbar :label="`Album ${album.name}`" />

    <v-container
      class="bg-stitched pb-10 mt-4 px-1 h-full pa-0 grid grid-cols-2 gap-1 border-l-8 border-blue-900"
    >
      <div
        v-for="(slot, idx) in albumSlotsWithCards"
        :key="idx"
        class="w-full relative flex items-end pa-1 bg-black aspect-[5/7] border-[1px] border-white/20"
      >
        <template v-if="slot.card">
          <Card :key="ix" :card="slot.card" class="w-full h-auto z-[1]" />
          <div
            v-if="removeCardMode"
            class="absolute inset-0 bg-black/80 flex items-center justify-center"
          >
            <v-btn
              variant="text"
              icon
              class="text-white"
              @click="removeCard(idx)"
            >
              <Icon icon="tabler:trash" class="text-5xl text-red"></Icon>
            </v-btn>
          </div>
        </template>

        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center"
        >
          <h3 class="text-lg font-semibold mb-2">Slot {{ idx + 1 }}</h3>
          <v-btn
            v-if="!removeCardMode"
            variant="text"
            icon
            class="text-white"
            @click="goToSelectCard(idx)"
          >
            <Icon icon="heroicons:plus-16-solid" class="text-5xl"></Icon>
          </v-btn>
        </div>
        <div
          class="absolute opacity-20 plastic-card w-full h-full bottom-0 left-0 z-[0]"
        ></div>
        <div
          class="absolute opacity-35 plastic-card w-full h-[90%] bottom-0 left-0 z-[2]"
        ></div>
      </div>
    </v-container>
    <CardViewPagination
      :items="albumSlotsWithCards"
      :itemsPerPage="16"
      @update:paginated="handlePaginatedUpdate"
    />
    <MobileFloatMenu>
      <template #buttons>
        <v-btn
          v-if="!removeCardMode"
          variant="text"
          class="text-white"
          @click="removeCardMode = true"
        >
          Rimuovi carte
          <Icon
            icon="mdi:card-remove-outline"
            class="text-xl ml-3 -rotate-90"
          />
        </v-btn>
        <v-btn
          v-else
          variant="text"
          class="text-white"
          @click="removeCardMode = false"
        >
          Termina rimozione
          <Icon icon="el:ok" class="text-xl ml-3" />
        </v-btn>
      </template>
    </MobileFloatMenu>
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
  background-image: url("@/public/assets/images/sleeve-effect-1.png");
  /* background-image: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0) 30%
  ); */
  box-shadow: inset 0 0 4px rgba(255, 255, 255, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(1px);
}
</style>
