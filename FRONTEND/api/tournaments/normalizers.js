import {
  DEFAULT_TOURNAMENT_GAME,
  SUPPORTED_TOURNAMENT_FORMATS,
  TournamentFormat,
  TournamentMatchResult,
  TournamentMatchStatus,
  TournamentParticipantStatus,
  TournamentRoundStatus,
  TournamentStatus,
} from "@/api/tournaments/constants";
import {
  normalizeJsonObject,
  normalizeNonNegativeInteger,
  normalizeNumberInRange,
  normalizePositiveInteger,
  normalizeString,
  normalizeUuid,
} from "@/api/tournaments/utils";

export function normalizeTournamentFormat(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  return SUPPORTED_TOURNAMENT_FORMATS.includes(normalizedValue)
    ? normalizedValue
    : null;
}

export function normalizeTournamentStatus(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return TournamentStatus.Draft;

  return Object.values(TournamentStatus).includes(normalizedValue)
    ? normalizedValue
    : TournamentStatus.Draft;
}

export function normalizeTournamentParticipantStatus(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return TournamentParticipantStatus.Registered;

  return Object.values(TournamentParticipantStatus).includes(normalizedValue)
    ? normalizedValue
    : TournamentParticipantStatus.Registered;
}

export function normalizeTournamentRoundStatus(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return TournamentRoundStatus.Pending;

  return Object.values(TournamentRoundStatus).includes(normalizedValue)
    ? normalizedValue
    : TournamentRoundStatus.Pending;
}

export function normalizeTournamentMatchStatus(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return TournamentMatchStatus.Pending;

  return Object.values(TournamentMatchStatus).includes(normalizedValue)
    ? normalizedValue
    : TournamentMatchStatus.Pending;
}

export function normalizeTournamentMatchResult(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  return Object.values(TournamentMatchResult).includes(normalizedValue)
    ? normalizedValue
    : null;
}

export function normalizeTournamentRow(row) {
  if (!row) return null;

  return {
    ...row,
    id: normalizeUuid(row.id),
    name: normalizeString(row.name),
    format: normalizeTournamentFormat(row.format) ?? TournamentFormat.SingleElimination,
    game: normalizeString(row.game) ?? DEFAULT_TOURNAMENT_GAME,
    max_participants: normalizePositiveInteger(row.max_participants, 2),
    organizer_id: normalizeUuid(row.organizer_id),
    status: normalizeTournamentStatus(row.status),
    settings: normalizeJsonObject(row.settings),
    latitude: normalizeNumberInRange(row.latitude, -90, 90),
    longitude: normalizeNumberInRange(row.longitude, -180, 180),
    location_label: normalizeString(row.location_label),
    current_round: normalizeNonNegativeInteger(row.current_round, 0),
    total_rounds: row.total_rounds == null
      ? null
      : normalizePositiveInteger(row.total_rounds, 1),
    winner_participant_id: normalizeUuid(row.winner_participant_id),
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    cancelled_at: row.cancelled_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export function normalizeTournamentParticipantRow(row) {
  if (!row) return null;

  return {
    ...row,
    id: normalizeUuid(row.id),
    tournament_id: normalizeUuid(row.tournament_id),
    profile_id: normalizeUuid(row.profile_id),
    seed: row.seed == null ? null : normalizePositiveInteger(row.seed, 1),
    status: normalizeTournamentParticipantStatus(row.status),
    withdrawn_at: row.withdrawn_at ?? null,
    dropped_round: row.dropped_round == null
      ? null
      : normalizeNonNegativeInteger(row.dropped_round, 0),
    metadata: normalizeJsonObject(row.metadata),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export function normalizeTournamentRoundRow(row) {
  if (!row) return null;

  return {
    ...row,
    id: normalizeUuid(row.id),
    tournament_id: normalizeUuid(row.tournament_id),
    round_number: normalizePositiveInteger(row.round_number, 1),
    label: normalizeString(row.label),
    status: normalizeTournamentRoundStatus(row.status),
    metadata: normalizeJsonObject(row.metadata),
    created_at: row.created_at ?? null,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function normalizeMatchScore(score) {
  if (!score || typeof score !== "object" || Array.isArray(score)) {
    return {};
  }

  const normalizedScore = {};
  const player1 = Number(score.player1);
  const player2 = Number(score.player2);

  if (Number.isFinite(player1)) {
    normalizedScore.player1 = player1;
  }

  if (Number.isFinite(player2)) {
    normalizedScore.player2 = player2;
  }

  return normalizedScore;
}

export function normalizeTournamentMatchRow(row) {
  if (!row) return null;

  return {
    ...row,
    id: normalizeUuid(row.id),
    tournament_id: normalizeUuid(row.tournament_id),
    round_id: normalizeUuid(row.round_id),
    round_number: normalizePositiveInteger(row.round_number, 1),
    table_number: row.table_number == null
      ? null
      : normalizePositiveInteger(row.table_number, 1),
    status: normalizeTournamentMatchStatus(row.status),
    result: normalizeTournamentMatchResult(row.result),
    player1_participant_id: normalizeUuid(row.player1_participant_id),
    player2_participant_id: normalizeUuid(row.player2_participant_id),
    winner_participant_id: normalizeUuid(row.winner_participant_id),
    match_id: normalizeUuid(row.match_id),
    is_bye: Boolean(row.is_bye),
    score: normalizeMatchScore(row.score),
    metadata: normalizeJsonObject(row.metadata),
    reported_by: normalizeUuid(row.reported_by),
    created_at: row.created_at ?? null,
    completed_at: row.completed_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}
