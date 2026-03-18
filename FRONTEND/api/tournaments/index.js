import {
  DEFAULT_TOURNAMENT_GAME,
  TournamentFormat,
  TournamentMatchResult,
  TournamentMatchStatus,
  TournamentParticipantStatus,
  TournamentRoundStatus,
  TournamentStatus,
} from "@/api/tournaments/constants";
import {
  areAllMatchesCompleted,
  createByeMatch,
  createPendingMatch,
  getMatchLoserParticipantId,
  getMatchWinnerParticipantId,
  getRoundMatches,
} from "@/api/tournaments/engine/common";
import {
  getTournamentFormatHandler,
  normalizeTournamentSettingsByFormat,
  resolveTournamentTotalRounds,
  tournamentFormatAllowsDraws,
} from "@/api/tournaments/engine";
import {
  normalizeTournamentFormat,
  normalizeTournamentMatchResult,
  normalizeTournamentParticipantStatus,
  normalizeTournamentRow,
  normalizeTournamentStatus,
} from "@/api/tournaments/normalizers";
import {
  deleteTournamentById,
  deleteTournamentParticipantById,
  deleteTournamentParticipantsByIds,
  fetchTournamentById,
  fetchTournamentMatchById,
  fetchTournamentMatchByLinkedMatchId,
  fetchTournamentMatches,
  fetchTournamentParticipantByProfile,
  fetchTournamentParticipants,
  fetchTournamentRounds,
  fetchUserTournaments,
  hydrateParticipants,
  hydrateTournament,
  hydrateTournaments,
  insertTournament,
  insertTournamentMatches,
  insertTournamentParticipant,
  insertTournamentRound,
  updateTournamentById,
  updateTournamentMatchById,
  updateTournamentParticipantById,
  updateTournamentParticipantsByIds,
  updateTournamentRoundById,
} from "@/api/tournaments/repository";
import { computeTournamentStandings } from "@/api/tournaments/standings";
import {
  assertAuthenticatedUserId,
  normalizeJsonObject,
  normalizeNumberInRange,
  normalizePositiveInteger,
  normalizeString,
  normalizeUuid,
  nowIso,
} from "@/api/tournaments/utils";
import { createSecretDeckSnapshot } from "@/utilities/deckPrivacy";

export * from "@/api/tournaments/constants";

function assertTournamentId(tournamentId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }
  return normalizedTournamentId;
}

function assertTournamentName(tournamentName) {
  const normalizedTournamentName = normalizeString(tournamentName);
  if (!normalizedTournamentName) {
    throw new Error("Nome torneo obbligatorio");
  }
  return normalizedTournamentName;
}

function assertTournamentFormat(tournamentFormat) {
  const normalizedFormat = normalizeTournamentFormat(tournamentFormat);
  if (!normalizedFormat) {
    throw new Error("Formato torneo non supportato");
  }
  return normalizedFormat;
}

function hasLocationValue(value) {
  return !(value === null || value === undefined || value === "");
}

function resolveTournamentLocationPayload(payload = {}) {
  const location = payload?.location && typeof payload.location === "object" && !Array.isArray(payload.location)
    ? payload.location
    : null;

  const rawLatitude = location?.latitude
    ?? location?.lat
    ?? payload?.latitude
    ?? payload?.lat;
  const rawLongitude = location?.longitude
    ?? location?.lng
    ?? payload?.longitude
    ?? payload?.lng;
  const hasLatitude = hasLocationValue(rawLatitude);
  const hasLongitude = hasLocationValue(rawLongitude);

  if (!hasLatitude && !hasLongitude) {
    return {
      latitude: null,
      longitude: null,
      location_label: null,
    };
  }

  const latitude = normalizeNumberInRange(rawLatitude, -90, 90);
  const longitude = normalizeNumberInRange(rawLongitude, -180, 180);

  if (latitude == null || longitude == null) {
    throw new Error("Coordinate torneo non valide");
  }

  return {
    latitude,
    longitude,
    location_label: normalizeString(
      location?.label
        ?? location?.locationLabel
        ?? payload?.locationLabel
        ?? payload?.location_label,
    ),
  };
}

function resolveInitialTournamentStatus(status) {
  const normalizedStatus = normalizeTournamentStatus(status ?? TournamentStatus.Open);

  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(normalizedStatus)) {
    return TournamentStatus.Open;
  }

  return normalizedStatus;
}

function assertOrganizer(tournament, userId) {
  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  if (String(tournament.organizer_id) !== String(userId)) {
    throw new Error("Solo l'organizzatore puo eseguire questa operazione");
  }
}

function assertTournamentJoinable(tournament) {
  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.status)) {
    throw new Error("Il torneo non accetta nuove iscrizioni");
  }
}

function countJoinedParticipants(participants = []) {
  return (Array.isArray(participants) ? participants : [])
    .filter((participant) => participant?.status !== TournamentParticipantStatus.Withdrawn)
    .length;
}

function normalizeParticipantIdsFromPayload(payload = {}) {
  const rawValues = [];

  if (Array.isArray(payload?.participantIds)) {
    rawValues.push(...payload.participantIds);
  }

  if (Array.isArray(payload?.participant_ids)) {
    rawValues.push(...payload.participant_ids);
  }

  rawValues.push(payload?.participantId, payload?.participant_id);

  return [...new Set(
    rawValues
      .map((value) => normalizeUuid(value))
      .filter(Boolean),
  )];
}

function scoreFromPayload(payload = {}) {
  const normalizedRawScore = normalizeJsonObject(payload?.score);
  const player1FromScore = Number(normalizedRawScore.player1);
  const player2FromScore = Number(normalizedRawScore.player2);

  const player1Value = Number.isFinite(player1FromScore)
    ? player1FromScore
    : Number(payload?.player1Score);
  const player2Value = Number.isFinite(player2FromScore)
    ? player2FromScore
    : Number(payload?.player2Score);

  const normalizedScore = {};

  if (Number.isFinite(player1Value)) {
    normalizedScore.player1 = player1Value;
  }

  if (Number.isFinite(player2Value)) {
    normalizedScore.player2 = player2Value;
  }

  return normalizedScore;
}

