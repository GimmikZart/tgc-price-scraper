import { normalizeProfile, sortProfilesByName } from "@/api/profiles";

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function normalizeUuid(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(normalizedValue)
    ? normalizedValue
    : null;
}

function normalizeSearchKeyword(value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return null;

  const safeValue = normalizedValue
    .replace(/[%_]/g, "")
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return safeValue || null;
}

function dedupeProfileIds(profileIds = []) {
  return [...new Set(
    (Array.isArray(profileIds) ? profileIds : [])
      .map((profileId) => normalizeUuid(profileId))
      .filter(Boolean),
  )];
}

function createPairKey(sourceProfileId, targetProfileId) {
  return `${sourceProfileId}::${targetProfileId}`;
}

function buildBlockedRelationSet(relationships = []) {
  const blockedRelationKeys = new Set();

  relationships.forEach((relationship) => {
    const userProfileId = normalizeUuid(relationship?.user_profile);
    const friendProfileId = normalizeUuid(relationship?.friend_profile);

    if (!userProfileId || !friendProfileId || !relationship?.blocked_at) return;

    blockedRelationKeys.add(createPairKey(userProfileId, friendProfileId));
  });

  return blockedRelationKeys;
}

function isBlockedBetweenProfiles(blockedRelationKeys, sourceProfileId, targetProfileId) {
  if (!(blockedRelationKeys instanceof Set)) return false;

  return blockedRelationKeys.has(createPairKey(sourceProfileId, targetProfileId)) ||
    blockedRelationKeys.has(createPairKey(targetProfileId, sourceProfileId));
}

function normalizeRelationship(rawRelationship) {
  const userProfileId = normalizeUuid(rawRelationship?.user_profile);
  const friendProfileId = normalizeUuid(rawRelationship?.friend_profile);

  if (!userProfileId || !friendProfileId) return null;

  return {
    id: rawRelationship?.id ?? null,
    created_at: rawRelationship?.created_at ?? null,
    blocked_at: rawRelationship?.blocked_at ?? null,
    user_profile: userProfileId,
    friend_profile: friendProfileId,
  };
}

function createEmptyFriendRelationStatus() {
  return {
    currentUserFollows: false,
    followsCurrentUser: false,
    blockedByCurrentUser: false,
    blockedByOtherUser: false,
    isBlocked: false,
    outgoingRelationship: null,
    incomingRelationship: null,
  };
}

function buildFriendCollections(profileId, relationships = []) {
  const normalizedProfileId = normalizeUuid(profileId);
  if (!normalizedProfileId) {
    return {
      followingProfileIds: [],
      followerProfileIds: [],
      blockedProfileIds: [],
    };
  }

  const blockedRelationKeys = buildBlockedRelationSet(relationships);
  const followingProfileIds = [];
  const followerProfileIds = [];
  const blockedProfileIds = [];

  relationships.forEach((relationship) => {
    const normalizedRelationship = normalizeRelationship(relationship);
    if (!normalizedRelationship) return;

    const isOutgoingRelationship = normalizedRelationship.user_profile === normalizedProfileId;
    const isIncomingRelationship = normalizedRelationship.friend_profile === normalizedProfileId;

    if (isOutgoingRelationship && normalizedRelationship.blocked_at) {
      blockedProfileIds.push(normalizedRelationship.friend_profile);
      return;
    }

    if (
      isOutgoingRelationship &&
      !normalizedRelationship.blocked_at &&
      !isBlockedBetweenProfiles(
        blockedRelationKeys,
        normalizedProfileId,
        normalizedRelationship.friend_profile,
      )
    ) {
      followingProfileIds.push(normalizedRelationship.friend_profile);
    }

    if (
      isIncomingRelationship &&
      !normalizedRelationship.blocked_at &&
      !isBlockedBetweenProfiles(
        blockedRelationKeys,
        normalizedProfileId,
        normalizedRelationship.user_profile,
      )
    ) {
      followerProfileIds.push(normalizedRelationship.user_profile);
    }
  });

  return {
    followingProfileIds: dedupeProfileIds(followingProfileIds),
    followerProfileIds: dedupeProfileIds(followerProfileIds),
    blockedProfileIds: dedupeProfileIds(blockedProfileIds),
  };
}

