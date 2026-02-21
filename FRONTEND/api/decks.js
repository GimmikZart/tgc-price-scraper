export async function fetchUserDecks() {
  const userAuth = useUserAuth();
  const client = useSupabaseClient();
  const { allCards } = await useOnePieceCards();

  const { data: userDecks = [], error } = await client
    .from("decks")
    .select("name, slug, leader, visibility, cards")
    .eq("user_uuid", userAuth.userLogged.id);

  if (error) {
    throw new Error(error.message);
  }

  return userDecks;
}

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function isUuid(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(normalizedValue);
}

function parseProfileTagFilters(profileTagOrSlug) {
  const normalizedTagOrSlug = normalizeString(profileTagOrSlug);
  if (!normalizedTagOrSlug) return null;

  let decodedTagOrSlug = normalizedTagOrSlug;
  try {
    decodedTagOrSlug = decodeURIComponent(normalizedTagOrSlug);
  } catch {
    decodedTagOrSlug = normalizedTagOrSlug;
  }

  const normalizedTag = decodedTagOrSlug.trim().replace(/^@+/, "").toLowerCase();
  if (!normalizedTag) return null;

  return {
    withPrefix: `@${normalizedTag}`,
    withoutPrefix: normalizedTag,
  };
}

function extractProfileUserUuids(profile = {}) {
  const profileUserUuidCandidates = [
    profile?.user_uuid,
    profile?.id,
    profile?.auth_user_id,
    profile?.uuid,
  ];

  return [...new Set(
    profileUserUuidCandidates
      .map((candidate) => normalizeString(candidate))
      .filter((candidate) => isUuid(candidate)),
  )];
}

async function fetchProfileUserUuidsByTag(client, profileTagOrSlug) {
  const profileTagFilters = parseProfileTagFilters(profileTagOrSlug);
  if (!profileTagFilters) {
    throw new Error("tag profilo non valido");
  }

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .or(
      `user_tag.ilike.${profileTagFilters.withPrefix},user_tag.ilike.${profileTagFilters.withoutPrefix}`
    )
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!profiles.length) return [];
  return extractProfileUserUuids(profiles[0]);
}

export async function fetchPublicDecksByUser(userUuid) {
  const normalizedUserUuid = typeof userUuid === "string" ? userUuid.trim() : "";
  if (!normalizedUserUuid) {
    throw new Error("userUuid non valido");
  }

  const client = useSupabaseClient();

  const { data: publicDecks = [], error } = await client
    .from("decks")
    .select("name, slug, leader, visibility, cards")
    .eq("user_uuid", normalizedUserUuid)
    .eq("visibility", "public")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return publicDecks;
}

export async function fetchPublicDecksByUserTag(profileTagOrSlug) {
  const client = useSupabaseClient();
  const profileUserUuids = await fetchProfileUserUuidsByTag(client, profileTagOrSlug);

  if (!profileUserUuids.length) return [];

  const { data: publicDecks = [], error } = await client
    .from("decks")
    .select("name, slug, leader, visibility, cards")
    .in("user_uuid", profileUserUuids)
    .eq("visibility", "public")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return publicDecks;
}

export async function fetchUserDeckCards(userUuid, slug) {
  const client = useSupabaseClient();

  const { data: userDeck = [], error } = await client
    .from("decks")
    .select("*")
    .eq("user_uuid", userUuid)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return userDeck;
}

export async function saveDeckOnCloud(localDeck) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const { data: existingDeck, error: fetchError } = await client
    .from("decks")
    .select("*")
    .eq("user_uuid", userAuth.userLogged.id)
    .eq("slug", localDeck.slug)
    .single();

  if (existingDeck) {
    const { data: updatedDeck, error: updateError } = await client
      .from("decks")
      .update({
        name: localDeck.name,
        leader: localDeck.leader,
        visibility: localDeck.visibility,
        cards: localDeck.cards,
      })
      .eq("user_uuid", userAuth.userLogged.id)
      .eq("slug", localDeck.slug)
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }
    return updatedDeck;
  } else {
    const { data: deckCreationResponse, error: deckCreationError } = await client
    .from("decks")
    .insert({
      user_uuid: userAuth.userLogged.id,
      slug: localDeck.slug,
      name: localDeck.name,
      leader: localDeck.leader,
      visibility: localDeck.visibility,
      cards: localDeck.cards,
    })
    .single();

    if (deckCreationError) {
      throw new Error(deckCreationError.message);
    }

    return deckCreationResponse;
  }
}

export async function updateDeckVisibility(slug, visibility) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const { data: updatedDeck, error } = await client
    .from("decks")
    .update({ visibility })
    .eq("user_uuid", userAuth.userLogged.id)
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updatedDeck;
}

export async function deleteDeckFromCloud(userUuid, slug) {
  const client = useSupabaseClient();

  const { data: deletedDeck, error } = await client
    .from("decks")
    .delete()
    .eq("user_uuid", userUuid)
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return deletedDeck;
}
