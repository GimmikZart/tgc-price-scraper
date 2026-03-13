<script setup>
import {
  cancelTournament,
  computeStandings,
  expelTournamentParticipants,
  fetchTournamentDetails,
  startTournament,
  submitMatchResult,
  TournamentFormat,
  TournamentMatchStatus,
  TournamentParticipantStatus,
  TournamentStatus,
  withdrawTournament,
} from "@/api/tournaments";

const STANDINGS_TAB = "standings";
const ROUNDS_TAB = "rounds";
const AVAILABLE_TABS = Object.freeze([STANDINGS_TAB, ROUNDS_TAB]);

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

const isLoading = ref(true);
const loadError = ref(null);
const details = ref(null);

const isJoining = ref(false);
const isWithdrawing = ref(false);
const isStartingTournament = ref(false);
const isExpellingParticipants = ref(false);
const isCancellingTournament = ref(false);
const updatingMatchId = ref(null);
const expelDialogRef = ref(null);
const cancelDialogRef = ref(null);
const organizerResultDialogRef = ref(null);
const selectedExpelParticipantIds = ref([]);
const activeTab = ref(normalizeDetailTab(route.query.tab));
const selectedRoundNumber = ref(null);
const selectedMatchForResultDialog = ref(null);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);
const tournamentId = computed(() => String(route.params.id ?? ""));
const tournament = computed(() => details.value?.tournament ?? null);
const participants = computed(() => details.value?.participants ?? []);
const rounds = computed(() => details.value?.rounds ?? []);
const matches = computed(() => details.value?.matches ?? []);
const standings = computed(() => details.value?.standings ?? []);

const toolbarLabel = computed(() => {
  const tournamentName = String(tournament.value?.name ?? "").trim();
  return tournamentName ? `Torneo: ${tournamentName}` : "Torneo";
});

const currentParticipant = computed(() => {
  if (!currentUserId.value) return null;

  return participants.value.find((participant) =>
    String(participant.profile_id) === String(currentUserId.value)
  ) ?? null;
});

const isOrganizer = computed(() => {
  return String(tournament.value?.organizer_id ?? "") === String(currentUserId.value ?? "");
});

const participantsById = computed(() => {
  return new Map(
    participants.value
      .filter((participant) => participant?.id)
      .map((participant) => [participant.id, participant]),
  );
});

const canJoinTournament = computed(() => {
  if (!tournament.value) return false;
  if (!currentUserId.value) return false;
  if (currentParticipant.value) return false;

  return [TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.value.status);
});

const canWithdrawTournament = computed(() => {
  if (!tournament.value || !currentParticipant.value) return false;
  if (currentParticipant.value.status === TournamentParticipantStatus.Withdrawn) return false;
  if ([TournamentStatus.Completed, TournamentStatus.Cancelled].includes(tournament.value.status)) {
    return false;
  }
  return true;
});

const canStartTournament = computed(() => {
  if (!tournament.value) return false;
  if (!isOrganizer.value) return false;
  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.value.status)) {
    return false;
  }
  return participants.value.length >= 2;
});

const expellableParticipants = computed(() => {
  if (!isOrganizer.value || !tournament.value) return [];

  return participants.value.filter((participant) => {
    if (!participant?.id) return false;
    if (String(participant.profile_id) === String(tournament.value.organizer_id)) return false;
    if (participant.status === TournamentParticipantStatus.Withdrawn) return false;
    return true;
  });
});

const canOpenExpelDialog = computed(() => {
  if (!isOrganizer.value) return false;
  if (!tournament.value) return false;
  if ([TournamentStatus.Completed, TournamentStatus.Cancelled].includes(tournament.value.status)) {
    return false;
  }
  return expellableParticipants.value.length > 0;
});

const canCancelTournament = computed(() => {
  if (!isOrganizer.value || !tournament.value) return false;
  return ![TournamentStatus.Completed, TournamentStatus.Cancelled].includes(tournament.value.status);
});

const hasTournamentActions = computed(() => {
  return [
    canJoinTournament.value,
    canWithdrawTournament.value,
    canStartTournament.value,
    canOpenExpelDialog.value,
    canCancelTournament.value,
  ].some(Boolean);
});

const standingsRows = computed(() => {
  if (standings.value.length > 0) return standings.value;
  return [];
});

const standingsTableRows = computed(() => {
  if (standingsRows.value.length > 0) {
    return standingsRows.value.map((row, index) => {
      const participant = row.participant ?? participantsById.value.get(row.participant_id) ?? null;
      return {
        ...row,
        participant,
        rank: Number(row.rank ?? 0) > 0 ? Number(row.rank) : index + 1,
        status: participant?.status ?? row.status ?? TournamentParticipantStatus.Registered,
      };
    });
  }

  return participants.value.map((participant, index) => ({
    participant_id: participant.id,
    profile_id: participant.profile_id,
    rank: index + 1,
    status: participant.status ?? TournamentParticipantStatus.Registered,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    matches_played: 0,
    buchholz: 0,
    score_diff: 0,
    participant,
  }));
});

const standingsExtraColumns = computed(() => {
  if (tournament.value?.format === TournamentFormat.Swiss) {
    return [{ key: "buchholz", label: "Buchholz" }];
  }

  if (tournament.value?.format === TournamentFormat.RoundRobin) {
    return [{ key: "score_diff", label: "Diff" }];
  }

  return [];
});

const standingsBaseColumns = Object.freeze([
  { key: "player", label: "Player" },
  { key: "rank", label: "Rank" },
  { key: "wins", label: "W" },
  { key: "draws", label: "D" },
  { key: "losses", label: "L" },
  { key: "points", label: "Pts" },
  { key: "matches_played", label: "Match" },
  { key: "byes", label: "Bye" },
]);

const standingsColumns = computed(() => {
  return [
    ...standingsBaseColumns,
    ...standingsExtraColumns.value.map((column) => ({
      key: column.key,
      label: column.label,
    })),
  ];
});

