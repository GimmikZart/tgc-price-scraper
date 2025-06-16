import { Snackbar } from "#components";
import { generateSlug } from "@/utilities/generateSlug";
export async function createAlbum(albumName, slots) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const slug = generateSlug(albumName);
  const data = {
    user_uuid: userAuth?.userLogged?.id || null,
    name: albumName,
    slots: slots,
    slug: slug,
  };
  console.log("Creating album with data:", data);

  const { error } = await client.from("albums").insert(data);

  if (error) {
    throw new Error(error.message);
  } else {
    return data.slug;
  }
}

export async function getAlbums() {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const { data: albums, error } = await client
    .from("albums")
    .select("*")
    .eq("user_uuid", userAuth?.userLogged?.id);
  console.log({ albums });

  if (error) {
    throw new Error(error.message);
  }
  return albums;
}
export async function getAlbum(slug) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const { data, error } = await client
    .from("albums")
    .select(
      `
      *,
      card_album (
        id,
        index,
        card_id,
        collection (
          id,
          card_id
        )
      )
    `
    )
    .eq("user_uuid", userAuth?.userLogged?.id)
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  console.log({ data });

  return data;
}

export async function insertCardToAlbum(album, cardId, index) {
  console.log("insertCardToAlbum", { album, cardId, index });

  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const { data: cardInCollection, error: collectionError } = await client
    .from("collection")
    .select("id, card_id")
    .eq("user_uuid", userAuth?.userLogged?.id)
    .eq("card_id", cardId)
    .single();

  if (collectionError) {
    Snackbar.error("Carta non presente in collezione: " + collectionError);
    return;
  }

  const { error } = await client.from("card_album").insert({
    album_id: album.id,
    card_id: cardInCollection.id,
    index: index,
  });

  if (error) {
    Snackbar.error("Errore inserimento in album: " + collectionError.message);
    return;
  }

  return true;
}

export async function removeCardFromAlbum(album, index) {
  console.log("removeCardFromAlbum", album.id);
  console.log("removeCardFromAlbum", { index });

  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const { data, error } = await client
    .from("card_album")
    .delete()
    .eq("album_id", album.id)
    .eq("index", index);

  console.log({ data });

  if (error) {
    Snackbar.error("Errore rimozione da album: " + error.message);
    return;
  }

  return true;
}
