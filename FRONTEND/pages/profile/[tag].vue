<script setup>
import { computed, onMounted, ref } from "vue";
import { fetchProfileByTag } from "@/api/profiles";
import { fetchPublicDecksByUserTag } from "@/api/decks";
import { getPublicAlbumsByUserTag } from "@/api/album";
import { DeckLocation } from "~/enums/deckLocation";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const activeTab = ref("decks");
const profile = ref(null);
const decks = ref([]);
const albums = ref([]);
const loadingProfile = ref(false);
const loadingDecks = ref(false);
const loadingAlbums = ref(false);
const profileError = ref(null);
const deckError = ref(null);
const albumError = ref(null);
const loadRequestId = ref(0);

const profileTagSlug = computed(() => {
  const value = route.params?.tag;
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
});

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

async function loadProfileData() {
  const requestId = ++loadRequestId.value;
  loadingProfile.value = true;
  profileError.value = null;
  profile.value = null;
  decks.value = [];
  albums.value = [];

  try {
    const loadedProfile = await fetchProfileByTag(profileTagSlug.value);

    if (requestId !== loadRequestId.value) return;

    if (!loadedProfile) {
      profileError.value = "Profilo non trovato";
      return;
    }

    profile.value = loadedProfile;

    await Promise.all([
      loadDecks(requestId),
      loadAlbums(requestId),
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

function goToDeck(deck) {
  router.push(`/me/decks/${deck.slug}?location=${DeckLocation.CLOUD}`);
}

definePageMeta({
  ssr: false,
  middleware: "auth",
});

watch(profileTagSlug, () => {
  loadProfileData();
});

onMounted(() => {
  loadProfileData();
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar fixed back-button>
      <template #content>
        <UserIdentityHeader
          :username="username"
          :user-tag="userTag"
          :avatar-url="userAvatarUrl"
          size="sm"
        />
      </template>

      <template #info>
        <div class="flex items-center gap-6 border-b border-white/10 px-2 pt-1">
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
      </template>
    </v-container>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <ButtonMenu
          icon="mdi:handshake"
          label="Aggiungi Amico"
          color="green"
          transition
          :delay="100"
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