const detailTabs = computed(() => {
  return [
    {
      label: "Classifica",
      value: STANDINGS_TAB,
      count: standingsTableRows.value.length,
    },
    {
      label: "Rounds",
      value: ROUNDS_TAB,
      count: expectedRoundsCount.value,
    },
  ];
});

const roundCards = computed(() => {
  return rounds.value.map((round) => {
    const roundMatches = matches.value.filter((item) => item.round_id === round.id);
    const completedMatchesCount = roundMatches
      .filter((match) => match.status === TournamentMatchStatus.Completed)
      .length;

    return {
      ...round,
      matches: roundMatches,
      completedMatchesCount,
      pendingMatchesCount: Math.max(roundMatches.length - completedMatchesCount, 0),
      stageLabel: resolveRoundStageLabel(round.round_number),
    };
  });
});

const expectedRoundsCount = computed(() => {
  const totalRounds = Number(tournament.value?.total_rounds ?? 0);
  if (Number.isFinite(totalRounds) && totalRounds > 0) {
    return totalRounds;
  }

  return roundCards.value.length;
});

const roundSubTabs = computed(() => {
  const totalRounds = expectedRoundsCount.value;
  if (totalRounds <= 0) return [];

  const roundByNumber = new Map(
    roundCards.value.map((round) => [Number(round.round_number), round]),
  );

  return Array.from({ length: totalRounds }, (_, index) => {
    const roundNumber = index + 1;
    const round = roundByNumber.get(roundNumber) ?? null;
    const status = round?.status ?? "pending";

    return {
      value: roundNumber,
      label: `Round ${roundNumber}`,
      status,
      disabled: !round || status === "pending",
      stageLabel: resolveRoundStageLabel(roundNumber),
      matchCount: round?.matches?.length ?? 0,
    };
  });
});

const selectedRoundCard = computed(() => {
  const normalizedRoundNumber = Number(selectedRoundNumber.value);
  if (!Number.isFinite(normalizedRoundNumber) || normalizedRoundNumber <= 0) {
    return null;
  }

  return roundCards.value.find((round) =>
    Number(round.round_number) === normalizedRoundNumber
  ) ?? null;
});

const FALLBACK_TBD_PROFILE = Object.freeze({
  username: "TBD",
  display_name: "TBD",
  user_tag: "tbd",
  avatar_url: null,
});

const FALLBACK_BYE_PROFILE = Object.freeze({
  username: "BYE",
  display_name: "BYE",
  user_tag: "bye",
  avatar_url: null,
});

const roundMatchRows = computed(() => {
  if (!selectedRoundCard.value) return [];

  return selectedRoundCard.value.matches.map((match) => {
    const player1Participant = participantById(match.player1_participant_id);
    const player2Participant = participantById(match.player2_participant_id);

    const challengerProfile = player1Participant?.profile ?? FALLBACK_TBD_PROFILE;
    const opponentProfile = match.is_bye
      ? FALLBACK_BYE_PROFILE
      : player2Participant?.profile ?? FALLBACK_TBD_PROFILE;

    return {
      id: match.match_id ?? match.id,
      tournamentMatch: match,
      challenger_profile: challengerProfile,
      opponent_profile: opponentProfile,
      challenger_deck: participantDefaultDeck(player1Participant),
      opponent_deck: match.is_bye ? null : participantDefaultDeck(player2Participant),
      resultTone: tournamentMatchTone(match),
      tableLabel: `Tavolo ${match.table_number ?? "-"}`,
      resultLabel: formatMatchResult(match),
      clickable: isRoundMatchClickable(match),
    };
  });
});

const selectedMatchPlayer1Label = computed(() => {
  return participantLabelById(selectedMatchForResultDialog.value?.player1_participant_id);
});

const selectedMatchPlayer2Label = computed(() => {
  return participantLabelById(selectedMatchForResultDialog.value?.player2_participant_id);
});

const roundsHint = computed(() => {
  if (tournament.value?.format === TournamentFormat.SingleElimination) {
    return "Bracket a eliminazione diretta: chi perde esce, chi vince passa al turno successivo.";
  }

  if (tournament.value?.format === TournamentFormat.Swiss) {
    return "Sistema Swiss: accoppiamenti per punteggio tra giocatori con rendimento simile.";
  }

  if (tournament.value?.format === TournamentFormat.RoundRobin) {
    return "Round Robin: tutti contro tutti, ogni risultato aggiorna la classifica generale.";
  }

  return "Andamento del torneo e partite previste per ogni round.";
});

const tournamentAdditionalRules = computed(() => {
  const settings = tournament.value?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return [];

  const rawRules = settings.rules
    ?? settings.rule
    ?? settings.notes
    ?? settings.note
    ?? settings.description
    ?? null;

  if (typeof rawRules === "string") {
    const normalizedRule = rawRules.trim();
    return normalizedRule ? [normalizedRule] : [];
  }

  if (!Array.isArray(rawRules)) return [];

  return rawRules
    .map((rule) => String(rule ?? "").trim())
    .filter(Boolean);
});

function normalizeDetailTab(rawTab) {
  const normalizedTab = Array.isArray(rawTab)
    ? String(rawTab[0] ?? "")
    : String(rawTab ?? "");

  if (AVAILABLE_TABS.includes(normalizedTab)) {
    return normalizedTab;
  }

  return STANDINGS_TAB;
}

function setActiveTab(nextTab) {
  const normalizedTab = normalizeDetailTab(nextTab);
  if (normalizedTab === activeTab.value && String(route.query.tab ?? "") === normalizedTab) {
    return;
  }

  activeTab.value = normalizedTab;
  router.replace({
    query: {
      ...route.query,
      tab: normalizedTab,
    },
  });
}

function participantDisplayName(participant) {
  if (!participant) return "Player";

  return participant.profile?.display_name
    ?? participant.profile?.username
    ?? participant.profile_id
    ?? "Player";
}

function participantById(participantId) {
  if (!participantId) return null;
  return participantsById.value.get(participantId) ?? null;
}

