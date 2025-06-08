import { useSupabaseClient } from "@supabase/auth-helpers-react";

export async function fetchUserCollection(userUuid) {
  const client = useSupabaseClient();
  const { data, error } = await client
    .from("collection")
    .select("*")
    .eq("user_uuid", userUuid);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchCardInCollection(userUuid, cardId) {}

export async function addCardToUserCollection(userUuid, cardId) {
  const client = useSupabaseClient();

  // 1) Cerco se esiste già
  const { data: existing, error: fetchError } = await client
    .from("collection")
    .select("id, card_number")
    .eq("user_uuid", userUuid)
    .eq("card_id", cardId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // 2) Se non esiste, inserisco nuova riga con card_number = 1
  if (!existing) {
    const { data, error } = await client
      .from("collection")
      .insert({
        user_uuid: userUuid,
        card_id: cardId,
        card_number: 1,
      })
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  // 3) Se esiste, incremento il counter
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

  // 1) Cerco se esiste già
  const { data: existing, error: fetchError } = await client
    .from("collection")
    .select("id, card_number")
    .eq("user_uuid", userUuid)
    .eq("card_id", cardId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  // Se non esiste, non c'è nulla da rimuovere
  if (!existing) {
    return null;
  }

  // 2) Se ne aveva più di uno, decremento
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

  // 3) Se era l’ultima copia, elimino la riga
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
