<script setup>
import ProfileSectionsTabs from "@/components/Tabs/ProfileSectionsTabs.vue";
import { fetchPublicDeckByUserTagAndSlug } from "@/api/decks";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const pageLoader = usePageLoader();

const profileTagSlug = computed(() => {
  const value = route.params?.tag;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});
const deckSlug = computed(() => {
  const value = route.params?.slug;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "public",
});
const leaderChoosen = ref(null);
const statsOpen = ref(false);
const availabilityOpen = ref(false);
const { allCards } = await useOnePieceCards();

const tabOptions = [
  {
    label: "Panoramica",
    value: "overview",
  },
  {
    label: "Stats",
    value: "stats",
  },
];
const activeTab = computed(() => (statsOpen.value ? "stats" : "overview"));

function setActiveTab(tab) {
  statsOpen.value = tab === "stats";
}

const singleCardsInDeck = computed(() => {
  const uniqueCards = new Map();
  const deckCards = Array.isArray(currentDeck.value.cards) ? currentDeck.value.cards : [];
  if (deckCards.length === 0) return [];

  deckCards.forEach((cardId) => {
    const cardData = allCards.find((card) => card.id === cardId);
    if (!cardData) return;

    if (uniqueCards.has(cardData.id)) {
      uniqueCards.get(cardData.id).count++;
    } else {
      uniqueCards.set(cardData.id, { ...cardData, count: 1 });
    }
  });

  return Array.from(uniqueCards.values()).sort((a, b) => a.cost - b.cost);
});

const leaderCards = computed(() => allCards.filter((card) => card.type === "LEADER"));

function chooseLeader(cardId) {
  currentDeck.value.leader = cardId;
  const leaderCard = leaderCards.value.find((card) => card.id === cardId);
  leaderChoosen.value = leaderCard || null;
}

function goToProfile() {
  if (!profileTagSlug.value) return;
  router.push(`/profile/${encodeURIComponent(profileTagSlug.value)}`);
}

async function loadPublicDeck() {
  if (!profileTagSlug.value || !deckSlug.value) return;

  pageLoader.startLoading();

  try {
    const publicDeck = await fetchPublicDeckByUserTagAndSlug(profileTagSlug.value, deckSlug.value);

    if (!publicDeck) {
      snackbar.addMessage("Mazzo non disponibile", "error");
      goToProfile();
      return;
    }

    currentDeck.value = publicDeck;
    chooseLeader(publicDeck.leader);
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore caricamento mazzo", "error");
    goToProfile();
  } finally {
    pageLoader.stopLoading();
  }
}

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}

watch([profileTagSlug, deckSlug], () => {
  loadPublicDeck();
}, { immediate: true });

definePageMeta({
  middleware: "auth",
  ssr: false,
});

provide("addCardInDeck", null);
provide("removeCardFromDeck", null);
provide("availabilityOpen", availabilityOpen);
</script>

<template>
  <Toolbar backButton fixed v-if="leaderChoosen" :label="`Mazzo ${currentDeck.name}`">
    <template #info>
      <DecksTopInfo :leader-choosen="leaderChoosen" :current-deck="currentDeck" />
      <DecksValue :cards="singleCardsInDeck" />
      <ProfileSectionsTabs
        :tabs="tabOptions"
        :active="activeTab"
        @change="setActiveTab"
      />
    </template>
  </Toolbar>
  <CardViewDeck v-if="!statsOpen" :single-cards-in-deck="singleCardsInDeck" />
  <DecksStats v-else :current-deck="singleCardsInDeck" />

  <MobileFloatMenu :cols="1">
    <template #buttons>
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
