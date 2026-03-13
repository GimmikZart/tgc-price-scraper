import {
  DEFAULT_ROUND_ROBIN_POINTS,
  DEFAULT_SWISS_POINTS,
  TournamentFormat,
  TournamentMatchResult,
  TournamentMatchStatus,
  TournamentParticipantStatus,
} from "@/api/tournaments/constants";
import { normalizeJsonObject, normalizeUuid } from "@/api/tournaments/utils";

function createDefaultStandingRow(participant) {
  return {
    participant_id: participant.id,
    profile_id: participant.profile_id,
    status: participant.status,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    matches_played: 0,
    buchholz: 0,
    score_diff: 0,
    opponents: [],
    rank: null,
  };
}

function resolvePointsConfig(tournament) {
  const settings = normalizeJsonObject(tournament?.settings);
  const settingsPoints = normalizeJsonObject(settings?.points);

  if (tournament?.format === TournamentFormat.Swiss) {
    return {
      win: Number.isFinite(Number(settingsPoints.win))
        ? Number(settingsPoints.win)
        : DEFAULT_SWISS_POINTS.win,
      draw: Number.isFinite(Number(settingsPoints.draw))
        ? Number(settingsPoints.draw)
        : DEFAULT_SWISS_POINTS.draw,
      loss: Number.isFinite(Number(settingsPoints.loss))
        ? Number(settingsPoints.loss)
        : DEFAULT_SWISS_POINTS.loss,
    };
  }

  if (tournament?.format === TournamentFormat.RoundRobin) {
    return {
      win: Number.isFinite(Number(settingsPoints.win))
        ? Number(settingsPoints.win)
        : DEFAULT_ROUND_ROBIN_POINTS.win,
      draw: Number.isFinite(Number(settingsPoints.draw))
        ? Number(settingsPoints.draw)
        : DEFAULT_ROUND_ROBIN_POINTS.draw,
      loss: Number.isFinite(Number(settingsPoints.loss))
        ? Number(settingsPoints.loss)
        : DEFAULT_ROUND_ROBIN_POINTS.loss,
    };
  }

  return {
    win: 1,
    draw: 0,
    loss: 0,
  };
}

function getParticipantOutcomeForMatch(match, participantId) {
  if (!match || match.status !== TournamentMatchStatus.Completed) return null;
  if (!participantId) return null;

  const player1ParticipantId = normalizeUuid(match.player1_participant_id);
  const player2ParticipantId = normalizeUuid(match.player2_participant_id);
  const winnerParticipantId = normalizeUuid(match.winner_participant_id);
  const normalizedParticipantId = normalizeUuid(participantId);

  if (!normalizedParticipantId) return null;

  const isParticipantPlayer1 = normalizedParticipantId === player1ParticipantId;
  const isParticipantPlayer2 = normalizedParticipantId === player2ParticipantId;
  if (!isParticipantPlayer1 && !isParticipantPlayer2) return null;

  if (match.result === TournamentMatchResult.Draw) {
    return {
      outcome: "draw",
      opponent_id: isParticipantPlayer1 ? player2ParticipantId : player1ParticipantId,
      is_bye: false,
    };
  }

  if (!winnerParticipantId) return null;

  const didWin = winnerParticipantId === normalizedParticipantId;

  return {
    outcome: didWin ? "win" : "loss",
    opponent_id: isParticipantPlayer1 ? player2ParticipantId : player1ParticipantId,
    is_bye: Boolean(match.is_bye),
  };
}

function addScoreDiff(standingRow, match, participantId) {
  const player1ParticipantId = normalizeUuid(match.player1_participant_id);
  const player2ParticipantId = normalizeUuid(match.player2_participant_id);
  const normalizedParticipantId = normalizeUuid(participantId);
  if (!normalizedParticipantId) return;

  const rawPlayer1Score = Number(match?.score?.player1);
  const rawPlayer2Score = Number(match?.score?.player2);

  if (!Number.isFinite(rawPlayer1Score) || !Number.isFinite(rawPlayer2Score)) {
    return;
  }

  if (normalizedParticipantId === player1ParticipantId) {
    standingRow.score_diff += rawPlayer1Score - rawPlayer2Score;
    return;
  }

  if (normalizedParticipantId === player2ParticipantId) {
    standingRow.score_diff += rawPlayer2Score - rawPlayer1Score;
  }
}