function participantLabelById(participantId) {
  const participant = participantById(participantId);
  if (!participant) return "TBD";

  return participantDisplayName(participant);
}

function standingParticipant(row) {
  return row?.participant ?? participantsById.value.get(row?.participant_id) ?? null;
}

function standingPlayerName(row) {
  const participant = standingParticipant(row);
  if (!participant) return row?.profile_id ?? "Player";
  return participantDisplayName(participant);
}

function profilePathFromParticipant(participant) {
  const rawProfileTag = participant?.profile?.user_tag ?? participant?.profile?.username;
  if (typeof rawProfileTag !== "string") return null;

  let normalizedProfileTag = rawProfileTag.trim();
  if (!normalizedProfileTag) return null;

  try {
    normalizedProfileTag = decodeURIComponent(normalizedProfileTag);
  } catch {
    normalizedProfileTag = rawProfileTag.trim();
  }

  normalizedProfileTag = normalizedProfileTag.replace(/^@+/, "");
  if (!normalizedProfileTag) return null;

  return `/profile/${encodeURIComponent(normalizedProfileTag)}`;
}

function standingProfilePath(row) {
  return profilePathFromParticipant(standingParticipant(row));
}

function isInactiveParticipantStatus(status) {
  return [
    TournamentParticipantStatus.Withdrawn,
    TournamentParticipantStatus.Eliminated,
  ].includes(status);
}

function participantStatusDotClass(status) {
  if (isInactiveParticipantStatus(status)) {
    return "tournament-player-status-dot--inactive";
  }
  return "tournament-player-status-dot--active";
}

function participantStatusLabel(status) {
  if (status === TournamentParticipantStatus.Withdrawn) return "Ritirato / espulso";
  if (status === TournamentParticipantStatus.Eliminated) return "Eliminato";
  if (status === TournamentParticipantStatus.Active) return "Attivo";
  if (status === TournamentParticipantStatus.Registered) return "Registrato";
  return "Stato non disponibile";
}

