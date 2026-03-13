import {
  TournamentMatchResult,
  TournamentMatchStatus,
  TournamentParticipantStatus,
} from "@/api/tournaments/constants";
import {
  createPairKey,
  dedupeStrings,
  normalizeUuid,
  nowIso,
  shuffleArray,
} from "@/api/tournaments/utils";

export function isParticipantActive(participant) {
  if (!participant) return false;

  return [
    TournamentParticipantStatus.Registered,
    TournamentParticipantStatus.Active,
  ].includes(participant.status);
}

export function getActiveParticipants(participants = []) {
  return (Array.isArray(participants) ? participants : []).filter((participant) =>
    isParticipantActive(participant)
  );
}

export function createParticipantMap(participants = []) {
  return new Map(
    (Array.isArray(participants) ? participants : [])
      .map((participant) => [participant.id, participant])
      .filter(([participantId]) => Boolean(normalizeUuid(participantId))),
  );
}

export function getRoundMatches(matches = [], roundNumber) {
  return (Array.isArray(matches) ? matches : []).filter((match) =>
    Number(match?.round_number) === Number(roundNumber)
  );
}

export function areAllMatchesCompleted(matches = []) {
  const normalizedMatches = Array.isArray(matches) ? matches : [];
  if (!normalizedMatches.length) return false;

  return normalizedMatches.every((match) =>
    match?.status === TournamentMatchStatus.Completed
  );
}

export function getMatchWinnerParticipantId(match) {
  if (!match || match.status !== TournamentMatchStatus.Completed) {
    return null;
  }

  return normalizeUuid(match.winner_participant_id);
}

export function getMatchLoserParticipantId(match) {
  if (!match || match.status !== TournamentMatchStatus.Completed) {
    return null;
  }

  const winnerId = normalizeUuid(match.winner_participant_id);
  const player1Id = normalizeUuid(match.player1_participant_id);
  const player2Id = normalizeUuid(match.player2_participant_id);

  if (!winnerId) return null;
  if (winnerId === player1Id) return player2Id;
  if (winnerId === player2Id) return player1Id;

  return null;
}

export function createByeMatch({
  tournamentId,
  roundId,
  roundNumber,
  tableNumber,
  player1ParticipantId,
  player2ParticipantId,
}) {
  const winnerParticipantId = player1ParticipantId ?? player2ParticipantId ?? null;

  if (!winnerParticipantId) {
    throw new Error("Impossibile creare bye senza partecipante vincitore");
  }

  const winnerIsPlayer1 = String(winnerParticipantId) === String(player1ParticipantId);

  return {
    tournament_id: tournamentId,
    round_id: roundId,
    round_number: roundNumber,
    table_number: tableNumber,
    status: TournamentMatchStatus.Completed,
    result: winnerIsPlayer1
      ? TournamentMatchResult.Player1Win
      : TournamentMatchResult.Player2Win,
    player1_participant_id: player1ParticipantId ?? null,
    player2_participant_id: player2ParticipantId ?? null,
    winner_participant_id: winnerParticipantId,
    is_bye: true,
    score: {},
    metadata: {},
    completed_at: nowIso(),
  };
}

export function createPendingMatch({
  tournamentId,
  roundId,
  roundNumber,
  tableNumber,
  player1ParticipantId,
  player2ParticipantId,
}) {
  return {
    tournament_id: tournamentId,
    round_id: roundId,
    round_number: roundNumber,
    table_number: tableNumber,
    status: TournamentMatchStatus.Pending,
    result: null,
    player1_participant_id: player1ParticipantId ?? null,
    player2_participant_id: player2ParticipantId ?? null,
    winner_participant_id: null,
    is_bye: false,
    score: {},
    metadata: {},
    completed_at: null,
  };
}

export function createMatchPairHistory(matches = []) {
  const pairHistory = new Set();

  (Array.isArray(matches) ? matches : []).forEach((match) => {
    const player1ParticipantId = normalizeUuid(match?.player1_participant_id);
    const player2ParticipantId = normalizeUuid(match?.player2_participant_id);

    if (!player1ParticipantId || !player2ParticipantId) return;

    const pairKey = createPairKey(player1ParticipantId, player2ParticipantId);
    if (!pairKey) return;
    pairHistory.add(pairKey);
  });

  return pairHistory;
}

export function createByeHistorySet(matches = []) {
  const byeHistorySet = new Set();

  (Array.isArray(matches) ? matches : []).forEach((match) => {
    if (!match?.is_bye) return;

    const winnerParticipantId = normalizeUuid(match?.winner_participant_id);
    if (!winnerParticipantId) return;

    byeHistorySet.add(winnerParticipantId);
  });

  return byeHistorySet;
}

export function orderedUniqueParticipantIds(participantIds = []) {
  return dedupeStrings(participantIds)
    .map((participantId) => normalizeUuid(participantId))
    .filter(Boolean);
}

export function createSequentialPairings(participantIds = []) {
  const normalizedParticipantIds = orderedUniqueParticipantIds(participantIds);
  const pairings = [];

  for (let index = 0; index < normalizedParticipantIds.length; index += 2) {
    pairings.push([
      normalizedParticipantIds[index] ?? null,
      normalizedParticipantIds[index + 1] ?? null,
    ]);
  }

  return pairings;
}

export function createShuffledParticipantIds(participantIds = []) {
  return shuffleArray(orderedUniqueParticipantIds(participantIds));
}