async function fetchProfilesByIds(client, profileIds = []) {
  const normalizedProfileIds = dedupeProfileIds(profileIds);
  if (!normalizedProfileIds.length) return [];

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .in("id", normalizedProfileIds);

  if (error) {
    throw new Error(error.message);
  }

  const normalizedProfiles = profiles
    .map((profile) => normalizeProfile(profile))
    .filter(Boolean);

  return sortProfilesByName(normalizedProfiles);
}

async function fetchRelationshipsForProfile(client, profileId) {
  const normalizedProfileId = normalizeUuid(profileId);
  if (!normalizedProfileId) {
    throw new Error("profileId non valido");
  }

  const { data: relationships = [], error } = await client
    .from("friends")
    .select("id, created_at, blocked_at, user_profile, friend_profile")
    .or(`user_profile.eq.${normalizedProfileId},friend_profile.eq.${normalizedProfileId}`);

  if (error) {
    throw new Error(error.message);
  }

  return relationships
    .map((relationship) => normalizeRelationship(relationship))
    .filter(Boolean);
}

async function fetchPairRelationships(client, currentUserId, otherProfileId) {
  const normalizedCurrentUserId = normalizeUuid(currentUserId);
  const normalizedOtherProfileId = normalizeUuid(otherProfileId);

  if (!normalizedCurrentUserId || !normalizedOtherProfileId) {
    throw new Error("profileId non valido");
  }

  const { data: relationships = [], error } = await client
    .from("friends")
    .select("id, created_at, blocked_at, user_profile, friend_profile")
    .or(
      `and(user_profile.eq.${normalizedCurrentUserId},friend_profile.eq.${normalizedOtherProfileId}),and(user_profile.eq.${normalizedOtherProfileId},friend_profile.eq.${normalizedCurrentUserId})`
    );

  if (error) {
    throw new Error(error.message);
  }

  return relationships
    .map((relationship) => normalizeRelationship(relationship))
    .filter(Boolean);
}

function getAuthenticatedUserId() {
  return normalizeUuid(useUserAuth()?.userLogged?.id ?? null);
}

export async function fetchFriendCollections(profileId) {
  const client = useSupabaseClient();
  const relationships = await fetchRelationshipsForProfile(client, profileId);
  const collections = buildFriendCollections(profileId, relationships);

  const [followingProfiles, followerProfiles, blockedProfiles] = await Promise.all([
    fetchProfilesByIds(client, collections.followingProfileIds),
    fetchProfilesByIds(client, collections.followerProfileIds),
    fetchProfilesByIds(client, collections.blockedProfileIds),
  ]);

  return {
    following: followingProfiles,
    followers: followerProfiles,
    blocked: blockedProfiles,
  };
}

export async function fetchFollowingProfiles(profileId) {
  const collections = await fetchFriendCollections(profileId);
  return collections.following;
}

export async function fetchFollowerProfiles(profileId) {
  const collections = await fetchFriendCollections(profileId);
  return collections.followers;
}

export async function fetchBlockedProfiles(profileId) {
  const collections = await fetchFriendCollections(profileId);
  return collections.blocked;
}

export async function fetchFriendRelationStatus(otherProfileId) {
  const currentUserId = getAuthenticatedUserId();
  const normalizedOtherProfileId = normalizeUuid(otherProfileId);

  if (!currentUserId) {
    throw new Error("Utente non autenticato");
  }

  if (!normalizedOtherProfileId) {
    throw new Error("profileId non valido");
  }

  if (currentUserId === normalizedOtherProfileId) {
    return createEmptyFriendRelationStatus();
  }

  const client = useSupabaseClient();
  const pairRelationships = await fetchPairRelationships(
    client,
    currentUserId,
    normalizedOtherProfileId,
  );

  const outgoingRelationship = pairRelationships.find(
    (relationship) =>
      relationship.user_profile === currentUserId &&
      relationship.friend_profile === normalizedOtherProfileId,
  ) ?? null;
  const incomingRelationship = pairRelationships.find(
    (relationship) =>
      relationship.user_profile === normalizedOtherProfileId &&
      relationship.friend_profile === currentUserId,
  ) ?? null;

  const blockedByCurrentUser = Boolean(outgoingRelationship?.blocked_at);
  const blockedByOtherUser = Boolean(incomingRelationship?.blocked_at);

  return {
    currentUserFollows: Boolean(outgoingRelationship && !outgoingRelationship.blocked_at),
    followsCurrentUser: Boolean(incomingRelationship && !incomingRelationship.blocked_at),
    blockedByCurrentUser,
    blockedByOtherUser,
    isBlocked: blockedByCurrentUser || blockedByOtherUser,
    outgoingRelationship,
    incomingRelationship,
  };
}