function resolveResultFromPayload(match, payload = {}) {
  const normalizedPayloadResult = normalizeTournamentMatchResult(
    payload?.result ?? payload?.outcome,
  );
  if (normalizedPayloadResult) {
    return normalizedPayloadResult;
  }

  const winnerParticipantId = normalizeUuid(payload?.winnerParticipantId ?? payload?.winner_participant_id);
  if (!winnerParticipantId) {
    return null;
  }

  if (winnerParticipantId === match?.player1_participant_id) {
    return TournamentMatchResult.Player1Win;
  }

  if (winnerParticipantId === match?.player2_participant_id) {
    return TournamentMatchResult.Player2Win;
  }

  return null;
}

function resolveWinnerIdFromResult(match, result) {
  if (result === TournamentMatchResult.Player1Win) {
    return normalizeUuid(match?.player1_participant_id);
  }

  if (result === TournamentMatchResult.Player2Win) {
    return normalizeUuid(match?.player2_participant_id);
  }

  return null;
}

function createParticipantByIdMap(participants = []) {
  return new Map(
    (Array.isArray(participants) ? participants : [])
      .map((participant) => [participant.id, participant]),
  );
}

function resolveMatchResultsByTournamentResult(result) {
  if (result === TournamentMatchResult.Player1Win) {
    return {
      challenger_result: "won",
      opponent_result: "lost",
    };
  }

  if (result === TournamentMatchResult.Player2Win) {
    return {
      challenger_result: "lost",
      opponent_result: "won",
    };
  }

  return {
    challenger_result: "draw",
    opponent_result: "draw",
  };
}

function normalizeParticipantMetadata(participant) {
  return normalizeJsonObject(participant?.metadata);
}

function resolveParticipantDefaultDeck(participant) {
  const metadata = normalizeParticipantMetadata(participant);
  const defaultDeck = normalizeJsonObject(metadata?.default_deck);
  return Object.keys(defaultDeck).length ? defaultDeck : null;
}

function normalizeTournamentDeckCards(deck = {}) {
  return Array.isArray(deck?.cards)
    ? deck.cards.filter((cardId) => typeof cardId === "string")
    : [];
}

async function findLeaderCardById(leaderId) {
  const normalizedLeaderId = normalizeString(leaderId);
  if (!normalizedLeaderId) return null;

  const { allCards } = await useOnePieceCards();
  return allCards.find((card) => card.id === normalizedLeaderId) ?? null;
}

async function buildTournamentDeckSnapshot(deck, game = DEFAULT_TOURNAMENT_GAME) {
  const normalizedDeck = deck ?? {};
  const normalizedLeaderId = normalizeString(normalizedDeck.leader);
  const leaderCard = await findLeaderCardById(normalizedLeaderId);
  const cards = normalizeTournamentDeckCards(normalizedDeck);

  return {
    game: normalizeString(game) ?? DEFAULT_TOURNAMENT_GAME,
    slug: normalizeString(normalizedDeck.slug),
    name: normalizeString(normalizedDeck.name),
    leader_id: normalizedLeaderId,
    leader_name: normalizeString(leaderCard?.name) ?? null,
    leader_image: normalizeString(leaderCard?.image) ?? null,
    leader_colors: Array.isArray(leaderCard?.color)
      ? leaderCard.color.filter((color) => typeof color === "string")
      : [],
    cards,
    cards_count: cards.length,
    saved_at: nowIso(),
  };
}

function resolveJoinDeckPayload(payload = {}) {
  const candidateDeck = payload?.deck
    ?? payload?.selectedDeck
    ?? payload?.defaultDeck
    ?? payload?.default_deck;

  if (!candidateDeck || typeof candidateDeck !== "object" || Array.isArray(candidateDeck)) {
    return null;
  }

  return candidateDeck;
}

function resolveAnonymousJoinChoice(payload = {}) {
  return [
    payload?.anonymousDeck,
    payload?.anonymous_deck,
    payload?.skipDeckSelection,
    payload?.skip_deck_selection,
  ].some((value) => value === true);
}

function applyDefaultDeckToMetadata(metadata, deckSnapshot) {
  const normalizedMetadata = normalizeJsonObject(metadata);

  if (!deckSnapshot || typeof deckSnapshot !== "object") {
    return normalizedMetadata;
  }

  return {
    ...normalizedMetadata,
    default_deck: deckSnapshot,
  };
}

function resolveClassicPendingStatusByDecks(player1Deck, player2Deck) {
  return player1Deck && player2Deck
    ? "active"
    : "pending";
}

function resolveTournamentResultFromClassicMatch({
  classicMatch,
  tournamentMatch,
  participantById,
}) {
  if (!classicMatch || classicMatch.status !== "completed") {
    return null;
  }

  const player1Participant = participantById.get(
    normalizeUuid(tournamentMatch?.player1_participant_id),
  );
  const player2Participant = participantById.get(
    normalizeUuid(tournamentMatch?.player2_participant_id),
  );

  const player1ProfileId = normalizeUuid(player1Participant?.profile_id);
  const player2ProfileId = normalizeUuid(player2Participant?.profile_id);
  const winnerProfileId = normalizeUuid(classicMatch?.winner_id);

  if (
    classicMatch?.challenger_result === "draw"
    && classicMatch?.opponent_result === "draw"
    && !winnerProfileId
  ) {
    return TournamentMatchResult.Draw;
  }

  if (winnerProfileId && winnerProfileId === player1ProfileId) {
    return TournamentMatchResult.Player1Win;
  }

  if (winnerProfileId && winnerProfileId === player2ProfileId) {
    return TournamentMatchResult.Player2Win;
  }

  return null;
}

function isSkippableAutoRoundError(error) {
  const normalizedErrorMessage = String(error?.message ?? "");
  return (
    normalizedErrorMessage.includes("Completa tutti i match del round corrente")
    || normalizedErrorMessage.includes("Il torneo non e nello stato started")
  );
}

