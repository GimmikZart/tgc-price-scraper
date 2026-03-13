import {
  createSequentialPairings,
  createShuffledParticipantIds,
  getActiveParticipants,
  getRoundMatches,
} from "@/api/tournaments/engine/common";
import { TournamentMatchStatus } from "@/api/tournaments/constants";
import { nextPowerOfTwo, normalizeJsonObject, normalizePositiveInteger, normalizeUuid } from "@/api/tournaments/utils";

function createInitialPairings(participantIds = []) {
  const shuffledIds = createShuffledParticipantIds(participantIds);
  if (shuffledIds.length < 2) return [];

  const bracketSize = nextPowerOfTwo(shuffledIds.length);
  const pairCount = Math.max(1, bracketSize / 2);
  const buckets = Array.from({ length: pairCount }, () => []);

  shuffledIds.forEach((participantId, index) => {
    buckets[index % pairCount].push(participantId);
  });

  return buckets
    .map((bucket) => [bucket[0] ?? null, bucket[1] ?? null])
    .filter((pairing) => Boolean(pairing[0] ?? pairing[1]));
}

function getRoundWinners(matches = [], roundNumber) {
  const roundMatches = getRoundMatches(matches, roundNumber)
    .sort((matchA, matchB) => (matchA.table_number ?? 0) - (matchB.table_number ?? 0));

  if (!roundMatches.length) return [];

  const unresolvedMatch = roundMatches.find((match) => {
    return match.status !== TournamentMatchStatus.Completed || !match.winner_participant_id;
  });

  if (unresolvedMatch) {
    return null;
  }

  return roundMatches
    .map((match) => normalizeUuid(match.winner_participant_id))
    .filter(Boolean);
}

export const singleEliminationHandler = {
  normalizeSettings(rawSettings = {}) {
    const normalizedSettings = normalizeJsonObject(rawSettings);

    return {
      seeding: normalizedSettings?.seeding === "manual" ? "manual" : "random",
    };
  },

  resolveTotalRounds({ participantsCount }) {
    const normalizedParticipantsCount = normalizePositiveInteger(participantsCount, 2);
    return Math.ceil(Math.log2(Math.max(2, normalizedParticipantsCount)));
  },

  buildNextRound({
    participants = [],
    matches = [],
    nextRoundNumber,
  }) {
    const roundNumber = normalizePositiveInteger(nextRoundNumber, 1);

    let candidateParticipantIds = [];

    if (roundNumber === 1) {
      candidateParticipantIds = getActiveParticipants(participants).map((participant) => participant.id);
    } else {
      const previousRoundWinners = getRoundWinners(matches, roundNumber - 1);

      if (previousRoundWinners == null) {
        throw new Error("Il round precedente non e ancora completato");
      }

      candidateParticipantIds = previousRoundWinners;
    }

    if (!candidateParticipantIds.length || candidateParticipantIds.length === 1) {
      return null;
    }

    const pairings = roundNumber === 1
      ? createInitialPairings(candidateParticipantIds)
      : createSequentialPairings(candidateParticipantIds);

    if (!pairings.length) return null;

    return {
      label: roundNumber === 1 ? "Bracket - Round 1" : `Bracket - Round ${roundNumber}`,
      matches: pairings.map(([player1ParticipantId, player2ParticipantId]) => ({
        player1ParticipantId,
        player2ParticipantId,
      })),
      metadata: {},
    };
  },

  allowsDraws() {
    return false;
  },
};
