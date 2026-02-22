import { OfferStatus } from "@/utilities/enums/offerStatus";

function parsePositiveInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsedValue;
}

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function normalizeUserTag(userTag, fallbackValue = null) {
  const normalizedTag = normalizeString(userTag);
  if (normalizedTag) {
    return normalizedTag.startsWith("@") ? normalizedTag : `@${normalizedTag}`;
  }

  const normalizedFallbackValue = normalizeString(fallbackValue);
  if (normalizedFallbackValue) {
    const fallbackTag = normalizedFallbackValue.toLowerCase();
    return fallbackTag.startsWith("@") ? fallbackTag : `@${fallbackTag}`;
  }

  return null;
}

function extractEmailUsername(email) {
  const normalizedEmail = normalizeString(email);
  if (!normalizedEmail) return null;

  const [localPart] = normalizedEmail.split("@");
  const normalizedLocalPart = normalizeString(localPart);
  return normalizedLocalPart;
}

function normalizeProfile(rawProfile) {
  if (!rawProfile) return null;

  const username = normalizeString(rawProfile.username);
  const fallbackUsername = extractEmailUsername(rawProfile.email);
  const displayName = normalizeString(rawProfile.display_name) ??
    normalizeString(rawProfile.full_name) ??
    normalizeString(rawProfile.name) ??
    username ??
    fallbackUsername;
  const avatarUrl = normalizeString(rawProfile.avatar_url) ??
    normalizeString(rawProfile.profile_image_url) ??
    normalizeString(rawProfile.photo_url) ??
    normalizeString(rawProfile.picture) ??
    normalizeString(rawProfile.image_url);

  return {
    id: rawProfile.id ?? null,
    username: displayName ?? null,
    user_tag: normalizeUserTag(rawProfile.user_tag, username ?? fallbackUsername),
    display_name: displayName ?? null,
    avatar_url: avatarUrl ?? null,
  };
}

async function fetchProfilesByIds(client, userIds) {
  const normalizedUserIds = [...new Set(
    userIds
      .filter((userId) => typeof userId === "string")
      .map((userId) => userId.trim())
      .filter(Boolean),
  )];

  if (!normalizedUserIds.length) return new Map();

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .in("id", normalizedUserIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(profiles.map((profile) => [profile.id, normalizeProfile(profile)]));
}

function mapSellListingWithCard(listing, cardById, profileById) {
  const parsedPrice = Number(listing?.price);
  const parsedQuantity = Number(listing?.quantity);
  const hasValidPrice = Number.isFinite(parsedPrice);
  const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 0;
  const sellerProfile = profileById.get(listing?.seller_uuid) ?? null;

  return {
    ...listing,
    card: cardById.get(listing?.card_id) ?? null,
    sellerProfile,
    sellerUsername: sellerProfile?.username ?? null,
    sellerUserTag: sellerProfile?.user_tag ?? null,
    sellerDisplayName: sellerProfile?.display_name ?? sellerProfile?.username ?? null,
    sellerAvatarUrl: sellerProfile?.avatar_url ?? null,
    price: hasValidPrice ? parsedPrice : null,
    quantity: hasValidQuantity ? parsedQuantity : 0,
    totalPrice: hasValidPrice && hasValidQuantity ? parsedPrice * parsedQuantity : null,
  };
}

function mapOfferListingWithProfile(offerListing, profileById) {
  const parsedOffer = Number(offerListing?.offer);
  const parsedQuantity = Number(offerListing?.quantity);
  const hasValidOffer = Number.isFinite(parsedOffer);
  const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 0;
  const offererProfile = profileById.get(offerListing?.offerer_id) ?? null;

  return {
    ...offerListing,
    offererProfile,
    offererUsername: offererProfile?.username ?? null,
    offererUserTag: offererProfile?.user_tag ?? null,
    offer: hasValidOffer ? parsedOffer : null,
    quantity: hasValidQuantity ? parsedQuantity : 0,
  };
}

function normalizeMessageBody(body) {
  if (typeof body !== "string") return null;
  const normalizedBody = body.trim();
  if (!normalizedBody) return null;
  if (normalizedBody.length > 150) {
    throw new Error("body must be at most 150 characters");
  }

  return normalizedBody;
}

function parseOfferListingId(offerListingId) {
  return parsePositiveInteger(offerListingId, "offerListingId");
}

function parseOfferStatus(status) {
  const normalizedStatus = normalizeString(status);
  if (!normalizedStatus) {
    throw new Error("status is required");
  }

  const validStatuses = Object.values(OfferStatus);
  if (!validStatuses.includes(normalizedStatus)) {
    throw new Error(`status must be one of: ${validStatuses.join(", ")}`);
  }

  return normalizedStatus;
}

function parseOfferQuantity(value) {
  return parsePositiveInteger(value, "quantity");
}

function parseOfferValue(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error("offer must be greater than 0");
  }

  return parsedValue;
}

