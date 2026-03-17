<script setup>
import ProfileSectionsTabs from "@/components/Tabs/ProfileSectionsTabs.vue";
import { fetchPublicDeckByUserTagAndSlug } from "@/api/decks";
import {
  DeckShareStatus,
  acceptDeckShare,
  fetchDeckShareById,
  rejectDeckShare,
} from "@/api/deckShares";
import { copyDeckOnClipboard } from "@/utilities/copyDeckOnClipboard";
import { usePageLoader } from "@/stores/usePageLoader";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const pageLoader = usePageLoader();
const userAuth = useUserAuth();

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
const shareId = computed(() => {
  const value = route.query?.shareId;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});
const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);

const currentDeck = ref({
  name: "",
  slug: "",
  leader: null,
  cards: [],
  visibility: "public",
});
const currentShare = ref(null);
const leaderChoosen = ref(null);
const statsOpen = ref(false);
const availabilityOpen = ref(false);
const isAcceptingDeck = ref(false);
const isRejectingDeck = ref(false);
const acceptDeckName = ref("");
const acceptDeckFormRef = ref(null);
const { allCards } = await useOnePieceCards();

const acceptNameRules = {
  required: (v) => !!String(v ?? "").trim() || "Il nome del mazzo è obbligatorio.",
  safeName: (v) =>
    /^[A-Za-z0-9 ]+$/.test(String(v ?? "").trim()) ||
    "Il nome può contenere solo lettere, numeri e spazi.",
};

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
const isReceivedShareView = computed(() => Boolean(currentShare.value?.id));
const canManageReceivedShare = computed(() => (
  isReceivedShareView.value
  && currentShare.value?.status === DeckShareStatus.Pending
  && String(currentShare.value?.receiver_user_uuid ?? "") === String(currentUserId.value ?? "")
));
const floatMenuCols = computed(() => (canManageReceivedShare.value ? 2 : 1));

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
  if (!profileTagSlug.value) {
    router.push("/me/decks?location=cloud");
    return;
  }

  router.push(`/profile/${encodeURIComponent(profileTagSlug.value)}`);
}

async function loadSharedDeck() {
  if (!shareId.value) return false;

  const sharedDeck = await fetchDeckShareById(shareId.value);
  if (!sharedDeck) {
    snackbar.addMessage("Deck condiviso non disponibile", "error");
    router.push("/me/decks?location=received");
    return true;
  }

  currentShare.value = sharedDeck;
  currentDeck.value = {
    name: sharedDeck.name,
    slug: sharedDeck.slug,
    leader: sharedDeck.leader,
    cards: sharedDeck.cards,
    visibility: "private",
  };
  acceptDeckName.value = sharedDeck.name;
  chooseLeader(sharedDeck.leader);

  return true;
}

async function loadPublicDeck() {
  if (!profileTagSlug.value || !deckSlug.value) return;

  try {
    const publicDeck = await fetchPublicDeckByUserTagAndSlug(profileTagSlug.value, deckSlug.value);

    if (!publicDeck) {
      snackbar.addMessage("Mazzo non disponibile", "error");
      goToProfile();
      return;
    }

    currentShare.value = null;
    currentDeck.value = publicDeck;
    chooseLeader(publicDeck.leader);
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore caricamento mazzo", "error");
    goToProfile();
  }
}

async function loadDeckView() {
  pageLoader.startLoading();

  try {
    if (shareId.value) {
      const handledSharedDeck = await loadSharedDeck();
      if (handledSharedDeck) return;
    }

    await loadPublicDeck();
  } finally {
    pageLoader.stopLoading();
  }
}

function exportDeck() {
  copyDeckOnClipboard(leaderChoosen.value, singleCardsInDeck.value);
  snackbar.addMessage("Deck copiato negli appunti", "success");
}

