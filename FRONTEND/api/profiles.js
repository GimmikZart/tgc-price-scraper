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
  return normalizeString(localPart);
}

function normalizeTagForFilter(tag, options = {}) {
  const normalizedTag = normalizeString(tag);
  if (!normalizedTag) return null;

  if (options?.forceAtPrefix) {
    const withPrefix = normalizedTag.startsWith("@")
      ? normalizedTag
      : `@${normalizedTag}`;
    return withPrefix.toLowerCase();
  }

  return normalizedTag.toLowerCase();
}

function toPositiveInteger(value, fallbackValue) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) return fallbackValue;
  return Math.floor(parsedValue);
}

function normalizeSelectedUserTagFilters(selectedTags = []) {
  const selectedTagsList = Array.isArray(selectedTags) ? selectedTags : [];
  const normalizedTags = [];

  selectedTagsList.forEach((selectedTag) => {
    const normalizedTagWithPrefix = normalizeTagForFilter(selectedTag, {
      forceAtPrefix: true,
    });
    if (!normalizedTagWithPrefix) return;

    normalizedTags.push(normalizedTagWithPrefix);

    const normalizedTagWithoutPrefix = normalizedTagWithPrefix.startsWith("@")
      ? normalizedTagWithPrefix.slice(1)
      : normalizedTagWithPrefix;
    if (normalizedTagWithoutPrefix) {
      normalizedTags.push(normalizedTagWithoutPrefix);
    }
  });

  return [...new Set(normalizedTags)];
}

function extractProfileTags(rawProfile, normalizedUserTag) {
  const tags = [];

  const normalizedPrimaryTag = normalizeTagForFilter(normalizedUserTag, {
    forceAtPrefix: true,
  });
  if (normalizedPrimaryTag) {
    tags.push(normalizedPrimaryTag);
  }

  const rawTags = rawProfile?.tags ?? rawProfile?.profile_tags ?? rawProfile?.interests;

  if (Array.isArray(rawTags)) {
    rawTags.forEach((rawTag) => {
      const normalizedTag = normalizeTagForFilter(rawTag);
      if (normalizedTag) tags.push(normalizedTag);
    });
  } else if (typeof rawTags === "string") {
    rawTags
      .split(",")
      .map((rawTag) => normalizeTagForFilter(rawTag))
      .filter(Boolean)
      .forEach((normalizedTag) => tags.push(normalizedTag));
  }

  return [...new Set(tags)];
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
  const normalizedUserTag = normalizeUserTag(rawProfile.user_tag, username ?? fallbackUsername);

  return {
    id: rawProfile.id ?? null,
    username: displayName ?? null,
    user_tag: normalizedUserTag,
    display_name: displayName ?? null,
    avatar_url: avatarUrl ?? null,
    tags: extractProfileTags(rawProfile, normalizedUserTag),
  };
}

function parseProfileId(profileId) {
  if (typeof profileId !== "string") return null;
  const normalizedProfileId = profileId.trim();
  return normalizedProfileId || null;
}

function parseProfileTagFilters(profileTagOrSlug) {
  if (typeof profileTagOrSlug !== "string") return null;

  const normalizedInput = profileTagOrSlug.trim();
  if (!normalizedInput) return null;

  let decodedInput = normalizedInput;
  try {
    decodedInput = decodeURIComponent(normalizedInput);
  } catch {
    decodedInput = normalizedInput;
  }

  const normalizedTag = decodedInput.trim().replace(/^@+/, "");
  if (!normalizedTag) return null;

  const normalizedLowerTag = normalizedTag.toLowerCase();

  return {
    withPrefix: `@${normalizedLowerTag}`,
    withoutPrefix: normalizedLowerTag,
  };
}

function sortProfilesByName(profiles = []) {
  return [...profiles].sort((profileA, profileB) => {
    const nameA = profileA?.display_name ?? profileA?.username ?? "";
    const nameB = profileB?.display_name ?? profileB?.username ?? "";
    return nameA.localeCompare(nameB, "it", { sensitivity: "base" });
  });
}

