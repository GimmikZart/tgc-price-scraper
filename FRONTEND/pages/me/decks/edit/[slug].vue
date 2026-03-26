<script setup>
import { Icon } from "@iconify/vue";
import ProfileSectionsTabs from "@/components/Tabs/ProfileSectionsTabs.vue";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";
import { DeckLocation } from "~/enums/deckLocation";

const snackbar = useSnackbar();
const pageLoader = usePageLoader();
const MAX_DECK_CARDS = 50;
const DECK_LIMIT_ERROR_MESSAGE = "Hai raggiunto il numero massimo di carte inseribili nel deck";



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
  location: DeckLocation.DEVICE,
});

const filteredCards = ref([]);
const visibleCards = ref([]);            // <-- buffer visibile dall'InfiniteGrid
const openFilter = ref(false);
const showDeck = ref(false);
const filterKey = ref(0);
const actionOnDeck = ref("info");
const leaderChoosen = ref(null);
const showPrice = ref(false)
const sortedCards = computed(() => sort.applySort(filteredCards.value))
const tabOptions = [
  {
    label: "Panoramica",
    value: "overview",
  },
  {
    label: "Catalogo Carte",
    value: "catalog",
  },
];
const activeTab = computed(() => (showDeck.value ? "overview" : "catalog"));

const sort = useCardSort('publish_date', 'desc')

const gridRef = ref(null)
const gridKey = ref(0);
const scroller = ref(null)

// Viewer: meglio su TUTTO il risultato (sortedCards)
const { show: viewerOpen, index: viewerIndex } = useCardViewer(sortedCards);

useScrollAnchor({
  scroller,
  headerOffset: 0,
  triggerVariable: visibleCards,
})

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

const oncardClickIcon = computed(() => {
  if (actionOnDeck.value === "add") return "streamline-ultimate:card-add-1-bold";
  if (actionOnDeck.value === "remove") return "hugeicons:file-remove";
  return "lucide:info";
});

watch(openFilter, (v) => {
  document.documentElement.classList.toggle("overflow-hidden", v);
});

function handleFilteredUpdate(newFiltered) {
  // sostituisci interamente l’array per far reagire l’InfiniteGrid
  filteredCards.value = newFiltered.slice();
}

function chooseLeader(cardOrId) {
  const cardId = typeof cardOrId === "object" ? cardOrId?.id : cardOrId;
  if (!cardId) return;
  filterKey.value++;
  currentDeck.value.leader = cardId;
  const leaderCard = leaderCards.value.find((c) => c.id === cardId);
  leaderChoosen.value = leaderCard || null;

  // reset lista filtrata sul nuovo insieme “builderCards”
  filteredCards.value = builderCards.value.slice();
}

function setActiveTab(tab) {
  if (tab === "overview" && !leaderChoosen.value) {
    snackbar.addMessage("Scegli prima un leader", "error");
    return;
  }

  showDeck.value = tab === "overview";
}

function getCopyInDeck(card) {
  return currentDeck.value.cards.filter((cId) => cId === card.id).length;
}

function showDeckLimitReachedError() {
  snackbar.addMessage(DECK_LIMIT_ERROR_MESSAGE, "error");
}

function addCardInDeck(card) {
  if (currentDeck.value.cards.length >= MAX_DECK_CARDS) {
    showDeckLimitReachedError();
    return;
  }

  currentDeck.value.cards.push(card.id);
}

function removeCardFromDeck(cardToRemove) {
  const idx = currentDeck.value.cards.lastIndexOf(cardToRemove.id);
  if (idx !== -1) currentDeck.value.cards.splice(idx, 1);
}

function setDeckAction(nextAction) {
  if (nextAction === "add" && currentDeck.value.cards.length >= MAX_DECK_CARDS) {
    showDeckLimitReachedError();
    return;
  }

  actionOnDeck.value = nextAction;
}

// Persistenza locale del deck sul dispositivo
watch(currentDeck, (current) => { saveLocal(current); }, { deep: true });