function sortStandingsByFormat({ tournament, standings = [] }) {
  const rows = Array.isArray(standings) ? [...standings] : [];
  const normalizedFormat = tournament?.format;

  if (normalizedFormat === TournamentFormat.Swiss) {
    rows.sort((rowA, rowB) => {
      return (
        (rowB.points - rowA.points)
        || (rowB.buchholz - rowA.buchholz)
        || (rowB.wins - rowA.wins)
        || (rowA.losses - rowB.losses)
        || String(rowA.profile_id ?? "").localeCompare(String(rowB.profile_id ?? ""))
      );
    });
  } else if (normalizedFormat === TournamentFormat.RoundRobin) {
    rows.sort((rowA, rowB) => {
      return (
        (rowB.points - rowA.points)
        || (rowB.wins - rowA.wins)
        || (rowB.score_diff - rowA.score_diff)
        || (rowB.buchholz - rowA.buchholz)
        || String(rowA.profile_id ?? "").localeCompare(String(rowB.profile_id ?? ""))
      );
    });
  } else {
    rows.sort((rowA, rowB) => {
      const rowAIsStillAlive = rowA.status === TournamentParticipantStatus.Active;
      const rowBIsStillAlive = rowB.status === TournamentParticipantStatus.Active;

      return (
        (Number(rowBIsStillAlive) - Number(rowAIsStillAlive))
        || (rowB.wins - rowA.wins)
        || (rowA.losses - rowB.losses)
        || (rowB.byes - rowA.byes)
        || String(rowA.profile_id ?? "").localeCompare(String(rowB.profile_id ?? ""))
      );
    });
  }

  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return rows;
}

export function computeTournamentStandings({
  tournament,
  participants = [],
  matches = [],
}) {
  const standingsMap = new Map();
  const pointsConfig = resolvePointsConfig(tournament);

  (Array.isArray(participants) ? participants : []).forEach((participant) => {
    if (!participant?.id) return;
    standingsMap.set(participant.id, createDefaultStandingRow(participant));
  });

  const completedMatches = (Array.isArray(matches) ? matches : [])
    .filter((match) => match?.status === TournamentMatchStatus.Completed);

  completedMatches.forEach((match) => {
    [match?.player1_participant_id, match?.player2_participant_id].forEach((participantId) => {
      const normalizedParticipantId = normalizeUuid(participantId);
      if (!normalizedParticipantId) return;

      const standingRow = standingsMap.get(normalizedParticipantId);
      if (!standingRow) return;

      const participantOutcome = getParticipantOutcomeForMatch(match, normalizedParticipantId);
      if (!participantOutcome) return;

      standingRow.matches_played += 1;

      if (participantOutcome.opponent_id) {
        standingRow.opponents.push(participantOutcome.opponent_id);
      }

      if (participantOutcome.outcome === "win") {
        standingRow.wins += 1;
        standingRow.points += pointsConfig.win;
      } else if (participantOutcome.outcome === "draw") {
        standingRow.draws += 1;
        standingRow.points += pointsConfig.draw;
      } else {
        standingRow.losses += 1;
        standingRow.points += pointsConfig.loss;
      }

      if (participantOutcome.is_bye) {
        standingRow.byes += 1;
      }

      addScoreDiff(standingRow, match, normalizedParticipantId);
    });
  });

  const standings = [...standingsMap.values()];
  const pointsByParticipantId = new Map(
    standings.map((standingRow) => [standingRow.participant_id, standingRow.points]),
  );

  standings.forEach((standingRow) => {
    const buchholzValue = standingRow.opponents
      .map((opponentId) => Number(pointsByParticipantId.get(opponentId) ?? 0))
      .reduce((sum, value) => sum + value, 0);
    standingRow.buchholz = buchholzValue;
  });

  return sortStandingsByFormat({
    tournament,
    standings,
  });
}
