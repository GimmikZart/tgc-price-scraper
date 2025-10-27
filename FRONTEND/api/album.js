import { useSnackbar } from "@/stores/useSnackbar";
import { generateSlug } from "@/utilities/generateSlug";
export async function createAlbum(albumName, slots) {
  const client = useSupabaseClient();
  const userAuth = useUserAuth();

  const slug = generateSlug(albumName);

  const { data: albums } = await client
    .from("albums")
    .select("slug")
    .eq("slug", slug)
    .eq("user_uuid", userAuth?.userLogged?.id);

  if (albums.length > 0) {
    throw new Error("Album con questo nome già esistente", "error");
  }

  const data = {
    user_uuid: userAuth?.userLogged?.id || null,
    name: albumName,
    slots: slots,
    slug: slug,
  };

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

  return data;
}

export async function insertCardToAlbum(album, cardId, index) {

  const client = useSupabaseClient();
  const userAuth = useUserAuth();
  const snackbar = useSnackbar();

  const { data: cardInCollection, error: collectionError } = await client
    .from("collection")
    .select("id, card_id")
    .eq("user_uuid", userAuth?.userLogged?.id)
    .eq("card_id", cardId)
    .single();

  if (collectionError) {
    snackbar.addMessage(
      "Carta non presente in collezione:",
      "error",
      collectionError
    );
    return;
  }

  const { error } = await client.from("card_album").insert({
    album_id: album.id,
    card_id: cardInCollection.id,
    index: index,
  });

  if (error) {
    snackbar.addMessage(
      "Errore inserimento in album:",
      "error",
      collectionError.message
    );
    return;
  }

  return true;
}

export async function removeCardFromAlbum(album, index) {
  const client = useSupabaseClient();
  const snackbar = useSnackbar();

  const { data, error } = await client
    .from("card_album")
    .delete()
    .eq("album_id", album.id)
    .eq("index", index);

  if (error) {
    snackbar.addMessage("Errore rimozione da album: ", "error", error.message);
    return;
  }

  return true;
}

export async function removeAlbum(albumId) {
  const client = useSupabaseClient();
  const snackbar = useSnackbar();

  const { data, error } = await client
    .from("albums")
    .delete()
    .eq("id", albumId);

  if (error) {
    snackbar.addMessage("Errore rimozione album:", "error", error.message);
    return;
  } else {
    snackbar.addMessage("Album rimosso con successo", "success");
  }

  return true;
}

export async function renameAlbum(albumId, newName) {
  const client = useSupabaseClient();
  const snackbar = useSnackbar();

  const { data, error } = await client
    .from("albums")
    .update({ name: newName })
    .eq("id", albumId);

  if (error) {
    snackbar.addMessage("Errore rinominazione album:", "error", error.message);
    return;
  } else {
    snackbar.addMessage("Album rinominato con successo", "success");
  }

  return true;
}

