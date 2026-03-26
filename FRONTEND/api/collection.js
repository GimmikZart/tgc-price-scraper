function ensureUserUuid(userUuid) {
  if (!userUuid) {
    throw new Error("userUuid is required");
  }

  return userUuid;
}

function normalizeCardId(cardId) {
  const normalizedCardId = typeof cardId === "string" ? cardId.trim() : "";

  if (!normalizedCardId) {
    throw new Error("cardId is required");
  }

  return normalizedCardId;
}

const collectionMutationQueues = new Map();

function createCollectionError(error) {
  const wrappedError = new Error(
    error?.message || "Collection operation failed"
  );

  if (error?.code) {
    wrappedError.code = error.code;
  }

  return wrappedError;
}

function getCollectionMutationKey(userUuid, cardId) {
  return `${userUuid}::${cardId}`;
}

function enqueueCollectionMutation(userUuid, cardId, operation) {
  const mutationKey = getCollectionMutationKey(userUuid, cardId);
  const previousOperation =
    collectionMutationQueues.get(mutationKey) || Promise.resolve();

  const nextOperation = previousOperation.catch(() => {}).then(operation);
  const trackedOperation = nextOperation.finally(() => {
    if (collectionMutationQueues.get(mutationKey) === trackedOperation) {
      collectionMutationQueues.delete(mutationKey);
    }
  });

  collectionMutationQueues.set(mutationKey, trackedOperation);

  return trackedOperation;
}

async function fetchCollectionEntry(client, userUuid, cardId) {
  const { data, error } = await client
    .from("collection")
    .select("id, card_number")
    .eq("user_uuid", userUuid)
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) {
    throw createCollectionError(error);
  }

  return data;
}

export async function fetchUserCollection(userUuid) {
  const client = useSupabaseClient();
  const { allCards } = await useOnePieceCards();
  const normalizedUserUuid = ensureUserUuid(userUuid);

  const { data: userCollection = [], error } = await client
    .from("collection")
    .select("card_id")
    .eq("user_uuid", normalizedUserUuid);

  if (error) {
    throw new Error(error.message);
  }

  const idsSet = new Set(userCollection.map((item) => item?.card_id));

  return allCards.filter((card) => idsSet.has(card.id));
}

export async function fetchCardCountInCollection(userUuid, cardId) {
  const client = useSupabaseClient();
  const normalizedUserUuid = ensureUserUuid(userUuid);
  const normalizedCardId = normalizeCardId(cardId);
  const { data: collectionInfo, error } = await client
    .from("collection")
    .select("card_number")
    .eq("user_uuid", normalizedUserUuid)
    .eq("card_id", normalizedCardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return collectionInfo?.card_number || 0;
}

export async function addCardToUserCollection(userUuid, cardId) {
  const client = useSupabaseClient();
  const normalizedUserUuid = ensureUserUuid(userUuid);
  const normalizedCardId = normalizeCardId(cardId);

  return enqueueCollectionMutation(
    normalizedUserUuid,
    normalizedCardId,
    async () => {
      let existing = await fetchCollectionEntry(
        client,
        normalizedUserUuid,
        normalizedCardId
      );

      if (!existing) {
        const { data, error } = await client
          .from("collection")
          .insert({
            user_uuid: normalizedUserUuid,
            card_id: normalizedCardId,
            card_number: 1,
          })
          .select("id, user_uuid, card_id, card_number")
          .single();

        if (!error) {
          return data;
        }

        if (error.code !== "23505") {
          throw createCollectionError(error);
        }

        existing = await fetchCollectionEntry(
          client,
          normalizedUserUuid,
          normalizedCardId
        );

        if (!existing) {
          throw createCollectionError(error);
        }
      }

      const nextCardNumber = Math.max(0, Number(existing.card_number || 0)) + 1;
      const { data, error } = await client
        .from("collection")
        .update({ card_number: nextCardNumber })
        .eq("id", existing.id)
        .select("id, user_uuid, card_id, card_number")
        .single();

      if (error) {
        throw createCollectionError(error);
      }

      return data;
    }
  );
}

export async function removeCardToUserCollection(userUuid, cardId) {
  const client = useSupabaseClient();
  const normalizedUserUuid = ensureUserUuid(userUuid);
  const normalizedCardId = normalizeCardId(cardId);

  return enqueueCollectionMutation(
    normalizedUserUuid,
    normalizedCardId,
    async () => {
      const existing = await fetchCollectionEntry(
        client,
        normalizedUserUuid,
        normalizedCardId
      );

      if (!existing) {
        return null;
      }

      const currentCardNumber = Math.max(0, Number(existing.card_number || 0));

      if (currentCardNumber > 1) {
        const { data, error } = await client
          .from("collection")
          .update({ card_number: currentCardNumber - 1 })
          .eq("id", existing.id)
          .select("id, user_uuid, card_id, card_number")
          .single();

        if (error) {
          throw createCollectionError(error);
        }

        return data;
      }

      const { error } = await client.from("collection").delete().eq("id", existing.id);

      if (error) {
        throw createCollectionError(error);
      }

      return null;
    }
  );
}