async function syncLinkedClassicMatch({
  client,
  tournament,
  tournamentMatch,
  participantById,
}) {
  if (!tournamentMatch || tournamentMatch.is_bye) {
    return tournamentMatch;
  }

  const player1ParticipantId = normalizeUuid(tournamentMatch.player1_participant_id);
  const player2ParticipantId = normalizeUuid(tournamentMatch.player2_participant_id);

  const player1Participant = participantById.get(player1ParticipantId);
  const player2Participant = participantById.get(player2ParticipantId);
  const player1ProfileId = normalizeUuid(player1Participant?.profile_id);
  const player2ProfileId = normalizeUuid(player2Participant?.profile_id);
  const player1DefaultDeck = resolveParticipantDefaultDeck(player1Participant);
  const player2DefaultDeck = resolveParticipantDefaultDeck(player2Participant);
  const syncTimestamp = nowIso();
  const hasCompletedTournamentMatch = (
    tournamentMatch.status === TournamentMatchStatus.Completed
    && Boolean(tournamentMatch.result)
  );

  if (!player1ProfileId || !player2ProfileId) {
    throw new Error("Impossibile collegare il match classico: profili partecipanti mancanti");
  }

  let linkedMatchId = normalizeUuid(tournamentMatch.match_id);

  if (linkedMatchId) {
    if (!hasCompletedTournamentMatch) {
      return tournamentMatch;
    }

    const winnerParticipantId = normalizeUuid(tournamentMatch.winner_participant_id);
    const winnerProfileId = winnerParticipantId === player1ParticipantId
      ? player1ProfileId
      : winnerParticipantId === player2ParticipantId
        ? player2ProfileId
        : null;
    const results = resolveMatchResultsByTournamentResult(tournamentMatch.result);

    const linkedMatchPayload = {
      status: "completed",
      challenger_result: results.challenger_result,
      opponent_result: results.opponent_result,
      winner_id: winnerProfileId,
      completed_at: tournamentMatch.completed_at ?? syncTimestamp,
      canceled_at: null,
      cancel_reason: null,
    };

    const { data: updatedClassicMatch, error: updateClassicMatchError } = await client
      .from("matches")
      .update(linkedMatchPayload)
      .eq("id", linkedMatchId)
      .select("id")
      .maybeSingle();

    if (updateClassicMatchError) {
      throw new Error(updateClassicMatchError.message);
    }

    if (!updatedClassicMatch?.id) {
      linkedMatchId = null;
    }
  }

  if (!linkedMatchId) {
    const createPayload = {
      game: tournament.game,
      tournament_id: tournament.id,
      challenger_id: player1ProfileId,
      opponent_id: player2ProfileId,
      challenger_deck: player1DefaultDeck,
      opponent_deck: player2DefaultDeck,
      challenger_deck_selected_at: player1DefaultDeck ? syncTimestamp : null,
      opponent_deck_selected_at: player2DefaultDeck ? syncTimestamp : null,
      started_at: player1DefaultDeck && player2DefaultDeck ? syncTimestamp : null,
      canceled_at: null,
      cancel_reason: null,
    };

    if (hasCompletedTournamentMatch) {
      const winnerParticipantId = normalizeUuid(tournamentMatch.winner_participant_id);
      const winnerProfileId = winnerParticipantId === player1ParticipantId
        ? player1ProfileId
        : winnerParticipantId === player2ParticipantId
          ? player2ProfileId
          : null;
      const results = resolveMatchResultsByTournamentResult(tournamentMatch.result);

      createPayload.status = "completed";
      createPayload.challenger_result = results.challenger_result;
      createPayload.opponent_result = results.opponent_result;
      createPayload.winner_id = winnerProfileId;
      createPayload.completed_at = tournamentMatch.completed_at ?? syncTimestamp;
    } else {
      createPayload.status = resolveClassicPendingStatusByDecks(
        player1DefaultDeck,
        player2DefaultDeck,
      );
      createPayload.challenger_result = null;
      createPayload.opponent_result = null;
      createPayload.winner_id = null;
      createPayload.completed_at = null;
    }

    const { data: createdClassicMatch, error: createClassicMatchError } = await client
      .from("matches")
      .insert(createPayload)
      .select("id")
      .single();

    if (createClassicMatchError) {
      throw new Error(createClassicMatchError.message);
    }

    linkedMatchId = normalizeUuid(createdClassicMatch?.id);
  }

  if (!linkedMatchId || linkedMatchId === tournamentMatch.match_id) {
    return tournamentMatch;
  }

  return updateTournamentMatchById(client, tournamentMatch.id, {
    match_id: linkedMatchId,
  });
}

async function loadTournamentState(client, tournamentId) {
  const normalizedTournamentId = assertTournamentId(tournamentId);

  const [tournament, participants, rounds, matches] = await Promise.all([
    fetchTournamentById(client, normalizedTournamentId),
    fetchTournamentParticipants(client, normalizedTournamentId),
    fetchTournamentRounds(client, normalizedTournamentId),
    fetchTournamentMatches(client, normalizedTournamentId),
  ]);

  return {
    tournament,
    participants,
    rounds,
    matches,
  };
}

async function markRoundCompletedIfPossible(client, round, roundMatches) {
  if (!round) return round;
  if (!Array.isArray(roundMatches) || !roundMatches.length) return round;
  if (!areAllMatchesCompleted(roundMatches)) return round;
  if (round.status === TournamentRoundStatus.Completed) return round;

  return updateTournamentRoundById(client, round.id, {
    status: TournamentRoundStatus.Completed,
    completed_at: nowIso(),
  });
}

async function applySingleEliminationRoundEffects(client, participants, roundMatches, roundNumber) {
  if (!Array.isArray(roundMatches) || !roundMatches.length) {
    return participants;
  }

  const participantById = new Map(
    (Array.isArray(participants) ? participants : [])
      .map((participant) => [participant.id, participant]),
  );
  const losers = [];
  const winners = [];

  roundMatches.forEach((match) => {
    const winnerParticipantId = getMatchWinnerParticipantId(match);
    const loserParticipantId = getMatchLoserParticipantId(match);

    if (winnerParticipantId) {
      winners.push(winnerParticipantId);
    }

    if (loserParticipantId) {
      losers.push(loserParticipantId);
    }
  });

  const updatableLosers = [...new Set(losers)].filter((participantId) => {
    const participant = participantById.get(participantId);
    return participant && participant.status !== TournamentParticipantStatus.Withdrawn;
  });
  const updatableWinners = [...new Set(winners)].filter((participantId) => {
    const participant = participantById.get(participantId);
    return participant && participant.status !== TournamentParticipantStatus.Withdrawn;
  });

  if (updatableLosers.length > 0) {
    await updateTournamentParticipantsByIds(client, updatableLosers, {
      status: TournamentParticipantStatus.Eliminated,
      dropped_round: roundNumber,
    });
  }

  if (updatableWinners.length > 0) {
    await updateTournamentParticipantsByIds(client, updatableWinners, {
      status: TournamentParticipantStatus.Active,
      dropped_round: null,
    });
  }

  return fetchTournamentParticipants(client, roundMatches[0]?.tournament_id);
}

