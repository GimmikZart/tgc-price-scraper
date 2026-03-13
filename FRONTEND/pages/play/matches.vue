<script setup>
import {
  fetchUserMatches,
  subscribeToUserMatches,
  MatchResult,
  MatchStatus,
} from "@/api/matches";

const HISTORY_TAB = "history";
const INVITES_TAB = "invites";
const ACTIVE_TAB = "active";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

const isLoading = ref(true);
const loadError = ref(null);
const matches = ref([]);
const fetchRequestId = ref(0);
const activeTab = ref(normalizeTab(route.query.tab));
const realtimeSubscription = ref(null);
let pendingReloadTimeout = null;

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);

function normalizeTab(rawTab) {
  const normalizedTab = Array.isArray(rawTab)
    ? String(rawTab[0] ?? "")
    : String(rawTab ?? "");

  if ([HISTORY_TAB, INVITES_TAB, ACTIVE_TAB].includes(normalizedTab)) {
    return normalizedTab;
  }

  return HISTORY_TAB;
}

function isMatchInvite(match) {
  if (!currentUserId.value) return false;
  if (match?.status !== MatchStatus.Pending) return false;
  if (String(match?.opponent_id) !== String(currentUserId.value)) return false;
  return !match?.opponent_deck;
}

function isMatchHistory(match) {
  return [MatchStatus.Completed, MatchStatus.Invalid].includes(match?.status);
}

function isMatchInProgress(match) {
  if (!match) return false;
  if (isMatchHistory(match)) return false;
  if ([MatchStatus.Canceled, MatchStatus.Rejected].includes(match?.status)) return false;
  if (isMatchInvite(match)) return false;
  return true;
}

function mapPerspective(match) {
  const meIsChallenger = String(match?.challenger_id) === String(currentUserId.value);

  return {
    ...match,
    meProfile: meIsChallenger ? match?.challenger_profile : match?.opponent_profile,
    opponentProfile: meIsChallenger ? match?.opponent_profile : match?.challenger_profile,
    meDeck: meIsChallenger ? match?.challenger_deck : match?.opponent_deck,
    opponentDeck: meIsChallenger ? match?.opponent_deck : match?.challenger_deck,
    meRole: meIsChallenger ? "challenger" : "opponent",
  };
}

function inferOutcome(match) {
  if (!currentUserId.value) {
    return { label: "-", tone: "invalid" };
  }

  if (match?.status === MatchStatus.Invalid) {
    return { label: "Non valida", tone: "invalid" };
  }

  const normalizedMatch = mapPerspective(match);

  if (String(match?.winner_id) === String(currentUserId.value)) {
    return { label: "Vinta", tone: "win" };
  }

  if (match?.winner_id && String(match?.winner_id) !== String(currentUserId.value)) {
    return { label: "Persa", tone: "loss" };
  }

  const myResult = normalizedMatch?.meRole === "challenger"
    ? match?.challenger_result
    : match?.opponent_result;

  if (myResult === MatchResult.Won) {
    return { label: "Vinta", tone: "win" };
  }

  if (myResult === MatchResult.Lost) {
    return { label: "Persa", tone: "loss" };
  }

  return { label: "Non valida", tone: "invalid" };
}

const historyMatches = computed(() => {
  return matches.value
    .filter((match) => isMatchHistory(match))
    .map((match) => {
      const perspectiveMatch = mapPerspective(match);
      const outcome = inferOutcome(match);
      return {
        ...perspectiveMatch,
        resultLabel: outcome.label,
        resultTone: outcome.tone,
      };
    });
});

const inviteMatches = computed(() => {
  return matches.value
    .filter((match) => isMatchInvite(match))
    .map((match) => {
      const perspectiveMatch = mapPerspective(match);
      return {
        ...perspectiveMatch,
        inviterProfile: match?.challenger_profile,
        inviterDeck: match?.challenger_deck,
      };
    });
});

const inProgressMatches = computed(() => {
  return matches.value
    .filter((match) => isMatchInProgress(match))
    .map((match) => mapPerspective(match));
});

const tabs = computed(() => {
  const visibleTabs = [
    {
      label: "Storico",
      value: HISTORY_TAB,
      count: historyMatches.value.length,
    },
  ];

  if (inviteMatches.value.length > 0) {
    visibleTabs.push({
      label: "Inviti",
      value: INVITES_TAB,
      count: inviteMatches.value.length,
    });
  }

  if (inProgressMatches.value.length > 0) {
    visibleTabs.push({
      label: "In corso",
      value: ACTIVE_TAB,
      count: inProgressMatches.value.length,
    });
  }

  return visibleTabs;
});

const visibleTabValues = computed(() => tabs.value.map((tab) => tab.value));

function formatDate(value) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInProgressLabel(match) {
  if (match?.status === MatchStatus.Active) {
    return "Partita avviata";
  }

  if (match?.status === MatchStatus.Pending) {
    return "In attesa avversario";
  }

  return "In corso";
}

function setActiveTab(tab) {
  activeTab.value = normalizeTab(tab);
  router.replace({
    query: {
      ...route.query,
      tab: activeTab.value,
    },
  });
}

function goToMatchRoom(matchId) {
  if (!matchId) return;
  router.push(`/play/match/${matchId}`);
}

