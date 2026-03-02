<script setup>
import { computed, ref } from "vue";
import {
  fetchFriendRelationStatus,
  followProfile,
  unfollowProfile,
} from "@/api/friends";
import { fetchProfileByTag } from "@/api/profiles";
import { fetchPublicDecksByUserTag } from "@/api/decks";
import { getPublicAlbumsByUserTag } from "@/api/album";
import { fetchActiveSellListingsBySellerId } from "@/api/sellListings";
import { DeckLocation } from "~/enums/deckLocation";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();
const activeTab = ref("decks");
const profile = ref(null);
const decks = ref([]);
const albums = ref([]);
const sellListings = ref([]);
const loadingProfile = ref(false);
const loadingDecks = ref(false);
const loadingAlbums = ref(false);
const loadingSellListings = ref(false);
const relationActionLoading = ref(false);
const profileError = ref(null);
const deckError = ref(null);
const albumError = ref(null);
const sellListingsError = ref(null);
const loadRequestId = ref(0);
const relationStatus = ref(createEmptyFriendRelationStatus());

const profileTagSlug = computed(() => {
  const value = route.params?.tag;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);

const username = computed(() => {
  return profile.value?.display_name ||
    profile.value?.username ||
    "Collezionista";
});

const userTag = computed(() => {
  return profile.value?.user_tag || "@collezionista";
});

const userAvatarUrl = computed(() => {
  return profile.value?.avatar_url || null;
});

const publicAlbums = computed(() =>
  (albums.value ?? []).filter((album) => album.visibility === "public")
);
const sellListingDetailsPathBase = computed(() =>
  isOwnProfile.value ? "/community/sell-cards/current-sells" : "/community/offers"
);

const isOwnProfile = computed(() => {
  return Boolean(
    profile.value?.id &&
    currentUserId.value &&
    profile.value.id === currentUserId.value,
  );
});

const showAddFriendButton = computed(() => {
  return Boolean(
    profile.value &&
    !isOwnProfile.value &&
    !relationStatus.value.isBlocked &&
    !relationStatus.value.currentUserFollows,
  );
});

const showRemoveFriendButton = computed(() => {
  return Boolean(
    profile.value &&
    !isOwnProfile.value &&
    !relationStatus.value.isBlocked &&
    relationStatus.value.currentUserFollows,
  );
});

const showFriendAction = computed(() => {
  return showAddFriendButton.value || showRemoveFriendButton.value;
});

const toolbarLabel = computed(() => {
  if (profile.value) return "";
  if (profileError.value) return "Profilo non disponibile";
  return "Profilo";
});

function createEmptyFriendRelationStatus() {
  return {
    currentUserFollows: false,
    followsCurrentUser: false,
    blockedByCurrentUser: false,
    blockedByOtherUser: false,
    isBlocked: false,
  };
}

async function loadDecks(requestId) {
  if (!profileTagSlug.value) {
    decks.value = [];
    return;
  }

  loadingDecks.value = true;
  deckError.value = null;

  try {
    decks.value = await fetchPublicDecksByUserTag(profileTagSlug.value);
  } catch (error) {
    if (requestId !== loadRequestId.value) return;
    deckError.value = error?.message || "Errore caricamento mazzi";
  } finally {
    if (requestId !== loadRequestId.value) return;
    loadingDecks.value = false;
  }
}

async function loadAlbums(requestId) {
  if (!profileTagSlug.value) {
    albums.value = [];
    return;
  }

  loadingAlbums.value = true;
  albumError.value = null;

  try {
    albums.value = await getPublicAlbumsByUserTag(profileTagSlug.value);
  } catch (error) {
    if (requestId !== loadRequestId.value) return;
    albumError.value = error?.message || "Errore caricamento album";
  } finally {
    if (requestId !== loadRequestId.value) return;
    loadingAlbums.value = false;
  }
}

async function loadSellListings(requestId, sellerUuid) {
  if (!sellerUuid) {
    sellListings.value = [];
    return;
  }

  loadingSellListings.value = true;
  sellListingsError.value = null;

  try {
    sellListings.value = await fetchActiveSellListingsBySellerId(sellerUuid);
  } catch (error) {
    if (requestId !== loadRequestId.value) return;
    sellListingsError.value = error?.message || "Errore caricamento vendite";
  } finally {
    if (requestId !== loadRequestId.value) return;
    loadingSellListings.value = false;
  }
}

async function loadProfileData() {
  const requestId = ++loadRequestId.value;
  loadingProfile.value = true;
  profileError.value = null;
  deckError.value = null;
  albumError.value = null;
  sellListingsError.value = null;
  profile.value = null;
  decks.value = [];
  albums.value = [];
  sellListings.value = [];
  relationStatus.value = createEmptyFriendRelationStatus();

  try {
    const loadedProfile = await fetchProfileByTag(profileTagSlug.value);

    if (requestId !== loadRequestId.value) return;

    if (!loadedProfile) {
      profileError.value = "Profilo non disponibile";
      return;
    }

    if (
      loadedProfile.id &&
      currentUserId.value &&
      loadedProfile.id !== currentUserId.value
    ) {
      const nextRelationStatus = await fetchFriendRelationStatus(loadedProfile.id);

      if (requestId !== loadRequestId.value) return;

      relationStatus.value = nextRelationStatus;

      if (nextRelationStatus.isBlocked) {
        profileError.value = "Profilo non disponibile";
        return;
      }
    }

    profile.value = loadedProfile;

    await Promise.all([
      loadDecks(requestId),
      loadAlbums(requestId),
      loadSellListings(requestId, loadedProfile.id),
    ]);
  } catch (error) {
    if (requestId !== loadRequestId.value) return;
    profileError.value = error?.message || "Errore durante il recupero profilo";
    snackbar.addMessage(profileError.value, "error");
  } finally {
    if (requestId !== loadRequestId.value) return;
    loadingProfile.value = false;
  }
}

async function refreshRelationStatus() {
  if (!profile.value?.id || isOwnProfile.value) {
    relationStatus.value = createEmptyFriendRelationStatus();
    return;
  }

  relationStatus.value = await fetchFriendRelationStatus(profile.value.id);

  if (relationStatus.value.isBlocked) {
    profile.value = null;
    decks.value = [];
    albums.value = [];
    sellListings.value = [];
    profileError.value = "Profilo non disponibile";
  }
}

async function handleFriendAction() {
  if (!profile.value?.id || relationActionLoading.value) return;

  relationActionLoading.value = true;

  try {
    if (relationStatus.value.currentUserFollows) {
      await unfollowProfile(profile.value.id);
      snackbar.addMessage("Amico rimosso", "success");
    } else {
      await followProfile(profile.value.id);
      snackbar.addMessage("Amico aggiunto", "success");
    }

    await refreshRelationStatus();
  } catch (error) {
    snackbar.addMessage(
      error?.message || "Errore durante l'aggiornamento dell'amicizia",
      "error",
    );
  } finally {
    relationActionLoading.value = false;
  }
}

function goToDeck(deck) {
  router.push(`/me/decks/${deck.slug}?location=${DeckLocation.CLOUD}`);
}

definePageMeta({
  ssr: false,
  middleware: "auth",
});

watch([profileTagSlug, currentUserId], () => {
  loadProfileData();
}, { immediate: true });
</script>

<template>
  <section class="relative h-full">
    <Toolbar fixed back-button :label="toolbarLabel">
      <template #content>
        <UserIdentityHeader
          v-if="profile"
          :username="username"
          :user-tag="userTag"
          :avatar-url="userAvatarUrl"
          size="sm"
        />
      </template>

      <template #info>
        <div v-if="profile" class="flex items-center gap-6 border-b border-white/10 px-2 pt-1">
          <button
            type="button"
            class="text-sm font-semibold transition"
            :class="activeTab === 'decks' ? 'border-b-2 border-white text-white' : 'text-white/50'"
            @click="activeTab = 'decks'"
          >
            Deck Attivi
          </button>
          <button
            type="button"
            class="text-sm font-semibold transition"
            :class="activeTab === 'albums' ? 'border-b-2 border-white text-white' : 'text-white/50'"
            @click="activeTab = 'albums'"
          >
            Albums
          </button>
          <button
            type="button"
            class="text-sm font-semibold transition"
            :class="activeTab === 'sellListings' ? 'border-b-2 border-white text-white' : 'text-white/50'"
            @click="activeTab = 'sellListings'"
          >
            In vendita
          </button>
        </div>
      </template>
    </Toolbar>

    <v-container class="flex flex-col gap-5 px-4 pb-24 pt-3">
      <p v-if="loadingProfile" class="profile-state-message">
        Caricamento profilo in corso...
      </p>
      <p v-else-if="profileError" class="profile-state-message profile-state-message--error">
        {{ profileError }}
      </p>

      <template v-else>
        <div v-if="activeTab === 'decks'" class="space-y-3">
          <p v-if="loadingDecks" class="text-center text-sm text-white/50">Caricamento deck in corso...</p>
          <p v-else-if="deckError" class="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {{ deckError }}
          </p>
          <div v-else>
            <div v-if="decks.length === 0" class="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-sm text-white/60">
              Nessun deck attivo al momento.
            </div>
            <div v-else class="flex flex-col gap-3">
              <DecksItem
                v-for="deck in decks"
                :key="deck.slug"
                :leader-id="deck.leader"
                :current-deck="deck"
                @click="goToDeck(deck)"
              />
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'albums'" class="space-y-3">
          <p v-if="loadingAlbums" class="text-center text-sm text-white/50">Caricamento album pubblici...</p>
          <p v-else-if="albumError" class="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {{ albumError }}
          </p>
          <div v-else>
            <div v-if="publicAlbums.length === 0" class="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-sm text-white/60">
              Nessun album pubblico al momento.
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <ButtonAlbum
                v-for="album in publicAlbums"
                :key="album.slug"
                :to="`/me/collection/albums/${album.slug}`"
                :label="album.name"
              />
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'sellListings'" class="space-y-3">
          <p v-if="loadingSellListings" class="text-center text-sm text-white/50">Caricamento vendite in corso...</p>
          <p v-else-if="sellListingsError" class="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {{ sellListingsError }}
          </p>
          <div v-else>
            <div v-if="sellListings.length === 0" class="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-sm text-white/60">
              Nessuna carta attualmente in vendita.
            </div>
            <div v-else class="flex flex-col gap-3">
              <CommunitySellListingCard
                v-for="listing in sellListings"
                :key="listing.id"
                :listing="listing"
                :details-path-base="sellListingDetailsPathBase"
                :show-seller-identity="false"
              />
            </div>
          </div>
        </div>
      </template>
    </v-container>

    <MobileFloatMenu v-if="showFriendAction" :cols="1">
      <template #buttons>
        <ButtonMenu
          :icon="showRemoveFriendButton ? 'mdi:account-remove-outline' : 'mdi:handshake'"
          :label="showRemoveFriendButton ? 'Rimuovi Amico' : 'Aggiungi Amico'"
          :color="showRemoveFriendButton ? 'red' : 'green'"
          :disabled="relationActionLoading || loadingProfile"
          transition
          :delay="100"
          @click="handleFriendAction"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.profile-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.profile-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}
</style>
