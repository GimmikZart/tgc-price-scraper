<script setup>
import { ref, onMounted, nextTick, computed, watch } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { storeToRefs } from 'pinia'    
import { Icon } from "@iconify/vue";
import {
  fetchCardCountInCollection,
  addCardToUserCollection,
  removeCardToUserCollection,
} from "@/api/collection";

import { useScrollAnchor } from "~/composables/useScrollAnchor"; 

const userAuth = useUserAuth();
const snackbar = useSnackbar();

const { allCards } = await useOnePieceCards();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();

const globalSettings = useGlobalSettings()
const { collectionIsHandling } = storeToRefs(globalSettings)
const { toggleHandlingCollections } = globalSettings

const sort = useCardSort('publish_date', 'desc')
const filteredCards = ref([]);
const visibleCards = ref([]);
const openFilter = ref(false);
const showPrice = ref(false)

const gridRef = ref(null)
const gridKey = ref(0);
const scroller = ref(null)

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(visibleCards);

useScrollAnchor({
  scroller,            
  headerOffset: 0,
  triggerVariable: collectionIsHandling,
})

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = [...newFiltered]
  visibleCards.value = []
  gridKey.value++

  const s = scroller.value
  if (s?.scrollTo) s.scrollTo({ top: 0, behavior: 'smooth' })
  else if (s) s.scrollTop = 0
}

async function loadCountsForChunk(chunk) {
  if (!collectionIsHandling.value) return
  const userId = userAuth.userLogged?.id
  if (!userId) return
  await Promise.all(chunk.map(async (card) => {
    if (card._countLoaded || card._pending) return
    try {
      const c = await fetchCardCountInCollection(userId, card.id)
      card.count = c
    } catch {
      card.count = card.count ?? 0
    }
    card._countLoaded = true
  }))
}

async function addCardInCollection(card) {
  const previousCount = Number(card.count) || 0;
  card.count = previousCount + 1;

  try {
    await addCardToUserCollection(userAuth.userLogged.id, card.id);
  } catch (error) {
    card.count = previousCount;
    snackbar.addMessage(
      "Errore durante l'aggiunta alla collezione",
      "error",
      error?.message
    );
  }
}

async function removeCardInCollection(card) {
  const previousCount = Number(card.count) || 0;

  if (previousCount <= 0) {
    card.count = 0;
    return;
  }

  card.count = previousCount - 1;

  try {
    await removeCardToUserCollection(userAuth.userLogged.id, card.id);
  } catch (error) {
    card.count = previousCount;
    snackbar.addMessage(
      "Errore durante la rimozione dalla collezione",
      "error",
      error?.message
    );
  }
}

const gridSystem = computed(() => {
  const cls = ['grid'];
  if (isMobile.value)  cls.push('grid-cols-2','px-2','pb-15','gap-2');
  if (isTablet.value)  cls.push('grid-cols-4');
  if (isDesktop.value) cls.push('grid-cols-8','px-4','pb-20');
  if (collectionIsHandling.value) cls.push('gap-2');
  return cls;
});

const sortedCards = computed(() => sort.applySort(filteredCards.value))

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

watch(collectionIsHandling, async (val) => {
  if (val) await loadCountsForChunk(visibleCards.value);
});

async function onToggleHandlingCollections() {
  toggleHandlingCollections()
}

definePageMeta({
  middleware: 'auth'
})

onMounted(async () => {
  filteredCards.value = [...allCards];
  scroller.value = gridRef.value?.containerEl || null
  await nextTick()
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Lista Carte" />

    <h4
      v-if="visibleCards.length == 0"
      class="text-center text-gray-500 my-5"
    >
      La ricerca non ha prodotto risultati
    </h4>

    <InfiniteGrid
      ref="gridRef"
      :key="gridKey"
      :items="sortedCards"
      :grid-class="gridSystem"
      :onChunk="loadCountsForChunk"
      @update:visible="visibleCards = $event"
    >
      <template #default="{ item }">
        <Card
          :key="item.id"
          :card="item"
          :handle-cards="collectionIsHandling"
          :card-count="item.count"
          :show-price="true"
          @addCard="addCardInCollection"
          @removeCard="removeCardInCollection"
          @open="openViewer"
        />
      </template>
    </InfiniteGrid>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="allCards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <MobileFloatMenu :cols="3">
      <template #buttons>
        <ButtonMenu
          :icon="collectionIsHandling ? 'mdi-check' : 'fluent:collections-add-24-regular'"
          :label="collectionIsHandling ? 'Termina' : 'Gestisci'"
          :color="collectionIsHandling ? 'green' : 'orange'"
          transition
          :delay="200"
          @click="onToggleHandlingCollections()"
        />

        <!-- <ButtonMenu
          icon="solar:tag-price-outline"
          label="Prezzi"
          transition
          :delay="200"
          :class="{
            'opacity-40': !showPrice
          }"
          @click="showPrice = !showPrice"
        /> -->

        <ButtonSortMenu
          :model-key="sort.sortKey.value"
          :model-dir="sort.sortDir.value"
          @change="({ key, dir }) => sort.setSort(key, dir)"
        />

        <ButtonMenu
          icon="material-symbols:search-rounded"
          label="Filtra"
          transition
          :delay="200"
          @click="openFilter = true"
        />
      </template>
    </MobileFloatMenu>

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="sortedCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
