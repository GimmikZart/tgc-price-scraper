import { normalizeProfile } from "@/api/profiles";
import {
  normalizeTournamentMatchRow,
  normalizeTournamentParticipantRow,
  normalizeTournamentRoundRow,
  normalizeTournamentRow,
} from "@/api/tournaments/normalizers";
import { dedupeStrings, normalizeUuid } from "@/api/tournaments/utils";

function assertSupabaseResult(error) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchTournamentById(client, tournamentId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }

  const { data, error } = await client
    .from("tournaments")
    .select("*")
    .eq("id", normalizedTournamentId)
    .maybeSingle();

  assertSupabaseResult(error);
  return normalizeTournamentRow(data);
}

export async function fetchUserTournaments(client, userId, options = {}) {
  const normalizedUserId = normalizeUuid(userId);
  if (!normalizedUserId) {
    throw new Error("userId non valido");
  }

  const limit = Number.isInteger(options?.limit) && options.limit > 0
    ? options.limit
    : 50;

  let query = client
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.includeAll !== true || options?.organizerOnly) {
    query = query.eq("organizer_id", normalizedUserId);
  }

  const { data: rows = [], error } = await query;
  assertSupabaseResult(error);

  const normalizedRows = rows
    .map((row) => normalizeTournamentRow(row))
    .filter(Boolean);

  return hydrateTournaments(client, normalizedRows);
}

export async function insertTournament(client, payload) {
  const { data, error } = await client
    .from("tournaments")
    .insert(payload)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentRow(data);
}

export async function updateTournamentById(client, tournamentId, payload) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }

  const { data, error } = await client
    .from("tournaments")
    .update(payload)
    .eq("id", normalizedTournamentId)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentRow(data);
}

export async function deleteTournamentById(client, tournamentId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }

  const { error } = await client
    .from("tournaments")
    .delete()
    .eq("id", normalizedTournamentId);

  assertSupabaseResult(error);
  return true;
}

export async function fetchTournamentParticipants(client, tournamentId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }

  const { data: rows = [], error } = await client
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", normalizedTournamentId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("joined_at", { ascending: true });

  assertSupabaseResult(error);

  return rows
    .map((row) => normalizeTournamentParticipantRow(row))
    .filter(Boolean);
}

export async function fetchTournamentParticipantByProfile(client, tournamentId, profileId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  const normalizedProfileId = normalizeUuid(profileId);

  if (!normalizedTournamentId || !normalizedProfileId) {
    throw new Error("Dati partecipante non validi");
  }

  const { data, error } = await client
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", normalizedTournamentId)
    .eq("profile_id", normalizedProfileId)
    .maybeSingle();

  assertSupabaseResult(error);
  return normalizeTournamentParticipantRow(data);
}

export async function insertTournamentParticipant(client, payload) {
  const { data, error } = await client
    .from("tournament_participants")
    .insert(payload)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentParticipantRow(data);
}

export async function updateTournamentParticipantById(client, participantId, payload) {
  const normalizedParticipantId = normalizeUuid(participantId);
  if (!normalizedParticipantId) {
    throw new Error("participantId non valido");
  }

  const { data, error } = await client
    .from("tournament_participants")
    .update(payload)
    .eq("id", normalizedParticipantId)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentParticipantRow(data);
}

export async function deleteTournamentParticipantById(client, participantId) {
  const normalizedParticipantId = normalizeUuid(participantId);
  if (!normalizedParticipantId) {
    throw new Error("participantId non valido");
  }

  const { error } = await client
    .from("tournament_participants")
    .delete()
    .eq("id", normalizedParticipantId);

  assertSupabaseResult(error);
  return true;
}

export async function deleteTournamentParticipantsByIds(client, participantIds) {
  const normalizedIds = dedupeStrings(participantIds)
    .map((participantId) => normalizeUuid(participantId))
    .filter(Boolean);

  if (!normalizedIds.length) return [];

  const { data: rows = [], error } = await client
    .from("tournament_participants")
    .delete()
    .in("id", normalizedIds)
    .select("id");

  assertSupabaseResult(error);
  return rows
    .map((row) => normalizeUuid(row?.id))
    .filter(Boolean);
}

export async function updateTournamentParticipantsByIds(client, participantIds, payload) {
  const normalizedIds = dedupeStrings(participantIds)
    .map((participantId) => normalizeUuid(participantId))
    .filter(Boolean);

  if (!normalizedIds.length) return [];

  const { data: rows = [], error } = await client
    .from("tournament_participants")
    .update(payload)
    .in("id", normalizedIds)
    .select("*");

  assertSupabaseResult(error);
  return rows
    .map((row) => normalizeTournamentParticipantRow(row))
    .filter(Boolean);
}

export async function fetchTournamentRounds(client, tournamentId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }

  const { data: rows = [], error } = await client
    .from("tournament_rounds")
    .select("*")
    .eq("tournament_id", normalizedTournamentId)
    .order("round_number", { ascending: true })
    .order("created_at", { ascending: true });

  assertSupabaseResult(error);

  return rows
    .map((row) => normalizeTournamentRoundRow(row))
    .filter(Boolean);
}

export async function insertTournamentRound(client, payload) {
  const { data, error } = await client
    .from("tournament_rounds")
    .insert(payload)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentRoundRow(data);
}

