<script setup>
import { ref, onMounted } from "vue";
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

const userAuth = useUserAuth();

const { allCards } = await useOnePieceCards();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();

const globalSettings = useGlobalSettings()
const { collectionIsHandling } = storeToRefs(globalSettings)
const { toggleHandlingCollections } = globalSettings


const filteredCards = ref([]);
const visibleCards = ref([]);
const openFilter = ref(false);

const gridRef = ref(null)
const gridKey = ref(0);

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(visibleCards);

const scroller = computed(() => gridRef.value?.containerEl?.value || null)
const { setItemRef, captureFromList, restore } = useScrollAnchor({
  scroller,        // <-- PASSA QUESTO!
  headerOffset: 0  // se hai una toolbar sticky DENTRO lo scroller, metti la sua altezza
})

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = [...newFiltered];
  visibleCards.value = [];
  gridKey.value++; 
  window.scrollTo({ top: 0, behavior: 'instant'});
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
  card.count = ++card.count;
  await addCardToUserCollection(userAuth.userLogged.id, card.id);
}

async function removeCardInCollection(card) {
  card.count = --card.count;
  await removeCardToUserCollection(userAuth.userLogged.id, card.id);
}

const gridSystem = computed(() => {
  const cls = ['grid']; // 'grid' sempre
  if (isMobile.value)  cls.push('grid-cols-2','px-2','pb-15','gap-2');
  if (isTablet.value)  cls.push('grid-cols-4');
  if (isDesktop.value) cls.push('grid-cols-8','px-4','pb-20');
  if (collectionIsHandling.value) cls.push('gap-2'); // opzionale sovrascrittura
  return cls; // array o .join(' ')
});

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
  captureFromList(visibleCards.value)
  toggleHandlingCollections()
  await restore()
}



definePageMeta({
    middleware: 'auth'
})

onMounted(() => {
  filteredCards.value = [...allCards];
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
      :items="filteredCards"
      :grid-class="gridSystem"
      :onChunk="loadCountsForChunk"
      @update:visible="visibleCards = $event"
    >
      <template #default="{ item }">
        <div :ref="el => setItemRef(item.id, el)">
          <Card
            :key="item.id"
            :card="item"
            :card-count="item.count"
            @addCard="addCardInCollection(item)"
            @removeCard="removeCardInCollection(item)"
            @open="openViewer(item)"
          />
        </div>
      </template>
    </InfiniteGrid>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="allCards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonMenu
          :icon="collectionIsHandling ? 'mdi-check' : 'fluent:collections-add-24-regular'"
          :label="collectionIsHandling ? 'Termina' : 'Gestisci'"
          :color="collectionIsHandling ? 'green' : 'orange'"
          transition
            :delay="100"
          @click="onToggleHandlingCollections()"
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


    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="filteredCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
