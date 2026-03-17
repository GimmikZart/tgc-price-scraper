<script setup>
import { fetchFriendCollections } from "@/api/friends";
import { createDeckShare } from "@/api/deckShares";
import { usePageLoader } from "@/stores/usePageLoader";
import RelationProfilesPicker from "@/components/Friends/RelationProfilesPicker.vue";

const FRIEND_TAB = Object.freeze({
  FOLLOWING: "following",
  FOLLOWERS: "followers",
});

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const pageLoader = usePageLoader();

const { getCloud } = useDeckManager();

const currentDeck = ref(null);
const relationCollections = ref({
  following: [],
  followers: [],
});
const isLoadingRelations = ref(true);
const relationLoadError = ref(null);
const relationRequestId = ref(0);
const activeTab = ref(normalizeFriendTab(route.query.tab));

const searchInput = ref(extractQuery(route.query.q));
const submittedQuery = ref(extractQuery(route.query.q));
const hasSearched = ref(Boolean(submittedQuery.value));

const selectedReceiver = ref(null);
const confirmDialogRef = ref(null);
const isSendingDeck = ref(false);

const currentUserId = computed(() => useUserAuth()?.userLogged?.id ?? null);
const deckSlug = computed(() => {
  const rawSlug = route.params?.slug;
  if (Array.isArray(rawSlug)) return String(rawSlug[0] ?? "");
  return String(rawSlug ?? "");
});

function extractQuery(rawValue) {
  const normalizedValue = Array.isArray(rawValue)
    ? String(rawValue[0] ?? "")
    : String(rawValue ?? "");

  return normalizedValue.trim();
}

function normalizeFriendTab(value) {
  const normalizedValue = Array.isArray(value)
    ? String(value[0] ?? "")
    : String(value ?? "");

  switch (normalizedValue) {
    case FRIEND_TAB.FOLLOWERS:
      return FRIEND_TAB.FOLLOWERS;
    default:
      return FRIEND_TAB.FOLLOWING;
  }
}

function normalizeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeProfileSearchTokens(profile = {}) {
  return [
    profile?.display_name,
    profile?.username,
    profile?.user_tag,
  ]
    .map((value) => normalizeSearchValue(value))
    .filter(Boolean);
}

function matchesProfileQuery(profile, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  return normalizeProfileSearchTokens(profile).some((token) =>
    token.includes(normalizedQuery),
  );
}

const relationSearchResults = computed(() => {
  if (!hasSearched.value) return [];

  const normalizedQuery = normalizeSearchValue(submittedQuery.value);
  if (!normalizedQuery) return [];

  const uniqueProfiles = new Map();
  const allProfiles = [
    ...(relationCollections.value.following ?? []),
    ...(relationCollections.value.followers ?? []),
  ];

  allProfiles.forEach((profile) => {
    if (!profile?.id || !matchesProfileQuery(profile, normalizedQuery)) return;
    uniqueProfiles.set(profile.id, profile);
  });

  return Array.from(uniqueProfiles.values());
});

function setActiveTab(nextTab) {
  const normalizedTab = normalizeFriendTab(nextTab);
  if (normalizedTab === activeTab.value) return;

  activeTab.value = normalizedTab;
  router.replace({
    query: {
      ...route.query,
      tab: normalizedTab,
    },
  });
}

function selectReceiver(profile) {
  if (!profile?.id) return;
  selectedReceiver.value = profile;
  nextTick(() => {
    confirmDialogRef.value?.openDialog?.();
  });
}

async function loadDeck() {
  if (!deckSlug.value) {
    throw new Error("Deck non valido");
  }

  const deck = await getCloud(deckSlug.value);
  if (!deck) {
    throw new Error("Deck cloud non trovato");
  }

  currentDeck.value = deck;
}

async function loadRelationCollections() {
  if (!currentUserId.value) {
    relationCollections.value = {
      following: [],
      followers: [],
    };
    isLoadingRelations.value = false;
    return;
  }

  const currentRequestId = ++relationRequestId.value;
  isLoadingRelations.value = true;
  relationLoadError.value = null;

  try {
    const collections = await fetchFriendCollections(currentUserId.value);
    if (currentRequestId !== relationRequestId.value) return;

    relationCollections.value = {
      following: collections?.following ?? [],
      followers: collections?.followers ?? [],
    };
  } catch (error) {
    if (currentRequestId !== relationRequestId.value) return;

    relationCollections.value = {
      following: [],
      followers: [],
    };
    relationLoadError.value = error?.message || "Errore durante il caricamento relazioni";
    snackbar.addMessage(relationLoadError.value, "error");
  } finally {
    if (currentRequestId !== relationRequestId.value) return;
    isLoadingRelations.value = false;
  }
}

function runSearch() {
  const normalizedQuery = searchInput.value.trim();
  submittedQuery.value = normalizedQuery;
  hasSearched.value = Boolean(normalizedQuery);

  router.replace({
    query: {
      ...Object.fromEntries(
        Object.entries(route.query).filter(([key]) => key !== "q"),
      ),
      tab: activeTab.value,
      ...(normalizedQuery ? { q: normalizedQuery } : {}),
    },
  });
}

