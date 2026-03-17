<script setup>
import ProfileSectionsTabs from "@/components/Tabs/ProfileSectionsTabs.vue";
import { updateDeckVisibility } from "~/api/decks";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";
import { DeckLocation, normalizeDeckLocation } from "~/enums/deckLocation";
import { publicPrivateVisibilityOptions } from "~/enums/visibility";
import {
  fetchCardCountInCollection
} from "@/api/collection";

const userAuth = useUserAuth();
const snackbar = useSnackbar();
const route = useRoute();
const pageLoader = usePageLoader();

const deckLocation = ref(normalizeDeckLocation(route.query.location));

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "private",
  location: DeckLocation.DEVICE,
});
const leaderChoosen = ref(null);
const statsOpen = ref(false);
const availabilityOpen = ref(false);
const isUpdatingVisibility = ref(false);
const router = useRouter();
const { allCards } = await useOnePieceCards();
const { getLocal, getCloud } = useDeckManager();
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
const isCloudDeckView = computed(() => deckLocation.value === DeckLocation.CLOUD);
const floatMenuCols = computed(() => {
  if (isCloudDeckView.value) {
    return statsOpen.value ? 3 : 4;
  }

  return statsOpen.value ? 2 : 3;
});


function goToEditDeck() {
  router.push(`/me/decks/edit/${route.params.slug}?location=${deckLocation.value}`);
}

function goToSendDeck() {
  if (!isCloudDeckView.value) {
    snackbar.addMessage("Puoi inviare solo deck salvati nel cloud", "error");
    return;
  }

  router.push(`/me/decks/send/${route.params.slug}`);
}

function setActiveTab(tab) {
  statsOpen.value = tab === "stats";
}

const singleCardsInDeck = computed(() => {
  const uniqueCards = new Map(); 
  if( currentDeck.value.cards.length == 0) return [];
  
  currentDeck.value.cards.forEach((card) => {
    
    const cardData = allCards.find((c) => c.id === card);
    if (!cardData) return;

    if (uniqueCards.has(cardData)) {
      uniqueCards.get(cardData).count++;
    } else {
      uniqueCards.set(cardData, { ...cardData, count: 1 });
    }
    
  });
  return Array.from(uniqueCards.values()).sort((a, b) => {
    return a.cost - b.cost;
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
  // 1) Provo a prendere il deck salvato sul dispositivo
  const local = await getLocal(slug);
  const cloudDeck = await getCloud(slug);
  if (deckLocation.value === DeckLocation.DEVICE && local) {
    currentDeck.value = local;
    chooseLeader(local.leader);
    return;
  } else if (deckLocation.value === DeckLocation.CLOUD && cloudDeck) {
    currentDeck.value = cloudDeck;
    chooseLeader(cloudDeck.leader);
  }
}

async function setCardsInCollectionCounts(){
  const userId = userAuth.userLogged?.id;
  await singleCardsInDeck.value.map(async (card) => {
    const cardInCollection = await fetchCardCountInCollection(userId, card.id);
    card.userCountInCollection = cardInCollection || 0;
  });
}

async function updateVisibility(newValue) {
  if (!isCloudDeckView.value || !currentDeck.value?.slug || isUpdatingVisibility.value) return;

  const previousVisibility = currentDeck.value.visibility;
  if (newValue === previousVisibility) return;

  isUpdatingVisibility.value = true;

  try {
    const updatedDeck = await updateDeckVisibility(currentDeck.value.slug, newValue);
    currentDeck.value.visibility = updatedDeck?.visibility ?? newValue;
    snackbar.addMessage("Visibilita aggiornata", "success");
  } catch (error) {
    currentDeck.value.visibility = previousVisibility;
    snackbar.addMessage(error?.message || "Errore aggiornamento visibilita", "error");
  } finally {
    isUpdatingVisibility.value = false;
  }
}

function exportDeckForSimulator() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}

onMounted(async () => {
  pageLoader.startLoading();
  await getDeckFromSlug(route.params.slug);
  pageLoader.stopLoading();
  if(leaderChoosen.value === null) {
    snackbar.addMessage("Mazzo non trovato", "error");
    router.push(`/me/decks/edit/${route.params.slug}?location=${deckLocation.value}`);
  }
  await setCardsInCollectionCounts();
});

watch(
  () => route.query.location,
  (newLocation) => {
    const normalizedLocation = normalizeDeckLocation(newLocation);
    deckLocation.value = normalizedLocation;

    if (typeof newLocation === "string" && newLocation !== normalizedLocation) {
      router.replace({
        query: {
          ...route.query,
          location: normalizedLocation,
        },
      });
    }
  },
);

definePageMeta({
  middleware: 'auth',
  ssr: false,
});


provide("addCardInDeck", null);
provide("removeCardFromDeck", null);
provide("item", currentDeck);
provide("availabilityOpen", availabilityOpen);

</script>
<template>
  <Toolbar backButton fixed v-if="leaderChoosen" :label="`Mazzo ${currentDeck.name}`">
    <template #info>
      <DecksTopInfo :leader-choosen="leaderChoosen" :current-deck="currentDeck" />
      <DecksCost v-if="availabilityOpen" :cards="singleCardsInDeck" />
      <DecksValue v-else :cards="singleCardsInDeck" />
      <ProfileSectionsTabs
        :tabs="tabOptions"
        :active="activeTab"
        @change="setActiveTab"
      />
    </template>
  </Toolbar>
  <CardViewDeck v-if="!statsOpen" :single-cards-in-deck="singleCardsInDeck" />
  <DecksStats v-else :current-deck="singleCardsInDeck" />
  
  <MobileFloatMenu :cols="floatMenuCols">
    <template #buttons>
      <ButtonMenu
        icon="material-symbols:export-notes-outline"
        transition
        :delay="200"
        label="Esporta"
        multi
      >
        <template #buttons>
          <ButtonMenu
            icon="material-symbols:terminal-rounded"
            transition
            :delay="0"
            label="Simulatore"
            @click="exportDeckForSimulator()"
          />
          <ButtonMenu
            v-if="isCloudDeckView"
            icon="mdi:account-arrow-right-outline"
            transition
            :delay="100"
            label="Invia ad amico"
            @click="goToSendDeck()"
          />
        </template>
      </ButtonMenu>
      <DialogsHandleVisibility
        v-if="isCloudDeckView"
        :options="publicPrivateVisibilityOptions"
        :disabled="isUpdatingVisibility"
        @update-visibility="updateVisibility"
      />
      <ButtonMenu
        v-show="!statsOpen"
        @click="availabilityOpen = !availabilityOpen"
        icon="fluent:shifts-availability-24-regular"
        transition
        :delay="100"
        label="Disponibilità"
        :class="{
            'opacity-40': !availabilityOpen
          }"
      />
      <ButtonMenu
        @click="goToEditDeck()"
        icon="iconoir:wrench"
        transition
        :delay="200"
        label="Modifica"
      />
    </template>
  </MobileFloatMenu>
</template>
