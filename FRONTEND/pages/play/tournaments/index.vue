<script setup>
import {
  fetchJoinedTournaments,
  fetchMyTournaments,
  fetchTournaments,
  TournamentStatus,
} from "@/api/tournaments";
import TournamentCard from "@/components/Play/TournamentCard.vue";
import {
  CLOUD_ACTIVE_BADGE_CLASS,
  CLOUD_ACTIVE_TAB_CLASS,
  CLOUD_INACTIVE_BADGE_CLASS,
  CLOUD_INACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";

const ALL_TAB = "all";
const ACTIVE_TAB = "active";
const HISTORY_TAB = "history";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();

const isLoading = ref(true);
const loadError = ref(null);
const allTournaments = ref([]);
const activeTournaments = ref([]);
const historyTournaments = ref([]);
const activeTab = ref(normalizeTab(route.query.tab));

const tabs = computed(() => {
  const visibleTabs = [];

  if (activeTournaments.value.length > 0) {
    visibleTabs.push({
      label: "In corso",
      value: ACTIVE_TAB,
      count: activeTournaments.value.length,
      activeClass: CLOUD_ACTIVE_TAB_CLASS,
      inactiveClass: CLOUD_INACTIVE_TAB_CLASS,
      badgeActiveClass: CLOUD_ACTIVE_BADGE_CLASS,
      badgeInactiveClass: CLOUD_INACTIVE_BADGE_CLASS,
    });
  }

  visibleTabs.push({
    label: "Tutti",
    value: ALL_TAB,
    count: allTournaments.value.length,
  });

  visibleTabs.push({
    label: "Storico",
    value: HISTORY_TAB,
    count: historyTournaments.value.length,
  });

  return visibleTabs;
});

const visibleTabValues = computed(() => tabs.value.map((tab) => tab.value));

const visibleTournaments = computed(() => {
  if (activeTab.value === ACTIVE_TAB) return activeTournaments.value;
  if (activeTab.value === HISTORY_TAB) return historyTournaments.value;
  return allTournaments.value;
});

function normalizeTab(rawTab) {
  const normalizedTab = Array.isArray(rawTab)
    ? String(rawTab[0] ?? "")
    : String(rawTab ?? "");

  if (normalizedTab === "open") {
    return ALL_TAB;
  }

  if ([ALL_TAB, ACTIVE_TAB, HISTORY_TAB].includes(normalizedTab)) {
    return normalizedTab;
  }

  return ALL_TAB;
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

function goToTournament(tournamentId) {
  if (!tournamentId) return;
  router.push(`/play/tournaments/${tournamentId}`);
}

function goToCreateTournament() {
  router.push("/play/tournaments/create");
}

function parseDateToTimestamp(value) {
  const timestamp = new Date(value ?? 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortTournamentsByRecency(tournaments = []) {
  return [...tournaments].sort((leftTournament, rightTournament) => {
    const rightTimestamp = parseDateToTimestamp(rightTournament?.created_at);
    const leftTimestamp = parseDateToTimestamp(leftTournament?.created_at);
    return rightTimestamp - leftTimestamp;
  });
}

function mergeTournamentsById(...groups) {
  const groupedTournaments = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  const tournamentById = new Map();

  groupedTournaments.forEach((tournament) => {
    if (!tournament?.id) return;
    tournamentById.set(tournament.id, tournament);
  });

  return sortTournamentsByRecency([...tournamentById.values()]);
}

function isHistoricalTournamentStatus(status) {
  return [TournamentStatus.Completed, TournamentStatus.Cancelled].includes(status);
}

async function loadTournaments() {
  isLoading.value = true;
  loadError.value = null;

  try {
    const [allRows, myRows, joinedRows] = await Promise.all([
      fetchTournaments({
        limit: 500,
      }),
      fetchMyTournaments({ organizerOnly: true, limit: 200 }),
      fetchJoinedTournaments({ limit: 200 }),
    ]);

    const allPool = mergeTournamentsById(allRows ?? [], myRows ?? [], joinedRows ?? []);
    const privatePool = mergeTournamentsById(myRows ?? [], joinedRows ?? []);

    allTournaments.value = allPool;
    activeTournaments.value = privatePool.filter((tournament) => {
      return tournament.status === TournamentStatus.Started;
    });
    historyTournaments.value = privatePool.filter((tournament) => {
      return isHistoricalTournamentStatus(tournament.status);
    });
  } catch (error) {
    loadError.value = error?.message ?? "Errore durante il caricamento tornei";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => route.query.tab,
  (nextTab) => {
    activeTab.value = normalizeTab(nextTab);
  },
);

watch(
  [activeTab, visibleTabValues],
  ([currentTab, availableTabs]) => {
    if (availableTabs.includes(currentTab)) return;
    setActiveTab(availableTabs[0] ?? ALL_TAB);
  },
  { immediate: true },
);

onMounted(() => {
  loadTournaments();
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Tornei" fixed back-button>
      <template #info>
        <TabsPlayMatchTabs
          :tabs="tabs"
          :active="activeTab"
          @change="setActiveTab"
        />
      </template>
    </Toolbar>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-2">
      <div class="space-y-3 pb-2">
        <p v-if="isLoading" class="tournaments-state-message">
          Caricamento tornei...
        </p>

        <p v-else-if="loadError" class="tournaments-state-message tournaments-state-message--error">
          {{ loadError }}
        </p>

        <template v-else>
          <div
            v-if="activeTab === ALL_TAB && allTournaments.length === 0"
            class="tournaments-state-message"
          >
            Nessun torneo disponibile.
          </div>

          <div
            v-if="activeTab === ACTIVE_TAB && activeTournaments.length === 0"
            class="tournaments-state-message"
          >
            Nessun torneo in corso.
          </div>

          <div
            v-if="activeTab === HISTORY_TAB && historyTournaments.length === 0"
            class="tournaments-state-message"
          >
            Nessun torneo concluso nello storico.
          </div>

          <div class="space-y-2">
            <TournamentCard
              v-for="tournament in visibleTournaments"
              :key="tournament.id"
              :tournament="tournament"
              interactive
              @click="goToTournament(tournament.id)"
            />
          </div>
        </template>
      </div>
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <ButtonMenu
          icon="fa-solid:plus"
          label="Crea torneo"
          transition
          :delay="120"
          @click="goToCreateTournament"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.tournaments-state-message {
  margin-top: 0.8rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.88rem;
  font-weight: 600;
}

.tournaments-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}
</style>
