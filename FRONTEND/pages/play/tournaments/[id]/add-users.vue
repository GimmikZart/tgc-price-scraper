<script setup>
import { fetchFriendCollections, searchDiscoverableProfiles } from "@/api/friends";
import {
  addTournamentParticipantByOrganizer,
  fetchTournamentDetails,
  TournamentParticipantStatus,
  TournamentStatus,
} from "@/api/tournaments";
import RelationProfilesPicker from "@/components/Friends/RelationProfilesPicker.vue";

const FRIEND_TAB = Object.freeze({
  FOLLOWING: "following",
  FOLLOWERS: "followers",
});

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

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
const searchResults = ref([]);
const hasSearched = ref(Boolean(submittedQuery.value));
const isSearching = ref(false);
const searchError = ref(null);
const searchRequestId = ref(0);

const isLoadingTournament = ref(true);
const tournamentLoadError = ref(null);
const tournamentDetails = ref(null);
const isAddingProfileId = ref(null);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const tournamentId = computed(() => String(route.params.id ?? "").trim());
const tournament = computed(() => tournamentDetails.value?.tournament ?? null);
const participants = computed(() => tournamentDetails.value?.participants ?? []);
const toolbarLabel = computed(() => {
  const tournamentName = String(tournament.value?.name ?? "").trim();
  return tournamentName ? `Invita: ${tournamentName}` : "Aggiungi utenti";
});

const joinedParticipantsCount = computed(() => {
  return participants.value.filter((participant) => participant?.status !== TournamentParticipantStatus.Withdrawn).length;
});

const availableSlots = computed(() => {
  const maxParticipants = Number(tournament.value?.max_participants ?? 0);
  if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) return 0;
  return Math.max(maxParticipants - joinedParticipantsCount.value, 0);
});

const isOrganizer = computed(() => {
  return String(tournament.value?.organizer_id ?? "") === String(currentUserId.value ?? "");
});

const canManageParticipants = computed(() => {
  if (!tournament.value) return false;
  if (!isOrganizer.value) return false;
  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.value.status)) return false;
  return availableSlots.value > 0;
});

const enrolledProfileIds = computed(() => {
  return new Set(
    participants.value
      .filter((participant) => participant?.status !== TournamentParticipantStatus.Withdrawn)
      .map((participant) => String(participant?.profile_id ?? ""))
      .filter(Boolean),
  );
});

function isListableProfile(profile) {
  const profileId = String(profile?.id ?? "");
  if (!profileId) return false;
  if (profileId === String(currentUserId.value ?? "")) return false;
  if (profileId === String(tournament.value?.organizer_id ?? "")) return false;
  if (enrolledProfileIds.value.has(profileId)) return false;
  return true;
}

const listableRelationCollections = computed(() => ({
  following: (relationCollections.value.following ?? []).filter((profile) => {
    return isListableProfile(profile);
  }),
  followers: (relationCollections.value.followers ?? []).filter((profile) => {
    return isListableProfile(profile);
  }),
}));

const relationProfileIds = computed(() => {
  const allProfiles = [
    ...(listableRelationCollections.value.following ?? []),
    ...(listableRelationCollections.value.followers ?? []),
  ];

  return new Set(allProfiles.map((profile) => String(profile?.id ?? "")));
});

const listableSearchResults = computed(() => {
  if (!Array.isArray(searchResults.value)) return [];

  return searchResults.value.filter((profile) => {
    const profileId = String(profile?.id ?? "");
    if (!isListableProfile(profile)) return false;
    return !relationProfileIds.value.has(profileId);
  });
});

const tournamentInfoMessage = computed(() => {
  if (!tournament.value) return null;
  if (!isOrganizer.value) return "Solo l'organizzatore puo aggiungere utenti a questo torneo.";
  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.value.status)) {
    return "Puoi aggiungere utenti solo finche il torneo non e ancora partito.";
  }
  if (availableSlots.value <= 0) {
    return "Il torneo ha raggiunto il numero massimo di partecipanti.";
  }

  return `${joinedParticipantsCount.value} / ${tournament.value.max_participants ?? "-"} iscritti`;
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

