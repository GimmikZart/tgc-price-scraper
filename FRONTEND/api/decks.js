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
