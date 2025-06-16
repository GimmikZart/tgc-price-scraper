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