async function getDeckFromSlug(slug) {
  if (!slug) return;
  // 1) prova locale
  const local = await getLocal(slug);
  if (local) {
    currentDeck.value = local;
    currentDeck.value.isPublished = false;
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

async function saveCloudDeck() {
  await publish(currentDeck.value);
  snackbar.addMessage("Deck salvato in cloud con successo", "success");
  router.push(`/me/decks/${route.params.slug}?location=${DeckLocation.CLOUD}`);
}
async function saveLocalDeck() {
  await saveLocal(currentDeck.value);
  snackbar.addMessage("Deck salvato sul dispositivo con successo", "success");
  router.push(`/me/decks/${route.params.slug}?location=${DeckLocation.DEVICE}`);
}

function exportDeck() {
  snackbar.addMessage("Il deck deve contenere esattamente 50 carte per essere esportato", "error");
  if(currentDeck.value.cards.length == MAX_DECK_CARDS){
    copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
    snackbar.addMessage("Deck copiato negli appunti", "success");
  } else {
    snackbar.addMessage("Il deck deve contenere esattamente 50 carte per essere esportato", "error");
  }
}

function openViewerFromItem(item) {
  const i = sortedCards.value.findIndex(c => c.id === item.id);
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
  if(leaderChoosen.value != null) showDeck.value = true;
});

definePageMeta({
    middleware: 'auth',
    ssr: false
})

// provide per child (deck, card actions)
provide("cardsInDeck", currentDeck.value.cards);
provide("addCardInDeck", addCardInDeck);
provide("removeCardFromDeck", removeCardFromDeck);
provide("item", currentDeck);
provide("actionOnDeck", actionOnDeck);
</script>

<template>
  <section class="relative">
    <Toolbar fixed backButton :label="`Modifica ${currentDeck.name}`" class="rounded-b-xl">
      <template #info>
        <DecksTopInfo
          :leader-choosen="leaderChoosen"
          :current-deck="currentDeck"
          :toggle-cards="showDeck"
        />
        <DecksValue :cards="singleCardsInDeck" />
        <ProfileSectionsTabs
          :tabs="tabOptions"
          :active="activeTab"
          @change="setActiveTab"
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
        :items="sortedCards"
        :grid-class="['grid','grid-cols-2','gap-3','px-2','pt-2','pb-12','transition-all']"
        @update:visible="visibleCards = $event"
        :step="30"
        :load-threshold-px="500"
      >
        <template #default="{ item }">
          <Card
            :key="item.id"
            :card="item"
            :show-price="showPrice"
            :choose-card="!leaderChoosen"
            :handle-cards="leaderChoosen != null"
            @chooseCard="chooseLeader"
            @addCard="addCardInDeck"
            @removeCard="removeCardFromDeck"
            :card-count="getCopyInDeck(item)"
            @open="openViewerFromItem"
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
      :is-leader-filter="leaderChoosen == null"
    />

    <MobileFloatMenu v-if="showDeck && leaderChoosen" :cols="3">
      <template #buttons>
        <DialogsHandleDeleteDeck :slug="route.params.slug" />
        <ButtonMenu
          icon="material-symbols:save-rounded"
          label="Salva"
          multi
          transition
          :delay="100"
        >
          <template #buttons>
            <ButtonMenu
              icon="ic:baseline-cloud-done"
              label="Salva nel cloud"
              transition
              icon-color="green"
              :delay="100"
              @click="saveCloudDeck()"
            />
            <ButtonMenu
              icon="material-symbols:save-as-outline"
              label="Salva su dispositivo"
              transition
              :delay="0"
              @click="saveLocalDeck()"
            />
          </template>
        </ButtonMenu>

        <ButtonMenu
          :icon="oncardClickIcon"
          label="Al click"
          multi
          transition
          :delay="200"
        >
          <template #buttons>
            <ButtonMenu
              icon="hugeicons:file-remove"
              label="Rimuovi"
              transition
              :delay="0"
              @click="setDeckAction('remove')"
            />
            <ButtonMenu
              icon="streamline-ultimate:card-add-1-bold"
              label="Aggiungi"
              transition
              :delay="100"
              @click="setDeckAction('add')"
            />
            <ButtonMenu
              icon="lucide:info"
              label="Info"
              transition
              :delay="200"
              @click="setDeckAction('info')"
            />
          </template>
        </ButtonMenu>

      </template>
    </MobileFloatMenu>

    <MobileFloatMenu v-else :cols="3">
      <template #buttons>
        <ButtonMenu
          icon="solar:tag-price-outline"
          label="Prezzi"
          transition
          :delay="200"
          :class="{
            'opacity-50': !showPrice
          }"
          @click="showPrice = !showPrice"
        />

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
          @click="
            openFilter = true;
            mobileFloatMenu.close();
          "
        />
      </template>
    </MobileFloatMenu>

    <!-- Viewer -->
    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="sortedCards"
      @close="viewerOpen = false"
    />
  </section>
</template>
