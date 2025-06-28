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
const paginatedCards = ref([]);
const openFilter = ref(false);
const editCollection = ref(false);

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

async function addCardInCollection(card) {
  card.count = ++card.count;
  await addCardToUserCollection(userAuth.userLogged.id, card.id);
}

async function removeCardInCollection(card) {
  card.count = --card.count;
  await removeCardToUserCollection(userAuth.userLogged.id, card.id);
}

async function loadCollectionCardCounts() {
  if (!userAuth.userLogged?.id) return;
  const userId = userAuth.userLogged.id;

  await Promise.all(
    paginatedCards.value.map(async (card) => {
      try {
        const c = await fetchCardCountInCollection(userId, card.id);
        card.count = c;
      } catch (e) {
        console.error("Errore fetch count per", card.id, e);
        card.count = 0;
      }
    })
  );
}

watch(editCollection, async () => {
  if (editCollection.value) await loadCollectionCardCounts();
});

const gridSystem = computed(() => {
  return {
    "grid-cols-2 px-2 pb-15 gap-2": isMobile.value,
    "grid-cols-4": isTablet.value,
    "grid-cols-8 px-4 pb-20": isDesktop.value,
    "gap-2": editCollection.value,
  };
});

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

onMounted(() => {
  filteredCards.value = allCards;
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Lista Carte">
      <template #actions>
        <span class="font-bold text-lg">
          {{ filteredCards.length }} carte
        </span>
        <v-btn
          v-if="isDesktop"
          class="text-white"
          variant="text"
          @click="openFilter = true"
        >
          <v-icon size="30">mdi-magnify</v-icon>
        </v-btn>
      </template>
    </Toolbar>

    <h4
      v-if="paginatedCards.length == 0"
      class="text-center text-gray-500 my-5"
    >
      La ricerca non ha prodotto risultati
    </h4>

    <div class="grid px-2 pt-2 transition-all" :class="gridSystem">
      <Card
        v-for="(card, ix) in paginatedCards"
        :key="ix"
        :card="card"
        :handle-cards="editCollection"
        @addCard="addCardInCollection(card)"
        @removeCard="removeCardInCollection(card)"
        :card-count="card.count"
      />
    </div>
    <CardViewPagination
      :items="filteredCards"
      :itemsPerPage="32"
      @update:paginated="handlePaginatedUpdate"
    />

    <CardViewFilter
      v-show="openFilter"
      :cards-list="allCards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
    />

    <MobileFloatMenu :menu-open="mobileFloatMenu.open">
      <template #buttons>
        <v-btn
          class="text-white"
          variant="text"
          to="/collection"
          @click="mobileFloatMenu.close()"
        >
          <span class="text-xs mr-3">Vai a Collezione</span>
          <Icon class="text-xl" icon="tdesign:collection-filled"></Icon>
        </v-btn>
        <v-btn
          class="text-white"
          variant="text"
          @click="
            editCollection = !editCollection;
            mobileFloatMenu.close();
          "
        >
          <span class="text-xs mr-3">Gestisci Collezione</span>
          <Icon class="text-xl" icon="fluent:collections-add-24-regular"></Icon>
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
          <Icon class="text-2xl" icon="material-symbols:search-rounded"></Icon>
        </v-btn>
      </template>
    </MobileFloatMenu>
  </section>
</template>
