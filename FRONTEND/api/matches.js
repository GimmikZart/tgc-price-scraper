import { normalizeProfile } from "@/api/profiles";
import { syncTournamentMatchFromClassicMatch } from "@/api/tournaments";

export const MatchStatus = Object.freeze({
  Pending: "pending",
  Active: "active",
  Completed: "completed",
  Invalid: "invalid",
  Canceled: "canceled",
  Rejected: "rejected",
});

export const MatchResult = Object.freeze({
  Won: "won",
  Lost: "lost",
  Draw: "draw",
});

export const MatchCancelReason = Object.freeze({
  Canceled: "canceled",
  Rejected: "rejected",
});

export const DEFAULT_MATCH_GAME = "one_piece";

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function normalizeUuid(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(normalizedValue)
    ? normalizedValue
    : null;
}

function normalizeMatchStatus(value) {
  const normalizedStatus = normalizeString(value);
  if (!normalizedStatus) return MatchStatus.Pending;

  return Object.values(MatchStatus).includes(normalizedStatus)
    ? normalizedStatus
    : MatchStatus.Pending;
}

function normalizeMatchResult(value) {
  const normalizedResult = normalizeString(value);
  if (!normalizedResult) return null;

  return Object.values(MatchResult).includes(normalizedResult)
    ? normalizedResult
    : null;
}

function normalizeCancelReason(value) {
  const normalizedReason = normalizeString(value);
  if (!normalizedReason) return null;

  return Object.values(MatchCancelReason).includes(normalizedReason)
    ? normalizedReason
    : null;
}

function normalizePositiveInteger(value, fallbackValue = 50) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) return fallbackValue;
  return parsedValue;
}

function dedupeStrings(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => normalizeString(value))
      .filter(Boolean),
  )];
}

function normalizeMatchRow(row) {
  if (!row) return null;

  return {
    ...row,
    id: normalizeUuid(row.id),
    game: normalizeString(row.game) ?? DEFAULT_MATCH_GAME,
    tournament_id: normalizeUuid(row.tournament_id),
    status: normalizeMatchStatus(row.status),
    challenger_id: normalizeUuid(row.challenger_id),
    opponent_id: normalizeUuid(row.opponent_id),
    winner_id: normalizeUuid(row.winner_id),
    challenger_result: normalizeMatchResult(row.challenger_result),
    opponent_result: normalizeMatchResult(row.opponent_result),
    cancel_reason: normalizeCancelReason(row.cancel_reason),
    challenger_deck: row.challenger_deck ?? null,
    opponent_deck: row.opponent_deck ?? null,
  };
}

function getAuthenticatedUserId() {
  return normalizeUuid(useUserAuth()?.userLogged?.id ?? null);
}

function assertAuthenticatedUserId() {
  const userId = getAuthenticatedUserId();
  if (!userId) {
    throw new Error("Utente non autenticato");
  }
  return userId;
}

function assertMatchId(matchId) {
  const normalizedMatchId = normalizeUuid(matchId);
  if (!normalizedMatchId) {
    throw new Error("matchId non valido");
  }
  return normalizedMatchId;
}

function assertGame(game) {
  const normalizedGame = normalizeString(game) ?? DEFAULT_MATCH_GAME;
  return normalizedGame;
}

function assertResult(result) {
  const normalizedResult = normalizeMatchResult(result);
  if (!normalizedResult) {
    throw new Error("Risultato non valido");
  }
  return normalizedResult;
}

function assertCancelReason(reason) {
  const normalizedReason = normalizeCancelReason(reason);
  if (!normalizedReason) {
    throw new Error("Motivazione annullamento non valida");
  }
  return normalizedReason;
}

function getUserRoleInMatch(matchRow, userId) {
  if (!matchRow || !userId) return null;
  if (String(matchRow.challenger_id) === String(userId)) return "challenger";
  if (String(matchRow.opponent_id) === String(userId)) return "opponent";
  return null;
}

