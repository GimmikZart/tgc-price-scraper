function toFiniteNumber(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${fieldName} is required`);
  }

  return parsedValue;
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

  const quantity = Number(payload.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive integer");
  }

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

  const cardById = new Map(allCards.map((card) => [card.id, card]));

  return userListings.map((listing) => {
    const parsedPrice = Number(listing.price);
    const parsedQuantity = Number(listing.quantity);
    const hasValidPrice = Number.isFinite(parsedPrice);
    const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 0;
    const normalizedCondition =
      typeof listing?.condition === "string" && listing.condition.trim()
        ? listing.condition.trim()
        : null;

    return {
      ...listing,
      condition: normalizedCondition,
      card: cardById.get(listing.card_id) ?? null,
      price: hasValidPrice ? parsedPrice : null,
      quantity: hasValidQuantity ? parsedQuantity : 0,
      totalPrice: hasValidPrice && hasValidQuantity ? parsedPrice * parsedQuantity : null,
    };
  });
}
