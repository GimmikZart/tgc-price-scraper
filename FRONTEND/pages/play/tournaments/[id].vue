<script setup>
import BaseTabs from "@/components/Tabs/BaseTabs.vue";
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
import {
  GHOST_INACTIVE_TAB_CLASS,
  ORANGE_ACTIVE_TAB_CLASS,
} from "@/components/Tabs/styles";
import { formatCoordinatesLabel, normalizeCoordinates } from "@/utilities/geo";
import {
  formatTournamentFormatLabel,
  formatTournamentGameLabel,
  formatTournamentLocationLabel,
  formatTournamentStatusLabel,
  formatTournamentVisibilityLabel,
} from "@/utilities/tournaments";

const DETAILS_VIEW_TAB = "details";
const TOURNAMENT_VIEW_TAB = "tournament";
const AVAILABLE_VIEW_TABS = Object.freeze([DETAILS_VIEW_TAB, TOURNAMENT_VIEW_TAB]);
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
const activeViewTab = ref(normalizeViewTab(route.query.view));
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

const tournamentLocationLabel = computed(() => {
  return formatTournamentLocationLabel(tournament.value);
});

const tournamentCoordinates = computed(() => {
  return normalizeCoordinates(tournament.value);
});

const tournamentCoordinatesLabel = computed(() => {
  if (!tournamentCoordinates.value) return null;
  return formatCoordinatesLabel(tournamentCoordinates.value, 5);
});

const tournamentAddressLabel = computed(() => {
  return tournamentLocationLabel.value ?? tournamentCoordinatesLabel.value ?? null;
});

const tournamentFormatLabel = computed(() => {
  return formatTournamentFormatLabel(tournament.value?.format);
});

const tournamentGameLabel = computed(() => {
  return formatTournamentGameLabel(tournament.value?.game);
});

const tournamentStatusText = computed(() => {
  return formatTournamentStatusLabel(tournament.value?.status);
});

const tournamentVisibilityLabel = computed(() => {
  return formatTournamentVisibilityLabel(tournament.value?.visibility);
});

const tournamentOrganizerLabel = computed(() => {
  const profile = tournament.value?.organizer_profile;

  return profile?.display_name
    ?? profile?.username
    ?? tournament.value?.organizer_id
    ?? "Organizzatore";
});

const joinedParticipantsCount = computed(() => {
  return participants.value.filter((participant) => {
    return participant?.status !== TournamentParticipantStatus.Withdrawn;
  }).length;
});

const participantSlotsLeft = computed(() => {
  const maxParticipants = Number(tournament.value?.max_participants ?? 0);
  if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) return null;

  return Math.max(maxParticipants - joinedParticipantsCount.value, 0);
});

const tournamentParticipantsSummary = computed(() => {
  return `${joinedParticipantsCount.value} / ${tournament.value?.max_participants ?? "-"}`;
});

const tournamentRoundProgressLabel = computed(() => {
  const currentRound = Number(tournament.value?.current_round ?? 0);
  const totalRounds = Number(tournament.value?.total_rounds ?? 0);

  if (!Number.isFinite(totalRounds) || totalRounds <= 0) {
    return "Da definire";
  }

  if (!Number.isFinite(currentRound) || currentRound <= 0) {
    return `0 / ${totalRounds}`;
  }

  return `${Math.min(currentRound, totalRounds)} / ${totalRounds}`;
});

const mapsProviderLabel = computed(() => {
  return prefersAppleMaps() ? "Apple Maps" : "Google Maps";
});

