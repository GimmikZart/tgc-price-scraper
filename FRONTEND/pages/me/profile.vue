<script setup>
import { computed, onMounted, ref } from "vue";
import { fetchUserDecks } from "@/api/decks";
import { getAlbums } from "@/api/album";
import { DeckLocation } from "~/enums/deckLocation";

const userAuth = useUserAuth();
const router = useRouter();
const activeTab = ref("decks");
const decks = ref([]);
const albums = ref([]);
const loadingDecks = ref(false);
const loadingAlbums = ref(false);
const deckError = ref(null);
const albumError = ref(null);

const username = computed(() => {
  const metadata = userAuth.userLogged?.user_metadata ?? {};
  return (
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    userAuth.userLogged?.email?.split("@")[0] ||
    "Collezionista"
  );
});

const userTag = computed(() => {
  const metadata = userAuth.userLogged?.user_metadata ?? {};
  const handle =
    metadata.username || metadata.handle ||
    userAuth.userLogged?.email?.split("@")[0] ||
    "collezionista";
  return `@${handle}`.toLowerCase();
});

const userAvatarUrl = computed(() => {
  const metadata = userAuth.userLogged?.user_metadata ?? {};
  const candidateAvatarUrls = [
    metadata.avatar_url,
    metadata.picture,
    metadata.photo_url,
  ];

  const normalizedAvatarUrl = candidateAvatarUrls
    .find((value) => typeof value === "string" && value.trim());

  return typeof normalizedAvatarUrl === "string" ? normalizedAvatarUrl.trim() : null;
});

const publicAlbums = computed(() =>
  (albums.value ?? []).filter((album) => album.visibility === "public")
);

async function loadDecks() {
  loadingDecks.value = true;
  deckError.value = null;
  try {
    decks.value = await fetchUserDecks();
  } catch (error) {
    deckError.value = error?.message || "Errore caricamento mazzi";
  } finally {
    loadingDecks.value = false;
  }
}

async function loadAlbums() {
  loadingAlbums.value = true;
  albumError.value = null;
  try {
    const response = await getAlbums();
    albums.value = response ?? [];
  } catch (error) {
    albumError.value = error?.message || "Errore caricamento album";
  } finally {
    loadingAlbums.value = false;
  }
}

onMounted(() => {
  loadDecks();
  loadAlbums();
});

function goToDeck(deck) {
  router.push(`/me/decks/${deck.slug}?location=${DeckLocation.CLOUD}`);
}

definePageMeta({
  ssr: false,
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Profilo" fixed> 
      <template #info>
        <UserIdentityHeader
          :username="username"
          :user-tag="userTag"
          :avatar-url="userAvatarUrl"
          size="md"
        />

        <div class="flex items-center gap-6 border-b border-white/10 p-2 mt-3">
          <button
            type="button"
            class="text-sm font-semibold transition"
            :class="activeTab === 'decks' ? 'border-b-2 border-white text-white' : 'text-white/50'"
            @click="activeTab = 'decks'"
          >
            Mazzi
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
    </v-container>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <DialogsHandleLogout />
      </template>
    </MobileFloatMenu>
  </section>
</template>