function goToNewMatch() {
  router.push("/play/new-match");
}

async function loadMatches() {
  if (!currentUserId.value) {
    matches.value = [];
    isLoading.value = false;
    return;
  }

  const requestId = ++fetchRequestId.value;
  isLoading.value = true;
  loadError.value = null;

  try {
    const fetchedMatches = await fetchUserMatches();
    if (requestId !== fetchRequestId.value) return;

    matches.value = fetchedMatches;
  } catch (error) {
    if (requestId !== fetchRequestId.value) return;

    loadError.value = error?.message || "Errore durante il caricamento partite";
    matches.value = [];
    snackbar.addMessage(loadError.value, "error");
  } finally {
    if (requestId !== fetchRequestId.value) return;
    isLoading.value = false;
  }
}

function scheduleMatchesReload() {
  if (pendingReloadTimeout) {
    clearTimeout(pendingReloadTimeout);
  }

  pendingReloadTimeout = setTimeout(() => {
    loadMatches();
    pendingReloadTimeout = null;
  }, 220);
}

function stopRealtime() {
  const subscription = realtimeSubscription.value;
  realtimeSubscription.value = null;
  if (!subscription) return;

  subscription
    .unsubscribe()
    .catch((error) => {
      snackbar.addMessage(error?.message || "Errore durante la chiusura realtime match", "error");
    });
}

function startRealtime() {
  stopRealtime();

  try {
    realtimeSubscription.value = subscribeToUserMatches({
      onInsert: scheduleMatchesReload,
      onUpdate: scheduleMatchesReload,
      onDelete: scheduleMatchesReload,
      onError: (error) => {
        snackbar.addMessage(error?.message || "Errore realtime partite", "error");
      },
    });
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore avvio realtime partite", "error");
  }
}

watch(
  () => route.query.tab,
  (queryTab) => {
    activeTab.value = normalizeTab(queryTab);
  },
);

watch(
  visibleTabValues,
  (availableTabs) => {
    if (availableTabs.includes(activeTab.value)) return;
    activeTab.value = HISTORY_TAB;
  },
);

watch(
  currentUserId,
  async () => {
    await loadMatches();
    startRealtime();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopRealtime();

  if (pendingReloadTimeout) {
    clearTimeout(pendingReloadTimeout);
    pendingReloadTimeout = null;
  }
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Partite" fixed>
      <template #info>
        <TabsPlayMatchTabs
          :tabs="tabs"
          :active="activeTab"
          @change="setActiveTab"
        />
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-28 pt-2">
      <p v-if="isLoading" class="play-matches-state-message">
        Caricamento partite...
      </p>

      <p v-else-if="loadError" class="play-matches-state-message play-matches-state-message--error">
        {{ loadError }}
      </p>

      <template v-else>
        <div v-if="activeTab === HISTORY_TAB" class="space-y-3 pb-2">
          <p v-if="historyMatches.length === 0" class="play-matches-state-message">
            Nessuna partita conclusa al momento.
          </p>

          <PlayMatchHistoryItem
            v-for="historyMatch in historyMatches"
            :key="historyMatch.id"
            :item="historyMatch"
          />
        </div>

        <div v-else-if="activeTab === INVITES_TAB" class="space-y-3 pb-2">
          <p v-if="inviteMatches.length === 0" class="play-matches-state-message">
            Nessun invito disponibile.
          </p>

          <button
            v-for="inviteMatch in inviteMatches"
            :key="inviteMatch.id"
            type="button"
            class="play-room-list-item"
            @click="goToMatchRoom(inviteMatch.id)"
          >
            <PlayRoomParticipantCard
              :profile="inviteMatch.inviterProfile"
              :deck="inviteMatch.inviterDeck"
              waiting-label="Lo sfidante deve scegliere il mazzo"
              compact-deck
            />

            <p class="play-room-list-item__meta">Creato il {{ formatDate(inviteMatch.created_at) }}</p>
          </button>
        </div>

        <div v-else class="space-y-3 pb-2">
          <p v-if="inProgressMatches.length === 0" class="play-matches-state-message">
            Nessun match in corso.
          </p>

          <button
            v-for="inProgressMatch in inProgressMatches"
            :key="inProgressMatch.id"
            type="button"
            class="play-room-list-item"
            @click="goToMatchRoom(inProgressMatch.id)"
          >
            <PlayRoomParticipantCard
              :profile="inProgressMatch.opponentProfile"
              :deck="inProgressMatch.opponentDeck"
              waiting-label="L'avversario deve scegliere il mazzo"
              compact-deck
            />

            <p class="play-room-list-item__meta">
              {{ getInProgressLabel(inProgressMatch) }} - {{ formatDate(inProgressMatch.created_at) }}
            </p>
          </button>
        </div>
      </template>
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <ButtonMenu
          icon="fa-solid:plus"
          label="Nuova partita"
          transition
          :delay="120"
          @click="goToNewMatch"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.play-matches-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.play-matches-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.play-room-list-item {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.58);
  padding: 0.55rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.play-room-list-item:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 157, 82, 0.45);
  background: rgba(15, 23, 42, 0.72);
}

.play-room-list-item__meta {
  margin: 0.4rem 0 0;
  color: rgba(148, 163, 184, 0.95);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