async function maybeCompleteTournament(client, state) {
  const tournament = normalizeTournamentRow(state?.tournament);
  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  if (tournament.status === TournamentStatus.Completed) {
    return tournament;
  }

  const participants = Array.isArray(state?.participants) ? state.participants : [];
  const matches = Array.isArray(state?.matches) ? state.matches : [];

  if (tournament.format === TournamentFormat.SingleElimination) {
    const highestRoundNumber = matches.reduce((maxValue, match) =>
      Math.max(maxValue, Number(match?.round_number ?? 0)), 0);

    if (highestRoundNumber < 1) {
      return tournament;
    }

    const finalRoundMatches = getRoundMatches(matches, highestRoundNumber);
    if (!areAllMatchesCompleted(finalRoundMatches)) {
      return tournament;
    }

    const finalRoundWinners = finalRoundMatches
      .map((match) => getMatchWinnerParticipantId(match))
      .filter(Boolean);

    if (finalRoundWinners.length !== 1) {
      return tournament;
    }

    return updateTournamentById(client, tournament.id, {
      status: TournamentStatus.Completed,
      completed_at: nowIso(),
      winner_participant_id: finalRoundWinners[0],
      current_round: Math.max(
        Number(tournament.current_round ?? 0),
        highestRoundNumber,
      ),
    });
  }

  const totalRounds = Number(tournament.total_rounds ?? 0);
  if (totalRounds <= 0) {
    return tournament;
  }

  if (Number(tournament.current_round ?? 0) < totalRounds) {
    return tournament;
  }

  const finalRoundMatches = getRoundMatches(matches, totalRounds);
  if (!areAllMatchesCompleted(finalRoundMatches)) {
    return tournament;
  }

  const standings = computeTournamentStandings({
    tournament,
    participants,
    matches,
  });
  const winnerParticipantId = standings[0]?.participant_id ?? null;

  return updateTournamentById(client, tournament.id, {
    status: TournamentStatus.Completed,
    completed_at: nowIso(),
    winner_participant_id: winnerParticipantId,
  });
}

async function buildAndCreateNextRound(client, tournamentId, currentUserId) {
  const state = await loadTournamentState(client, tournamentId);
  const tournament = state.tournament;

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  assertOrganizer(tournament, currentUserId);

  if (tournament.status !== TournamentStatus.Started) {
    throw new Error("Il torneo non e nello stato started");
  }

  const lastRound = state.rounds[state.rounds.length - 1] ?? null;
  if (lastRound) {
    const lastRoundMatches = getRoundMatches(state.matches, lastRound.round_number);
    if (!areAllMatchesCompleted(lastRoundMatches)) {
      throw new Error("Completa tutti i match del round corrente prima di generarne uno nuovo");
    }

    if (lastRound.status !== TournamentRoundStatus.Completed) {
      await markRoundCompletedIfPossible(client, lastRound, lastRoundMatches);
    }
  }

  const nextRoundNumber = state.rounds.length + 1;
  const standings = computeTournamentStandings({
    tournament,
    participants: state.participants,
    matches: state.matches,
  });
  const formatHandler = getTournamentFormatHandler(tournament.format);
  const roundTemplate = formatHandler.buildNextRound({
    tournament,
    participants: state.participants,
    rounds: state.rounds,
    matches: state.matches,
    standings,
    nextRoundNumber,
  });

  if (!roundTemplate || !Array.isArray(roundTemplate.matches) || !roundTemplate.matches.length) {
    const maybeCompletedTournament = await maybeCompleteTournament(client, state);
    const hydratedTournament = await hydrateTournament(client, maybeCompletedTournament);
    const refreshedStandings = computeTournamentStandings({
      tournament: maybeCompletedTournament,
      participants: state.participants,
      matches: state.matches,
    });

    return {
      tournament: hydratedTournament,
      round: null,
      matches: [],
      standings: refreshedStandings,
    };
  }

  const roundCreationTimestamp = nowIso();
  const createdRound = await insertTournamentRound(client, {
    tournament_id: tournament.id,
    round_number: nextRoundNumber,
    label: normalizeString(roundTemplate.label) ?? `Round ${nextRoundNumber}`,
    status: TournamentRoundStatus.Active,
    metadata: normalizeJsonObject(roundTemplate.metadata),
    started_at: roundCreationTimestamp,
  });

  const matchesPayload = roundTemplate.matches.map((templateMatch, index) => {
    const player1ParticipantId = normalizeUuid(templateMatch?.player1ParticipantId);
    const player2ParticipantId = normalizeUuid(templateMatch?.player2ParticipantId);
    const tableNumber = index + 1;

    if (!player1ParticipantId && !player2ParticipantId) {
      throw new Error("Match generato senza partecipanti");
    }

    if (!player1ParticipantId || !player2ParticipantId) {
      return createByeMatch({
        tournamentId: tournament.id,
        roundId: createdRound.id,
        roundNumber: createdRound.round_number,
        tableNumber,
        player1ParticipantId: player1ParticipantId ?? null,
        player2ParticipantId: player2ParticipantId ?? null,
      });
    }

    return createPendingMatch({
      tournamentId: tournament.id,
      roundId: createdRound.id,
      roundNumber: createdRound.round_number,
      tableNumber,
      player1ParticipantId,
      player2ParticipantId,
    });
  });

  const createdMatches = await insertTournamentMatches(client, matchesPayload);
  const participantById = createParticipantByIdMap(state.participants);
  const createdMatchesWithLinks = await Promise.all(
    createdMatches.map((createdMatch) =>
      syncLinkedClassicMatch({
        client,
        tournament,
        tournamentMatch: createdMatch,
        participantById,
      })
    ),
  );

  let roundToReturn = createdRound;
  if (areAllMatchesCompleted(createdMatchesWithLinks)) {
    roundToReturn = await updateTournamentRoundById(client, createdRound.id, {
      status: TournamentRoundStatus.Completed,
      completed_at: nowIso(),
    });
  }

  let refreshedParticipants = state.participants;
  if (tournament.format === TournamentFormat.SingleElimination) {
    const roundMatches = getRoundMatches(createdMatchesWithLinks, roundToReturn.round_number);
    if (areAllMatchesCompleted(roundMatches)) {
      refreshedParticipants = await applySingleEliminationRoundEffects(
        client,
        refreshedParticipants,
        roundMatches,
        roundToReturn.round_number,
      );
    }
  }

  let updatedTournament = await updateTournamentById(client, tournament.id, {
    current_round: nextRoundNumber,
  });

  const updatedState = {
    tournament: updatedTournament,
    participants: refreshedParticipants,
    matches: [...state.matches, ...createdMatchesWithLinks],
  };
  updatedTournament = await maybeCompleteTournament(client, updatedState);

  const hydratedTournament = await hydrateTournament(client, updatedTournament);
  const standingsAfterRoundCreation = computeTournamentStandings({
    tournament: updatedTournament,
    participants: refreshedParticipants,
    matches: [...state.matches, ...createdMatchesWithLinks],
  });

  return {
    tournament: hydratedTournament,
    round: roundToReturn,
    matches: createdMatchesWithLinks,
    standings: standingsAfterRoundCreation,
  };
}