export async function updateTournamentRoundById(client, roundId, payload) {
  const normalizedRoundId = normalizeUuid(roundId);
  if (!normalizedRoundId) {
    throw new Error("roundId non valido");
  }

  const { data, error } = await client
    .from("tournament_rounds")
    .update(payload)
    .eq("id", normalizedRoundId)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentRoundRow(data);
}

export async function fetchTournamentMatches(client, tournamentId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  if (!normalizedTournamentId) {
    throw new Error("tournamentId non valido");
  }

  const { data: rows = [], error } = await client
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", normalizedTournamentId)
    .order("round_number", { ascending: true })
    .order("table_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  assertSupabaseResult(error);

  return rows
    .map((row) => normalizeTournamentMatchRow(row))
    .filter(Boolean);
}

export async function fetchTournamentMatchById(client, tournamentId, matchId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  const normalizedMatchId = normalizeUuid(matchId);
  if (!normalizedTournamentId || !normalizedMatchId) {
    throw new Error("matchId non valido");
  }

  const { data, error } = await client
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", normalizedTournamentId)
    .eq("id", normalizedMatchId)
    .maybeSingle();

  assertSupabaseResult(error);
  return normalizeTournamentMatchRow(data);
}

export async function fetchTournamentMatchByLinkedMatchId(client, tournamentId, linkedMatchId) {
  const normalizedTournamentId = normalizeUuid(tournamentId);
  const normalizedLinkedMatchId = normalizeUuid(linkedMatchId);

  if (!normalizedTournamentId || !normalizedLinkedMatchId) {
    throw new Error("matchId non valido");
  }

  const { data, error } = await client
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", normalizedTournamentId)
    .eq("match_id", normalizedLinkedMatchId)
    .maybeSingle();

  assertSupabaseResult(error);
  return normalizeTournamentMatchRow(data);
}

export async function insertTournamentMatches(client, payload = []) {
  const rowsToInsert = Array.isArray(payload) ? payload : [];
  if (!rowsToInsert.length) return [];

  const { data: rows = [], error } = await client
    .from("tournament_matches")
    .insert(rowsToInsert)
    .select("*");

  assertSupabaseResult(error);

  return rows
    .map((row) => normalizeTournamentMatchRow(row))
    .filter(Boolean)
    .sort((matchA, matchB) => (matchA.table_number ?? 0) - (matchB.table_number ?? 0));
}

export async function updateTournamentMatchById(client, matchId, payload) {
  const normalizedMatchId = normalizeUuid(matchId);
  if (!normalizedMatchId) {
    throw new Error("matchId non valido");
  }

  const { data, error } = await client
    .from("tournament_matches")
    .update(payload)
    .eq("id", normalizedMatchId)
    .select("*")
    .single();

  assertSupabaseResult(error);
  return normalizeTournamentMatchRow(data);
}

export async function fetchProfilesMap(client, profileIds = []) {
  const normalizedIds = dedupeStrings(profileIds)
    .map((profileId) => normalizeUuid(profileId))
    .filter(Boolean);

  if (!normalizedIds.length) return new Map();

  const { data: rows = [], error } = await client
    .from("profiles")
    .select("*")
    .in("id", normalizedIds);

  assertSupabaseResult(error);

  return new Map(
    rows
      .map((row) => normalizeProfile(row))
      .filter(Boolean)
      .map((profile) => [profile.id, profile]),
  );
}

export async function hydrateParticipants(client, participants = []) {
  const normalizedParticipants = (Array.isArray(participants) ? participants : [])
    .map((participant) => normalizeTournamentParticipantRow(participant))
    .filter(Boolean);

  const profileMap = await fetchProfilesMap(
    client,
    normalizedParticipants.map((participant) => participant.profile_id),
  );

  return normalizedParticipants.map((participant) => ({
    ...participant,
    profile: profileMap.get(participant.profile_id) ?? null,
  }));
}

export async function hydrateTournaments(client, tournaments = []) {
  const normalizedTournaments = (Array.isArray(tournaments) ? tournaments : [])
    .map((tournament) => normalizeTournamentRow(tournament))
    .filter(Boolean);

  const organizerMap = await fetchProfilesMap(
    client,
    normalizedTournaments.map((tournament) => tournament.organizer_id),
  );

  const tournamentIds = normalizedTournaments
    .map((tournament) => tournament.id)
    .filter(Boolean);

  const participantsCountByTournamentId = new Map();

  if (tournamentIds.length > 0) {
    const { data: participantRows = [], error } = await client
      .from("tournament_participants")
      .select("tournament_id, status")
      .in("tournament_id", tournamentIds);

    assertSupabaseResult(error);

    participantRows.forEach((row) => {
      const tournamentId = normalizeUuid(row?.tournament_id);
      if (!tournamentId) return;

      if (row?.status === "withdrawn") return;

      const currentCount = participantsCountByTournamentId.get(tournamentId) ?? 0;
      participantsCountByTournamentId.set(tournamentId, currentCount + 1);
    });
  }

  return normalizedTournaments.map((tournament) => ({
    ...tournament,
    organizer_profile: organizerMap.get(tournament.organizer_id) ?? null,
    participants_count: participantsCountByTournamentId.get(tournament.id) ?? 0,
  }));
}

export async function hydrateTournament(client, tournament) {
  const hydratedRows = await hydrateTournaments(client, [tournament]);
  return hydratedRows[0] ?? null;
}
