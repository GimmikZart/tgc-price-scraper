import { normalizeProfile, sortProfilesByName } from "@/api/profiles";

export const DeckShareStatus = Object.freeze({
  Pending: "pending",
  Accepted: "accepted",
  Rejected: "rejected",
});

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

function normalizeDeckShareStatus(value) {
  const normalizedStatus = normalizeString(value);
  if (!normalizedStatus) return DeckShareStatus.Pending;

  return Object.values(DeckShareStatus).includes(normalizedStatus)
    ? normalizedStatus
    : DeckShareStatus.Pending;
}

function normalizeDeckCards(cards) {
  if (!Array.isArray(cards)) return [];

  return cards
    .map((cardId) => normalizeString(cardId))
    .filter(Boolean);
}

function createSyntheticShareSlug(shareId) {
  const normalizedShareId = normalizeUuid(shareId);
  if (!normalizedShareId) return "shared-deck";
  return `shared-${normalizedShareId.slice(0, 8)}`;
}

function normalizeDeckShareRow(row, profileById = new Map()) {
  if (!row) return null;

  const senderUserUuid = normalizeUuid(row.sender_user_uuid);
  const receiverUserUuid = normalizeUuid(row.receiver_user_uuid);
  const cards = normalizeDeckCards(row.cards);
  const shareId = normalizeUuid(row.id);

  return {
    id: shareId,
    sender_user_uuid: senderUserUuid,
    receiver_user_uuid: receiverUserUuid,
    status: normalizeDeckShareStatus(row.status),
    name: normalizeString(row.name) ?? "Deck condiviso",
    slug: createSyntheticShareSlug(shareId),
    leader: normalizeString(row.leader),
    cards,
    visibility: "private",
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    accepted_at: row.accepted_at ?? null,
    rejected_at: row.rejected_at ?? null,
    accepted_deck_id: row.accepted_deck_id !== null && row.accepted_deck_id !== undefined
      && Number.isInteger(Number(row.accepted_deck_id))
      ? Number(row.accepted_deck_id)
      : null,
    sender_profile: profileById.get(senderUserUuid) ?? null,
    receiver_profile: profileById.get(receiverUserUuid) ?? null,
  };
}

async function fetchProfilesByIds(client, profileIds = []) {
  const normalizedProfileIds = [...new Set(
    (Array.isArray(profileIds) ? profileIds : [])
      .map((profileId) => normalizeUuid(profileId))
      .filter(Boolean),
  )];

  if (!normalizedProfileIds.length) return new Map();

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .in("id", normalizedProfileIds);

  if (error) {
    throw new Error(error.message);
  }

  const normalizedProfiles = sortProfilesByName(
    profiles
      .map((profile) => normalizeProfile(profile))
      .filter(Boolean),
  );

  return new Map(normalizedProfiles.map((profile) => [profile.id, profile]));
}

async function hydrateDeckShares(client, rows = []) {
  const profileIds = rows.flatMap((row) => [
    normalizeUuid(row?.sender_user_uuid),
    normalizeUuid(row?.receiver_user_uuid),
  ]);
  const profileById = await fetchProfilesByIds(client, profileIds);

  return rows
    .map((row) => normalizeDeckShareRow(row, profileById))
    .filter(Boolean);
}

function assertAuthenticatedUserId() {
  const userId = normalizeUuid(useUserAuth()?.userLogged?.id ?? null);
  if (!userId) {
    throw new Error("Utente non autenticato");
  }
  return userId;
}

function assertDeckShareId(shareId) {
  const normalizedShareId = normalizeUuid(shareId);
  if (!normalizedShareId) {
    throw new Error("Deck condiviso non valido");
  }
  return normalizedShareId;
}

export async function createDeckShare(payload = {}) {
  const client = useSupabaseClient();
  const receiverUserUuid = normalizeUuid(
    payload?.receiverUserUuid ?? payload?.receiver_user_uuid ?? payload?.receiverId,
  );
  const deck = payload?.deck;

  if (!receiverUserUuid) {
    throw new Error("Destinatario non valido");
  }

  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    throw new Error("Deck non valido");
  }

  const normalizedCards = normalizeDeckCards(deck.cards);
  const normalizedLeader = normalizeString(deck.leader);
  const normalizedName = normalizeString(deck.name);

  if (!normalizedName) {
    throw new Error("Nome deck non valido");
  }

  if (!normalizedLeader) {
    throw new Error("Leader deck non valido");
  }

  if (!normalizedCards.length) {
    throw new Error("Carte deck non valide");
  }

  const { data, error } = await client.rpc("create_deck_share", {
    p_receiver_user_uuid: receiverUserUuid,
    p_name: normalizedName,
    p_leader: normalizedLeader,
    p_cards: normalizedCards,
  });

  if (error) {
    throw new Error(error.message);
  }

  const hydratedShares = await hydrateDeckShares(client, data ? [data] : []);
  return hydratedShares[0] ?? null;
}

export async function fetchPendingReceivedDeckShares() {
  const client = useSupabaseClient();
  const userId = assertAuthenticatedUserId();

  const { data: deckShares = [], error } = await client
    .from("deck_shares")
    .select("*")
    .eq("receiver_user_uuid", userId)
    .eq("status", DeckShareStatus.Pending)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateDeckShares(client, deckShares);
}

export async function fetchDeckShareById(shareId) {
  const client = useSupabaseClient();
  const normalizedShareId = assertDeckShareId(shareId);

  const { data: deckShare, error } = await client
    .from("deck_shares")
    .select("*")
    .eq("id", normalizedShareId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!deckShare) return null;

  const hydratedShares = await hydrateDeckShares(client, [deckShare]);
  return hydratedShares[0] ?? null;
}

export async function acceptDeckShare(payload = {}) {
  const client = useSupabaseClient();
  const normalizedShareId = assertDeckShareId(payload?.shareId ?? payload?.share_id);
  const normalizedDeckName = normalizeString(payload?.deckName ?? payload?.deck_name);

  if (!normalizedDeckName) {
    throw new Error("Nome deck non valido");
  }

  const { data, error } = await client.rpc("accept_deck_share", {
    p_share_id: normalizedShareId,
    p_deck_name: normalizedDeckName,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function rejectDeckShare(payload = {}) {
  const client = useSupabaseClient();
  const normalizedShareId = assertDeckShareId(payload?.shareId ?? payload?.share_id);

  const { data, error } = await client.rpc("reject_deck_share", {
    p_share_id: normalizedShareId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const hydratedShares = await hydrateDeckShares(client, data ? [data] : []);
  return hydratedShares[0] ?? null;
}