function createChannelName(offerListingId) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `offer-listing-chat-${offerListingId}-${randomSuffix}`;
}

function toChatMessage(message) {
  return {
    ...message,
    body: typeof message?.body === "string" ? message.body : "",
  };
}

export async function fetchOfferListingChatContext(offerListingId) {
  const client = useSupabaseClient();
  const parsedOfferListingId = parseOfferListingId(offerListingId);

  const { data: offerListing, error: offerListingError } = await client
    .from("offer_listing")
    .select("*")
    .eq("id", parsedOfferListingId)
    .maybeSingle();

  if (offerListingError) {
    throw new Error(offerListingError.message);
  }

  if (!offerListing) return null;

  const parsedSellListingId = parsePositiveInteger(offerListing.sell_list_id, "sell_list_id");
  const { data: sellListing, error: sellListingError } = await client
    .from("sell_listings")
    .select("*")
    .eq("id", parsedSellListingId)
    .maybeSingle();

  if (sellListingError) {
    throw new Error(sellListingError.message);
  }

  if (!sellListing) return null;

  const profileById = await fetchProfilesByIds(client, [offerListing?.offerer_id, sellListing?.seller_uuid]);
  const { allCards } = await useOnePieceCards();
  const cardById = new Map(allCards.map((card) => [card.id, card]));

  return {
    offerListing: mapOfferListingWithProfile(offerListing, profileById),
    sellListing: mapSellListingWithCard(sellListing, cardById, profileById),
  };
}

