<script setup>
import {
  createTournament,
  fetchJoinedTournaments,
  fetchMyTournaments,
  fetchTournaments,
  TournamentFormat,
  TournamentStatus,
} from "@/api/tournaments";

const OPEN_TAB = "open";
const ACTIVE_TAB = "active";
const HISTORY_TAB = "history";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();

const isLoading = ref(true);
const loadError = ref(null);
const openTournaments = ref([]);
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
  return [
    {
      label: "Aperti",
      value: OPEN_TAB,
      count: openTournaments.value.length,
    },
    {
      label: "In corso",
      value: ACTIVE_TAB,
      count: activeTournaments.value.length,
    },
    {
      label: "Storico",
      value: HISTORY_TAB,
      count: historyTournaments.value.length,
    },
  ];
});

const visibleTournaments = computed(() => {
  if (activeTab.value === OPEN_TAB) return openTournaments.value;
  if (activeTab.value === ACTIVE_TAB) return activeTournaments.value;
  return historyTournaments.value;
});

function normalizeTab(rawTab) {
  const normalizedTab = Array.isArray(rawTab)
    ? String(rawTab[0] ?? "")
    : String(rawTab ?? "");

  if ([OPEN_TAB, ACTIVE_TAB, HISTORY_TAB].includes(normalizedTab)) {
    return normalizedTab;
  }

  return OPEN_TAB;
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

function normalizeStatusLabel(status) {
  if (status === TournamentStatus.Draft) return "Draft";
  if (status === TournamentStatus.Open) return "Open";
  if (status === TournamentStatus.Started) return "Started";
  if (status === TournamentStatus.Completed) return "Completed";
  if (status === TournamentStatus.Cancelled) return "Cancelled";
  return "-";
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
    const [openRows, myRows, joinedRows] = await Promise.all([
      fetchTournaments({
        statuses: [TournamentStatus.Draft, TournamentStatus.Open],
        limit: 120,
      }),
      fetchMyTournaments({ organizerOnly: true, limit: 120 }),
      fetchJoinedTournaments({ limit: 120 }),
    ]);

    const openPool = mergeTournamentsById(openRows ?? []);
    const privatePool = mergeTournamentsById(myRows ?? [], joinedRows ?? []);

    openTournaments.value = openPool.filter((tournament) => {
      return [TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.status);
    });
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
    <Toolbar label="Tornei" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-2">
      <div class="space-y-3 pb-2">
        <TabsPlayMatchTabs
          :tabs="tabs"
          :active="activeTab"
          @change="setActiveTab"
        />

        <p v-if="isLoading" class="tournaments-state-message">
          Caricamento tornei...
        </p>

        <p v-else-if="loadError" class="tournaments-state-message tournaments-state-message--error">
          {{ loadError }}
        </p>

        <template v-else>
          <div
            v-if="activeTab === OPEN_TAB && openTournaments.length === 0"
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
            Nessun torneo nello storico.
          </div>

          <div class="space-y-2">
            <button
              v-for="tournament in visibleTournaments"
              :key="tournament.id"
              type="button"
              class="tournament-card"
              @click="goToTournament(tournament.id)"
            >
              <div>
                <p class="tournament-card__title">{{ tournament.name }}</p>
                <p class="tournament-card__meta">
                  {{ normalizeFormatLabel(tournament.format) }}
                  -
                  {{ tournament.game }}
                </p>
                <p class="tournament-card__meta">
                  Stato: {{ normalizeStatusLabel(tournament.status) }}
                  -
                  Partecipanti: {{ tournament.participants_count }} / {{ tournament.max_participants }}
                </p>
                <p class="tournament-card__meta">
                  Organizer:
                  {{ tournament.organizer_profile?.display_name ?? tournament.organizer_profile?.username ?? "-" }}
                </p>
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
  border-radius: 0.95rem;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 16px 26px rgba(0, 0, 0, 0.33);
  padding: 0.72rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    filter 160ms ease;
}

.tournament-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 157, 82, 0.45);
  filter: brightness(1.02);
}

.tournament-card:focus-visible {
  outline: none;
  border-color: rgba(255, 216, 177, 0.52);
  box-shadow:
    0 0 0 2px rgba(255, 216, 177, 0.22),
    0 16px 26px rgba(0, 0, 0, 0.33);
}

.tournament-card__title {
  margin: 0;
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.9rem;
  font-weight: 800;
}

.tournament-card__meta {
  margin: 0.3rem 0 0;
  color: rgba(203, 213, 225, 0.92);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.3;
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
