<script setup>
import { updateDeckVisibility } from "~/api/decks";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";
import { DeckLocation } from "~/enums/deckLocation";

const snackbar = useSnackbar();
const route = useRoute();
const pageLoader = usePageLoader();

const deckLocation = ref(route.query.location);

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "private",
  location: "bozza",
});
const leaderChoosen = ref(null);
const statsOpen = ref(false);
const router = useRouter();
const { allCards } = await useOnePieceCards();
const { getLocal, getCloud } = useDeckManager();


function goToEditDeck() {
  router.push(`/decks/edit/${route.params.slug}?location=${deckLocation.value}`);
}

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

const leaderCards = computed(() => {
  return allCards.filter((card) => card.type === "LEADER");
});

function chooseLeader(cardId) {
  currentDeck.value.leader = cardId;
  const leaderCard = leaderCards.value.find((c) => c.id === cardId);
  leaderChoosen.value = leaderCard || null;
}

async function getDeckFromSlug(slug) {
  if (!slug) return;
  // 1) Provo a prendere il draft locale
  const local = await getLocal(slug);
  const cloudDeck = await getCloud(slug);
  if (deckLocation.value === DeckLocation.BOZZA && local) {
    currentDeck.value = local;
    chooseLeader(local.leader);
    return;
  } else if (deckLocation.value === DeckLocation.CLOUD && cloudDeck) {
    currentDeck.value = cloudDeck;
    chooseLeader(cloudDeck.leader);
  }
}

const updateVisibility = async (newValue) => {
  await updateDeckVisibility(currentDeck.value.slug, newValue);
};

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}

onMounted(async () => {
  pageLoader.startLoading();
  await getDeckFromSlug(route.params.slug);
  pageLoader.stopLoading();
  if(leaderChoosen.value === null) {
    snackbar.addMessage("Mazzo non trovato", "error");
    router.push(`/decks/edit/${currentDeck.value.slug}?location=${deckLocation.value}`);
  }
});

definePageMeta({
  ssr: false,
});

provide("addCardInDeck", null);
provide("removeCardFromDeck", null);
provide("item", currentDeck);
</script>
<template>
  <Toolbar v-if="leaderChoosen" :label="`Mazzo ${currentDeck.name}`">
    <template #info>
      <DecksTopInfo :leader-choosen="leaderChoosen" :current-deck="currentDeck" />
    </template>
  </Toolbar>
  <CardViewDeck v-if="!statsOpen" :single-cards-in-deck="singleCardsInDeck" />
  <DecksStats v-else :current-deck="singleCardsInDeck" />
  <MobileFloatMenu :cols="currentDeck.isLocal ? 3 : 3">
    <template #buttons>
      <ButtonMenu
        v-show="statsOpen"
        @click="statsOpen = false"
        icon="material-symbols:cards"
        transition
        :delay="200"
        label="Panoramica"
      />

      <ButtonMenu
        v-show="!statsOpen"
        @click="statsOpen = true"
        icon="ion:stats-chart"
        transition
        :delay="200"
        label="Stats"
      />
      
      <ButtonMenu
        @click="goToEditDeck()"
        icon="iconoir:wrench"
        transition
        :delay="100"
        label="Modifica"
      />
      <!-- <DialogsHandleVisibility
        v-if="!currentDeck.isLocal"
        @update-visibility="(newValue) => updateVisibility(newValue)"
      /> -->
      <ButtonMenu
        @click="exportDeck()"
        icon="material-symbols:export-notes-outline"
        transition
        :delay="200"
        label="Esporta"
      />
    </template>
  </MobileFloatMenu>
</template>