export async function fetchOfferListingChatMessages(offerListingId) {
  const client = useSupabaseClient();
  const parsedOfferListingId = parseOfferListingId(offerListingId);

  const { data: messages = [], error } = await client
    .from("offer_listing_chat_messages")
    .select("*")
    .eq("offer_listing_id", parsedOfferListingId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return messages.map(toChatMessage);
}

export async function sendOfferListingChatMessage(payload) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const senderId = userAuth?.userLogged?.id ?? null;

  if (!senderId) {
    throw new Error("User not authenticated");
  }

  const parsedOfferListingId = parseOfferListingId(payload?.offerListingId);
  const body = normalizeMessageBody(payload?.body);

  if (!body) {
    throw new Error("body is required");
  }

  const { data, error } = await client
    .from("offer_listing_chat_messages")
    .insert({
      offer_listing_id: parsedOfferListingId,
      sender_id: senderId,
      body,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toChatMessage(data);
}

export async function markOfferListingChatMessagesAsSeen(offerListingId) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const viewerId = userAuth?.userLogged?.id ?? null;

  if (!viewerId) {
    throw new Error("User not authenticated");
  }

  const parsedOfferListingId = parseOfferListingId(offerListingId);

  const { error } = await client
    .from("offer_listing_chat_messages")
    .update({ seen_at: new Date().toISOString() })
    .eq("offer_listing_id", parsedOfferListingId)
    .neq("sender_id", viewerId)
    .is("seen_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchOfferListingHasUnreadMessages(offerListingId) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const viewerId = userAuth?.userLogged?.id ?? null;

  if (!viewerId) {
    throw new Error("User not authenticated");
  }

  const parsedOfferListingId = parseOfferListingId(offerListingId);

  const { data: unreadMessages = [], error } = await client
    .from("offer_listing_chat_messages")
    .select("id")
    .eq("offer_listing_id", parsedOfferListingId)
    .neq("sender_id", viewerId)
    .is("seen_at", null)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return unreadMessages.length > 0;
}

export async function updateOwnOfferListingProposal(payload) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const viewerId = userAuth?.userLogged?.id ?? null;

  if (!viewerId) {
    throw new Error("User not authenticated");
  }

  const parsedOfferListingId = parseOfferListingId(payload?.offerListingId);
  const quantity = parseOfferQuantity(payload?.quantity);
  const offer = parseOfferValue(payload?.offer);

  const { data: offerListing, error: offerListingError } = await client
    .from("offer_listing")
    .select("*")
    .eq("id", parsedOfferListingId)
    .maybeSingle();

  if (offerListingError) {
    throw new Error(offerListingError.message);
  }

  if (!offerListing) {
    throw new Error("Offer listing not found");
  }

  if (String(offerListing.offerer_id ?? "") !== String(viewerId)) {
    throw new Error("Non sei autorizzato a modificare questa proposta");
  }

  const parsedSellListingId = parsePositiveInteger(offerListing.sell_list_id, "sell_list_id");
  const { data: sellListing, error: sellListingError } = await client
    .from("sell_listings")
    .select("id, quantity")
    .eq("id", parsedSellListingId)
    .maybeSingle();

  if (sellListingError) {
    throw new Error(sellListingError.message);
  }

  if (!sellListing) {
    throw new Error("Sell listing not found");
  }

  const availableQuantity = Number(sellListing.quantity);
  if (!Number.isInteger(availableQuantity) || availableQuantity < 1) {
    throw new Error("La vendita non e disponibile");
  }

  if (quantity > availableQuantity) {
    throw new Error(`Quantita massima disponibile: ${availableQuantity}`);
  }

  if (Number(offerListing.quantity) === quantity && Number(offerListing.offer) === offer) {
    const profileById = await fetchProfilesByIds(client, [offerListing?.offerer_id]);
    return mapOfferListingWithProfile(offerListing, profileById);
  }

  const { data: updatedOfferListing, error: updateError } = await client
    .from("offer_listing")
    .update({
      quantity,
      offer,
    })
    .eq("id", parsedOfferListingId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const profileById = await fetchProfilesByIds(client, [updatedOfferListing?.offerer_id]);
  return mapOfferListingWithProfile(updatedOfferListing, profileById);
}

export async function updateOfferListingStatus(payload) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const viewerId = userAuth?.userLogged?.id ?? null;

  if (!viewerId) {
    throw new Error("User not authenticated");
  }

  const parsedOfferListingId = parseOfferListingId(payload?.offerListingId);
  const status = parseOfferStatus(payload?.status);

  const { data: offerListing, error: offerListingError } = await client
    .from("offer_listing")
    .select("*")
    .eq("id", parsedOfferListingId)
    .maybeSingle();

  if (offerListingError) {
    throw new Error(offerListingError.message);
  }

  if (!offerListing) {
    throw new Error("Offer listing not found");
  }

  const parsedSellListingId = parsePositiveInteger(offerListing.sell_list_id, "sell_list_id");
  const { data: sellListing, error: sellListingError } = await client
    .from("sell_listings")
    .select("id, seller_uuid")
    .eq("id", parsedSellListingId)
    .maybeSingle();

  if (sellListingError) {
    throw new Error(sellListingError.message);
  }

  if (!sellListing) {
    throw new Error("Sell listing not found");
  }

  if (String(sellListing.seller_uuid ?? "") !== String(viewerId)) {
    throw new Error("Non sei autorizzato a rispondere a questa proposta");
  }

  if (offerListing.status === status) {
    const profileById = await fetchProfilesByIds(client, [offerListing?.offerer_id]);
    return mapOfferListingWithProfile(offerListing, profileById);
  }

  const { data: updatedOfferListing, error: updateError } = await client
    .from("offer_listing")
    .update({ status })
    .eq("id", parsedOfferListingId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const profileById = await fetchProfilesByIds(client, [updatedOfferListing?.offerer_id]);
  return mapOfferListingWithProfile(updatedOfferListing, profileById);
}

export async function acceptOfferListingProposal(offerListingId) {
  return updateOfferListingStatus({
    offerListingId,
    status: OfferStatus.Accepted,
  });
}

export async function rejectOfferListingProposal(offerListingId) {
  return updateOfferListingStatus({
    offerListingId,
    status: OfferStatus.Rejected,
  });
}

export function subscribeToOfferListingChatMessages(offerListingId, handlers = {}) {
  const client = useSupabaseClient();
  const parsedOfferListingId = parseOfferListingId(offerListingId);
  const channel = client
    .channel(createChannelName(parsedOfferListingId))
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "offer_listing_chat_messages",
        filter: `offer_listing_id=eq.${parsedOfferListingId}`,
      },
      (payload) => handlers?.onInsert?.(toChatMessage(payload.new), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "offer_listing_chat_messages",
        filter: `offer_listing_id=eq.${parsedOfferListingId}`,
      },
      (payload) => handlers?.onUpdate?.(toChatMessage(payload.new), payload),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "offer_listing_chat_messages",
        filter: `offer_listing_id=eq.${parsedOfferListingId}`,
      },
      (payload) => handlers?.onDelete?.(payload.old, payload),
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