function standingsValue(row, key) {
  if (key === "score_diff") {
    const scoreDiff = Number(row?.score_diff ?? 0);
    if (scoreDiff > 0) return `+${scoreDiff}`;
    return `${scoreDiff}`;
  }

  const value = Number(row?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function standingsCellValue(row, key) {
  if (key === "rank") {
    return row?.rank ?? "-";
  }

  if (key === "score_diff" || key === "buchholz") {
    return standingsValue(row, key);
  }

  const value = Number(row?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function resolveRoundStageLabel(roundNumber) {
  if (tournament.value?.format !== TournamentFormat.SingleElimination) return null;

  const totalRounds = Number(tournament.value?.total_rounds ?? 0);
  const normalizedRoundNumber = Number(roundNumber);

  if (!Number.isFinite(totalRounds) || totalRounds <= 0) return null;
  if (!Number.isFinite(normalizedRoundNumber) || normalizedRoundNumber <= 0) return null;

  const distanceFromFinal = totalRounds - normalizedRoundNumber;

  if (distanceFromFinal === 0) return "Finale";
  if (distanceFromFinal === 1) return "Semifinale";
  if (distanceFromFinal === 2) return "Quarti";
  if (distanceFromFinal === 3) return "Ottavi";

  return null;
}

function formatMatchResult(match) {
  if (match?.is_bye) {
    const player1Label = participantLabelById(match.player1_participant_id);
    const player2Label = participantLabelById(match.player2_participant_id);
    const byePlayer = player1Label !== "TBD" ? player1Label : player2Label;
    return `Bye assegnato a ${byePlayer}`;
  }

  if (!match?.result) return "Da giocare";

  if (match.result === "draw") return "Pareggio";
  if (match.result === "player1_win") {
    return `Vince ${participantLabelById(match.player1_participant_id)}`;
  }
  if (match.result === "player2_win") {
    return `Vince ${participantLabelById(match.player2_participant_id)}`;
  }

  return String(match.result);
}

function participantDefaultDeck(participant) {
  if (!participant || typeof participant !== "object") return null;
  if (!participant.metadata || typeof participant.metadata !== "object") return null;

  const defaultDeck = participant.metadata.default_deck;
  if (!defaultDeck || typeof defaultDeck !== "object" || Array.isArray(defaultDeck)) {
    return null;
  }

  return defaultDeck;
}

function tournamentMatchTone(match) {
  if (match?.status !== TournamentMatchStatus.Completed) {
    return "pending";
  }

  if (match?.result === "player1_win") return "winner_left";
  if (match?.result === "player2_win") return "winner_right";
  if (match?.result === "draw") return "draw";
  return "invalid";
}

function isCurrentUserPlayerInMatch(match) {
  if (!match || !currentUserId.value) return false;

  const player1ProfileId = participantById(match.player1_participant_id)?.profile_id;
  const player2ProfileId = participantById(match.player2_participant_id)?.profile_id;

  return [player1ProfileId, player2ProfileId]
    .map((profileId) => String(profileId))
    .includes(String(currentUserId.value));
}

function isRoundMatchClickable(match) {
  if (!match || match.is_bye) return false;
  if (isOrganizer.value) return true;
  return isCurrentUserPlayerInMatch(match);
}

function formatLabel(format) {
  if (format === TournamentFormat.SingleElimination) return "Single Elimination";
  if (format === TournamentFormat.Swiss) return "Swiss";
  if (format === TournamentFormat.RoundRobin) return "Round Robin";
  return "-";
}

function statusLabel(status) {
  if (status === TournamentStatus.Draft) return "Draft";
  if (status === TournamentStatus.Open) return "Open";
  if (status === TournamentStatus.Started) return "Started";
  if (status === TournamentStatus.Completed) return "Completed";
  if (status === TournamentStatus.Cancelled) return "Cancelled";
  return "-";
}

function canMatchDraw() {
  return tournament.value?.format !== TournamentFormat.SingleElimination;
}

function resolveDefaultRoundNumber() {
  const activeRoundTab = roundSubTabs.value.find((roundTab) => {
    return roundTab.status === "active" && !roundTab.disabled;
  });
  if (activeRoundTab) {
    return Number(activeRoundTab.value);
  }

  const firstPlayableRoundTab = roundSubTabs.value.find((roundTab) => {
    return !roundTab.disabled && roundTab.status !== "completed";
  });
  if (firstPlayableRoundTab) {
    return Number(firstPlayableRoundTab.value);
  }

  const firstCompletedRoundTab = roundSubTabs.value.find((roundTab) => {
    return roundTab.status === "completed";
  });
  if (firstCompletedRoundTab) {
    return Number(firstCompletedRoundTab.value);
  }

  return null;
}

function setActiveRound(nextRoundNumber) {
  const normalizedRoundNumber = Number(nextRoundNumber);
  if (!Number.isFinite(normalizedRoundNumber) || normalizedRoundNumber <= 0) {
    return;
  }

  const roundTab = roundSubTabs.value.find((tab) => Number(tab.value) === normalizedRoundNumber);
  if (!roundTab || roundTab.disabled) return;

  selectedRoundNumber.value = normalizedRoundNumber;
}

function openMatchResultDialog(match) {
  if (!match || match.is_bye || !isOrganizer.value) return;
  selectedMatchForResultDialog.value = match;
  organizerResultDialogRef.value?.openDialog?.();
}

function closeMatchResultDialog(closeDialog) {
  closeDialog?.();
  organizerResultDialogRef.value?.closeDialog?.();
  selectedMatchForResultDialog.value = null;
}

function handleRoundMatchSelect(match) {
  if (!match || match.is_bye) return;

  if (isOrganizer.value) {
    openMatchResultDialog(match);
    return;
  }

  if (!isCurrentUserPlayerInMatch(match)) {
    return;
  }

  if (!match.match_id) {
    snackbar.addMessage("Match room non ancora disponibile per questo tavolo", "warning");
    return;
  }

  router.push(`/play/match/${match.match_id}`);
}

async function loadDetails() {
  isLoading.value = true;
  loadError.value = null;

  try {
    if (!tournamentId.value) {
      throw new Error("Torneo non valido");
    }

    const tournamentDetails = await fetchTournamentDetails(tournamentId.value);
    if (!tournamentDetails) {
      throw new Error("Torneo non trovato");
    }

    details.value = tournamentDetails;
  } catch (error) {
    loadError.value = error?.message || "Errore durante il caricamento torneo";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    isLoading.value = false;
  }
}

async function refreshStandings() {
  if (!tournamentId.value || !details.value) return;

  try {
    const nextStandings = await computeStandings({ tournamentId: tournamentId.value });
    details.value = {
      ...details.value,
      standings: nextStandings,
    };
  } catch {
    // silent fail: full reload remains the source of truth
  }
}

async function handleJoin() {
  if (!canJoinTournament.value || isJoining.value) return;

  isJoining.value = true;

  try {
    await router.push(`/play/choose-deck?tournamentId=${encodeURIComponent(tournamentId.value)}`);
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il passaggio alla scelta mazzo", "error");
  } finally {
    isJoining.value = false;
  }
}

async function handleWithdraw() {
  if (!canWithdrawTournament.value || isWithdrawing.value) return;

  isWithdrawing.value = true;

  try {
    await withdrawTournament({ tournamentId: tournamentId.value });
    snackbar.addMessage("Ritiro completato", "warning");
    await loadDetails();
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il ritiro", "error");
  } finally {
    isWithdrawing.value = false;
  }
}

function openExpelDialog() {
  selectedExpelParticipantIds.value = [];
  expelDialogRef.value?.openDialog?.();
}

function openCancelDialog() {
  cancelDialogRef.value?.openDialog?.();
}

function toggleExpelParticipant(participantId) {
  if (!participantId) return;

  const selectedIds = new Set(selectedExpelParticipantIds.value);
  if (selectedIds.has(participantId)) {
    selectedIds.delete(participantId);
  } else {
    selectedIds.add(participantId);
  }

  selectedExpelParticipantIds.value = [...selectedIds];
}

async function handleExpelParticipants() {
  if (!canOpenExpelDialog.value || isExpellingParticipants.value) return;
  if (!selectedExpelParticipantIds.value.length) {
    snackbar.addMessage("Seleziona almeno un giocatore da espellere", "warning");
    return;
  }

  isExpellingParticipants.value = true;

  try {
    await expelTournamentParticipants({
      tournamentId: tournamentId.value,
      participantIds: selectedExpelParticipantIds.value,
    });

    expelDialogRef.value?.closeDialog?.();
    selectedExpelParticipantIds.value = [];
    snackbar.addMessage("Giocatori espulsi correttamente", "success");
    await loadDetails();
    await refreshStandings();
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'espulsione giocatori", "error");
  } finally {
    isExpellingParticipants.value = false;
  }
}

async function handleCancelTournament() {
  if (!canCancelTournament.value || isCancellingTournament.value) return;

  isCancellingTournament.value = true;

  try {
    await cancelTournament({ tournamentId: tournamentId.value });
    cancelDialogRef.value?.closeDialog?.();
    snackbar.addMessage("Torneo annullato", "warning");
    router.replace("/play/tournaments");
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'annullamento torneo", "error");
  } finally {
    isCancellingTournament.value = false;
  }
}

async function handleStartTournament() {
  if (!canStartTournament.value || isStartingTournament.value) return;

  isStartingTournament.value = true;

  try {
    await startTournament({ tournamentId: tournamentId.value });
    snackbar.addMessage("Torneo avviato", "success");
    await loadDetails();
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante l'avvio torneo", "error");
  } finally {
    isStartingTournament.value = false;
  }
}

async function handleSubmitResult(matchId, result) {
  if (!isOrganizer.value || updatingMatchId.value) return;
  if (!matchId) return;

  updatingMatchId.value = matchId;

  try {
    const submissionResult = await submitMatchResult({
      tournamentId: tournamentId.value,
      matchId,
      result,
    });

    if (submissionResult?.tournamentCompleted) {
      snackbar.addMessage("Risultato salvato: torneo completato", "success");
    } else if (submissionResult?.autoGeneratedRound) {
      snackbar.addMessage("Risultato salvato: prossimo round avviato automaticamente", "success");
    } else {
      snackbar.addMessage("Risultato salvato", "success");
    }

    closeMatchResultDialog();
    await loadDetails();
    await refreshStandings();
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante il salvataggio risultato", "error");
  } finally {
    updatingMatchId.value = null;
  }
}

watch(
  () => route.params.id,
  () => {
    loadDetails();
  },
  { immediate: true },
);

watch(
  () => route.query.tab,
  (nextTab) => {
    activeTab.value = normalizeDetailTab(nextTab);
  },
);

watch(
  [activeTab, roundSubTabs],
  ([currentTab, tabs]) => {
    if (currentTab !== ROUNDS_TAB) return;

    if (!Array.isArray(tabs) || tabs.length === 0) {
      selectedRoundNumber.value = null;
      return;
    }

    const normalizedSelectedRoundNumber = Number(selectedRoundNumber.value);
    const selectedRoundTab = tabs.find((tab) =>
      Number(tab.value) === normalizedSelectedRoundNumber
    );

    if (selectedRoundTab && !selectedRoundTab.disabled) {
      return;
    }

    selectedRoundNumber.value = resolveDefaultRoundNumber();
  },
  { immediate: true },
);

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar :label="toolbarLabel" fixed back-button>
      <template #info>
        <div class="space-y-2">
          <div v-if="tournament" class="tournament-info-box">
            <v-expansion-panels class="tournament-info-panel" variant="accordion">
              <v-expansion-panel class="tournament-info-panel-item">
                <v-expansion-panel-title class="tournament-info-panel-title">
                  Dettagli torneo
                </v-expansion-panel-title>
                <v-expansion-panel-text class="tournament-info-panel-text">
                  <ul class="tournament-info-list list-disc list-inside">
                    <li class="text-xs">Formato: {{ formatLabel(tournament?.format) }}</li>
                    <li class="text-xs">Gioco: {{ tournament?.game }}</li>
                    <li class="text-xs">Stato: {{ statusLabel(tournament?.status) }}</li>
                    <li class="text-xs">
                      Round: {{ tournament?.current_round ?? "-" }} / {{ tournament?.total_rounds ?? "-" }}
                    </li>
                    <li class="text-xs">
                      Partecipanti: {{ participants.length }} / {{ tournament?.max_participants ?? "-" }}
                    </li>
                    <li class="text-xs">{{ roundsHint }}</li>
                    <li v-if="tournamentAdditionalRules.length > 0" class="text-xs">
                      Regole: {{ tournamentAdditionalRules.join(" | ") }}
                    </li>
                    <li v-else class="text-xs">
                      Regole aggiuntive: nessuna specificata.
                    </li>
                  </ul>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>

          <p v-else-if="isLoading" class="tournament-toolbar-state-message">
            Caricamento dati torneo...
          </p>

          <p v-else-if="loadError" class="tournament-toolbar-state-message tournament-toolbar-state-message--error">
            {{ loadError }}
          </p>

          <TabsPlayMatchTabs
            :tabs="detailTabs"
            :active="activeTab"
            @change="setActiveTab"
          />

          <div v-if="activeTab === ROUNDS_TAB" class="tournament-toolbar-rounds-shell">
            <p v-if="roundSubTabs.length === 0" class="tournament-toolbar-rounds-empty">
              Nessun round pianificato.
            </p>

            <div
              v-else
              class="tournament-round-subtabs"
              role="tablist"
              aria-label="Round previsti torneo"
            >
              <button
                v-for="roundTab in roundSubTabs"
                :key="roundTab.value"
                type="button"
                class="tournament-round-subtab"
                :class="[
                  roundTab.value === selectedRoundNumber ? 'tournament-round-subtab--selected' : '',
                  roundTab.status === 'completed'
                    ? 'tournament-round-subtab--completed'
                    : roundTab.status === 'active'
                      ? 'tournament-round-subtab--active'
                      : 'tournament-round-subtab--pending',
                ]"
                :disabled="roundTab.disabled"
                :aria-selected="roundTab.value === selectedRoundNumber"
                @click="setActiveRound(roundTab.value)"
              >
                <span class="tournament-round-subtab__label">{{ roundTab.label }}</span>
                <span v-if="roundTab.stageLabel" class="tournament-round-subtab__stage">
                  {{ roundTab.stageLabel }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </Toolbar>

    <div
      class="min-h-0 flex-1 overflow-y-auto pb-36"
      :class="activeTab === STANDINGS_TAB ? 'px-0 pt-0' : 'px-3 pt-2'"
    >
      <p v-if="isLoading" class="tournament-detail-state-message">
        Caricamento torneo...
      </p>

      <p v-else-if="loadError" class="tournament-detail-state-message tournament-detail-state-message--error">
        {{ loadError }}
      </p>

      <div v-else :class="activeTab === STANDINGS_TAB ? 'pb-2' : 'space-y-3 pb-2'">
        <article v-if="activeTab === STANDINGS_TAB" class="tournament-section-card tournament-section-card--standings">
          <p v-if="standingsTableRows.length === 0" class="tournament-section-card__state">
            Nessuna classifica disponibile.
          </p>

          <div v-else class="tournament-standings-table-wrapper">
            <table class="tournament-standings-table tournament-standings-table--body">
              <thead>
                <tr>
                  <th
                    v-for="column in standingsColumns"
                    :key="`header-${column.key}`"
                    class="tournament-standings-table__head"
                    :class="{
                      'tournament-standings-table__head--player': column.key === 'player',
                      'tournament-standings-table__head--metric': column.key !== 'player',
                    }"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in standingsTableRows"
                  :key="row.participant_id"
                  class="tournament-standings-table__row"
                >
                  <td
                    v-for="column in standingsColumns"
                    :key="`${row.participant_id}-${column.key}`"
                    class="tournament-standings-table__cell"
                    :class="{
                      'tournament-standings-table__cell--player': column.key === 'player',
                      'tournament-standings-table__cell--metric': column.key !== 'player',
                    }"
                  >
                    <template v-if="column.key === 'player'">
                      <div class="tournament-standings-table__player-content">
                        <span
                          class="tournament-player-status-dot"
                          :class="participantStatusDotClass(row.status)"
                          :title="participantStatusLabel(row.status)"
                          aria-hidden="true"
                        />

                        <NuxtLink
                          v-if="standingProfilePath(row)"
                          :to="standingProfilePath(row)"
                          class="tournament-player-link"
                        >
                          {{ standingPlayerName(row) }}
                        </NuxtLink>

                        <span v-else class="tournament-player-link tournament-player-link--disabled">
                          {{ standingPlayerName(row) }}
                        </span>
                      </div>
                    </template>

                    <template v-else>
                      {{ standingsCellValue(row, column.key) }}
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <template v-else>
          <div class="space-y-2">
            <div v-if="roundSubTabs.length === 0" class="tournament-round-card__empty">
              Nessun round pianificato.
            </div>

            <template v-else>
              <div v-if="!selectedRoundCard" class="tournament-round-card__empty">
                Round non ancora iniziato.
              </div>

              <template v-else>
                <div v-if="roundMatchRows.length === 0" class="tournament-round-card__empty">
                  Nessuna partita pianificata per questo round.
                </div>

                <div v-else class="space-y-2">
                  <div
                    v-for="roundMatchRow in roundMatchRows"
                    :key="roundMatchRow.tournamentMatch.id"
                    class="tournament-round-match-item"
                  >
                    <PlayMatchHistoryItem
                      :item="roundMatchRow"
                      :disable-navigation="true"
                      :clickable="roundMatchRow.clickable"
                      @select="handleRoundMatchSelect(roundMatchRow.tournamentMatch)"
                    />
                  </div>
                </div>
              </template>
            </template>
          </div>
        </template>
      </div>
    </div>

    <MobileFloatMenu v-if="hasTournamentActions" :cols="1">
      <template #buttons>
        <div class="tournament-actions-row">
          <ButtonMenu
            v-if="canJoinTournament"
            icon="fa-solid:plus"
            label="Iscriviti"
            color="green"
            :disabled="isJoining"
            transition
            :delay="60"
            @click="handleJoin"
          />

          <ButtonMenu
            v-if="canWithdrawTournament"
            icon="hugeicons:file-remove"
            label="Ritirati"
            color="red"
            :disabled="isWithdrawing"
            transition
            :delay="120"
            @click="handleWithdraw"
          />

          <ButtonMenu
            v-if="canStartTournament"
            icon="mdi-check"
            label="Avvia torneo"
            color="blue"
            :disabled="isStartingTournament"
            transition
            :delay="180"
            @click="handleStartTournament"
          />

          <ButtonMenu
            v-if="canOpenExpelDialog"
            icon="hugeicons:file-remove"
            label="Espelli"
            color="yellow"
            :disabled="isExpellingParticipants"
            transition
            :delay="240"
            @click="openExpelDialog"
          />

          <ButtonMenu
            v-if="canCancelTournament"
            icon="tabler:trash"
            label="Annulla"
            color="red"
            :disabled="isCancellingTournament"
            transition
            :delay="300"
            @click="openCancelDialog"
          />
        </div>
      </template>
    </MobileFloatMenu>

    <DialogsGeneric ref="organizerResultDialogRef" :disabled="Boolean(updatingMatchId)">
      <template #button>
        <span class="tournament-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Gestisci risultato match</template>

      <template #content>
        <div class="tournament-result-dialog-content">
          <p class="tournament-result-dialog-meta">
            Round {{ selectedMatchForResultDialog?.round_number ?? "-" }} - Tavolo
            {{ selectedMatchForResultDialog?.table_number ?? "-" }}
          </p>
          <p class="tournament-result-dialog-players">
            {{ selectedMatchPlayer1Label }}
            vs
            {{ selectedMatchPlayer2Label }}
          </p>
          <p class="tournament-result-dialog-hint">
            In quanto organizzatore il risultato inserito qui ha priorita e aggiorna sia il match torneo che lo storico della partita singola.
          </p>
        </div>
      </template>

      <template #actions="{ closeDialog }">
        <div class="flex flex-col gap-3">
          <v-btn
            variant="flat"
            class="tournament-result-dialog-action tournament-result-dialog-action--win"
            :loading="updatingMatchId === selectedMatchForResultDialog?.id"
            :disabled="!selectedMatchForResultDialog || Boolean(updatingMatchId)"
            @click="handleSubmitResult(selectedMatchForResultDialog?.id, 'player1_win')"
          >
            Vince {{ selectedMatchPlayer1Label }}
          </v-btn>

          <v-btn
            v-if="canMatchDraw()"
            variant="flat"
            class="tournament-result-dialog-action tournament-result-dialog-action--draw"
            :loading="updatingMatchId === selectedMatchForResultDialog?.id"
            :disabled="!selectedMatchForResultDialog || Boolean(updatingMatchId)"
            @click="handleSubmitResult(selectedMatchForResultDialog?.id, 'draw')"
          >
            Pareggio
          </v-btn>

          <v-btn
            variant="flat"
            class="tournament-result-dialog-action tournament-result-dialog-action--loss"
            :loading="updatingMatchId === selectedMatchForResultDialog?.id"
            :disabled="!selectedMatchForResultDialog || Boolean(updatingMatchId)"
            @click="handleSubmitResult(selectedMatchForResultDialog?.id, 'player2_win')"
          >
            Vince {{ selectedMatchPlayer2Label }}
          </v-btn>
          
          <v-btn
            variant="text"
            :disabled="Boolean(updatingMatchId)"
            @click="closeMatchResultDialog(closeDialog)"
          >
            Chiudi
          </v-btn>
        </div>
      </template>
    </DialogsGeneric>

    <DialogsGeneric ref="expelDialogRef" :disabled="isExpellingParticipants">
      <template #button>
        <span class="tournament-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Espelli giocatori</template>

      <template #content>
        <p class="tournament-dialog-text">
          Seleziona uno o piu giocatori da espellere dal torneo.
        </p>
        <div class="tournament-expel-list">
          <label
            v-for="participant in expellableParticipants"
            :key="participant.id"
            class="tournament-expel-option"
          >
            <input
              type="checkbox"
              class="tournament-expel-option__check"
              :checked="selectedExpelParticipantIds.includes(participant.id)"
              @change="toggleExpelParticipant(participant.id)"
            />
            <span class="tournament-expel-option__label">
              {{ participant.profile?.display_name ?? participant.profile?.username ?? participant.profile_id }}
            </span>
          </label>
        </div>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn variant="text" :disabled="isExpellingParticipants" @click="closeDialog">
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="tournament-dialog-danger"
          :loading="isExpellingParticipants"
          :disabled="isExpellingParticipants || selectedExpelParticipantIds.length === 0"
          @click="handleExpelParticipants"
        >
          Espelli selezionati
        </v-btn>
      </template>
    </DialogsGeneric>

    <DialogsGeneric ref="cancelDialogRef" :disabled="isCancellingTournament">
      <template #button>
        <span class="tournament-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Annulla torneo</template>

      <template #content>
        <p class="tournament-dialog-text">
          Il torneo verra eliminato definitivamente con tutti i record associati. Vuoi continuare?
        </p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn variant="text" :disabled="isCancellingTournament" @click="closeDialog">
          Indietro
        </v-btn>
        <v-btn
          variant="flat"
          class="tournament-dialog-danger"
          :loading="isCancellingTournament"
          :disabled="isCancellingTournament"
          @click="handleCancelTournament"
        >
          Elimina torneo
        </v-btn>
      </template>
    </DialogsGeneric>
  </section>
</template>
<style scoped>
.tournament-detail-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.82);
  font-size: 0.9rem;
  font-weight: 600;
}

