export async function fetchUserCollection(userUuid) {
  const client = useSupabaseClient();
  const { allCards } = await useOnePieceCards();

  const { data: userCollection = [], error } = await client
    .from("collection")
    .select("*")
    .eq("user_uuid", userUuid);

  if (error) {
    throw new Error(error.message);
  }

  const idsSet = new Set(userCollection.map((item) => item?.card_id));

  return allCards.filter((card) => idsSet.has(card.id));
}

export async function fetchCardCountInCollection(userUuid, cardId) {
  const client = useSupabaseClient();
  const { data: collectionInfo, error } = await client
    .from("collection")
    .select("*")
    .eq("user_uuid", userUuid)
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return collectionInfo?.card_number || 0;
}

export async function addCardToUserCollection(userUuid, cardId) {
  const client = useSupabaseClient();
  const normalizedCardId = typeof cardId === "string" ? cardId.trim() : "";

  if (!normalizedCardId) {
    throw new Error("cardId is required");
  }

  // Ensure FK collection_card_id_fkey can be satisfied before insert.
  const { error: upsertCardError } = await client
    .from("cards")
    .upsert({ card_id: normalizedCardId }, { onConflict: "card_id" });

  if (upsertCardError) {
    throw new Error(upsertCardError.message);
  }

  // 1) Check if an entry already exists.
  const { data: existing, error: fetchError } = await client
    .from("collection")
    .select("id, card_number")
    .eq("user_uuid", userUuid)
    .eq("card_id", normalizedCardId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // 2) If missing, create a new row with card_number = 1.
  if (!existing) {
    const { data, error } = await client
      .from("collection")
      .insert({
        user_uuid: userUuid,
        card_id: normalizedCardId,
        card_number: 1,
      })
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  // 3) If present, increment the counter.
  const { data, error } = await client
    .from("collection")
    .update({ card_number: existing.card_number + 1 })
    .eq("id", existing.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function removeCardToUserCollection(userUuid, cardId) {
  const client = useSupabaseClient();

  // 1) Check if an entry already exists.
  const { data: existing, error: fetchError } = await client
    .from("collection")
    .select("id, card_number")
    .eq("user_uuid", userUuid)
    .eq("card_id", cardId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // If missing, there is nothing to remove.
  if (!existing) {
    return null;
  }

  // 2) If there is more than one copy, decrement.
  if (existing.card_number > 1) {
    const { data, error } = await client
      .from("collection")
      .update({ card_number: existing.card_number - 1 })
      .eq("id", existing.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  // 3) If it was the last copy, delete the row.
  const { data, error } = await client
    .from("collection")
    .delete()
    .eq("id", existing.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return null;
}
