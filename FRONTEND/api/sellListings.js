function toFiniteNumber(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${fieldName} is required`);
  }

  return parsedValue;
}

function parsePositiveInteger(value, fieldName) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsedValue;
}

function parseListingId(listingId) {
  return parsePositiveInteger(listingId, "listingId");
}

function normalizeProfile(rawProfile) {
  if (!rawProfile) return null;
  return {
    id: rawProfile.id ?? null,
    username: rawProfile.username ?? null,
    user_tag: rawProfile.user_tag ?? null,
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
    .select("id,username,user_tag")
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
    price: hasValidPrice ? parsedPrice : null,
    quantity: hasValidQuantity ? parsedQuantity : 0,
    totalPrice: hasValidPrice && hasValidQuantity ? parsedPrice * parsedQuantity : null,
  };
}

function mapSellListingsWithCards(listings, allCards, profileById) {
  const cardById = new Map(allCards.map((card) => [card.id, card]));
  return listings.map((listing) => mapSellListingWithCard(listing, cardById, profileById));
}

function mapOfferListing(offerListing, profileById) {
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

function mapOfferListings(offerListings, profileById) {
  return offerListings.map((offerListing) => mapOfferListing(offerListing, profileById));
}

export async function createSellListing(payload) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const sellerUuid = userAuth?.userLogged?.id;
  if (!sellerUuid) {
    throw new Error("User not authenticated");
  }

  if (!payload?.cardId) {
    throw new Error("cardId is required");
  }

  const quantity = parsePositiveInteger(payload.quantity, "quantity");
  const latitude = toFiniteNumber(payload.latitude, "latitude");
  const longitude = toFiniteNumber(payload.longitude, "longitude");
  const price = toFiniteNumber(payload.price, "price");

  if (price <= 0) {
    throw new Error("price must be greater than 0");
  }

  const sellListing = {
    card_id: payload.cardId,
    seller_uuid: sellerUuid,
    latitude,
    longitude,
    quantity,
    price,
  };

  if (typeof payload?.condition !== "string" || !payload.condition.trim()) {
    throw new Error("condition is required");
  }

  sellListing.condition = payload.condition.trim();

  if (payload.status) {
    sellListing.status = payload.status;
  }

  const { data, error } = await client
    .from("sell_listings")
    .insert(sellListing)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchActiveSellListings() {
  const client = useSupabaseClient();
  const { allCards } = await useOnePieceCards();

  const { data: activeListings = [], error } = await client
    .from("sell_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const sellerProfileById = await fetchProfilesByIds(
    client,
    activeListings.map((listing) => listing?.seller_uuid),
  );

  return mapSellListingsWithCards(activeListings, allCards, sellerProfileById);
}

export async function fetchLoggedUserSellListings() {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const { allCards } = await useOnePieceCards();

  const sellerUuid = userAuth?.userLogged?.id;
  if (!sellerUuid) {
    throw new Error("User not authenticated");
  }

  const { data: userListings = [], error } = await client
    .from("sell_listings")
    .select("*")
    .eq("seller_uuid", sellerUuid)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const sellerProfileById = await fetchProfilesByIds(
    client,
    userListings.map((listing) => listing?.seller_uuid),
  );

  return mapSellListingsWithCards(userListings, allCards, sellerProfileById);
}

export async function fetchActiveSellListingById(listingId) {
  const client = useSupabaseClient();
  const { allCards } = await useOnePieceCards();
  const parsedListingId = parseListingId(listingId);

  const { data, error } = await client
    .from("sell_listings")
    .select("*")
    .eq("id", parsedListingId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const sellerProfileById = await fetchProfilesByIds(client, [data?.seller_uuid]);
  return mapSellListingsWithCards([data], allCards, sellerProfileById)[0] ?? null;
}

export async function fetchLoggedUserSellListingById(listingId) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const { allCards } = await useOnePieceCards();
  const parsedListingId = parseListingId(listingId);

  const sellerUuid = userAuth?.userLogged?.id;
  if (!sellerUuid) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await client
    .from("sell_listings")
    .select("*")
    .eq("id", parsedListingId)
    .eq("seller_uuid", sellerUuid)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const sellerProfileById = await fetchProfilesByIds(client, [data?.seller_uuid]);
  return mapSellListingsWithCards([data], allCards, sellerProfileById)[0] ?? null;
}

export async function fetchOfferListingsBySellListingId(sellListingId) {
  const client = useSupabaseClient();
  const parsedSellListingId = parseListingId(sellListingId);

  const { data: offerListings = [], error } = await client
    .from("offer_listing")
    .select("*")
    .eq("sell_list_id", parsedSellListingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const offererProfileById = await fetchProfilesByIds(
    client,
    offerListings.map((offerListing) => offerListing?.offerer_id),
  );

  return mapOfferListings(offerListings, offererProfileById);
}

export async function createOfferListing(payload) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const offererId = userAuth?.userLogged?.id;
  if (!offererId) {
    throw new Error("User not authenticated");
  }

  const sellListId = parseListingId(payload?.sellListId);
  const quantity = parsePositiveInteger(payload?.quantity, "quantity");
  const offer = toFiniteNumber(payload?.offer, "offer");

  if (offer <= 0) {
    throw new Error("offer must be greater than 0");
  }

  const offerListingToInsert = {
    sell_list_id: sellListId,
    quantity,
    offer,
    offerer_id: offererId,
  };

  if (payload?.status) {
    offerListingToInsert.status = payload.status;
  }

  const { data, error } = await client
    .from("offer_listing")
    .insert(offerListingToInsert)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const offererProfileById = await fetchProfilesByIds(client, [data?.offerer_id]);
  return mapOfferListings([data], offererProfileById)[0] ?? null;
}
