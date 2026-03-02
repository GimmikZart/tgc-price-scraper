import { OfferStatus } from "@/utilities/enums/offerStatus";

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

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function parseSellerUuid(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    throw new Error("sellerUuid is required");
  }

  return normalizedValue;
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

async function fetchOfferCountsBySellListingIds(client, listingIds) {
  const normalizedListingIds = [...new Set(
    listingIds
      .map((listingId) => Number(listingId))
      .filter((listingId) => Number.isInteger(listingId) && listingId > 0),
  )];

  if (!normalizedListingIds.length) return new Map();

  const { data: offerListings = [], error } = await client
    .from("offer_listing")
    .select("sell_list_id")
    .in("sell_list_id", normalizedListingIds);

  if (error) {
    throw new Error(error.message);
  }

  const offerCountByListingId = new Map();

  offerListings.forEach((offerListing) => {
    const parsedListingId = Number(offerListing?.sell_list_id);
    if (!Number.isInteger(parsedListingId) || parsedListingId <= 0) return;

    const currentCount = offerCountByListingId.get(parsedListingId) ?? 0;
    offerCountByListingId.set(parsedListingId, currentCount + 1);
  });

  return offerCountByListingId;
}

function mapSellListingWithCard(listing, cardById, profileById, offerCountByListingId) {
  const parsedPrice = Number(listing?.price);
  const parsedQuantity = Number(listing?.quantity);
  const parsedListingId = Number(listing?.id);
  const hasValidPrice = Number.isFinite(parsedPrice);
  const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 0;
  const sellerProfile = profileById.get(listing?.seller_uuid) ?? null;
  const offersCount = Number.isInteger(parsedListingId) && parsedListingId > 0
    ? (offerCountByListingId.get(parsedListingId) ?? 0)
    : 0;

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
    offersCount,
    totalPrice: hasValidPrice && hasValidQuantity ? parsedPrice * parsedQuantity : null,
  };
}

function mapSellListingsWithCards(listings, allCards, profileById, offerCountByListingId = new Map()) {
  const cardById = new Map(allCards.map((card) => [card.id, card]));
  return listings.map((listing) => mapSellListingWithCard(listing, cardById, profileById, offerCountByListingId));
}

async function fetchSellListingCardsByIds(client, sellListingIds) {
  const normalizedSellListingIds = [...new Set(
    sellListingIds
      .map((sellListingId) => Number(sellListingId))
      .filter((sellListingId) => Number.isInteger(sellListingId) && sellListingId > 0),
  )];

  if (!normalizedSellListingIds.length) return new Map();

  const { data: sellListings = [], error } = await client
    .from("sell_listings")
    .select("id, card_id")
    .in("id", normalizedSellListingIds);

  if (error) {
    throw new Error(error.message);
  }

  const { allCards } = await useOnePieceCards();
  const cardById = new Map(allCards.map((card) => [card.id, card]));
  const sellListingCardById = new Map();

  sellListings.forEach((sellListing) => {
    const parsedSellListingId = Number(sellListing?.id);
    if (!Number.isInteger(parsedSellListingId) || parsedSellListingId <= 0) return;
    sellListingCardById.set(parsedSellListingId, cardById.get(sellListing?.card_id) ?? null);
  });

  return sellListingCardById;
}

function mapOfferListing(offerListing, profileById, sellListingCardById = null) {
  const parsedOffer = Number(offerListing?.offer);
  const parsedQuantity = Number(offerListing?.quantity);
  const parsedSellListingId = Number(offerListing?.sell_list_id);
  const hasValidOffer = Number.isFinite(parsedOffer);
  const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 0;
  const offererProfile = profileById.get(offerListing?.offerer_id) ?? null;
  const sellListingCard = sellListingCardById instanceof Map &&
    Number.isInteger(parsedSellListingId) &&
    parsedSellListingId > 0
    ? (sellListingCardById.get(parsedSellListingId) ?? null)
    : null;

  return {
    ...offerListing,
    offererProfile,
    offererUsername: offererProfile?.username ?? null,
    offererUserTag: offererProfile?.user_tag ?? null,
    sellListingCard,
    offer: hasValidOffer ? parsedOffer : null,
    quantity: hasValidQuantity ? parsedQuantity : 0,
  };
}

function mapOfferListings(offerListings, profileById, sellListingCardById = null) {
  return offerListings.map((offerListing) => mapOfferListing(offerListing, profileById, sellListingCardById));
}

