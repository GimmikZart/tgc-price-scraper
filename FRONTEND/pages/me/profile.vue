<script setup>
import { computed, onMounted, ref } from "vue";
import ProfileSectionsTabs from "@/components/Tabs/ProfileSectionsTabs.vue";
import { fetchUserDecks } from "@/api/decks";
import { getAlbums } from "@/api/album";
import { fetchLoggedUserSellListings } from "@/api/sellListings";
import { DeckLocation } from "~/enums/deckLocation";

const userAuth = useUserAuth();
const router = useRouter();
const activeTab = ref("decks");
const decks = ref([]);
const albums = ref([]);
const sellListings = ref([]);
const loadingDecks = ref(false);
const loadingAlbums = ref(false);
const loadingSellListings = ref(false);
const deckError = ref(null);
const albumError = ref(null);
const sellListingsError = ref(null);

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
const tabOptions = computed(() => [
  {
    label: "Mazzi",
    value: "decks",
  },
  {
    label: "Albums",
    value: "albums",
  },
  {
    label: "In vendita",
    value: "sellListings",
  },
]);

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

async function loadSellListings() {
  loadingSellListings.value = true;
  sellListingsError.value = null;
  try {
    sellListings.value = await fetchLoggedUserSellListings();
  } catch (error) {
    sellListingsError.value = error?.message || "Errore caricamento vendite";
  } finally {
    loadingSellListings.value = false;
  }
}

onMounted(() => {
  loadDecks();
  loadAlbums();
  loadSellListings();
});

function goToDeck(deck) {
  router.push(`/me/decks/${deck.slug}?location=${DeckLocation.CLOUD}`);
}

function setActiveTab(nextTab) {
  activeTab.value = nextTab;
}

definePageMeta({
  ssr: false,
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar fixed>
      <template #content>
        <UserIdentityHeader
          :username="username"
          :user-tag="userTag"
          :avatar-url="userAvatarUrl"
          size="sm"
        />
      </template>

      <template #info>
        <ProfileSectionsTabs
          :tabs="tabOptions"
          :active="activeTab"
          @change="setActiveTab"
        />
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
              details-path-base="/community/sell-cards/current-sells"
              show-proposals-in-header-slot
              :show-seller-identity="false"
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