async function confirmAcceptShare(closeDialog) {
  if (!currentShare.value?.id || isAcceptingDeck.value) return;

  const validation = await acceptDeckFormRef.value?.validate?.();
  if (validation && !validation.valid) return;

  isAcceptingDeck.value = true;

  try {
    const acceptedDeck = await acceptDeckShare({
      shareId: currentShare.value.id,
      deckName: acceptDeckName.value,
    });

    closeDialog?.();
    snackbar.addMessage("Deck accettato con successo", "success");

    if (acceptedDeck?.slug) {
      router.push(`/me/decks/${encodeURIComponent(acceptedDeck.slug)}?location=cloud`);
      return;
    }

    router.push("/me/decks?location=cloud");
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'accettazione del deck", "error");
  } finally {
    isAcceptingDeck.value = false;
  }
}

async function confirmRejectShare(closeDialog) {
  if (!currentShare.value?.id || isRejectingDeck.value) return;

  isRejectingDeck.value = true;

  try {
    await rejectDeckShare({
      shareId: currentShare.value.id,
    });

    closeDialog?.();
    snackbar.addMessage("Deck rifiutato", "success");
    router.push("/me/decks?location=received");
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il rifiuto del deck", "error");
  } finally {
    isRejectingDeck.value = false;
  }
}

watch([profileTagSlug, deckSlug, shareId], () => {
  loadDeckView();
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

  <MobileFloatMenu :cols="floatMenuCols">
    <template #buttons>
      <template v-if="canManageReceivedShare">
        <DialogsGeneric
          :disabled="isAcceptingDeck"
          accept-label="Accetta"
          accept-color="green"
        >
          <template #button>
            <ButtonMenu
              icon="mdi:check-bold"
              transition
              :delay="100"
              label="Accetta"
              icon-color="green"
            />
          </template>

          <template #title>Accetta deck</template>

          <template #content>
            <v-form ref="acceptDeckFormRef">
              <v-text-field
                v-model="acceptDeckName"
                label="Nome deck"
                density="compact"
                variant="outlined"
                :rules="[acceptNameRules.required]"
                hint="Il deck sarà salvato nel cloud come privato."
                persistent-hint
              />
            </v-form>
          </template>

          <template #actions="{ closeDialog }">
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="isAcceptingDeck"
              @click="closeDialog"
            >
              Annulla
            </v-btn>
            <v-btn
              variant="flat"
              class="deck-share-accept-btn"
              :loading="isAcceptingDeck"
              :disabled="isAcceptingDeck"
              @click="confirmAcceptShare(closeDialog)"
            >
              Accetta
            </v-btn>
          </template>
        </DialogsGeneric>

        <DialogsGeneric
          :disabled="isRejectingDeck"
          accept-label="Rifiuta"
          accept-color="red"
        >
          <template #button>
            <ButtonMenu
              icon="mdi:close-thick"
              transition
              :delay="200"
              label="Rifiuta"
              icon-color="red"
            />
          </template>

          <template #title>Rifiuta deck</template>

          <template #content>
            <p class="deck-share-dialog-text">
              Sei sicuro di voler rifiutare questo deck ricevuto?
            </p>
          </template>

          <template #actions="{ closeDialog }">
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="isRejectingDeck"
              @click="closeDialog"
            >
              Annulla
            </v-btn>
            <v-btn
              variant="flat"
              class="deck-share-reject-btn"
              :loading="isRejectingDeck"
              :disabled="isRejectingDeck"
              @click="confirmRejectShare(closeDialog)"
            >
              Rifiuta
            </v-btn>
          </template>
        </DialogsGeneric>
      </template>

      <ButtonMenu
        v-else
        @click="exportDeck()"
        icon="material-symbols:export-notes-outline"
        transition
        :delay="200"
        label="Esporta"
      />
    </template>
  </MobileFloatMenu>
</template>

<style scoped>
.deck-share-dialog-text {
  margin: 0;
  color: rgba(241, 245, 249, 0.9);
  line-height: 1.4;
}

.deck-share-accept-btn {
  border: 1px solid rgba(74, 222, 128, 0.32);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.88), rgba(21, 128, 61, 0.95));
  color: #f3fff7;
}

.deck-share-reject-btn {
  border: 1px solid rgba(248, 113, 113, 0.36);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(153, 27, 27, 0.95));
  color: #fff4f4;
}
</style>
