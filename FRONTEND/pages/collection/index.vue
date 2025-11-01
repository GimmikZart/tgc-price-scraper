<script setup>
import { ref, computed, watch, onMounted } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";
import { fetchUserCollection } from "@/api/collection";
import { getAlbums, insertCardToAlbum } from "@/api/album";
import { Icon } from "@iconify/vue";
import {
  fetchCardCountInCollection,
  addCardToUserCollection,
  removeCardToUserCollection,
} from "@/api/collection";

const route = useRoute();
const router = useRouter();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();
const globalSettings = useGlobalSettings()
const { collectionIsHandling } = storeToRefs(globalSettings)
const { toggleHandlingCollections } = globalSettings
const sort = useCardSort('name', 'asc')

const handleAlbum = ref(false);
const selectedAlbum = ref(null);

const gridRef = ref(null)
const gridKey = ref(0);
const scroller = ref(null)

const filteredCards = ref([]);
const visibleCards = ref([]);
const openFilter = ref(false);
const userAuth = useUserAuth();

// Viewer: ora scegliamo di navigare sull’INTERO risultato filtrato
const { show: viewerOpen, index: viewerIndex } = useCardViewer(filteredCards);

useScrollAnchor({
  scroller,            
  headerOffset: 0,
  triggerVariable: collectionIsHandling,
})

const gridSystem = computed(() => {
  let classes = "";
  if (isMobile.value)  classes += "grid-cols-2 px-2 pb-10 gap-3 ";
  if (isTablet.value)  classes += "grid-cols-4 ";
  if (isDesktop.value) classes += "grid-cols-8 px-4 pb-20 ";
  if (handleAlbum.value) classes += "pt-6";
  return classes;
});

const { data: userCollection } = await useAsyncData(
  `user-collection-${userAuth.userLogged.id}`,
  () => fetchUserCollection(userAuth.userLogged.id)
);

function openViewerFromItem(item) {
  const i = filteredCards.value.findIndex(c => c.id === item.id);
  if (i === -1) return;
  viewerIndex.value = i;
  viewerOpen.value = true;
}

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = [...newFiltered]
  visibleCards.value = []
  gridKey.value++

  const s = scroller.value
  if (s?.scrollTo) s.scrollTo({ top: 0, behavior: 'smooth' })
  else if (s) s.scrollTop = 0
}

const sortedCards = computed(() => sort.applySort(filteredCards.value))

async function addCardInCollection(card) {
  card.count = (card.count || 0) + 1;
  await addCardToUserCollection(userAuth.userLogged.id, card.id);
}

async function removeCardFromCollection(card) {
  // 1) update ottimistico
  card.count = Math.max(0, (card.count || 0) - 1);

  // 2) chiama API
  await removeCardToUserCollection(userAuth.userLogged.id, card.id);

  // 3) se è arrivata a zero, rimuovi la carta dalla lista mostrata
  if ((card.count || 0) === 0) {
    const idx = filteredCards.value.findIndex(c => c.id === card.id);
    if (idx !== -1) {
      // nuovo array per triggerare il reset "pulito" dell'InfiniteGrid
      const next = filteredCards.value.slice();
      next.splice(idx, 1);
      filteredCards.value = next;
    }

    // 4) se il viewer era aperto, mantieni lo stato coerente
    if (viewerOpen.value) {
      // Se stai usando useCardViewer(filteredCards) lasciamo l'indice valido,
      // se invece stai usando useCardViewer(visibleCards), chiudi per semplicità:
      // viewerOpen.value = false
      const len = filteredCards.value.length;
      if (len === 0) {
        viewerOpen.value = false;
      } else if (viewerIndex.value >= len) {
        viewerIndex.value = len - 1;
      }
    }
  }
}

// Carica i count solo per i NUOVI item che entrano nel buffer
async function loadCountsForChunk(chunk) {
  const userId = userAuth.userLogged?.id;
  if (!userId) return;

  await Promise.all(
    chunk.map(async (card) => {
      if (card._countLoaded) return;
      try {
        const c = await fetchCardCountInCollection(userId, card.id);
        card.count = c;
        console.log(card.count);
        
      } catch (e) {
        console.error("Errore fetch count per", card.id, e);
        card.count = 0;
      }
      card._countLoaded = true;
    })
  );
}