function assertUserCanAccessMatch(matchRow, userId) {
  const role = getUserRoleInMatch(matchRow, userId);
  if (!role) {
    throw new Error("Non sei autorizzato a gestire questo match");
  }
  return role;
}

function isMatchTerminal(status) {
  return [
    MatchStatus.Completed,
    MatchStatus.Invalid,
    MatchStatus.Canceled,
    MatchStatus.Rejected,
  ].includes(status);
}

async function fetchProfilesByIds(client, profileIds = []) {
  const normalizedProfileIds = dedupeStrings(profileIds)
    .map((profileId) => normalizeUuid(profileId))
    .filter(Boolean);

  if (!normalizedProfileIds.length) return new Map();

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .in("id", normalizedProfileIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    profiles
      .map((profile) => normalizeProfile(profile))
      .filter(Boolean)
      .map((profile) => [profile.id, profile]),
  );
}

async function hydrateMatchProfiles(client, matchRows = []) {
  const normalizedRows = matchRows
    .map((row) => normalizeMatchRow(row))
    .filter(Boolean);

  const profileIds = dedupeStrings(
    normalizedRows.flatMap((row) => [row.challenger_id, row.opponent_id]),
  );
  const profileById = await fetchProfilesByIds(client, profileIds);

  return normalizedRows.map((row) => ({
    ...row,
    challenger_profile: profileById.get(row.challenger_id) ?? null,
    opponent_profile: profileById.get(row.opponent_id) ?? null,
  }));
}

async function findLeaderCardById(leaderId) {
  const normalizedLeaderId = normalizeString(leaderId);
  if (!normalizedLeaderId) return null;

  const { allCards } = await useOnePieceCards();
  return allCards.find((card) => card.id === normalizedLeaderId) ?? null;
}

async function buildDeckSnapshot(deck, game = DEFAULT_MATCH_GAME) {
  const normalizedDeck = deck ?? {};
  const normalizedCards = Array.isArray(normalizedDeck.cards)
    ? normalizedDeck.cards.filter((cardId) => typeof cardId === "string")
    : [];

  const normalizedLeaderId = normalizeString(normalizedDeck.leader);
  const leaderCard = await findLeaderCardById(normalizedLeaderId);

  return {
    game: assertGame(game),
    slug: normalizeString(normalizedDeck.slug),
    name: normalizeString(normalizedDeck.name),
    leader_id: normalizedLeaderId,
    leader_name: normalizeString(leaderCard?.name) ?? null,
    leader_image: normalizeString(leaderCard?.image) ?? null,
    leader_colors: Array.isArray(leaderCard?.color)
      ? leaderCard.color.filter((color) => typeof color === "string")
      : [],
    cards: normalizedCards,
    cards_count: normalizedCards.length,
    saved_at: new Date().toISOString(),
  };
}

function createUserMatchesChannelName(userId) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `matches-feed-${userId}-${suffix}`;
}

function createMatchChannelName(matchId) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `match-room-${matchId}-${suffix}`;
}

function toRealtimeMatchRow(payload = {}) {
  const rawRow = payload.new ?? payload.old ?? null;
  return normalizeMatchRow(rawRow);
}