const tournamentMapsHref = computed(() => {
  const coordinates = tournamentCoordinates.value;
  const addressLabel = tournamentAddressLabel.value;

  if (!coordinates && !addressLabel) return null;

  if (prefersAppleMaps()) {
    const params = new URLSearchParams();

    if (addressLabel) {
      params.set("q", addressLabel);
    }

    if (coordinates) {
      params.set("ll", `${coordinates.lat},${coordinates.lng}`);
    }

    return `http://maps.apple.com/?${params.toString()}`;
  }

  const googleQuery = coordinates
    ? `${coordinates.lat},${coordinates.lng}${addressLabel ? ` (${addressLabel})` : ""}`
    : addressLabel;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleQuery)}`;
});

const viewTabs = computed(() => {
  return [
    {
      label: "Dettagli",
      value: DETAILS_VIEW_TAB,
    },
    {
      label: "Torneo",
      value: TOURNAMENT_VIEW_TAB,
    },
  ];
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

const canAddParticipants = computed(() => {
  if (!tournament.value) return false;
  if (!isOrganizer.value) return false;
  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.value.status)) {
    return false;
  }

  return joinedParticipantsCount.value < Number(tournament.value.max_participants ?? 0);
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
    canAddParticipants.value,
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

const tournamentDetailCards = computed(() => {
  return [
    {
      label: "Formato",
      value: tournamentFormatLabel.value,
      hint: roundsHint.value,
    },
    {
      label: "Gioco",
      value: tournamentGameLabel.value,
      hint: "Titolo giocato in questo evento.",
    },
    {
      label: "Stato",
      value: tournamentStatusText.value,
      hint: "Aggiornato in base alla fase corrente del torneo.",
    },
    {
      label: "Visibilita",
      value: tournamentVisibilityLabel.value,
      hint: "Definisce chi puo trovare il torneo prima dell'iscrizione.",
    },
    {
      label: "Partecipanti",
      value: tournamentParticipantsSummary.value,
      hint: participantSlotsLeft.value == null
        ? "Capienza non disponibile."
        : participantSlotsLeft.value === 0
          ? "Posti esauriti."
          : `${participantSlotsLeft.value} posti ancora disponibili.`,
    },
    {
      label: "Round",
      value: tournamentRoundProgressLabel.value,
      hint: expectedRoundsCount.value > 0
        ? `${expectedRoundsCount.value} round previsti in totale.`
        : "Il numero di round verra definito all'avvio.",
    },
    {
      label: "Organizzatore",
      value: tournamentOrganizerLabel.value,
      hint: "Responsabile della gestione del torneo.",
    },
  ];
});

const contentShellClass = computed(() => {
  if (activeViewTab.value === DETAILS_VIEW_TAB) {
    return "px-3 pt-3";
  }

  return activeTab.value === STANDINGS_TAB ? "px-0 pt-0" : "px-3 pt-2";
});

const contentInnerClass = computed(() => {
  if (activeViewTab.value === DETAILS_VIEW_TAB) {
    return "space-y-3 pb-2";
  }

  return activeTab.value === STANDINGS_TAB ? "pb-2" : "space-y-3 pb-2";
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

function normalizeViewTab(rawView) {
  const normalizedView = Array.isArray(rawView)
    ? String(rawView[0] ?? "")
    : String(rawView ?? "");

  if (AVAILABLE_VIEW_TABS.includes(normalizedView)) {
    return normalizedView;
  }

  return TOURNAMENT_VIEW_TAB;
}

function setActiveViewTab(nextView) {
  const normalizedView = normalizeViewTab(nextView);
  if (normalizedView === activeViewTab.value && String(route.query.view ?? "") === normalizedView) {
    return;
  }

  activeViewTab.value = normalizedView;
  router.replace({
    query: {
      ...route.query,
      view: normalizedView,
    },
  });
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

function canMatchDraw() {
  return tournament.value?.format !== TournamentFormat.SingleElimination;
}

function prefersAppleMaps() {
  if (typeof navigator === "undefined") return false;

  const userAgentDataPlatform = String(navigator.userAgentData?.platform ?? "").toLowerCase();
  const platform = String(navigator.platform ?? "").toLowerCase();
  const userAgent = String(navigator.userAgent ?? "").toLowerCase();

  if (
    userAgentDataPlatform.includes("windows")
    || userAgentDataPlatform.includes("android")
    || platform.startsWith("win")
    || platform.startsWith("linux")
    || userAgent.includes("windows")
    || userAgent.includes("android")
  ) {
    return false;
  }

  if (/(iphone|ipad|ipod)/i.test(userAgent)) {
    return true;
  }

  return [
    "macintosh",
    "macintel",
    "macppc",
    "mac68k",
  ].includes(platform) || /macintosh|mac os x/i.test(userAgent);
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

function goToAddParticipants() {
  if (!canAddParticipants.value || !tournamentId.value) return;
  router.push(`/play/tournaments/${tournamentId.value}/add-users`);
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
  () => route.query.view,
  (nextView) => {
    activeViewTab.value = normalizeViewTab(nextView);
  },
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
  <section class="relative h-full tournament-detail-page">
    <Toolbar class="tournament-detail-page__toolbar" :label="toolbarLabel" fixed back-button>
      <template #info>
        <div class="space-y-2">
          <BaseTabs
            :tabs="viewTabs"
            :active="activeViewTab"
            :active-class="ORANGE_ACTIVE_TAB_CLASS"
            :inactive-class="GHOST_INACTIVE_TAB_CLASS"
            @change="setActiveViewTab"
          />

          <p v-if="isLoading" class="tournament-toolbar-state-message">
            Caricamento dati torneo...
          </p>

          <p v-else-if="loadError" class="tournament-toolbar-state-message tournament-toolbar-state-message--error">
            {{ loadError }}
          </p>

          <template v-else-if="activeViewTab === TOURNAMENT_VIEW_TAB">
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
          </template>
        </div>
      </template>
    </Toolbar>

    <div
      class="min-h-0 flex-1 overflow-y-auto pb-36"
      :class="contentShellClass"
    >
      <p v-if="isLoading" class="tournament-detail-state-message">
        Caricamento torneo...
      </p>

      <p v-else-if="loadError" class="tournament-detail-state-message tournament-detail-state-message--error">
        {{ loadError }}
      </p>

      <div v-else :class="contentInnerClass">
        <template v-if="activeViewTab === DETAILS_VIEW_TAB">
          <div class="tournament-details-shell">
            <article class="tournament-details-map-card">
              <div v-if="tournamentCoordinates" class="tournament-details-map-shell">
                <MapLeafletMap
                  :center="tournamentCoordinates"
                  :zoom="15"
                  :interactive="false"
                  :zoom-control="false"
                  :show-center-marker="true"
                  :min-height="220"
                />
              </div>

              <div v-else class="tournament-details-map-placeholder">
                <v-icon size="26" icon="mdi:map-marker-off-outline" />
                <p class="tournament-details-map-placeholder__title">Posizione non disponibile</p>
                <p class="tournament-details-map-placeholder__text">
                  Questo torneo non ha ancora coordinate valide da mostrare in mappa.
                </p>
              </div>

              <a
                v-if="tournamentMapsHref && tournamentAddressLabel"
                :href="tournamentMapsHref"
                target="_blank"
                rel="noopener noreferrer"
                class="tournament-details-address"
              >
                <span class="tournament-details-address__icon">
                  <v-icon size="18" icon="mdi:map-marker-radius-outline" />
                </span>

                <span class="tournament-details-address__content">
                  <span class="tournament-details-address__label">Indirizzo torneo</span>
                  <span class="tournament-details-address__value">{{ tournamentAddressLabel }}</span>
                  <span
                    v-if="tournamentCoordinatesLabel && tournamentLocationLabel"
                    class="tournament-details-address__meta"
                  >
                    {{ tournamentCoordinatesLabel }}
                  </span>
                </span>

                <span class="tournament-details-address__action">
                  Apri in {{ mapsProviderLabel }}
                  <v-icon size="16" icon="mdi:open-in-new" />
                </span>
              </a>

              <div v-else class="tournament-details-address tournament-details-address--static">
                <span class="tournament-details-address__icon">
                  <v-icon size="18" icon="mdi:map-marker-alert-outline" />
                </span>

                <span class="tournament-details-address__content">
                  <span class="tournament-details-address__label">Indirizzo torneo</span>
                  <span class="tournament-details-address__value">Nessun indirizzo disponibile</span>
                </span>
              </div>
            </article>

            <section class="tournament-details-grid" aria-label="Informazioni torneo">
              <article
                v-for="detailCard in tournamentDetailCards"
                :key="detailCard.label"
                class="tournament-details-card"
              >
                <p class="tournament-details-card__label">{{ detailCard.label }}</p>
                <p class="tournament-details-card__value">{{ detailCard.value }}</p>
                <p class="tournament-details-card__hint">{{ detailCard.hint }}</p>
              </article>
            </section>

            <article class="tournament-details-section">
              <p class="tournament-details-section__eyebrow">Come funziona</p>
              <h3 class="tournament-details-section__title">{{ tournamentFormatLabel }}</h3>
              <p class="tournament-details-section__text">{{ roundsHint }}</p>
            </article>

            <article class="tournament-details-section">
              <p class="tournament-details-section__eyebrow">Regole aggiuntive</p>
              <p
                v-if="tournamentAdditionalRules.length === 0"
                class="tournament-details-section__text"
              >
                Nessuna regola aggiuntiva specificata per questo torneo.
              </p>

              <ul v-else class="tournament-details-rules">
                <li
                  v-for="(rule, index) in tournamentAdditionalRules"
                  :key="`${index}-${rule}`"
                  class="tournament-details-rules__item"
                >
                  {{ rule }}
                </li>
              </ul>
            </article>
          </div>
        </template>

        <template v-else>
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
            v-if="canAddParticipants"
            icon="mdi:account-plus-outline"
            label="Aggiungi utenti"
            color="green"
            transition
            :delay="210"
            @click="goToAddParticipants"
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
:deep(.tournament-detail-page__toolbar > div:first-child) {
  z-index: 1100;
}

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
  text-align: center;
}

.tournament-details-shell {
  display: grid;
  gap: 0.9rem;
}

.tournament-details-map-card,
.tournament-details-section,
.tournament-details-card {
  border-radius: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background:
    radial-gradient(circle at top, rgba(255, 122, 24, 0.11), transparent 45%),
    linear-gradient(145deg, rgba(9, 14, 24, 0.96), rgba(3, 7, 18, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 18px 30px rgba(2, 6, 23, 0.24);
}

.tournament-details-map-card {
  overflow: hidden;
  padding: 0.8rem;
}

.tournament-details-map-shell {
  height: clamp(220px, 32vh, 280px);
  position: relative;
  z-index: 0;
  isolation: isolate;
}

.tournament-details-map-placeholder {
  display: grid;
  place-items: center;
  gap: 0.35rem;
  min-height: 220px;
  border-radius: 1rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background:
    radial-gradient(circle at top, rgba(255, 122, 24, 0.12), transparent 48%),
    rgba(15, 23, 42, 0.72);
  color: rgba(226, 232, 240, 0.88);
  padding: 1.2rem;
  text-align: center;
}

.tournament-details-map-placeholder__title,
.tournament-details-map-placeholder__text {
  margin: 0;
}

.tournament-details-map-placeholder__title {
  color: rgba(255, 245, 235, 0.98);
  font-size: 0.95rem;
  font-weight: 800;
}

.tournament-details-map-placeholder__text {
  color: rgba(203, 213, 225, 0.82);
  font-size: 0.82rem;
  line-height: 1.45;
}

.tournament-details-address {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.8rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 178, 125, 0.18);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  padding: 0.85rem 0.95rem;
  text-decoration: none;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.tournament-details-address:hover {
  border-color: rgba(255, 178, 125, 0.34);
  background: rgba(255, 122, 24, 0.08);
  transform: translateY(-1px);
}

.tournament-details-address--static:hover {
  transform: none;
}

.tournament-details-address__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.8rem;
  background: rgba(255, 122, 24, 0.12);
  color: rgba(255, 190, 146, 0.96);
}

.tournament-details-address__content {
  display: grid;
  gap: 0.14rem;
  min-width: 0;
}

.tournament-details-address__label,
.tournament-details-address__meta,
.tournament-details-address__action {
  font-size: 0.76rem;
  font-weight: 700;
}

.tournament-details-address__label {
  color: rgba(255, 178, 125, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tournament-details-address__value {
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.94rem;
  font-weight: 800;
  line-height: 1.35;
}

.tournament-details-address__meta {
  color: rgba(148, 163, 184, 0.86);
}

.tournament-details-address__action {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: rgba(255, 225, 198, 0.94);
  white-space: nowrap;
}

.tournament-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.tournament-details-card,
.tournament-details-section {
  padding: 0.95rem 1rem;
}

.tournament-details-card__label,
.tournament-details-card__value,
.tournament-details-card__hint,
.tournament-details-section__eyebrow,
.tournament-details-section__title,
.tournament-details-section__text {
  margin: 0;
}

.tournament-details-card__label,
.tournament-details-section__eyebrow {
  color: rgba(255, 178, 125, 0.9);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tournament-details-card__value {
  margin-top: 0.3rem;
  color: rgba(248, 250, 252, 0.98);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.25;
}

.tournament-details-card__hint,
.tournament-details-section__text {
  margin-top: 0.4rem;
  color: rgba(203, 213, 225, 0.82);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.45;
}

.tournament-details-section__title {
  margin-top: 0.32rem;
  color: rgba(255, 245, 235, 0.98);
  font-size: 1.04rem;
  font-weight: 800;
}

.tournament-details-rules {
  display: grid;
  gap: 0.5rem;
  margin: 0.55rem 0 0;
  padding: 0;
  list-style: none;
}

.tournament-details-rules__item {
  position: relative;
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.45;
  padding-left: 1rem;
}

.tournament-details-rules__item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.42rem;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: rgba(255, 157, 82, 0.96);
  box-shadow: 0 0 10px rgba(255, 122, 24, 0.35);
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

@media (max-width: 520px) {
  .tournament-details-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .tournament-details-address {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .tournament-details-address__action {
    grid-column: 1 / -1;
    justify-self: start;
    padding-left: 3rem;
  }
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