// Se l’utente attiva/disattiva la gestione, aggiorniamo i count del buffer corrente
watch(visibleCards, async () => {
  await loadCountsForChunk(visibleCards.value);
});

// Lock body scroll quando filtro è aperto
watch(openFilter, (newValue) => {
  document.documentElement.classList.toggle("overflow-hidden", newValue);
});

async function handleInsertAlbum(card) {
  if (handleAlbum.value && !selectedAlbum.value) {
    snackbar.addMessage("Seleziona un album prima di aggiungere la carta", "error");
    return;
  }

  const slotIndex = parseInt(route.query?.index) || 0;

  const response = await insertCardToAlbum(selectedAlbum.value, card.id, slotIndex);
  if (response) {
    const perPage = 10; // deve combaciare con :itemsPerPage dell’album
    const page = Math.floor(slotIndex / perPage) + 1; // 1-based

    router.push({
      path: `/collection/albums/${selectedAlbum.value.slug}`,
      query: { page: String(page), focus: String(slotIndex) },
    });
  }
}


// Sincronizza album da query
watch(selectedAlbum, (newAlbum) => {
  if (!newAlbum) router.push({ query: {} });
});

definePageMeta({
    middleware: 'auth'
})

onMounted(async () => {
  filteredCards.value = userCollection.value || [];
  scroller.value = gridRef.value?.containerEl || null
  if (route.query.album) {
    handleAlbum.value = true;
    const userAlbums = await getAlbums();
    selectedAlbum.value = userAlbums.find((a) => a.slug === route.query.album);
  }
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="La tua collezione">
      <template #actions>
        
      </template>
    </Toolbar>

    <div>
      <div
        v-if="handleAlbum"
        class="fixed bg-black/80 backdrop-blur-[3px] p-3 w-full flex justify-around top-[50px] left-0 z-[100] px-3 text-sm text-white/70"
      >
        <h5>Aggiungi ad Album</h5>
        <Icon icon="icomoon-free:arrow-right" class="text-xl" />
        <span class="font-bold">{{ selectedAlbum?.name }}</span>
      </div>

      <h4 v-if="visibleCards.length === 0" class="text-center text-gray-500 my-5">
        La ricerca non ha prodotto risultati
      </h4>
    </div>

    <!-- INFINITE GRID -->
    <InfiniteGrid
      ref="gridRef"
      :key="gridKey"
      :items="sortedCards"
      :grid-class="['grid','px-2','pt-2', gridSystem]"
      :class="handleAlbum ? 'pt-6' : 'pt-0'"
      @update:visible="visibleCards = $event"
    >
      <template #default="{ item }">
        <Card
          :key="item.id"
          :card="item"
          :handle-cards="collectionIsHandling"
          :card-count="item.count"
          show-count
          :disable-opening="handleAlbum"
          @addCard="addCardInCollection(item)"
          @removeCard="removeCardFromCollection(item)"
          @open="openViewerFromItem(item)"
          @click="handleAlbum ? handleInsertAlbum(item) : null"
        />
      </template>
    </InfiniteGrid>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="userCollection"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <MobileFloatMenu :cols="4">
      <template #buttons>
        <ButtonMenu
          :icon="collectionIsHandling ? 'mdi-check' : 'fluent:collections-add-24-regular'"
          :label="collectionIsHandling ? 'Termina' : 'Gestisci'"
          :color="collectionIsHandling ? 'green' : 'orange'"
          transition
            :delay="200"
          @click="toggleHandlingCollections()"
        />

        <ButtonMenu
          icon="material-symbols-light:book-ribbon"
          label="Album"
          transition
          :delay="100"
          @click="router.push('/collection/albums')"
        />

        <ButtonSortMenu
          :model-key="sort.sortKey"
          :model-dir="sort.sortDir"
          @change="({ key, dir }) => sort.setSort(key, dir)"
        />

        <ButtonMenu
          icon="material-symbols:search-rounded"
          label="Filtra"
          transition
          :delay="200"
          @click="
            openFilter = true;
          "
        />
      </template>
    </MobileFloatMenu>

    <!-- Viewer full-screen: su TUTTO il risultato filtrato -->
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="filteredCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