export async function createTournament(payload = {}) {
  const client = useSupabaseClient();
  const organizerId = assertAuthenticatedUserId();
  const name = assertTournamentName(payload?.name);
  const format = assertTournamentFormat(payload?.format);
  const game = normalizeString(payload?.game) ?? DEFAULT_TOURNAMENT_GAME;
  const locationPayload = resolveTournamentLocationPayload(payload);
  const maxParticipants = normalizePositiveInteger(
    payload?.maxParticipants ?? payload?.max_participants,
    8,
  );
  const status = resolveInitialTournamentStatus(payload?.status);
  const settings = normalizeTournamentSettingsByFormat(format, payload?.settings);

  const createdTournament = await insertTournament(client, {
    name,
    format,
    game,
    max_participants: maxParticipants,
    organizer_id: organizerId,
    status,
    settings,
    ...locationPayload,
    current_round: 0,
    total_rounds: null,
  });

  return hydrateTournament(client, createdTournament);
}

export async function fetchTournaments(options = {}) {
  const client = useSupabaseClient();
  const limit = normalizePositiveInteger(options?.limit, 50);
  const statuses = Array.isArray(options?.statuses)
    ? options.statuses
        .map((status) => normalizeTournamentStatus(status))
        .filter(Boolean)
    : [];

  let query = client
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statuses.length > 0) {
    query = query.in("status", statuses);
  }

  if (options?.format) {
    const normalizedFormat = normalizeTournamentFormat(options.format);
    if (normalizedFormat) {
      query = query.eq("format", normalizedFormat);
    }
  }

  if (options?.game) {
    const normalizedGame = normalizeString(options.game);
    if (normalizedGame) {
      query = query.eq("game", normalizedGame);
    }
  }

  const { data: rows = [], error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return hydrateTournaments(client, rows.map((row) => normalizeTournamentRow(row)).filter(Boolean));
}

export async function fetchMyTournaments(options = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  return fetchUserTournaments(client, userId, {
    organizerOnly: options?.organizerOnly ?? true,
    limit: options?.limit,
  });
}

export async function fetchJoinedTournaments(options = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const limit = normalizePositiveInteger(options?.limit, 50);

  const { data: participantRows = [], error } = await client
    .from("tournament_participants")
    .select("tournament_id, status, created_at")
    .eq("profile_id", userId)
    .neq("status", TournamentParticipantStatus.Withdrawn)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const tournamentIds = [...new Set(
    participantRows
      .map((row) => normalizeUuid(row?.tournament_id))
      .filter(Boolean),
  )];

  if (!tournamentIds.length) return [];

  const { data: tournamentRows = [], error: tournamentError } = await client
    .from("tournaments")
    .select("*")
    .in("id", tournamentIds)
    .order("created_at", { ascending: false });

  if (tournamentError) {
    throw new Error(tournamentError.message);
  }

  return hydrateTournaments(
    client,
    tournamentRows.map((row) => normalizeTournamentRow(row)).filter(Boolean),
  );
}

export async function fetchTournamentDetails(tournamentId) {
  const client = useSupabaseClient();
  const normalizedTournamentId = assertTournamentId(tournamentId);
  const state = await loadTournamentState(client, normalizedTournamentId);

  if (!state.tournament) return null;

  const [hydratedTournament, hydratedParticipantRows] = await Promise.all([
    hydrateTournament(client, state.tournament),
    hydrateParticipants(client, state.participants),
  ]);

  const standings = computeTournamentStandings({
    tournament: state.tournament,
    participants: state.participants,
    matches: state.matches,
  }).map((standingRow) => ({
    ...standingRow,
    participant: hydratedParticipantRows.find((participant) =>
      participant.id === standingRow.participant_id
    ) ?? null,
  }));

  return {
    tournament: hydratedTournament,
    participants: hydratedParticipantRows,
    rounds: state.rounds,
    matches: state.matches,
    standings,
  };
}

export async function joinTournament(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  const tournament = await fetchTournamentById(client, tournamentId);
  const joinDeckInput = resolveJoinDeckPayload(payload);
  const wantsAnonymousDeck = resolveAnonymousJoinChoice(payload);

  assertTournamentJoinable(tournament);

  const defaultDeckSnapshot = joinDeckInput
    ? await buildTournamentDeckSnapshot(joinDeckInput, tournament?.game)
    : wantsAnonymousDeck
      ? createSecretDeckSnapshot(tournament?.game)
      : null;

  const existingParticipant = await fetchTournamentParticipantByProfile(
    client,
    tournamentId,
    userId,
  );

  if (existingParticipant) {
    const updatedMetadata = applyDefaultDeckToMetadata(
      existingParticipant.metadata,
      defaultDeckSnapshot,
    );

    if (existingParticipant.status === TournamentParticipantStatus.Withdrawn) {
      const reactivatedParticipant = await updateTournamentParticipantById(
        client,
        existingParticipant.id,
        {
          status: TournamentParticipantStatus.Registered,
          withdrawn_at: null,
          dropped_round: null,
          metadata: updatedMetadata,
        },
      );

      const hydratedParticipants = await hydrateParticipants(client, [reactivatedParticipant]);
      return hydratedParticipants[0] ?? reactivatedParticipant;
    }

    if (defaultDeckSnapshot) {
      const updatedParticipant = await updateTournamentParticipantById(
        client,
        existingParticipant.id,
        {
          metadata: updatedMetadata,
        },
      );

      const hydratedParticipants = await hydrateParticipants(client, [updatedParticipant]);
      return hydratedParticipants[0] ?? updatedParticipant;
    }

    const hydratedParticipants = await hydrateParticipants(client, [existingParticipant]);
    return hydratedParticipants[0] ?? existingParticipant;
  }

  const participants = await fetchTournamentParticipants(client, tournamentId);
  if (countJoinedParticipants(participants) >= Number(tournament.max_participants ?? 0)) {
    throw new Error("Numero massimo partecipanti raggiunto");
  }

  if (!defaultDeckSnapshot) {
    throw new Error("Seleziona un mazzo oppure salta per iscriverti in anonimo");
  }

  const createdParticipant = await insertTournamentParticipant(client, {
    tournament_id: tournamentId,
    profile_id: userId,
    status: TournamentParticipantStatus.Registered,
    metadata: applyDefaultDeckToMetadata({}, defaultDeckSnapshot),
  });

  const hydratedParticipants = await hydrateParticipants(client, [createdParticipant]);
  return hydratedParticipants[0] ?? createdParticipant;
}

