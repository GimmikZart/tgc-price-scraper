import { useSnackbar } from "@/stores/useSnackbar";
import { generateSlug } from "@/utilities/generateSlug";

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function isUuid(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(normalizedValue);
}

function parseProfileTagFilters(profileTagOrSlug) {
  const normalizedTagOrSlug = normalizeString(profileTagOrSlug);
  if (!normalizedTagOrSlug) return null;

  let decodedTagOrSlug = normalizedTagOrSlug;
  try {
    decodedTagOrSlug = decodeURIComponent(normalizedTagOrSlug);
  } catch {
    decodedTagOrSlug = normalizedTagOrSlug;
  }

  const normalizedTag = decodedTagOrSlug.trim().replace(/^@+/, "").toLowerCase();
  if (!normalizedTag) return null;

  return {
    withPrefix: `@${normalizedTag}`,
    withoutPrefix: normalizedTag,
  };
}

function extractProfileUserUuids(profile = {}) {
  const profileUserUuidCandidates = [
    profile?.user_uuid,
    profile?.id,
    profile?.auth_user_id,
    profile?.uuid,
  ];

  return [...new Set(
    profileUserUuidCandidates
      .map((candidate) => normalizeString(candidate))
      .filter((candidate) => isUuid(candidate)),
  )];
}

async function fetchProfileUserUuidsByTag(client, profileTagOrSlug) {
  const profileTagFilters = parseProfileTagFilters(profileTagOrSlug);
  if (!profileTagFilters) {
    throw new Error("tag profilo non valido");
  }

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .or(
      `user_tag.ilike.${profileTagFilters.withPrefix},user_tag.ilike.${profileTagFilters.withoutPrefix}`
    )
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!profiles.length) return [];
  return extractProfileUserUuids(profiles[0]);
}
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

export async function getPublicAlbumsByUser(userUuid) {
  const normalizedUserUuid = typeof userUuid === "string" ? userUuid.trim() : "";
  if (!normalizedUserUuid) {
    throw new Error("userUuid non valido");
  }

  const client = useSupabaseClient();

  const { data: albums = [], error } = await client
    .from("albums")
    .select("*")
    .eq("user_uuid", normalizedUserUuid)
    .eq("visibility", "public")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return albums;
}

export async function getPublicAlbumsByUserTag(profileTagOrSlug) {
  const client = useSupabaseClient();
  const profileUserUuids = await fetchProfileUserUuidsByTag(client, profileTagOrSlug);

  if (!profileUserUuids.length) return [];

  const { data: albums = [], error } = await client
    .from("albums")
    .select("*")
    .in("user_uuid", profileUserUuids)
    .eq("visibility", "public")
    .order("name", { ascending: true });

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

export async function addPage(album) {
  const client = useSupabaseClient();
  const snackbar = useSnackbar();

  const newSlotsValue = album.slots + 10;
  const { data, error } = await client
    .from("albums")
    .update({ slots: newSlotsValue })
    .eq("id", album.id);

  if (error) {
    snackbar.addMessage("Errore aggiunta pagina album:", "error", error.message);
    return;
  } else {
    snackbar.addMessage("Pagina aggiunta con successo", "success");
  }

  return true;
}

export async function removePage(album) {
  const client = useSupabaseClient();
  const snackbar = useSnackbar();

  const newSlotsValue = album.slots - 10;
  const { data: albumData, error: albumError } = await client
    .from("albums")
    .update({ slots: newSlotsValue })
    .eq("id", album.id);

    const {data: cardAlbumData, error: cardAlbumError} = await client
    .from("card_album")
    .delete()
    .eq("album_id", album.id)
    .gt("index", newSlotsValue - 1);

  if (albumError || cardAlbumError) {
    snackbar.addMessage("Errore rimozione pagina album:", "error", albumError?.message || cardAlbumError?.message);
    return;
  } else {
    snackbar.addMessage("Pagina rimossa con successo", "success");
  }

  return true;
}

