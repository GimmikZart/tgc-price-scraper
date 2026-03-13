import { TournamentParticipantStatus, DEFAULT_ROUND_ROBIN_POINTS } from "@/api/tournaments/constants";
import {
  normalizeJsonObject,
  normalizePositiveInteger,
  normalizeUuid,
} from "@/api/tournaments/utils";

function createRoundRobinSchedule(participantIds = []) {
  const normalizedIds = (Array.isArray(participantIds) ? participantIds : [])
    .map((participantId) => normalizeUuid(participantId))
    .filter(Boolean);

  if (normalizedIds.length < 2) return [];

  const players = [...normalizedIds];
  if (players.length % 2 === 1) {
    players.push(null);
  }

  const rounds = [];
  const rotatingPlayers = [...players];
  const totalRounds = rotatingPlayers.length - 1;
  const halfSize = rotatingPlayers.length / 2;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const pairings = [];

    for (let pairIndex = 0; pairIndex < halfSize; pairIndex += 1) {
      const player1ParticipantId = rotatingPlayers[pairIndex] ?? null;
      const player2ParticipantId = rotatingPlayers[rotatingPlayers.length - 1 - pairIndex] ?? null;
      pairings.push([player1ParticipantId, player2ParticipantId]);
    }

    rounds.push(pairings);

    const fixedPlayer = rotatingPlayers[0];
    const rotatingBlock = rotatingPlayers.slice(1);
    const movedPlayer = rotatingBlock.pop();

    rotatingPlayers.splice(
      0,
      rotatingPlayers.length,
      fixedPlayer,
      movedPlayer,
      ...rotatingBlock,
    );
  }

  return rounds;
}

function isWithdrawn(participantById, participantId) {
  if (!participantId) return false;
  const participant = participantById.get(participantId);
  return participant?.status === TournamentParticipantStatus.Withdrawn;
}

export const roundRobinHandler = {
  normalizeSettings(rawSettings = {}) {
    const normalizedSettings = normalizeJsonObject(rawSettings);
    const pointsConfig = normalizeJsonObject(
      normalizedSettings?.points,
      DEFAULT_ROUND_ROBIN_POINTS,
    );

    const rawScheduleParticipantIds = Array.isArray(normalizedSettings?.schedule_participant_ids)
      ? normalizedSettings.schedule_participant_ids
      : [];

    return {
      points: {
        win: Number.isFinite(Number(pointsConfig.win))
          ? Number(pointsConfig.win)
          : DEFAULT_ROUND_ROBIN_POINTS.win,
        draw: Number.isFinite(Number(pointsConfig.draw))
          ? Number(pointsConfig.draw)
          : DEFAULT_ROUND_ROBIN_POINTS.draw,
        loss: Number.isFinite(Number(pointsConfig.loss))
          ? Number(pointsConfig.loss)
          : DEFAULT_ROUND_ROBIN_POINTS.loss,
      },
      schedule_participant_ids: rawScheduleParticipantIds
        .map((participantId) => normalizeUuid(participantId))
        .filter(Boolean),
    };
  },

  resolveTotalRounds({ participantsCount }) {
    const normalizedParticipantsCount = normalizePositiveInteger(participantsCount, 2);
    const hasOddParticipants = normalizedParticipantsCount % 2 === 1;
    return hasOddParticipants
      ? normalizedParticipantsCount
      : normalizedParticipantsCount - 1;
  },

  buildNextRound({
    participants = [],
    tournament = null,
    nextRoundNumber,
  }) {
    const participantById = new Map(
      (Array.isArray(participants) ? participants : [])
        .map((participant) => [participant.id, participant]),
    );

    const normalizedSettings = this.normalizeSettings(tournament?.settings);
    const fallbackParticipantIds = (Array.isArray(participants) ? participants : [])
      .filter((participant) => participant?.status !== TournamentParticipantStatus.Withdrawn)
      .map((participant) => participant.id);
    const scheduleParticipantIds = normalizedSettings.schedule_participant_ids.length > 0
      ? normalizedSettings.schedule_participant_ids
      : fallbackParticipantIds;
    const fullSchedule = createRoundRobinSchedule(scheduleParticipantIds);
    const roundNumber = normalizePositiveInteger(nextRoundNumber, 1);
    const selectedRoundPairings = fullSchedule[roundNumber - 1] ?? null;

    if (!selectedRoundPairings) {
      return null;
    }

    const matches = selectedRoundPairings
      .map(([rawPlayer1ParticipantId, rawPlayer2ParticipantId]) => {
        const player1ParticipantId = normalizeUuid(rawPlayer1ParticipantId);
        const player2ParticipantId = normalizeUuid(rawPlayer2ParticipantId);

        const player1Withdrawn = isWithdrawn(participantById, player1ParticipantId);
        const player2Withdrawn = isWithdrawn(participantById, player2ParticipantId);

        if (!player1ParticipantId && !player2ParticipantId) {
          return null;
        }

        if ((player1ParticipantId && !player2ParticipantId) || (player1ParticipantId && player2Withdrawn)) {
          return {
            player1ParticipantId,
            player2ParticipantId: null,
          };
        }

        if ((!player1ParticipantId && player2ParticipantId) || (player2ParticipantId && player1Withdrawn)) {
          return {
            player1ParticipantId: null,
            player2ParticipantId,
          };
        }

        if (player1Withdrawn && player2Withdrawn) {
          return null;
        }

        return {
          player1ParticipantId,
          player2ParticipantId,
        };
      })
      .filter(Boolean);

    if (!matches.length) {
      return null;
    }

    return {
      label: `Round Robin - Round ${roundNumber}`,
      matches,
      metadata: {},
    };
  },

  allowsDraws() {
    return true;
  },
};