export async function withdrawTournament(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  const tournament = await fetchTournamentById(client, tournamentId);

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  if ([TournamentStatus.Completed, TournamentStatus.Cancelled].includes(tournament.status)) {
    throw new Error("Il torneo e gia terminato");
  }

  const participant = await fetchTournamentParticipantByProfile(client, tournamentId, userId);
  if (!participant) {
    throw new Error("Non sei iscritto al torneo");
  }

  if ([TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.status)) {
    await deleteTournamentParticipantById(client, participant.id);
    return {
      deleted: true,
      participant_id: participant.id,
      tournament_id: tournamentId,
    };
  }

  if (participant.status === TournamentParticipantStatus.Withdrawn) {
    const hydratedParticipants = await hydrateParticipants(client, [participant]);
    return hydratedParticipants[0] ?? participant;
  }

  const withdrawnParticipant = await updateTournamentParticipantById(client, participant.id, {
    status: TournamentParticipantStatus.Withdrawn,
    withdrawn_at: nowIso(),
    dropped_round: tournament.current_round,
  });

  if (
    tournament.status === TournamentStatus.Started
    && String(tournament.organizer_id) === String(userId)
  ) {
    const allMatches = await fetchTournamentMatches(client, tournamentId);
    const allParticipants = await fetchTournamentParticipants(client, tournamentId);
    const participantById = createParticipantByIdMap(allParticipants);
    const pendingMatches = allMatches.filter((match) => {
      if (match.status !== TournamentMatchStatus.Pending) return false;

      return [match.player1_participant_id, match.player2_participant_id]
        .map((participantId) => String(participantId))
        .includes(String(participant.id));
    });

    for (const match of pendingMatches) {
      const player1ParticipantId = normalizeUuid(match.player1_participant_id);
      const player2ParticipantId = normalizeUuid(match.player2_participant_id);
      const winnerParticipantId = player1ParticipantId === participant.id
        ? player2ParticipantId
        : player1ParticipantId;

      if (!winnerParticipantId) continue;

      const completedTournamentMatch = await updateTournamentMatchById(client, match.id, {
        status: TournamentMatchStatus.Completed,
        result: winnerParticipantId === player1ParticipantId
          ? TournamentMatchResult.Player1Win
          : TournamentMatchResult.Player2Win,
        winner_participant_id: winnerParticipantId,
        score: {},
        reported_by: userId,
        completed_at: nowIso(),
      });

      await syncLinkedClassicMatch({
        client,
        tournament,
        tournamentMatch: completedTournamentMatch,
        participantById,
      });
    }
  }

  const hydratedParticipants = await hydrateParticipants(client, [withdrawnParticipant]);
  return hydratedParticipants[0] ?? withdrawnParticipant;
}

export async function expelTournamentParticipants(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  const tournament = await fetchTournamentById(client, tournamentId);

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  assertOrganizer(tournament, userId);

  if ([TournamentStatus.Completed, TournamentStatus.Cancelled].includes(tournament.status)) {
    throw new Error("Il torneo e gia terminato");
  }

  const requestedParticipantIds = normalizeParticipantIdsFromPayload(payload);
  if (!requestedParticipantIds.length) {
    throw new Error("Nessun partecipante selezionato");
  }

  const participants = await fetchTournamentParticipants(client, tournamentId);
  const participantById = createParticipantByIdMap(participants);

  const targetParticipants = requestedParticipantIds
    .map((participantId) => participantById.get(participantId))
    .filter(Boolean)
    .filter((participant) => String(participant.profile_id) !== String(tournament.organizer_id));

  if (!targetParticipants.length) {
    throw new Error("Nessun partecipante espellibile");
  }

  const targetParticipantIds = targetParticipants.map((participant) => participant.id);

  if ([TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.status)) {
    const deletedParticipantIds = await deleteTournamentParticipantsByIds(client, targetParticipantIds);

    return {
      deleted: true,
      tournament_id: tournamentId,
      participant_ids: deletedParticipantIds,
    };
  }

  const updatableParticipants = targetParticipants
    .filter((participant) => participant.status !== TournamentParticipantStatus.Withdrawn);

  if (!updatableParticipants.length) {
    return {
      deleted: false,
      tournament_id: tournamentId,
      participants: [],
    };
  }

  const withdrawnAt = nowIso();
  const updatedParticipants = await updateTournamentParticipantsByIds(
    client,
    updatableParticipants.map((participant) => participant.id),
    {
      status: TournamentParticipantStatus.Withdrawn,
      withdrawn_at: withdrawnAt,
      dropped_round: tournament.current_round,
    },
  );
  const hydratedParticipants = await hydrateParticipants(client, updatedParticipants);

  return {
    deleted: false,
    tournament_id: tournamentId,
    participants: hydratedParticipants,
  };
}

export async function cancelTournament(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  const tournament = await fetchTournamentById(client, tournamentId);

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  assertOrganizer(tournament, userId);

  await deleteTournamentById(client, tournamentId);

  return {
    deleted: true,
    tournament_id: tournamentId,
  };
}