async function loadTournament() {
  if (!tournamentId.value) {
    tournamentLoadError.value = "Torneo non valido";
    isLoadingTournament.value = false;
    return;
  }

  isLoadingTournament.value = true;
  tournamentLoadError.value = null;

  try {
    const details = await fetchTournamentDetails(tournamentId.value);
    if (!details?.tournament) {
      throw new Error("Torneo non trovato");
    }

    tournamentDetails.value = details;
  } catch (error) {
    tournamentDetails.value = null;
    tournamentLoadError.value = error?.message || "Errore durante il caricamento torneo";
    snackbar.addMessage(tournamentLoadError.value, "error");
  } finally {
    isLoadingTournament.value = false;
  }
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

async function runSearch() {
  const normalizedQuery = searchInput.value.trim();
  submittedQuery.value = normalizedQuery;
  searchError.value = null;

  router.replace({
    query: {
      ...Object.fromEntries(
        Object.entries(route.query).filter(([key]) => key !== "q"),
      ),
      tab: activeTab.value,
      ...(normalizedQuery ? { q: normalizedQuery } : {}),
    },
  });

  if (!normalizedQuery) {
    searchResults.value = [];
    hasSearched.value = false;
    return;
  }

  hasSearched.value = true;
  isSearching.value = true;
  const requestId = ++searchRequestId.value;

  try {
    const profiles = await searchDiscoverableProfiles(normalizedQuery);
    if (requestId !== searchRequestId.value) return;
    searchResults.value = profiles ?? [];
  } catch (error) {
    if (requestId !== searchRequestId.value) return;

    searchResults.value = [];
    searchError.value = error?.message || "Errore durante la ricerca utenti";
    snackbar.addMessage(searchError.value, "error");
  } finally {
    if (requestId !== searchRequestId.value) return;
    isSearching.value = false;
  }
}

async function handleSelectProfile(profile) {
  const profileId = String(profile?.id ?? "");
  if (!profileId || isAddingProfileId.value) return;

  if (!canManageParticipants.value) {
    snackbar.addMessage(tournamentInfoMessage.value || "Non puoi aggiungere utenti in questo momento", "warning");
    return;
  }

  isAddingProfileId.value = profileId;

  try {
    await addTournamentParticipantByOrganizer({
      tournamentId: tournamentId.value,
      profileId,
    });

    snackbar.addMessage(
      `${profile?.display_name ?? profile?.username ?? "Utente"} aggiunto al torneo`,
      "success",
    );
    await loadTournament();
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'aggiunta utente", "error");
  } finally {
    isAddingProfileId.value = null;
  }
}

watch(
  () => route.query.q,
  (queryValue) => {
    const normalizedQuery = extractQuery(queryValue);
    searchInput.value = normalizedQuery;

    if (normalizedQuery === submittedQuery.value) return;

    submittedQuery.value = normalizedQuery;

    if (!normalizedQuery) {
      searchResults.value = [];
      hasSearched.value = false;
      searchError.value = null;
    }
  },
);

watch(
  () => route.query.tab,
  (tabValue) => {
    activeTab.value = normalizeFriendTab(tabValue);
  },
);

watch(
  currentUserId,
  () => {
    void loadRelationCollections();
  },
  { immediate: true },
);

watch(
  () => route.params.id,
  () => {
    void loadTournament();
  },
  { immediate: true },
);

onMounted(() => {
  if (!submittedQuery.value) return;
  void runSearch();
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar :label="toolbarLabel" fixed back-button>
      <template #info>
        <p
          v-if="isLoadingTournament"
          class="add-users-toolbar-message"
        >
          Caricamento torneo...
        </p>

        <p
          v-else-if="tournamentLoadError"
          class="add-users-toolbar-message add-users-toolbar-message--error"
        >
          {{ tournamentLoadError }}
        </p>

        <p
          v-else-if="tournamentInfoMessage"
          class="add-users-toolbar-message"
        >
          {{ tournamentInfoMessage }}
        </p>
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-2">
      <template v-if="isLoadingTournament">
        <p class="add-users-state-message">Caricamento torneo...</p>
      </template>

      <template v-else-if="tournamentLoadError">
        <p class="add-users-state-message add-users-state-message--error">{{ tournamentLoadError }}</p>
      </template>

      <template v-else>
        <RelationProfilesPicker
          :relation-collections="listableRelationCollections"
          :active-tab="activeTab"
          :is-loading-relations="isLoadingRelations"
          :relation-load-error="relationLoadError"
          :search-results="listableSearchResults"
          :has-searched="hasSearched"
          :is-searching="isSearching"
          :search-error="searchError"
          :submitted-query="submittedQuery"
          search-title="Cerca utenti da aggiungere"
          search-idle-label="Usa la barra in basso per cercare un utente da iscrivere al torneo."
          search-empty-label="Nessun utente disponibile con questa ricerca."
          @change-tab="setActiveTab"
          @select="handleSelectProfile"
        />

        <p
          v-if="isAddingProfileId"
          class="add-users-state-message"
        >
          Aggiunta utente al torneo in corso...
        </p>
      </template>
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <input
            v-model="searchInput"
            type="text"
            inputmode="search"
            placeholder="Username o user tag"
            class="tournament-add-users-search-input"
            @keydown.enter.prevent="runSearch"
          >

          <button
            type="button"
            class="tournament-add-users-search-button"
            :disabled="isSearching"
            @click="runSearch"
          >
            Cerca
          </button>
        </div>
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.add-users-toolbar-message,
.add-users-state-message {
  text-align: center;
  color: rgba(241, 245, 249, 0.82);
  font-size: 0.86rem;
  font-weight: 600;
}

.add-users-toolbar-message {
  margin: 0;
}

.add-users-state-message {
  margin-top: 0.8rem;
}

.add-users-toolbar-message--error,
.add-users-state-message--error {
  color: rgba(254, 202, 202, 0.96);
}

.tournament-add-users-search-input {
  min-height: 2.9rem;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.76);
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.92rem;
  font-weight: 700;
  padding: 0 0.9rem;
}

.tournament-add-users-search-input::placeholder {
  color: rgba(203, 213, 225, 0.66);
}

.tournament-add-users-search-input:focus {
  outline: none;
  border-color: rgba(255, 178, 125, 0.36);
  box-shadow: 0 0 0 2px rgba(255, 122, 24, 0.14);
}

.tournament-add-users-search-button {
  min-height: 2.9rem;
  border: 1px solid rgba(255, 178, 125, 0.28);
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(255, 122, 24, 0.92), rgba(194, 65, 12, 0.96));
  color: rgba(255, 247, 237, 0.98);
  font-size: 0.88rem;
  font-weight: 900;
  padding: 0 1rem;
}

.tournament-add-users-search-button:disabled {
  opacity: 0.7;
}
</style>
