<script setup>
import { Icon } from "@iconify/vue";
import { updateDeckVisibility } from "~/api/decks";
import { getVisibilityLabel } from "~/enums/visibility";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";

const snackbar = useSnackbar();
const route = useRoute();
const pageLoader = usePageLoader();

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "private",
  location: "local",
});
const leaderChoosen = ref(null);
const router = useRouter();
const { allCards } = await useOnePieceCards();
const mobileFloatMenu = useMobileFloatMenu();
const { getLocal, getCloud } = useDeckManager();


function goToEditDeck() {
  router.push(`/decks/edit/${route.params.slug}`);
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
  if (local) {
    currentDeck.value = local;
    chooseLeader(local.leader);
    return;
  }

  // 2) Non esiste in locale → prendo dal cloud e creo il draft
  const cloudDeck = await getCloud(slug);
  if (cloudDeck) {
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
    router.push(`/decks/edit/${currentDeck.value.slug}`);
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
  <CardViewDeck :single-cards-in-deck="singleCardsInDeck" />
  <MobileFloatMenu :cols="4">
    <template #buttons>
      <DialogsHandleDeleteDeck :slug="route.params.slug"/>
      <button
        class="text-white border border-white p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
        @click="goToEditDeck()">
        <Icon class="text-2xl" icon="iconoir:wrench"></Icon>
        <span class="text-xs">Modifica</span>
      </button>
      <DialogsHandleVisibility
        v-if="!currentDeck.isLocal"
        @update-visibility="(newValue) => updateVisibility(newValue)"
      />
      <button
        class="text-white border border-white p-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
        :disabled="currentDeck.cards.length != 50"
        variant="text"
        @click="exportDeck()"
      >
      <Icon
        class="text-2xl"
        icon="material-symbols:export-notes-outline"
      ></Icon>
        <span class="text-xs">Esporta</span>
      </button>
    </template>
  </MobileFloatMenu>
</template>
