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