.tournament-detail-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.tournament-toolbar-state-message {
  margin: 0;
  text-align: center;
  color: rgba(203, 213, 225, 0.92);
  font-size: 0.76rem;
  font-weight: 600;
}

.tournament-toolbar-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.tournament-section-card__state {
  margin: 0.24rem 0 0;
  color: rgba(203, 213, 225, 0.92);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.34;
}

.tournament-info-box {
  border: 1px solid rgba(33, 95, 165, 0.34);
  border-radius: 0.75rem;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(33, 95, 165, 0.25), rgba(30, 41, 59, 0.35));
}

.tournament-info-panel {
  background: transparent;
}

:deep(.tournament-info-panel .v-expansion-panel) {
  background: transparent !important;
  box-shadow: none !important;
}

:deep(.tournament-info-panel .v-expansion-panel-title) {
  min-height: 0;
  padding: 0.55rem 0.65rem;
  color: rgba(147, 197, 253, 0.95);
  font-size: 0.8rem;
  font-weight: 700;
}

:deep(.tournament-info-panel .v-expansion-panel-title__icon) {
  color: rgba(191, 219, 254, 0.95);
}

:deep(.tournament-info-panel .v-expansion-panel-text__wrapper) {
  padding: 0 0.65rem 0.6rem 0.65rem;
}

