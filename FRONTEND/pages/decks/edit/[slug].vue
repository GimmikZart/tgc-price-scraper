<script setup>
import { Icon } from "@iconify/vue";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";

const snackbar = useSnackbar();
const pageLoader = usePageLoader();

const { allCards } = await useOnePieceCards();
const mobileFloatMenu = useMobileFloatMenu();
const route = useRoute();
const router = useRouter();
const { getLocal, saveLocal, getCloud, publish } = useDeckManager();

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "private",
  location: "local",
});

const filteredCards = ref([]);
const paginatedCards = ref([]);
const openFilter = ref(false);
const showDeck = ref(false);
const filterKey = ref(0);
const actionOnDeck = ref("info");
const leaderChoosen = ref(null);

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(paginatedCards);

const leaderCards = computed(() => {
  return allCards.filter((card) => card.type === "LEADER");
});

const builderCards = computed(() => {
  if (leaderChoosen.value != null) {
    return allCards.filter((card) => {
      const cardHasLeaderColor = leaderChoosen.value?.color?.some((item) =>
        card.color.includes(item)
      );

      const cardIsNotTypeLeader = card.type !== "LEADER";
      return cardIsNotTypeLeader && cardHasLeaderColor;
    });
  } else {
    return leaderCards.value.filter((card) => card.type === "LEADER");
  }
});

const singleCardsInDeck = computed(() => {
  const uniqueCards = new Map();
  currentDeck.value.cards.forEach((card) => {
    const cardData = allCards.find((c) => c.id === card);
    if (uniqueCards.has(cardData)) {
      uniqueCards.get(cardData).count++;
    } else {
      uniqueCards.set(cardData, { ...cardData, count: 1 });
    }
  });
  return Array.from(uniqueCards.values()).sort((a, b) => {
    return a.cost - b.cost || a.name.localeCompare(b.name);
  });
});

watch(openFilter, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});

function handleFilteredUpdate(newFiltered) {
  filteredCards.value = newFiltered;
}

function handlePaginatedUpdate(newPaginated) {
  paginatedCards.value = newPaginated;
}

function chooseLeader(cardId) {
  filterKey.value++;
  currentDeck.value.leader = cardId;
  const leaderCard = leaderCards.value.find((c) => c.id === cardId);
  leaderChoosen.value = leaderCard || null;
}

function getCopyInDeck(card) {
  return currentDeck.value.cards.filter((cId) => cId === card.id).length;
}

function addCardInDeck(card) {
  currentDeck.value.cards.push(card.id);
}

function removeCardFromDeck(cardToRemove) {
  const count = currentDeck.value.cards.filter(
    (id) => id === cardToRemove.id
  ).length;

  if (count > 1) {
    const idxToRemove = currentDeck.value.cards.lastIndexOf(cardToRemove.id);
    currentDeck.value.cards.splice(idxToRemove, 1);
  } else if (count === 1) {
    const idxToRemove = currentDeck.value.cards.indexOf(cardToRemove.id);
    currentDeck.value.cards.splice(idxToRemove, 1);
  }
}

watch(
  currentDeck,
  (current) => {
    saveLocal(current);
  },
  { deep: true }
);

async function getDeckFromSlug(slug) {
  if (!slug) return;
  // 1) Provo a prendere il draft locale
  const local = await getLocal(slug);
  if (local) {
    currentDeck.value = local;
    currentDeck.value.isPublished = true;
    chooseLeader(local.leader);
    return;
  }

  // 2) Non esiste in locale → prendo dal cloud e creo il draft
  const cloudDeck = await getCloud(slug);
  if (cloudDeck) {
    currentDeck.value = cloudDeck;
    currentDeck.value.isPublished = true;
    chooseLeader(cloudDeck.leader);
  }
}

async function saveDeck() {
  await publish(currentDeck.value);
  snackbar.addMessage("Deck salvato in locale con successo", "success");
  router.push(`/decks/${route.params.slug}`);
}

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}

onMounted(async () => {
  pageLoader.startLoading();
  await getDeckFromSlug(route.params.slug);
  pageLoader.stopLoading();
});

definePageMeta({
  ssr: false,
});

provide("cardsInDeck", currentDeck.value.cards);
provide("addCardInDeck", addCardInDeck);
provide("removeCardFromDeck", removeCardFromDeck);
provide("item", currentDeck);
provide("actionOnDeck", actionOnDeck);
</script>
<template>
  <section class="relative">
    <Toolbar :label="currentDeck.name" class="rounded-b-xl">
      <template #actions>
        <MobileFloatMenu>
          <template #buttons>
            <DialogsHandleDeleteDeck
              :slug="route.params.slug"
            />
            <v-btn
              :disabled="currentDeck.cards.length != 50"
              class="text-white"
              variant="text"
              @click="exportDeck"
            >
              <span class="text-xs mr-3">Esporta</span>
              <Icon
                class="text-2xl"
                icon="material-symbols:export-notes-outline"
              ></Icon>
            </v-btn>
            <v-btn class="text-white" variant="text" @click="saveDeck">
              <span class="text-xs mr-3">Salva</span>
              <Icon
                class="text-2xl"
                icon="material-symbols:save-rounded"
              ></Icon>
            </v-btn>
            <v-btn
              v-if="!showDeck && leaderChoosen"
              class="text-white"
              variant="text"
              @click="
                showDeck = true;
                mobileFloatMenu.close();
              "
            >
              <span class="text-xs mr-3">Mostra Mazzo</span>
              <Icon class="text-2xl" icon="mdi:show"></Icon>
            </v-btn>
            <v-btn
              v-else-if="showDeck && leaderChoosen"
              class="text-white"
              variant="text"
              @click="
                showDeck = false;
                mobileFloatMenu.close();
              "
            >
              <span class="text-xs mr-3">Lista Carte</span>
              <Icon class="text-2xl" icon="streamline:cards"></Icon>
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
      <template #info>
        <DecksTopInfo :leader-choosen="leaderChoosen" :current-deck="currentDeck" :toggle-cards="showDeck"/>
      </template>
    </Toolbar>
    <CardViewDeck
      v-if="showDeck"
      :single-cards-in-deck="singleCardsInDeck"
    />

    <div v-else>
      <h4
        v-if="paginatedCards.length == 0"
        class="text-center text-gray-500 my-5"
      >
        La ricerca non ha prodotto risultati
      </h4>
      <div class="grid grid-cols-2 gap-3 px-2 pt-2 pb-12 transition-all">
        <Card
          v-for="card in paginatedCards"
          :key="card.id"
          :card="card"
          :choose-card="!leaderChoosen"
          :handle-cards="leaderChoosen != null"
          @chooseCard="chooseLeader(card.id)"
          @addCard="addCardInDeck(card)"
          @removeCard="removeCardFromDeck(card)"
          :card-count="getCopyInDeck(card)"
          @open="openViewer(card)"
        >
        </Card>
      </div>
    </div>

    <CardViewPagination
      ref="pagination"
      :items="filteredCards"
      :itemsPerPage="32"
      @update:paginated="handlePaginatedUpdate"
    />
    <CardViewFilter
      :key="filterKey"
      v-show="openFilter"
      :cards-list="builderCards"
      @update:filtered="handleFilteredUpdate"
      @close="openFilter = false"
      :multicolor="false"
      :hide-color-filter="leaderChoosen != null"
      :hide-type-filter="leaderChoosen == null"
    />

    <!-- Viewer full-screen centralizzato -->
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="paginatedCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
