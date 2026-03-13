import {
  createByeHistorySet,
  createMatchPairHistory,
  getActiveParticipants,
} from "@/api/tournaments/engine/common";
import { DEFAULT_SWISS_POINTS } from "@/api/tournaments/constants";
import {
  createPairKey,
  normalizeJsonObject,
  normalizePositiveInteger,
} from "@/api/tournaments/utils";

function createPointsMap(standings = []) {
  return new Map(
    (Array.isArray(standings) ? standings : [])
      .map((standingRow) => [standingRow?.participant_id, Number(standingRow?.points ?? 0)]),
  );
}

function selectSwissByeCandidate(orderedParticipantIds = [], byeHistorySet = new Set()) {
  for (let index = orderedParticipantIds.length - 1; index >= 0; index -= 1) {
    const participantId = orderedParticipantIds[index];
    if (!byeHistorySet.has(participantId)) {
      return participantId;
    }
  }

  return orderedParticipantIds[orderedParticipantIds.length - 1] ?? null;
}

function findSwissOpponent({
  player1ParticipantId,
  unpairedParticipantIds,
  pointsMap,
  pairHistory,
  avoidRematch,
}) {
  if (!unpairedParticipantIds.length) return -1;

  const player1Points = Number(pointsMap.get(player1ParticipantId) ?? 0);
  let bestNonRematchIndex = -1;
  let bestNonRematchDiff = Number.POSITIVE_INFINITY;
  let bestFallbackIndex = 0;
  let bestFallbackDiff = Number.POSITIVE_INFINITY;

  unpairedParticipantIds.forEach((candidateParticipantId, candidateIndex) => {
    const candidatePoints = Number(pointsMap.get(candidateParticipantId) ?? 0);
    const pointsDiff = Math.abs(player1Points - candidatePoints);

    if (pointsDiff < bestFallbackDiff) {
      bestFallbackDiff = pointsDiff;
      bestFallbackIndex = candidateIndex;
    }

    if (!avoidRematch) return;

    const pairKey = createPairKey(player1ParticipantId, candidateParticipantId);
    if (pairKey && pairHistory.has(pairKey)) return;

    if (pointsDiff < bestNonRematchDiff) {
      bestNonRematchDiff = pointsDiff;
      bestNonRematchIndex = candidateIndex;
    }
  });

  if (avoidRematch && bestNonRematchIndex >= 0) {
    return bestNonRematchIndex;
  }

  return bestFallbackIndex;
}

export const swissHandler = {
  normalizeSettings(rawSettings = {}) {
    const normalizedSettings = normalizeJsonObject(rawSettings);
    const normalizedRounds = normalizePositiveInteger(
      normalizedSettings?.rounds,
      3,
    );
    const pointsConfig = normalizeJsonObject(
      normalizedSettings?.points,
      DEFAULT_SWISS_POINTS,
    );

    return {
      rounds: normalizedRounds,
      avoid_rematch: normalizedSettings?.avoid_rematch !== false,
      points: {
        win: Number.isFinite(Number(pointsConfig.win))
          ? Number(pointsConfig.win)
          : DEFAULT_SWISS_POINTS.win,
        draw: Number.isFinite(Number(pointsConfig.draw))
          ? Number(pointsConfig.draw)
          : DEFAULT_SWISS_POINTS.draw,
        loss: Number.isFinite(Number(pointsConfig.loss))
          ? Number(pointsConfig.loss)
          : DEFAULT_SWISS_POINTS.loss,
      },
    };
  },

  resolveTotalRounds({ participantsCount, settings = {} }) {
    const normalizedParticipantsCount = normalizePositiveInteger(participantsCount, 2);
    const normalizedSettings = this.normalizeSettings(settings);

    if (normalizedSettings.rounds > 0) {
      return normalizedSettings.rounds;
    }

    return Math.max(
      3,
      Math.ceil(Math.log2(Math.max(2, normalizedParticipantsCount))) + 1,
    );
  },

  buildNextRound({
    participants = [],
    matches = [],
    standings = [],
    tournament = null,
    nextRoundNumber,
  }) {
    const activeParticipants = getActiveParticipants(participants);
    if (activeParticipants.length <= 1) return null;

    const configuredTotalRounds = Number(tournament?.total_rounds ?? 0);
    const roundNumber = normalizePositiveInteger(nextRoundNumber, 1);

    if (configuredTotalRounds > 0 && roundNumber > configuredTotalRounds) {
      return null;
    }

    const rankingSource = Array.isArray(standings) && standings.length > 0
      ? standings
      : activeParticipants.map((participant) => ({
          participant_id: participant.id,
          points: 0,
        }));

    const activeParticipantIdSet = new Set(activeParticipants.map((participant) => participant.id));
    const rankedParticipantIds = rankingSource
      .map((standingRow) => standingRow.participant_id)
      .filter((participantId) => activeParticipantIdSet.has(participantId));

    const pointsMap = createPointsMap(rankingSource);
    const pairHistory = createMatchPairHistory(matches);
    const byeHistorySet = createByeHistorySet(matches);
    const normalizedSettings = this.normalizeSettings(tournament?.settings);
    const unpairedParticipantIds = [...rankedParticipantIds];
    const pairings = [];

    if (unpairedParticipantIds.length % 2 === 1) {
      const byeCandidateId = selectSwissByeCandidate(unpairedParticipantIds, byeHistorySet);
      const byeCandidateIndex = unpairedParticipantIds.findIndex((participantId) =>
        participantId === byeCandidateId
      );

      if (byeCandidateIndex >= 0) {
        const [selectedByeParticipantId] = unpairedParticipantIds.splice(byeCandidateIndex, 1);
        pairings.push([selectedByeParticipantId, null]);
      }
    }

    while (unpairedParticipantIds.length > 1) {
      const player1ParticipantId = unpairedParticipantIds.shift();
      if (!player1ParticipantId) break;

      const opponentIndex = findSwissOpponent({
        player1ParticipantId,
        unpairedParticipantIds,
        pointsMap,
        pairHistory,
        avoidRematch: normalizedSettings.avoid_rematch,
      });

      const [player2ParticipantId] = unpairedParticipantIds.splice(opponentIndex, 1);
      pairings.push([player1ParticipantId, player2ParticipantId ?? null]);
    }

    if (unpairedParticipantIds.length === 1) {
      pairings.push([unpairedParticipantIds[0], null]);
    }

    return {
      label: `Swiss - Round ${roundNumber}`,
      matches: pairings.map(([player1ParticipantId, player2ParticipantId]) => ({
        player1ParticipantId,
        player2ParticipantId,
      })),
      metadata: {
        avoid_rematch: normalizedSettings.avoid_rematch,
      },
    };
  },

  allowsDraws() {
    return true;
  },
};