export async function createMatchInvite(payload = {}) {
  const client = useSupabaseClient();
  const challengerId = assertAuthenticatedUserId();
  const opponentId = normalizeUuid(payload?.opponentId);
  const game = assertGame(payload?.game);

  if (!opponentId) {
    throw new Error("Avversario non valido");
  }

  if (String(opponentId) === String(challengerId)) {
    throw new Error("Non puoi sfidare te stesso");
  }

  const { data: existingMatch, error: existingMatchError } = await client
    .from("matches")
    .select("*")
    .is("tournament_id", null)
    .eq("game", game)
    .in("status", [MatchStatus.Pending, MatchStatus.Active])
    .or(
      `and(challenger_id.eq.${challengerId},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${challengerId})`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingMatchError) {
    throw new Error(existingMatchError.message);
  }

  if (existingMatch) {
    const hydratedMatches = await hydrateMatchProfiles(client, [existingMatch]);
    return hydratedMatches[0] ?? normalizeMatchRow(existingMatch);
  }

  const { data: createdMatch, error } = await client
    .from("matches")
    .insert({
      game,
      status: MatchStatus.Pending,
      challenger_id: challengerId,
      opponent_id: opponentId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const hydratedMatches = await hydrateMatchProfiles(client, [createdMatch]);
  return hydratedMatches[0] ?? normalizeMatchRow(createdMatch);
}

export async function fetchMatchById(matchId) {
  const client = useSupabaseClient();
  const normalizedMatchId = assertMatchId(matchId);

  const { data: matchRow, error } = await client
    .from("matches")
    .select("*")
    .eq("id", normalizedMatchId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!matchRow) return null;

  const hydratedMatches = await hydrateMatchProfiles(client, [matchRow]);
  return hydratedMatches[0] ?? normalizeMatchRow(matchRow);
}

export async function fetchUserMatches(options = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const game = assertGame(options?.game);
  const statuses = Array.isArray(options?.statuses)
    ? options.statuses
        .map((status) => normalizeMatchStatus(status))
        .filter((status) => Object.values(MatchStatus).includes(status))
    : [];
  const limit = normalizePositiveInteger(options?.limit, 80);

  let query = client
    .from("matches")
    .select("*")
    .eq("game", game)
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statuses.length) {
    query = query.in("status", statuses);
  }

  const { data: matches = [], error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return hydrateMatchProfiles(client, matches);
}

export async function fetchIncomingMatchInvites(options = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const game = assertGame(options?.game);
  const limit = normalizePositiveInteger(options?.limit, 40);

  const { data: matches = [], error } = await client
    .from("matches")
    .select("*")
    .is("tournament_id", null)
    .eq("game", game)
    .eq("status", MatchStatus.Pending)
    .eq("opponent_id", userId)
    .is("opponent_deck", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return hydrateMatchProfiles(client, matches);
}

export async function selectMatchDeck(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const normalizedMatchId = assertMatchId(payload?.matchId);
  const selectedDeck = payload?.deck;

  if (!selectedDeck || typeof selectedDeck !== "object") {
    throw new Error("Deck non valido");
  }

  const { data: currentMatch, error: currentMatchError } = await client
    .from("matches")
    .select("*")
    .eq("id", normalizedMatchId)
    .single();

  if (currentMatchError) {
    throw new Error(currentMatchError.message);
  }

  const normalizedCurrentMatch = normalizeMatchRow(currentMatch);
  const role = assertUserCanAccessMatch(normalizedCurrentMatch, userId);

  if (isMatchTerminal(normalizedCurrentMatch.status)) {
    throw new Error("Il match non e piu modificabile");
  }

  const deckSnapshot = await buildDeckSnapshot(
    selectedDeck,
    normalizedCurrentMatch.game,
  );

  const nowIso = new Date().toISOString();
  const nextChallengerDeck = role === "challenger"
    ? deckSnapshot
    : normalizedCurrentMatch.challenger_deck;
  const nextOpponentDeck = role === "opponent"
    ? deckSnapshot
    : normalizedCurrentMatch.opponent_deck;
  const hasBothDecks = Boolean(nextChallengerDeck && nextOpponentDeck);

  const updatePayload = {
    status: hasBothDecks ? MatchStatus.Active : MatchStatus.Pending,
    canceled_at: null,
    cancel_reason: null,
  };

  if (role === "challenger") {
    updatePayload.challenger_deck = deckSnapshot;
    updatePayload.challenger_deck_selected_at = nowIso;
  } else {
    updatePayload.opponent_deck = deckSnapshot;
    updatePayload.opponent_deck_selected_at = nowIso;
  }

  if (hasBothDecks && !normalizedCurrentMatch.started_at) {
    updatePayload.started_at = nowIso;
  }

  const { data: updatedMatch, error: updateError } = await client
    .from("matches")
    .update(updatePayload)
    .eq("id", normalizedMatchId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const hydratedMatches = await hydrateMatchProfiles(client, [updatedMatch]);
  return hydratedMatches[0] ?? normalizeMatchRow(updatedMatch);
}

export async function submitMatchResult(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const normalizedMatchId = assertMatchId(payload?.matchId);
  const normalizedResult = assertResult(payload?.result);

  const { data: currentMatch, error: currentMatchError } = await client
    .from("matches")
    .select("*")
    .eq("id", normalizedMatchId)
    .single();

  if (currentMatchError) {
    throw new Error(currentMatchError.message);
  }

  const normalizedCurrentMatch = normalizeMatchRow(currentMatch);
  const role = assertUserCanAccessMatch(normalizedCurrentMatch, userId);

  if (isMatchTerminal(normalizedCurrentMatch.status)) {
    throw new Error("Il match e gia terminato");
  }

  if (!normalizedCurrentMatch.challenger_deck || !normalizedCurrentMatch.opponent_deck) {
    throw new Error("Entrambi i giocatori devono scegliere il mazzo prima di terminare il match");
  }

  const challengerResult = role === "challenger"
    ? normalizedResult
    : normalizedCurrentMatch.challenger_result;
  const opponentResult = role === "opponent"
    ? normalizedResult
    : normalizedCurrentMatch.opponent_result;

  const updatePayload = {
    status: MatchStatus.Active,
    winner_id: null,
    completed_at: null,
  };

  if (role === "challenger") {
    updatePayload.challenger_result = normalizedResult;
  } else {
    updatePayload.opponent_result = normalizedResult;
  }

  if (challengerResult && opponentResult) {
    const nowIso = new Date().toISOString();
    const isWinLossCoherent = (
      (challengerResult === MatchResult.Won && opponentResult === MatchResult.Lost)
      || (challengerResult === MatchResult.Lost && opponentResult === MatchResult.Won)
    );
    const isDrawCoherent = (
      challengerResult === MatchResult.Draw
      && opponentResult === MatchResult.Draw
    );
    const isCoherent = isWinLossCoherent || isDrawCoherent;

    updatePayload.status = isCoherent ? MatchStatus.Completed : MatchStatus.Invalid;
    updatePayload.completed_at = nowIso;

    if (isCoherent) {
      if (isDrawCoherent) {
        updatePayload.winner_id = null;
      } else {
        updatePayload.winner_id = challengerResult === MatchResult.Won
          ? normalizedCurrentMatch.challenger_id
          : normalizedCurrentMatch.opponent_id;
      }
    }
  }

  if (!normalizedCurrentMatch.started_at) {
    updatePayload.started_at = new Date().toISOString();
  }

  const { data: updatedMatch, error: updateError } = await client
    .from("matches")
    .update(updatePayload)
    .eq("id", normalizedMatchId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const hydratedMatches = await hydrateMatchProfiles(client, [updatedMatch]);
  const normalizedUpdatedMatch = hydratedMatches[0] ?? normalizeMatchRow(updatedMatch);

  let tournamentSyncResult = null;
  let tournamentSyncErrorMessage = null;

  if (
    normalizedUpdatedMatch?.tournament_id
    && normalizedUpdatedMatch?.status === MatchStatus.Completed
  ) {
    try {
      tournamentSyncResult = await syncTournamentMatchFromClassicMatch({
        tournamentId: normalizedUpdatedMatch.tournament_id,
        matchId: normalizedUpdatedMatch.id,
      });
    } catch (error) {
      tournamentSyncErrorMessage = error?.message || "Risultato match salvato, ma sincronizzazione torneo non riuscita";
    }
  }

  return {
    ...normalizedUpdatedMatch,
    tournament_sync: tournamentSyncResult,
    tournament_sync_error: tournamentSyncErrorMessage,
  };
}

export async function deleteMatchWithReason(payload = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const normalizedMatchId = assertMatchId(payload?.matchId);
  const reason = assertCancelReason(payload?.reason);

  const { data: currentMatch, error: currentMatchError } = await client
    .from("matches")
    .select("*")
    .eq("id", normalizedMatchId)
    .single();

  if (currentMatchError) {
    throw new Error(currentMatchError.message);
  }

  const normalizedCurrentMatch = normalizeMatchRow(currentMatch);
  const role = assertUserCanAccessMatch(normalizedCurrentMatch, userId);

  if (reason === MatchCancelReason.Rejected && role !== "opponent") {
    throw new Error("Solo l'utente invitato puo rifiutare il match");
  }

  const nowIso = new Date().toISOString();
  const cancelStatus = reason === MatchCancelReason.Rejected
    ? MatchStatus.Rejected
    : MatchStatus.Canceled;

  const { error: updateError } = await client
    .from("matches")
    .update({
      status: cancelStatus,
      cancel_reason: reason,
      canceled_at: nowIso,
    })
    .eq("id", normalizedMatchId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteError } = await client
    .from("matches")
    .delete()
    .eq("id", normalizedMatchId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return true;
}

export function subscribeToMatch(matchId, handlers = {}) {
  const client = useSupabaseClient();
  const normalizedMatchId = assertMatchId(matchId);

  const channel = client
    .channel(createMatchChannelName(normalizedMatchId))
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "matches",
        filter: `id=eq.${normalizedMatchId}`,
      },
      (payload) => handlers?.onInsert?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matches",
        filter: `id=eq.${normalizedMatchId}`,
      },
      (payload) => handlers?.onUpdate?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "matches",
        filter: `id=eq.${normalizedMatchId}`,
      },
      (payload) => handlers?.onDelete?.(toRealtimeMatchRow(payload), payload),
    );

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      handlers?.onSubscribed?.();
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      handlers?.onError?.(new Error(`Realtime channel status: ${status}`), status);
    }
  });

  return {
    channel,
    unsubscribe: async () => {
      await client.removeChannel(channel);
    },
  };
}