export async function startTournament(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  const tournament = await fetchTournamentById(client, tournamentId);

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  assertOrganizer(tournament, userId);

  if (![TournamentStatus.Draft, TournamentStatus.Open].includes(tournament.status)) {
    throw new Error("Il torneo non puo essere avviato nello stato corrente");
  }

  const participants = await fetchTournamentParticipants(client, tournamentId);
  const startableParticipants = participants.filter((participant) => {
    return [TournamentParticipantStatus.Registered, TournamentParticipantStatus.Active]
      .includes(normalizeTournamentParticipantStatus(participant.status));
  });

  if (startableParticipants.length < 2) {
    throw new Error("Servono almeno 2 partecipanti per avviare il torneo");
  }

  const participantsMissingDefaultDeck = startableParticipants.filter((participant) => {
    return !resolveParticipantDefaultDeck(participant);
  });

  if (participantsMissingDefaultDeck.length > 0) {
    throw new Error("Tutti i partecipanti devono scegliere un mazzo prima dell'avvio torneo");
  }

  const format = assertTournamentFormat(tournament.format);
  const normalizedSettings = normalizeTournamentSettingsByFormat(
    format,
    tournament.settings,
  );
  const totalRounds = resolveTournamentTotalRounds({
    format,
    participantsCount: startableParticipants.length,
    settings: normalizedSettings,
  });
  const startedParticipantIds = startableParticipants.map((participant) => participant.id);

  normalizedSettings.started_participant_ids = startedParticipantIds;

  if (format === TournamentFormat.RoundRobin) {
    normalizedSettings.schedule_participant_ids = startedParticipantIds;
  }

  await updateTournamentParticipantsByIds(
    client,
    startableParticipants
      .filter((participant) => participant.status === TournamentParticipantStatus.Registered)
      .map((participant) => participant.id),
    {
      status: TournamentParticipantStatus.Active,
    },
  );

  await updateTournamentById(client, tournamentId, {
    status: TournamentStatus.Started,
    started_at: nowIso(),
    completed_at: null,
    cancelled_at: null,
    current_round: 0,
    total_rounds: totalRounds,
    settings: normalizedSettings,
  });

  return buildAndCreateNextRound(client, tournamentId, userId);
}

export async function generateNextRound(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  return buildAndCreateNextRound(client, tournamentId, userId);
}

export async function submitMatchResult(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id);
  const tournament = await fetchTournamentById(client, tournamentId);

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  assertOrganizer(tournament, userId);

  if (tournament.status !== TournamentStatus.Started) {
    throw new Error("Il torneo non e nello stato started");
  }

  const matchId = normalizeUuid(payload?.matchId ?? payload?.match_id);
  if (!matchId) {
    throw new Error("matchId non valido");
  }

  const match = await fetchTournamentMatchById(client, tournamentId, matchId);
  if (!match) {
    throw new Error("Match non trovato");
  }

  if (match.is_bye) {
    throw new Error("I match bye vengono chiusi automaticamente");
  }

  const normalizedResult = resolveResultFromPayload(match, payload);
  if (!normalizedResult) {
    throw new Error("Risultato match non valido");
  }

  if (
    normalizedResult === TournamentMatchResult.Draw
    && !tournamentFormatAllowsDraws(tournament.format)
  ) {
    throw new Error("Questo formato torneo non supporta i pareggi");
  }

  const winnerParticipantId = resolveWinnerIdFromResult(match, normalizedResult);
  const completedTournamentMatch = await updateTournamentMatchById(client, matchId, {
    status: TournamentMatchStatus.Completed,
    result: normalizedResult,
    winner_participant_id: winnerParticipantId,
    score: scoreFromPayload(payload),
    reported_by: userId,
    completed_at: nowIso(),
  });

  const participantsBeforeRoundEffects = await fetchTournamentParticipants(client, tournamentId);
  const participantById = createParticipantByIdMap(participantsBeforeRoundEffects);
  const updatedMatch = await syncLinkedClassicMatch({
    client,
    tournament,
    tournamentMatch: completedTournamentMatch,
    participantById,
  });

  const rounds = await fetchTournamentRounds(client, tournamentId);
  const updatedMatches = await fetchTournamentMatches(client, tournamentId);

  const currentRound = rounds.find((round) => round.id === updatedMatch.round_id) ?? null;
  const currentRoundMatches = getRoundMatches(updatedMatches, updatedMatch.round_number);

  let roundCompleted = false;

  if (currentRound && areAllMatchesCompleted(currentRoundMatches)) {
    await markRoundCompletedIfPossible(client, currentRound, currentRoundMatches);
    roundCompleted = true;
  }

  let participantsAfterRoundEffects = participantsBeforeRoundEffects;

  if (
    roundCompleted
    && tournament.format === TournamentFormat.SingleElimination
  ) {
    participantsAfterRoundEffects = await applySingleEliminationRoundEffects(
      client,
      participantsBeforeRoundEffects,
      currentRoundMatches,
      updatedMatch.round_number,
    );
  }

  let updatedTournament = tournament;
  if (roundCompleted) {
    updatedTournament = await updateTournamentById(client, tournamentId, {
      current_round: Math.max(
        Number(tournament.current_round ?? 0),
        Number(updatedMatch.round_number ?? 0),
      ),
    });
  }

  updatedTournament = await maybeCompleteTournament(client, {
    tournament: updatedTournament,
    participants: participantsAfterRoundEffects,
    matches: updatedMatches,
  });

  let autoGeneratedRound = null;

  if (roundCompleted && updatedTournament.status === TournamentStatus.Started) {
    try {
      const autoRoundState = await buildAndCreateNextRound(client, tournamentId, userId);
      autoGeneratedRound = autoRoundState?.round ?? null;
      updatedTournament = normalizeTournamentRow(autoRoundState?.tournament) ?? updatedTournament;
    } catch (error) {
      if (!isSkippableAutoRoundError(error)) {
        throw error;
      }
    }
  }

  const finalState = await loadTournamentState(client, tournamentId);
  const finalTournament = finalState?.tournament ?? updatedTournament;
  const finalParticipants = finalState?.participants ?? participantsAfterRoundEffects;
  const finalMatches = finalState?.matches ?? updatedMatches;

  const hydratedTournament = await hydrateTournament(client, finalTournament);
  const standings = computeTournamentStandings({
    tournament: finalTournament,
    participants: finalParticipants,
    matches: finalMatches,
  });

  return {
    tournament: hydratedTournament,
    match: updatedMatch,
    standings,
    roundCompleted,
    autoGeneratedRound,
    tournamentCompleted: finalTournament.status === TournamentStatus.Completed,
  };
}