:deep(.tournament-info-panel .v-expansion-panel-text) {
  color: inherit;
}

.tournament-info-list {
  margin: 0;
  color: rgba(203, 213, 225, 0.9);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.34;
}

.tournament-toolbar-rounds-shell {
  width: 100%;
}

.tournament-toolbar-rounds-empty {
  margin: 0.2rem 0 0;
  border-radius: 0.75rem;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.45);
  padding: 0.48rem 0.56rem;
  color: rgba(203, 213, 225, 0.9);
  font-size: 0.72rem;
  font-weight: 600;
}

.tournament-section-card--standings {
  margin: 0;
  --tournament-player-column-width: 148px;
  --tournament-metric-column-width: 72px;
}

.tournament-standings-table-wrapper {
  margin-top: 0;
  width: 100%;
  position: relative;
  overflow-y: visible;
  overflow-x: auto;
  border: none;
  border-radius: 0;
  background: transparent;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
  isolation: isolate;
}

.tournament-standings-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.tournament-standings-table__head,
.tournament-standings-table__cell {
  padding: 0.42rem 0.5rem;
  white-space: nowrap;
  border-bottom: none;
  font-size: 0.72rem;
  font-weight: 700;
}

.tournament-standings-table__head {
  position: sticky;
  top: 0;
  z-index: 20;
  color: rgba(255, 245, 235, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  background: rgba(2, 6, 23, 0.985);
}

.tournament-standings-table__cell {
  color: rgba(226, 232, 240, 0.95);
  text-align: center;
  background: rgba(15, 23, 42, 0.45);
}

.tournament-standings-table__row:nth-child(even) .tournament-standings-table__cell {
  background: rgba(15, 23, 42, 0.68);
}

.tournament-standings-table__head--player {
  position: sticky;
  left: 0;
  z-index: 24;
  width: var(--tournament-player-column-width);
  min-width: var(--tournament-player-column-width);
  max-width: var(--tournament-player-column-width);
  text-align: left;
}

.tournament-standings-table__head--metric {
  width: var(--tournament-metric-column-width);
  min-width: var(--tournament-metric-column-width);
  max-width: var(--tournament-metric-column-width);
}

.tournament-standings-table__cell--player {
  position: sticky;
  left: 0;
  z-index: 10;
  width: var(--tournament-player-column-width);
  min-width: var(--tournament-player-column-width);
  max-width: var(--tournament-player-column-width);
  text-align: left;
  background: rgba(8, 13, 25, 0.98) !important;
}

.tournament-standings-table__cell--metric {
  width: var(--tournament-metric-column-width);
  min-width: var(--tournament-metric-column-width);
  max-width: var(--tournament-metric-column-width);
}

.tournament-standings-table__player-content {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.38rem;
}

.tournament-standings-table__head--player::after,
.tournament-standings-table__cell--player::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: rgba(15, 23, 42, 0.98);
  pointer-events: none;
}

