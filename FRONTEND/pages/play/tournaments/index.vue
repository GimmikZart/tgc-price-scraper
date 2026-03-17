<script setup>
import {
  createTournament,
  fetchJoinedTournaments,
  fetchMyTournaments,
  fetchTournaments,
  TournamentFormat,
  TournamentStatus,
} from "@/api/tournaments";
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

const createDialogRef = ref(null);
const isCreatingTournament = ref(false);

const createForm = reactive({
  name: "",
  format: TournamentFormat.SingleElimination,
  game: "one_piece",
  maxParticipants: 8,
  swissRounds: 5,
});

const formatOptions = [
  { label: "Single Elimination", value: TournamentFormat.SingleElimination },
  { label: "Swiss", value: TournamentFormat.Swiss },
  { label: "Round Robin", value: TournamentFormat.RoundRobin },
];

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

function normalizeFormatLabel(format) {
  if (format === TournamentFormat.SingleElimination) return "Single Elimination";
  if (format === TournamentFormat.Swiss) return "Swiss";
  if (format === TournamentFormat.RoundRobin) return "Round Robin";
  return "-";
}

function normalizeGameLabel(game) {
  const normalizedGame = String(game ?? "").trim();
  if (!normalizedGame) return "Game";
  if (normalizedGame === "one_piece") return "One Piece";

  return normalizedGame
    .split(/[_-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function normalizeStatusLabel(status) {
  if (status === TournamentStatus.Draft) return "Bozza";
  if (status === TournamentStatus.Open) return "Aperto";
  if (status === TournamentStatus.Started) return "In corso";
  if (status === TournamentStatus.Completed) return "Completato";
  if (status === TournamentStatus.Cancelled) return "Annullato";
  return "-";
}

function normalizeHashtagLabel(label) {
  const normalizedLabel = String(label ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/[\s_-]+/g, "");

  return normalizedLabel ? `#${normalizedLabel}` : "#Torneo";
}

function tournamentStatusChipClass(status) {
  if (status === TournamentStatus.Open) return "tournament-card__status-chip--open";
  if (status === TournamentStatus.Started) return "tournament-card__status-chip--started";
  if (status === TournamentStatus.Completed) return "tournament-card__status-chip--completed";
  if (status === TournamentStatus.Cancelled) return "tournament-card__status-chip--cancelled";
  return "tournament-card__status-chip--draft";
}

function goToTournament(tournamentId) {
  if (!tournamentId) return;
  router.push(`/play/tournaments/${tournamentId}`);
}

function openCreateDialog() {
  createDialogRef.value?.openDialog?.();
}

function closeCreateDialog() {
  createDialogRef.value?.closeDialog?.();
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

async function handleCreateTournament() {
  if (isCreatingTournament.value) return;

  const tournamentName = String(createForm.name ?? "").trim();
  if (!tournamentName) {
    snackbar.addMessage("Inserisci un nome torneo", "warning");
    return;
  }

  isCreatingTournament.value = true;

  try {
    const settings = {};
    if (createForm.format === TournamentFormat.Swiss) {
      settings.rounds = Number(createForm.swissRounds) || 5;
    }

    const createdTournament = await createTournament({
      name: tournamentName,
      format: createForm.format,
      game: createForm.game,
      maxParticipants: Number(createForm.maxParticipants) || 8,
      status: TournamentStatus.Open,
      settings,
    });

    closeCreateDialog();
    snackbar.addMessage("Torneo creato correttamente", "success");

    createForm.name = "";
    createForm.format = TournamentFormat.SingleElimination;
    createForm.maxParticipants = 8;
    createForm.swissRounds = 5;

    await loadTournaments();

    if (createdTournament?.id) {
      goToTournament(createdTournament.id);
    }
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante la creazione del torneo", "error");
  } finally {
    isCreatingTournament.value = false;
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
            <button
              v-for="tournament in visibleTournaments"
              :key="tournament.id"
              type="button"
              class="tournament-card"
              @click="goToTournament(tournament.id)"
            >
              <div class="tournament-card__body">
                <div class="tournament-card__identity">
                  <UserIdentityHeader
                    :username="tournament.organizer_profile?.display_name ?? tournament.organizer_profile?.username ?? 'Organizer'"
                    :user-tag="tournament.organizer_profile?.user_tag ?? tournament.organizer_profile?.username ?? tournament.organizer_profile?.display_name"
                    :avatar-url="tournament.organizer_profile?.avatar_url"
                    size="sm"
                    :navigable="false"
                  />
                </div>

                <div class="tournament-card__content">
                  <p class="tournament-card__title">{{ tournament.name }}</p>

                  <div class="tournament-card__hashtags">
                    <span class="tournament-card__hashtag">
                      {{ normalizeHashtagLabel(normalizeGameLabel(tournament.game)) }}
                    </span>
                    <span class="tournament-card__hashtag">
                      {{ normalizeHashtagLabel(normalizeFormatLabel(tournament.format)) }}
                    </span>
                  </div>
                </div>

                <div class="tournament-card__footer">
                  <div class="tournament-card__participants">
                    <span class="tournament-card__participants-label">Partecipanti</span>
                    <span class="tournament-card__participants-value">
                      {{ tournament.participants_count }} / {{ tournament.max_participants }}
                    </span>
                  </div>

                  <span
                    :class="[
                      'tournament-card__status-chip',
                      tournamentStatusChipClass(tournament.status),
                    ]"
                  >
                    {{ normalizeStatusLabel(tournament.status) }}
                  </span>
                </div>
              </div>
            </button>
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
          @click="openCreateDialog"
        />
      </template>
    </MobileFloatMenu>

    <DialogsGeneric ref="createDialogRef" :disabled="isCreatingTournament">
      <template #button>
        <span class="hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Crea torneo</template>

      <template #content>
        <div class="space-y-2">
          <v-text-field
            v-model="createForm.name"
            label="Nome torneo"
            density="comfortable"
            variant="outlined"
            hide-details
          />

          <v-select
            v-model="createForm.format"
            :items="formatOptions"
            item-title="label"
            item-value="value"
            label="Formato"
            density="comfortable"
            variant="outlined"
            hide-details
          />

          <v-text-field
            v-model.number="createForm.maxParticipants"
            label="Max partecipanti"
            type="number"
            density="comfortable"
            variant="outlined"
            hide-details
          />

          <v-text-field
            v-if="createForm.format === TournamentFormat.Swiss"
            v-model.number="createForm.swissRounds"
            label="Round swiss"
            type="number"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </div>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn variant="text" :disabled="isCreatingTournament" @click="closeDialog">
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="tournament-dialog-confirm"
          :loading="isCreatingTournament"
          :disabled="isCreatingTournament"
          @click="handleCreateTournament"
        >
          Crea
        </v-btn>
      </template>
    </DialogsGeneric>
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

.tournament-card {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.15rem;
  background: rgba(8, 12, 20, 0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 12px 24px rgba(0, 0, 0, 0.24);
  padding: 0.88rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

.tournament-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 14px 28px rgba(0, 0, 0, 0.28);
  filter: brightness(1.01);
}

.tournament-card:focus-visible {
  outline: none;
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.12),
    0 12px 24px rgba(0, 0, 0, 0.24);
}

.tournament-card__body {
  display: grid;
  gap: 0.82rem;
}

.tournament-card__identity :deep(.user-identity) {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: none;
}

.tournament-card__identity :deep(.user-identity-name) {
  font-size: 0.88rem;
}

.tournament-card__identity :deep(.user-identity-tag) {
  font-size: 0.6rem;
}

.tournament-card__content {
  display: grid;
  gap: 0.6rem;
}

.tournament-card__title {
  margin: 0;
  color: rgba(255, 245, 235, 0.98);
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1.1;
}

.tournament-card__hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tournament-card__hashtag {
  display: inline-flex;
  align-items: center;
  min-height: 1.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(226, 232, 240, 0.92);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  padding: 0.34rem 0.72rem;
}

.tournament-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.tournament-card__participants {
  display: grid;
  gap: 0.16rem;
}

.tournament-card__participants-label {
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tournament-card__participants-value {
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1;
}

.tournament-card__status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  min-height: 2.25rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.95rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 20px rgba(0, 0, 0, 0.2);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  padding: 0.5rem 0.92rem;
  text-transform: uppercase;
}

.tournament-card__status-chip--draft {
  background: rgba(51, 65, 85, 0.92);
  border-color: rgba(148, 163, 184, 0.42);
  color: rgba(241, 245, 249, 0.96);
}

.tournament-card__status-chip--open {
  background: rgba(8, 47, 73, 0.94);
  border-color: rgba(125, 211, 252, 0.5);
  color: rgba(224, 242, 254, 0.98);
}

.tournament-card__status-chip--started {
  background: rgba(120, 53, 15, 0.94);
  border-color: rgba(252, 211, 77, 0.52);
  color: rgba(255, 247, 237, 0.98);
}

.tournament-card__status-chip--completed {
  background: rgba(20, 83, 45, 0.94);
  border-color: rgba(134, 239, 172, 0.5);
  color: rgba(240, 253, 244, 0.98);
}

.tournament-card__status-chip--cancelled {
  background: rgba(127, 29, 29, 0.94);
  border-color: rgba(252, 165, 165, 0.48);
  color: rgba(255, 241, 242, 0.98);
}

.tournament-dialog-confirm {
  border: 1px solid rgba(74, 222, 128, 0.28);
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.86), rgba(21, 128, 61, 0.94));
  color: rgba(240, 253, 244, 0.98);
}

.hidden-dialog-trigger {
  display: none;
  width: 0;
  height: 0;
}
</style>