export async function searchDiscoverableProfiles(keyword) {
  const currentUserId = getAuthenticatedUserId();
  const normalizedKeyword = normalizeSearchKeyword(keyword);

  if (!currentUserId) {
    throw new Error("Utente non autenticato");
  }

  if (!normalizedKeyword) return [];

  const client = useSupabaseClient();
  const likePattern = `%${normalizedKeyword}%`;

  const { data: profiles = [], error } = await client
    .from("profiles")
    .select("*")
    .neq("id", currentUserId)
    .or(`username.ilike.${likePattern},user_tag.ilike.${likePattern}`)
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const relationships = await fetchRelationshipsForProfile(client, currentUserId);
  const blockedRelationKeys = buildBlockedRelationSet(relationships);

  const filteredProfiles = profiles
    .map((profile) => normalizeProfile(profile))
    .filter(Boolean)
    .filter((profile) => {
      const profileId = normalizeUuid(profile?.id);
      if (!profileId) return false;

      return !isBlockedBetweenProfiles(blockedRelationKeys, currentUserId, profileId);
    });

  return sortProfilesByName(filteredProfiles);
}

export async function followProfile(otherProfileId) {
  const currentUserId = getAuthenticatedUserId();
  const normalizedOtherProfileId = normalizeUuid(otherProfileId);

  if (!currentUserId) {
    throw new Error("Utente non autenticato");
  }

  if (!normalizedOtherProfileId) {
    throw new Error("profileId non valido");
  }

  if (currentUserId === normalizedOtherProfileId) {
    throw new Error("Non puoi seguire te stesso");
  }

  const relationshipStatus = await fetchFriendRelationStatus(normalizedOtherProfileId);

  if (relationshipStatus.isBlocked) {
    throw new Error("Operazione non disponibile su un profilo bloccato");
  }

  if (relationshipStatus.currentUserFollows) {
    return relationshipStatus.outgoingRelationship;
  }

  const client = useSupabaseClient();
  const { data, error } = await client
    .from("friends")
    .insert({
      friend_profile: normalizedOtherProfileId,
    })
    .select("id, created_at, blocked_at, user_profile, friend_profile")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeRelationship(data);
}

export async function unfollowProfile(otherProfileId) {
  const currentUserId = getAuthenticatedUserId();
  const normalizedOtherProfileId = normalizeUuid(otherProfileId);

  if (!currentUserId) {
    throw new Error("Utente non autenticato");
  }

  if (!normalizedOtherProfileId) {
    throw new Error("profileId non valido");
  }

  const client = useSupabaseClient();
  const { error } = await client
    .from("friends")
    .delete()
    .eq("user_profile", currentUserId)
    .eq("friend_profile", normalizedOtherProfileId)
    .is("blocked_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function blockProfile(otherProfileId) {
  const currentUserId = getAuthenticatedUserId();
  const normalizedOtherProfileId = normalizeUuid(otherProfileId);

  if (!currentUserId) {
    throw new Error("Utente non autenticato");
  }

  if (!normalizedOtherProfileId) {
    throw new Error("profileId non valido");
  }

  if (currentUserId === normalizedOtherProfileId) {
    throw new Error("Non puoi bloccare te stesso");
  }

  const client = useSupabaseClient();
  const blockTimestamp = new Date().toISOString();

  const { data: existingRelationship, error: existingRelationshipError } = await client
    .from("friends")
    .select("id, created_at, blocked_at, user_profile, friend_profile")
    .eq("user_profile", currentUserId)
    .eq("friend_profile", normalizedOtherProfileId)
    .maybeSingle();

  if (existingRelationshipError) {
    throw new Error(existingRelationshipError.message);
  }

  if (existingRelationship) {
    if (existingRelationship.blocked_at) {
      return normalizeRelationship(existingRelationship);
    }

    const { data, error } = await client
      .from("friends")
      .update({ blocked_at: blockTimestamp })
      .eq("user_profile", currentUserId)
      .eq("friend_profile", normalizedOtherProfileId)
      .select("id, created_at, blocked_at, user_profile, friend_profile")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return normalizeRelationship(data);
  }

  const { data, error } = await client
    .from("friends")
    .insert({
      friend_profile: normalizedOtherProfileId,
      blocked_at: blockTimestamp,
    })
    .select("id, created_at, blocked_at, user_profile, friend_profile")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeRelationship(data);
}
