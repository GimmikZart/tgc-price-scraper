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
const visibleCards = ref([]);            // <-- buffer visibile dall'InfiniteGrid
const openFilter = ref(false);
const showDeck = ref(false);
const filterKey = ref(0);
const actionOnDeck = ref("info");
const leaderChoosen = ref(null);

// Viewer: meglio su TUTTO il risultato (filteredCards)
const { show: viewerOpen, index: viewerIndex } = useCardViewer(filteredCards);

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
    // prima schermata: scegli un LEADER
    return leaderCards.value;
  }
});

const singleCardsInDeck = computed(() => {
  const unique = new Map();
  currentDeck.value.cards.forEach((cardId) => {
    const cardData = allCards.find((c) => c.id === cardId);
    if (!cardData) return;
    if (unique.has(cardData.id)) {
      unique.get(cardData.id).count++;
    } else {
      unique.set(cardData.id, { ...cardData, count: 1 });
    }
  });
  return Array.from(unique.values()).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
});

watch(openFilter, (v) => {
  document.documentElement.classList.toggle("overflow-hidden", v);
});

function handleFilteredUpdate(newFiltered) {
  // sostituisci interamente l’array per far reagire l’InfiniteGrid
  filteredCards.value = newFiltered.slice();
}

function chooseLeader(cardId) {
  filterKey.value++;
  currentDeck.value.leader = cardId;
  const leaderCard = leaderCards.value.find((c) => c.id === cardId);
  leaderChoosen.value = leaderCard || null;

  // reset lista filtrata sul nuovo insieme “builderCards”
  filteredCards.value = builderCards.value.slice();
}

function getCopyInDeck(card) {
  return currentDeck.value.cards.filter((cId) => cId === card.id).length;
}

function addCardInDeck(card) {
  currentDeck.value.cards.push(card.id);
}

function removeCardFromDeck(cardToRemove) {
  const idx = currentDeck.value.cards.lastIndexOf(cardToRemove.id);
  if (idx !== -1) currentDeck.value.cards.splice(idx, 1);
}

// persistenza locale del draft
watch(currentDeck, (current) => { saveLocal(current); }, { deep: true });

async function getDeckFromSlug(slug) {
  if (!slug) return;
  // 1) prova locale
  const local = await getLocal(slug);
  if (local) {
    currentDeck.value = local;
    currentDeck.value.isPublished = true;
    chooseLeader(local.leader);
    return;
  }
  // 2) fallback cloud
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

function openViewerFromItem(item) {
  const i = filteredCards.value.findIndex(c => c.id === item.id);
  if (i !== -1) {
    viewerIndex.value = i;
    viewerOpen.value = true;
  }
}

onMounted(async () => {
  pageLoader.startLoading();
  await getDeckFromSlug(route.params.slug);
  // prima popolazione lista (in base a leader / non leader)
  filteredCards.value = builderCards.value.slice();
  pageLoader.stopLoading();
});

definePageMeta({ ssr: false });

// provide per child (deck, card actions)
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
            <DialogsHandleDeleteDeck :slug="route.params.slug" />
            <v-btn
              :disabled="currentDeck.cards.length != 50"
              class="text-white"
              variant="text"
              @click="exportDeck"
            >
              <span class="text-xs mr-3">Esporta</span>
              <Icon class="text-2xl" icon="material-symbols:export-notes-outline" />
            </v-btn>
            <v-btn class="text-white" variant="text" @click="saveDeck">
              <span class="text-xs mr-3">Salva</span>
              <Icon class="text-2xl" icon="material-symbols:save-rounded" />
            </v-btn>
            <v-btn
              v-if="!showDeck && leaderChoosen"
              class="text-white"
              variant="text"
              @click="showDeck = true; mobileFloatMenu.close();"
            >
              <span class="text-xs mr-3">Mostra Mazzo</span>
              <Icon class="text-2xl" icon="mdi:show" />
            </v-btn>
            <v-btn
              v-else-if="showDeck && leaderChoosen"
              class="text-white"
              variant="text"
              @click="showDeck = false; mobileFloatMenu.close();"
            >
              <span class="text-xs mr-3">Lista Carte</span>
              <Icon class="text-2xl" icon="streamline:cards" />
            </v-btn>
            <v-btn class="text-white" variant="text" @click="openFilter = true; mobileFloatMenu.close();">
              <span class="text-xs mr-3">Filtra</span>
              <Icon class="text-2xl" icon="material-symbols:search-rounded" />
            </v-btn>
          </template>
        </MobileFloatMenu>
      </template>

      <template #info>
        <DecksTopInfo
          :leader-choosen="leaderChoosen"
          :current-deck="currentDeck"
          :toggle-cards="showDeck"
        />
      </template>
    </Toolbar>

    <!-- Sezione Mazzo -->
    <CardViewDeck
      v-if="showDeck"
      :single-cards-in-deck="singleCardsInDeck"
    />

    <!-- Lista carte (builder) -->
    <div v-else>
      <h4 v-if="visibleCards.length === 0" class="text-center text-gray-500 my-5">
        La ricerca non ha prodotto risultati
      </h4>

      <InfiniteGrid
        :items="filteredCards"
        :grid-class="['grid','grid-cols-2','gap-3','px-2','pt-2','pb-12','transition-all']"
        @update:visible="visibleCards = $event"
        :step="30"
        :load-threshold-px="500"
      >
        <template #default="{ item }">
          <Card
            :key="item.id"
            :card="item"
            :choose-card="!leaderChoosen"
            :handle-cards="leaderChoosen != null"
            @chooseCard="chooseLeader(item.id)"
            @addCard="addCardInDeck(item)"
            @removeCard="removeCardFromDeck(item)"
            :card-count="getCopyInDeck(item)"
            @open="openViewerFromItem(item)"
          />
        </template>
      </InfiniteGrid>
    </div>

    <!-- FILTRI -->
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

    <!-- Viewer -->
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="filteredCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