export function subscribeToUserMatches(handlers = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();

  const channel = client
    .channel(createUserMatchesChannelName(userId))
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "matches",
        filter: `challenger_id=eq.${userId}`,
      },
      (payload) => handlers?.onInsert?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "matches",
        filter: `opponent_id=eq.${userId}`,
      },
      (payload) => handlers?.onInsert?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matches",
        filter: `challenger_id=eq.${userId}`,
      },
      (payload) => handlers?.onUpdate?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matches",
        filter: `opponent_id=eq.${userId}`,
      },
      (payload) => handlers?.onUpdate?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "matches",
        filter: `challenger_id=eq.${userId}`,
      },
      (payload) => handlers?.onDelete?.(toRealtimeMatchRow(payload), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "matches",
        filter: `opponent_id=eq.${userId}`,
      },
      (payload) => handlers?.onDelete?.(toRealtimeMatchRow(payload), payload),
    );

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      handlers?.onSubscribed?.();
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      handlers?.onError?.(new Error(`Realtime channel status: ${status}`), status);
    }
  });

  return {
    channel,
    unsubscribe: async () => {
      await client.removeChannel(channel);
    },
  };
}

export function subscribeToMatchPresence(matchId, handlers = {}) {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();
  const normalizedMatchId = assertMatchId(matchId);

  const channel = client.channel(`matches-presence-${normalizedMatchId}`, {
    config: {
      presence: { key: userId },
    },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      handlers?.onSync?.(channel.presenceState());
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      handlers?.onJoin?.({ key, presences: newPresences }, channel.presenceState());
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      handlers?.onLeave?.({ key, presences: leftPresences }, channel.presenceState());
    });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
      handlers?.onSubscribed?.(channel.presenceState());
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      handlers?.onError?.(new Error(`Presence channel status: ${status}`), status);
    }
  });

  return {
    channel,
    unsubscribe: async () => {
      await client.removeChannel(channel);
    },
  };
}