.tournament-player-status-dot {
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.tournament-player-status-dot--active {
  background: rgba(74, 222, 128, 0.95);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.6);
}

.tournament-player-status-dot--inactive {
  background: rgba(248, 113, 113, 0.95);
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.58);
}

.tournament-player-link {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(241, 245, 249, 0.96);
  font-weight: 800;
  text-decoration: none;
}

.tournament-player-link:hover {
  color: rgba(255, 216, 177, 0.98);
  text-decoration: underline;
}

.tournament-player-link--disabled {
  color: rgba(203, 213, 225, 0.75);
  cursor: default;
}

.tournament-round-subtabs {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  overflow-x: auto;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(2, 6, 23, 0.6);
  padding: 0.28rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  scrollbar-width: none;
}

.tournament-round-subtabs::-webkit-scrollbar {
  display: none;
}

.tournament-round-subtab {
  flex: 0 0 auto;
  min-width: 132px;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  background: transparent;
  padding: 0.44rem 0.6rem;
  text-align: left;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    filter 160ms ease;
}

.tournament-round-subtab:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  filter: brightness(1.03);
}

.tournament-round-subtab--selected {
  box-shadow:
    0 0 0 2px rgba(255, 216, 177, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.tournament-round-subtab:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.tournament-round-subtab--completed {
  border-color: rgba(74, 222, 128, 0.42);
  background: linear-gradient(135deg, rgba(21, 128, 61, 0.34), rgba(15, 118, 110, 0.26));
}

.tournament-round-subtab--active {
  border-color: rgba(251, 146, 60, 0.5);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.34), rgba(194, 65, 12, 0.28));
}

