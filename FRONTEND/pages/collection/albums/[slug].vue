<script setup>
import { useRoute } from "vue-router";
import { getAlbum, removeCardFromAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";

const route = useRoute();
const router = useRouter();
const gs = useGlobalSettings();
const slug = route.params.slug;
const addCardMode = ref(false);
const paginatedCards = ref([]);
const { allCards } = await useOnePieceCards();

const paginatedCardFormatted = computed(() => {
  return paginatedCards.value.map((slot) => slot.card).filter((c) => c !== null);
});

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(paginatedCardFormatted);

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

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

async function removeCard(idx) {
  await removeCardFromAlbum(album.value, idx);
  refreshAlbum();
}

function goToSelectCard(idx) {
  router.push({
    path: "/collection",
    query: {
      album: album.value.slug,
      index: idx,
    },
  });
}

definePageMeta({
    middleware: 'auth'
})
</script>

<template>
  <section class="h-full flex flex-col pb-[120px]">
    <Toolbar backButton :label="`${album.name}`">
    </Toolbar>

    <v-container
      class="bg-stitched mt-4 pb-1 px-1 h-full pa-0 grid grid-cols-2 gap-1 border-l-8 border-blue-900"
    >
      <div
        v-for="(slot, idx) in paginatedCards"
        :key="idx"
        class="w-full relative flex items-end pa-1 bg-black aspect-[5/7] border-[1px] border-white/20"
      >
        <template v-if="slot.card">
          <Card :key="slot.id" :card="slot.card" @open="openViewer(slot.card)" class="w-full h-auto z-[1]" />
          <div
            v-if="gs.albumIsHandling"
            class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-[2]"
          >
            <div
            class="flex flex-col items-center"
              @click="removeCard(idx)"
            >
              <Icon icon="fluent:square-hint-arrow-back-16-filled" class="text-4xl text-red"></Icon>
              <span class="text-xs text-red">Rimuovi da album</span>
            </div>
          </div>
        </template>

        <div
          v-else-if="gs.albumIsHandling"
          class="w-full h-full flex flex-col items-center justify-center"
        >
          <h3 class="text-lg font-semibold mb-2">Slot {{ slot.index + 1 }}</h3>
          <v-btn
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
          class="absolute opacity-35 plastic-card w-full h-[90%] bottom-0 left-0 z-[1]"
        ></div>
      </div>
    </v-container>
    <CardViewPagination
      :items="albumSlotsWithCards"
      :itemsPerPage="10"
      @update:paginated="handlePaginatedUpdate"
    />

    <MobileFloatMenu :cols="3" :fromBottom="gs.navbarHeight + gs.paginationHeight" closeable class="z-30" >
      <template #buttons>
        <DialogsHandleRemoveAlbum :album-id="album.id" />

        <DialogsRenameAlbum :album="album" @refresh="refreshAlbum()"/>

        <button
          class="text-white border border-white p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
          @click="gs.toggleAlbumHandling()"
        >
          <template v-if="!gs.albumIsHandling">
            <ButtonMenu
              icon="ph:swap"
              label="Gestisci"
            />
          </template>
          <template v-else>
            <ButtonMenu
              icon="el:ok"
              label="Termina"
              color="green"
            />
          </template>
        </button>
      </template>
    </MobileFloatMenu>


    <!-- Viewer full-screen centralizzato -->
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="paginatedCardFormatted"
      @close="viewerOpen = false"
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
  background-image: url("@/public/assets/images/sleeve-effect-1.png");
  background-size: cover;
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
