<script setup>
import { ref, onMounted } from "vue";
import Toolbar from "@/components/Toolbar.vue";
import Card from "@/components/Card.vue";
import { useMyBreakpoints } from "@/composables/useMyBreakpoints";
import { useMobileFloatMenu } from "@/stores/useMobileFloatMenu";
import { Icon } from "@iconify/vue";
import {
  fetchCardCountInCollection,
  addCardToUserCollection,
  removeCardToUserCollection,
} from "@/api/collection";

const userAuth = useUserAuth();
const { allCards } = await useOnePieceCards();
const { isMobile, isTablet, isDesktop } = useMyBreakpoints();
const mobileFloatMenu = useMobileFloatMenu();

const filteredCards = ref([]);
const visibleCards = ref([]);
const openFilter = ref(false);
const editCollection = ref(false);

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(visibleCards);


function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

async function loadCountsForChunk(chunk) {
  if (!editCollection.value) return
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
  if (editCollection.value) cls.push('gap-2'); // opzionale sovrascrittura
  return cls; // array o .join(' ')
});

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

watch(editCollection, async () => {
  if (editCollection.value) await loadCountsForChunk(visibleCards.value);
});

onMounted(() => {
  filteredCards.value = allCards;
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Lista Carte">
      <template #actions>
        <MobileFloatMenu>
          <template #buttons>
            <v-btn
              class="text-white"
              variant="text"
              @click="
                editCollection = !editCollection;
                mobileFloatMenu.close();
              "
            >
              <span class="text-xs mr-3">Gestisci Collezione</span>
              <Icon
                class="text-xl"
                icon="fluent:collections-add-24-regular"
              ></Icon>
            </v-btn>
            <v-btn
              class="text-white"
              variant="text"
              @click="
                openFilter = true;
                mobileFloatMenu.close();
              "
            >
              <span class="text-xs mr-3">Filtra</span>
              <Icon
                class="text-2xl"
                icon="material-symbols:search-rounded"
              ></Icon>
            </v-btn>
          </template>
        </MobileFloatMenu>
      </template>
    </Toolbar>

    <h4
      v-if="visibleCards.length == 0"
      class="text-center text-gray-500 my-5"
    >
      La ricerca non ha prodotto risultati
    </h4>
    <InfiniteGrid
      :items="filteredCards"
      :grid-class="gridSystem"
      :onChunk="loadCountsForChunk"
      @update:visible="visibleCards = $event"
    >
      <template #default="{ item }">
        <Card
          :key="item.id"
          :card="item"
          :handle-cards="editCollection"
          :card-count="item.count"
          @addCard="addCardInCollection(item)"
          @removeCard="removeCardInCollection(item)"
          @open="openViewer(item)"
        />
      </template>
    </InfiniteGrid>

    <CardViewFilter
      v-show="openFilter"
      :cards-list="allCards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="filteredCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