async function fetchActiveSellListingsForSeller(client, sellerUuid) {
  const { allCards } = await useOnePieceCards();
  const parsedSellerUuid = parseSellerUuid(sellerUuid);

  const { data: userListings = [], error } = await client
    .from("sell_listings")
    .select("*")
    .eq("seller_uuid", parsedSellerUuid)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const sellerProfileById = await fetchProfilesByIds(
    client,
    userListings.map((listing) => listing?.seller_uuid),
  );
  const offerCountByListingId = await fetchOfferCountsBySellListingIds(
    client,
    userListings.map((listing) => listing?.id),
  );

  return mapSellListingsWithCards(userListings, allCards, sellerProfileById, offerCountByListingId);
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

export async function fetchActiveSellListings(options = {}) {
  const client = useSupabaseClient();
  const { allCards } = await useOnePieceCards();
  const shouldExcludeLoggedUser = Boolean(options?.excludeLoggedUser);
  const loggedUserId = shouldExcludeLoggedUser ? (useUserAuth()?.userLogged?.id ?? null) : null;

  let activeListingsQuery = client
    .from("sell_listings")
    .select("*")
    .eq("status", "active");

  if (loggedUserId) {
    activeListingsQuery = activeListingsQuery.neq("seller_uuid", loggedUserId);
  }

  const { data: activeListings = [], error } = await activeListingsQuery
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const sellerProfileById = await fetchProfilesByIds(
    client,
    activeListings.map((listing) => listing?.seller_uuid),
  );
  const offerCountByListingId = await fetchOfferCountsBySellListingIds(
    client,
    activeListings.map((listing) => listing?.id),
  );

  return mapSellListingsWithCards(activeListings, allCards, sellerProfileById, offerCountByListingId);
}

export async function fetchLoggedUserSellListings() {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const sellerUuid = userAuth?.userLogged?.id;
  if (!sellerUuid) {
    throw new Error("User not authenticated");
  }

  return fetchActiveSellListingsForSeller(client, sellerUuid);
}

export async function fetchActiveSellListingsBySellerId(sellerUuid) {
  const client = useSupabaseClient();
  return fetchActiveSellListingsForSeller(client, sellerUuid);
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
  const offerCountByListingId = await fetchOfferCountsBySellListingIds(client, [data?.id]);
  return mapSellListingsWithCards([data], allCards, sellerProfileById, offerCountByListingId)[0] ?? null;
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
  const offerCountByListingId = await fetchOfferCountsBySellListingIds(client, [data?.id]);
  return mapSellListingsWithCards([data], allCards, sellerProfileById, offerCountByListingId)[0] ?? null;
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

export async function fetchLoggedUserPurchaseHistoryOfferListings() {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const offererId = userAuth?.userLogged?.id;
  if (!offererId) {
    throw new Error("User not authenticated");
  }

  const { data: offerListings = [], error } = await client
    .from("offer_listing")
    .select("*")
    .eq("offerer_id", offererId)
    .neq("status", OfferStatus.Pending)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const offererProfileById = await fetchProfilesByIds(
    client,
    offerListings.map((offerListing) => offerListing?.offerer_id),
  );
  const sellListingCardById = await fetchSellListingCardsByIds(
    client,
    offerListings.map((offerListing) => offerListing?.sell_list_id),
  );

  return mapOfferListings(offerListings, offererProfileById, sellListingCardById);
}

export async function fetchAcceptedOfferListingsForLoggedUser() {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const sellerUuid = userAuth?.userLogged?.id;
  if (!sellerUuid) {
    throw new Error("User not authenticated");
  }

  const { data: sellListings = [], error: sellListingsError } = await client
    .from("sell_listings")
    .select("id")
    .eq("seller_uuid", sellerUuid);

  if (sellListingsError) {
    throw new Error(sellListingsError.message);
  }

  const sellListingIds = [...new Set(
    sellListings
      .map((sellListing) => Number(sellListing?.id))
      .filter((sellListingId) => Number.isInteger(sellListingId) && sellListingId > 0),
  )];

  if (!sellListingIds.length) return [];

  const { data: offerListings = [], error } = await client
    .from("offer_listing")
    .select("*")
    .in("sell_list_id", sellListingIds)
    .eq("status", OfferStatus.Accepted)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const offererProfileById = await fetchProfilesByIds(
    client,
    offerListings.map((offerListing) => offerListing?.offerer_id),
  );
  const sellListingCardById = await fetchSellListingCardsByIds(
    client,
    offerListings.map((offerListing) => offerListing?.sell_list_id),
  );

  return mapOfferListings(offerListings, offererProfileById, sellListingCardById);
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

  const { data: existingOfferListings = [], error: existingOfferListingsError } = await client
    .from("offer_listing")
    .select("id")
    .eq("sell_list_id", sellListId)
    .eq("offerer_id", offererId)
    .limit(1);

  if (existingOfferListingsError) {
    throw new Error(existingOfferListingsError.message);
  }

  if (existingOfferListings.length > 0) {
    throw new Error("Hai gia inviato un'offerta per questa vendita");
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

export async function deleteSellListing(listingId) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const sellerUuid = userAuth?.userLogged?.id;
  if (!sellerUuid) {
    throw new Error("User not authenticated");
  }

  const parsedListingId = parseListingId(listingId);

  const { error } = await client
    .from("sell_listings")
    .delete()
    .eq("id", parsedListingId)
    .eq("seller_uuid", sellerUuid)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  return parsedListingId;
}