export async function fetchRegisteredProfiles(options = {}) {
  const client = useSupabaseClient();
  const shouldExcludeLoggedUser = options?.excludeLoggedUser ?? true;
  const shouldPaginate = Boolean(
    options?.paginated ?? (options?.page !== undefined || options?.pageSize !== undefined)
  );
  const page = toPositiveInteger(options?.page, 1);
  const pageSize = toPositiveInteger(options?.pageSize, 12);
  const selectedUserTagFilters = normalizeSelectedUserTagFilters(options?.selectedTags);
  const loggedUserId = shouldExcludeLoggedUser
    ? (useUserAuth()?.userLogged?.id ?? null)
    : null;

  let profilesQuery = shouldPaginate
    ? client.from("profiles").select("*", { count: "exact" })
    : client.from("profiles").select("*");

  if (loggedUserId) {
    profilesQuery = profilesQuery.neq("id", loggedUserId);
  }

  if (selectedUserTagFilters.length) {
    const userTagOrFilter = selectedUserTagFilters
      .map((tagFilter) => `user_tag.ilike.${tagFilter}`)
      .join(",");
    profilesQuery = profilesQuery.or(userTagOrFilter);
  }

  profilesQuery = profilesQuery
    .order("user_tag", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (shouldPaginate) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    profilesQuery = profilesQuery.range(from, to);
  }

  const { data: profiles = [], error, count } = await profilesQuery;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedProfiles = profiles
    .map((profile) => normalizeProfile(profile))
    .filter(Boolean);

  if (!shouldPaginate) {
    return sortProfilesByName(normalizedProfiles);
  }

  const totalItems = Number.isInteger(count) ? count : normalizedProfiles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    profiles: normalizedProfiles,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function fetchRegisteredProfileTags(options = {}) {
  const client = useSupabaseClient();
  const shouldExcludeLoggedUser = options?.excludeLoggedUser ?? true;
  const loggedUserId = shouldExcludeLoggedUser
    ? (useUserAuth()?.userLogged?.id ?? null)
    : null;

  let profileTagsQuery = client
    .from("profiles")
    .select("user_tag");

  if (loggedUserId) {
    profileTagsQuery = profileTagsQuery.neq("id", loggedUserId);
  }

  const { data: profiles = [], error } = await profileTagsQuery;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedTags = profiles
    .map((profile) => normalizeTagForFilter(profile?.user_tag, { forceAtPrefix: true }))
    .filter(Boolean);

  return [...new Set(normalizedTags)].sort((tagA, tagB) =>
    String(tagA).localeCompare(String(tagB), "it", { sensitivity: "base" })
  );
}

export async function fetchProfileById(profileId) {
  const parsedProfileId = parseProfileId(profileId);
  if (!parsedProfileId) {
    throw new Error("profileId non valido");
  }

  const client = useSupabaseClient();

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", parsedProfileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  return normalizeProfile(data);
}

export async function fetchProfileByTag(profileTagOrSlug, options = {}) {
  const parsedProfileTagFilters = parseProfileTagFilters(profileTagOrSlug);
  if (!parsedProfileTagFilters) {
    throw new Error("tag profilo non valido");
  }

  const client = useSupabaseClient();
  const shouldExcludeLoggedUser = options?.excludeLoggedUser ?? false;
  const loggedUserId = shouldExcludeLoggedUser
    ? (useUserAuth()?.userLogged?.id ?? null)
    : null;

  let profileQuery = client
    .from("profiles")
    .select("*")
    .or(
      `user_tag.ilike.${parsedProfileTagFilters.withPrefix},user_tag.ilike.${parsedProfileTagFilters.withoutPrefix}`
    )
    .limit(1);

  if (loggedUserId) {
    profileQuery = profileQuery.neq("id", loggedUserId);
  }

  const { data, error } = await profileQuery.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  return normalizeProfile(data);
}