async function confirmSendDeck() {
  if (!selectedReceiver.value?.id || !currentDeck.value || isSendingDeck.value) return;

  isSendingDeck.value = true;

  try {
    await createDeckShare({
      receiverUserUuid: selectedReceiver.value.id,
      deck: currentDeck.value,
    });

    confirmDialogRef.value?.closeDialog?.();
    snackbar.addMessage("Deck inviato con successo", "success");
    router.push(`/me/decks/${encodeURIComponent(deckSlug.value)}?location=cloud`);
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'invio del deck", "error");
  } finally {
    isSendingDeck.value = false;
  }
}

watch(
  () => route.query.tab,
  (tabValue) => {
    activeTab.value = normalizeFriendTab(tabValue);
  },
);

watch(
  () => route.query.q,
  (queryValue) => {
    const normalizedQuery = extractQuery(queryValue);
    searchInput.value = normalizedQuery;
    submittedQuery.value = normalizedQuery;
    hasSearched.value = Boolean(normalizedQuery);
  },
);

watch(
  currentUserId,
  () => {
    loadRelationCollections();
  },
  { immediate: true },
);

onMounted(async () => {
  pageLoader.startLoading();

  try {
    await loadDeck();
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore caricamento dati", "error");
    router.push("/me/decks?location=cloud");
  } finally {
    pageLoader.stopLoading();
  }
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Invia deck" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-2">
      <div v-if="currentDeck" class="send-deck-context-card">
        <p class="send-deck-context-card__eyebrow">Deck selezionato</p>
        <p class="send-deck-context-card__title">{{ currentDeck.name }}</p>
        <p class="send-deck-context-card__text">
          Scegli un utente tra i tuoi seguiti o follower per inviargli una copia di questo deck.
        </p>
      </div>

      <RelationProfilesPicker
        :relation-collections="relationCollections"
        :active-tab="activeTab"
        :is-loading-relations="isLoadingRelations"
        :relation-load-error="relationLoadError"
        :search-results="relationSearchResults"
        :has-searched="hasSearched"
        :is-searching="false"
        :search-error="null"
        :submitted-query="submittedQuery"
        search-title="Cerca tra amici"
        search-idle-label="Usa la barra in basso per filtrare seguiti e follower."
        search-empty-label="Nessun amico trovato con questa ricerca."
        @change-tab="setActiveTab"
        @select="selectReceiver"
      />
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <input
            v-model="searchInput"
            type="text"
            inputmode="search"
            placeholder="Nome o user tag"
            class="send-deck-search-input"
            @keydown.enter.prevent="runSearch"
          />

          <button
            type="button"
            class="send-deck-search-button"
            @click="runSearch"
          >
            Cerca
          </button>
        </div>
      </template>
    </MobileFloatMenu>

    <DialogsGeneric ref="confirmDialogRef" :disabled="isSendingDeck">
      <template #button>
        <span class="send-deck-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Conferma invio</template>

      <template #content>
        <p class="send-deck-dialog-text">
          Vuoi inviare il deck
          <strong>{{ currentDeck?.name ?? "" }}</strong>
          a
          <strong>{{ selectedReceiver?.display_name ?? selectedReceiver?.username ?? "utente" }}</strong>?
        </p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isSendingDeck"
          @click="closeDialog"
        >
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="send-deck-dialog-accept"
          :loading="isSendingDeck"
          :disabled="isSendingDeck"
          @click="confirmSendDeck"
        >
          Invia
        </v-btn>
      </template>
    </DialogsGeneric>
  </section>
</template>

<style scoped>
.send-deck-context-card {
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.58);
  padding: 1rem;
}

.send-deck-context-card__eyebrow {
  margin: 0;
  color: rgba(255, 216, 177, 0.92);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.send-deck-context-card__title {
  margin: 0.35rem 0 0;
  color: rgba(248, 250, 252, 0.96);
  font-size: 1rem;
  font-weight: 700;
}

.send-deck-context-card__text {
  margin: 0.45rem 0 0;
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.9rem;
  line-height: 1.35;
}

.send-deck-search-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.78);
  color: rgba(248, 250, 252, 0.95);
  padding: 0.9rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.send-deck-search-input::placeholder {
  color: rgba(148, 163, 184, 0.82);
}

.send-deck-search-input:focus {
  border-color: rgba(255, 157, 82, 0.45);
  box-shadow: 0 0 0 2px rgba(255, 157, 82, 0.18);
  background: rgba(15, 23, 42, 0.92);
}

.send-deck-search-button {
  border: 1px solid rgba(255, 178, 125, 0.45);
  border-radius: 1rem;
  background: rgba(255, 122, 24, 0.2);
  color: #ffd7b3;
  min-height: 3.1rem;
  padding: 0 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.send-deck-search-button:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 178, 125, 0.65);
  background: rgba(255, 122, 24, 0.28);
}

.send-deck-dialog-text {
  margin: 0;
  color: rgba(241, 245, 249, 0.9);
  line-height: 1.4;
}

.send-deck-dialog-accept {
  border: 1px solid rgba(255, 183, 124, 0.4);
  background: linear-gradient(135deg, rgba(255, 122, 24, 0.92), rgba(173, 72, 11, 0.95));
  color: #fff7f0;
}

.send-deck-hidden-dialog-trigger {
  display: none;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