.tournament-round-subtab--pending {
  border-color: rgba(71, 85, 105, 0.54);
  background: rgba(2, 6, 23, 0.82);
}

.tournament-round-subtab__label {
  display: block;
  color: rgba(241, 245, 249, 0.95);
  font-size: 0.74rem;
  font-weight: 800;
}

.tournament-round-subtab__stage {
  display: inline-block;
  margin-top: 0.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 216, 177, 0.38);
  background: rgba(255, 122, 24, 0.24);
  color: rgba(255, 227, 197, 0.95);
  padding: 0.1rem 0.34rem;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.tournament-round-card__empty {
  margin-top: 0.46rem;
  border-radius: 0.62rem;
  border: 1px dashed rgba(148, 163, 184, 0.26);
  padding: 0.5rem;
  color: rgba(203, 213, 225, 0.88);
  font-size: 0.71rem;
  font-weight: 600;
}

.tournament-round-match-item {
  border-radius: 0.86rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.36);
  padding: 0.35rem;
}

.tournament-round-match-item__result {
  margin: 0.35rem 0.1rem 0.1rem;
  color: rgba(255, 216, 177, 0.94);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.3;
}

.tournament-result-dialog-content {
  display: grid;
  gap: 0.48rem;
}

.tournament-result-dialog-meta {
  margin: 0;
  color: rgba(148, 163, 184, 0.95);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tournament-result-dialog-players {
  margin: 0;
  color: rgba(241, 245, 249, 0.95);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.3;
}

.tournament-result-dialog-hint {
  margin: 0;
  color: rgba(203, 213, 225, 0.92);
  font-size: 0.82rem;
  line-height: 1.35;
}

.tournament-result-dialog-action {
  border: 1px solid transparent;
  color: rgba(248, 250, 252, 0.98);
}

.tournament-result-dialog-action--win {
  border-color: rgba(74, 222, 128, 0.34);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.88), rgba(21, 128, 61, 0.95));
}

.tournament-result-dialog-action--draw {
  border-color: rgba(253, 186, 116, 0.36);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(194, 65, 12, 0.95));
}

.tournament-result-dialog-action--loss {
  border-color: rgba(129, 140, 248, 0.34);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.86), rgba(67, 56, 202, 0.95));
}

.tournament-actions-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.12rem;
  scrollbar-width: none;
}

.tournament-actions-row::-webkit-scrollbar {
  display: none;
}

.tournament-actions-row > * {
  min-width: 0;
  flex: 1 1 0;
}

.tournament-dialog-text {
  margin: 0;
  color: rgba(241, 245, 249, 0.9);
  line-height: 1.4;
}

.tournament-expel-list {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.45rem;
  max-height: 230px;
  overflow-y: auto;
}

.tournament-expel-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 0.7rem;
  background: rgba(15, 23, 42, 0.55);
  padding: 0.48rem 0.55rem;
}

.tournament-expel-option__check {
  width: 0.95rem;
  height: 0.95rem;
  accent-color: #fb923c;
}

.tournament-expel-option__label {
  color: rgba(226, 232, 240, 0.95);
  font-size: 0.8rem;
  font-weight: 700;
}

.tournament-dialog-danger {
  border: 1px solid rgba(248, 113, 113, 0.36);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(153, 27, 27, 0.95));
  color: rgba(255, 241, 242, 0.98);
}

.tournament-hidden-dialog-trigger {
  display: none;
  width: 0;
  height: 0;
}

@media (max-width: 640px) {
  .tournament-standings-table {
    min-width: max(100%, 700px);
  }

  .tournament-standings-table__head,
  .tournament-standings-table__cell {
    padding: 0.38rem 0.42rem;
  }

  .tournament-section-card--standings {
    --tournament-player-column-width: 132px;
    --tournament-metric-column-width: 66px;
  }

  .tournament-round-subtab {
    min-width: 108px;
  }
}
</style>
