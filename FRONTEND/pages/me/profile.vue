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
    <Toolbar label="Profilo" />
    <v-container class="flex flex-col gap-5 px-4 pb-24 pt-3">
      <div class="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center gap-4">
          <div
            class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold uppercase tracking-[0.3em] text-white/60"
          >
            Foto
          </div>
          <div class="min-w-0">
            <p class="truncate text-xl font-semibold text-white">{{ username }}</p>
            <p class="text-xs uppercase tracking-[0.25em] text-white/50">
              {{ userTag }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-6 border-b border-white/10">
        <button
          type="button"
          class="pb-3 text-sm font-semibold transition"
          :class="activeTab === 'decks' ? 'border-b-2 border-white text-white' : 'text-white/50'"
          @click="activeTab = 'decks'"
        >
          Deck Attivi
        </button>
        <button
          type="button"
          class="pb-3 text-sm font-semibold transition"
          :class="activeTab === 'albums' ? 'border-b-2 border-white text-white' : 'text-white/50'"
          @click="activeTab = 'albums'"
        >
          Albums
        </button>
      </div>

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

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <ButtonForLogs />
        <DialogsHandleLogout />
      </template>
    </MobileFloatMenu>
  </section>
</template>