export async function syncTournamentMatchFromClassicMatch(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const classicMatchId = normalizeUuid(payload?.matchId ?? payload?.match_id);

  if (!classicMatchId) {
    throw new Error("matchId non valido");
  }

  const { data: classicMatch, error: classicMatchError } = await client
    .from("matches")
    .select("*")
    .eq("id", classicMatchId)
    .maybeSingle();

  if (classicMatchError) {
    throw new Error(classicMatchError.message);
  }

  if (!classicMatch) {
    return {
      synced: false,
      reason: "classic_match_not_found",
    };
  }

  const tournamentId = assertTournamentId(
    payload?.tournamentId
      ?? payload?.tournament_id
      ?? classicMatch?.tournament_id,
  );
  const tournament = await fetchTournamentById(client, tournamentId);

  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  const linkedTournamentMatch = await fetchTournamentMatchByLinkedMatchId(
    client,
    tournamentId,
    classicMatchId,
  );

  if (!linkedTournamentMatch) {
    return {
      synced: false,
      reason: "tournament_match_not_found",
    };
  }

  if (linkedTournamentMatch.is_bye) {
    return {
      synced: false,
      reason: "bye_match",
    };
  }

  if (classicMatch.status !== "completed") {
    return {
      synced: false,
      reason: "classic_match_not_completed",
    };
  }

  const participantsBeforeRoundEffects = await fetchTournamentParticipants(client, tournamentId);
  const participantById = createParticipantByIdMap(participantsBeforeRoundEffects);
  const player1ProfileId = normalizeUuid(
    participantById.get(linkedTournamentMatch.player1_participant_id)?.profile_id,
  );
  const player2ProfileId = normalizeUuid(
    participantById.get(linkedTournamentMatch.player2_participant_id)?.profile_id,
  );
  const isOrganizer = String(tournament.organizer_id) === String(userId);
  const isPlayerInMatch = [player1ProfileId, player2ProfileId]
    .map((profileId) => String(profileId))
    .includes(String(userId));

  if (!isOrganizer && !isPlayerInMatch) {
    throw new Error("Non sei autorizzato a sincronizzare questo risultato");
  }

  const normalizedResult = resolveTournamentResultFromClassicMatch({
    classicMatch,
    tournamentMatch: linkedTournamentMatch,
    participantById,
  });

  if (!normalizedResult) {
    return {
      synced: false,
      reason: "classic_result_not_ready",
    };
  }

  if (
    normalizedResult === TournamentMatchResult.Draw
    && !tournamentFormatAllowsDraws(tournament.format)
  ) {
    throw new Error("Questo formato torneo non supporta i pareggi");
  }

  const winnerParticipantId = resolveWinnerIdFromResult(
    linkedTournamentMatch,
    normalizedResult,
  );
  const updatedTournamentMatch = await updateTournamentMatchById(client, linkedTournamentMatch.id, {
    status: TournamentMatchStatus.Completed,
    result: normalizedResult,
    winner_participant_id: winnerParticipantId,
    score: {},
    reported_by: userId,
    completed_at: classicMatch?.completed_at ?? nowIso(),
  });

  const rounds = await fetchTournamentRounds(client, tournamentId);
  const updatedMatches = await fetchTournamentMatches(client, tournamentId);
  const currentRound = rounds.find((round) => round.id === updatedTournamentMatch.round_id) ?? null;
  const currentRoundMatches = getRoundMatches(
    updatedMatches,
    updatedTournamentMatch.round_number,
  );

  let roundCompleted = false;
  if (currentRound && areAllMatchesCompleted(currentRoundMatches)) {
    await markRoundCompletedIfPossible(client, currentRound, currentRoundMatches);
    roundCompleted = true;
  }

  let participantsAfterRoundEffects = participantsBeforeRoundEffects;

  if (
    roundCompleted
    && tournament.format === TournamentFormat.SingleElimination
  ) {
    participantsAfterRoundEffects = await applySingleEliminationRoundEffects(
      client,
      participantsBeforeRoundEffects,
      currentRoundMatches,
      updatedTournamentMatch.round_number,
    );
  }

  let updatedTournament = tournament;
  if (roundCompleted) {
    updatedTournament = await updateTournamentById(client, tournamentId, {
      current_round: Math.max(
        Number(tournament.current_round ?? 0),
        Number(updatedTournamentMatch.round_number ?? 0),
      ),
    });
  }

  updatedTournament = await maybeCompleteTournament(client, {
    tournament: updatedTournament,
    participants: participantsAfterRoundEffects,
    matches: updatedMatches,
  });

  let autoGeneratedRound = null;

  if (
    roundCompleted
    && updatedTournament.status === TournamentStatus.Started
    && isOrganizer
  ) {
    try {
      const autoRoundState = await buildAndCreateNextRound(client, tournamentId, userId);
      autoGeneratedRound = autoRoundState?.round ?? null;
    } catch (error) {
      if (!isSkippableAutoRoundError(error)) {
        throw error;
      }
    }
  }

  const finalState = await loadTournamentState(client, tournamentId);
  const finalTournament = finalState?.tournament ?? updatedTournament;
  const finalParticipants = finalState?.participants ?? participantsAfterRoundEffects;
  const finalMatches = finalState?.matches ?? updatedMatches;
  const hydratedTournament = await hydrateTournament(client, finalTournament);
  const standings = computeTournamentStandings({
    tournament: finalTournament,
    participants: finalParticipants,
    matches: finalMatches,
  });

  return {
    synced: true,
    tournament: hydratedTournament,
    match: updatedTournamentMatch,
    standings,
    roundCompleted,
    autoGeneratedRound,
    tournamentCompleted: finalTournament.status === TournamentStatus.Completed,
  };
}

export async function computeStandings(payload = {}) {
  const client = useSupabaseClient();
  const tournamentId = assertTournamentId(payload?.tournamentId ?? payload?.tournament_id ?? payload);

  const tournament = await fetchTournamentById(client, tournamentId);
  if (!tournament) {
    throw new Error("Torneo non trovato");
  }

  const [participants, matches] = await Promise.all([
    fetchTournamentParticipants(client, tournamentId),
    fetchTournamentMatches(client, tournamentId),
  ]);

  const standings = computeTournamentStandings({
    tournament,
    participants,
    matches,
  });
  const hydratedParticipantRows = await hydrateParticipants(client, participants);
  const participantById = new Map(
    hydratedParticipantRows.map((participant) => [participant.id, participant]),
  );

  return standings.map((standingRow) => ({
    ...standingRow,
    participant: participantById.get(standingRow.participant_id) ?? null,
  }));
}
