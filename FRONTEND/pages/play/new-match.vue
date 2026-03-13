<script setup>
import { fetchFollowingProfiles, searchDiscoverableProfiles } from "@/api/friends";
import { createMatchInvite } from "@/api/matches";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

const friends = ref([]);
const isLoadingFriends = ref(true);
const friendLoadError = ref(null);

const searchInput = ref(extractQuery(route.query.q));
const submittedQuery = ref(extractQuery(route.query.q));
const searchResults = ref([]);
const hasSearched = ref(Boolean(submittedQuery.value));
const isSearching = ref(false);
const searchError = ref(null);
const searchRequestId = ref(0);

const selectedOpponent = ref(null);
const challengeDialogRef = ref(null);
const isCreatingMatch = ref(false);

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);

function extractQuery(rawValue) {
  const normalizedValue = Array.isArray(rawValue)
    ? String(rawValue[0] ?? "")
    : String(rawValue ?? "");

  return normalizedValue.trim();
}

const listableSearchResults = computed(() => {
  if (!Array.isArray(searchResults.value)) return [];

  const friendIds = new Set(friends.value.map((friend) => String(friend?.id ?? "")));

  return searchResults.value.filter((profile) => {
    const profileId = String(profile?.id ?? "");
    return !friendIds.has(profileId);
  });
});

function selectOpponent(profile) {
  if (!profile?.id) return;
  selectedOpponent.value = profile;
  nextTick(() => {
    challengeDialogRef.value?.openDialog?.();
  });
}

function closeConfirmDialog() {
  challengeDialogRef.value?.closeDialog?.();
}

async function loadFollowingFriends() {
  if (!currentUserId.value) {
    friends.value = [];
    isLoadingFriends.value = false;
    return;
  }

  isLoadingFriends.value = true;
  friendLoadError.value = null;

  try {
    const followingProfiles = await fetchFollowingProfiles(currentUserId.value);
    friends.value = followingProfiles ?? [];
  } catch (error) {
    friends.value = [];
    friendLoadError.value = error?.message || "Errore durante il caricamento amici";
    snackbar.addMessage(friendLoadError.value, "error");
  } finally {
    isLoadingFriends.value = false;
  }
}

async function runSearch() {
  const normalizedQuery = searchInput.value.trim();
  submittedQuery.value = normalizedQuery;
  searchError.value = null;

  router.replace({
    query: normalizedQuery
      ? { ...route.query, q: normalizedQuery }
      : Object.fromEntries(
          Object.entries(route.query).filter(([key]) => key !== "q"),
        ),
  });

  if (!normalizedQuery) {
    searchResults.value = [];
    hasSearched.value = false;
    return;
  }

  hasSearched.value = true;
  isSearching.value = true;
  const requestId = ++searchRequestId.value;

  try {
    const profiles = await searchDiscoverableProfiles(normalizedQuery);
    if (requestId !== searchRequestId.value) return;
    searchResults.value = profiles ?? [];
  } catch (error) {
    if (requestId !== searchRequestId.value) return;

    searchResults.value = [];
    searchError.value = error?.message || "Errore durante la ricerca utenti";
    snackbar.addMessage(searchError.value, "error");
  } finally {
    if (requestId !== searchRequestId.value) return;
    isSearching.value = false;
  }
}

async function confirmChallenge() {
  if (!selectedOpponent.value?.id || isCreatingMatch.value) return;

  isCreatingMatch.value = true;

  try {
    const createdMatch = await createMatchInvite({
      opponentId: selectedOpponent.value.id,
    });

    closeConfirmDialog();

    if (!createdMatch?.id) {
      throw new Error("Impossibile creare il match");
    }

    router.push(`/play/choose-deck?matchId=${createdMatch.id}`);
  } catch (error) {
    snackbar.addMessage(error?.message || "Errore durante la creazione del match", "error");
  } finally {
    isCreatingMatch.value = false;
  }
}

watch(
  () => route.query.q,
  (queryValue) => {
    const normalizedQuery = extractQuery(queryValue);
    searchInput.value = normalizedQuery;

    if (normalizedQuery === submittedQuery.value) return;

    submittedQuery.value = normalizedQuery;

    if (!normalizedQuery) {
      searchResults.value = [];
      hasSearched.value = false;
      searchError.value = null;
    }
  },
);

watch(
  currentUserId,
  () => {
    loadFollowingFriends();
  },
  { immediate: true },
);

onMounted(() => {
  if (!submittedQuery.value) return;
  runSearch();
});

definePageMeta({
  middleware: "auth",
  ssr: false,
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Nuova partita" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-2">
      <div class="space-y-4 pb-2">
        <div>
          <h3 class="play-new-match-title">Amici</h3>

          <p v-if="isLoadingFriends" class="play-new-match-state-message">
            Caricamento amici...
          </p>

          <p v-else-if="friendLoadError" class="play-new-match-state-message play-new-match-state-message--error">
            {{ friendLoadError }}
          </p>

          <p v-else-if="friends.length === 0" class="play-new-match-state-message">
            Non segui ancora nessun utente.
          </p>

          <div v-else class="space-y-2">
            <button
              v-for="friend in friends"
              :key="friend.id"
              type="button"
              class="play-new-match-select"
              @click="selectOpponent(friend)"
            >
              <UserIdentityHeader
                :username="friend.display_name ?? friend.username"
                :user-tag="friend.user_tag"
                :profile-tag="friend.user_tag"
                :avatar-url="friend.avatar_url"
                :navigable="false"
              />
            </button>
          </div>
        </div>

        <div>
          <h3 class="play-new-match-title">Cerca utenti</h3>

          <p v-if="isSearching" class="play-new-match-state-message">
            Ricerca utenti in corso...
          </p>

          <p v-else-if="searchError" class="play-new-match-state-message play-new-match-state-message--error">
            {{ searchError }}
          </p>

          <p v-else-if="!hasSearched" class="play-new-match-state-message">
            Usa la barra in basso per cercare un utente.
          </p>

          <p v-else-if="listableSearchResults.length === 0" class="play-new-match-state-message">
            Nessun utente disponibile per "{{ submittedQuery }}".
          </p>

          <div v-else class="space-y-2">
            <button
              v-for="profile in listableSearchResults"
              :key="profile.id"
              type="button"
              class="play-new-match-select"
              @click="selectOpponent(profile)"
            >
              <UserIdentityHeader
                :username="profile.display_name ?? profile.username"
                :user-tag="profile.user_tag"
                :profile-tag="profile.user_tag"
                :avatar-url="profile.avatar_url"
                :navigable="false"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <input
            v-model="searchInput"
            type="text"
            inputmode="search"
            placeholder="Username o user tag"
            class="play-new-match-search-input"
            @keydown.enter.prevent="runSearch"
          />

          <button
            type="button"
            class="play-new-match-search-button"
            :disabled="isSearching"
            @click="runSearch"
          >
            Cerca
          </button>
        </div>
      </template>
    </MobileFloatMenu>

    <DialogsGeneric ref="challengeDialogRef" :disabled="isCreatingMatch">
      <template #button>
        <span class="play-new-match-hidden-dialog-trigger" aria-hidden="true" />
      </template>

      <template #title>Conferma sfida</template>

      <template #content>
        <p class="play-new-match-dialog-text">
          Hai selezionato
          <strong>{{ selectedOpponent?.display_name ?? selectedOpponent?.username ?? "utente" }}</strong>,
          vuoi proporgli una sfida?
        </p>
      </template>

      <template #actions="{ closeDialog }">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isCreatingMatch"
          @click="closeDialog"
        >
          Annulla
        </v-btn>
        <v-btn
          variant="flat"
          class="play-new-match-dialog-accept"
          :loading="isCreatingMatch"
          :disabled="isCreatingMatch"
          @click="confirmChallenge"
        >
          Sfida!
        </v-btn>
      </template>
    </DialogsGeneric>
  </section>
</template>

<style scoped>
.play-new-match-title {
  margin: 0 0 0.45rem;
  color: rgba(255, 237, 213, 0.96);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.play-new-match-state-message {
  margin-top: 0.5rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.86rem;
  font-weight: 600;
}

.play-new-match-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.play-new-match-select {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.5);
  padding: 0.35rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.play-new-match-select:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 157, 82, 0.45);
  background: rgba(15, 23, 42, 0.65);
}

.play-new-match-search-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.78);
  color: rgba(248, 250, 252, 0.95);
  padding: 0.9rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.play-new-match-search-input::placeholder {
  color: rgba(148, 163, 184, 0.82);
}

.play-new-match-search-input:focus {
  border-color: rgba(255, 157, 82, 0.45);
  box-shadow: 0 0 0 2px rgba(255, 157, 82, 0.18);
  background: rgba(15, 23, 42, 0.92);
}

.play-new-match-search-button {
  border: 1px solid rgba(255, 178, 125, 0.45);
  border-radius: 1rem;
  background: rgba(255, 122, 24, 0.2);
  color: #ffd7b3;
  min-height: 3.1rem;
  padding: 0 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    opacity 160ms ease;
}

.play-new-match-search-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 178, 125, 0.65);
  background: rgba(255, 122, 24, 0.28);
}

.play-new-match-search-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.play-new-match-dialog-text {
  margin: 0;
  color: rgba(241, 245, 249, 0.9);
  line-height: 1.4;
}

.play-new-match-dialog-accept {
  border: 1px solid rgba(255, 183, 124, 0.4);
  background: linear-gradient(135deg, rgba(255, 122, 24, 0.92), rgba(173, 72, 11, 0.95));
  color: #fff7f0;
}

.play-new-match-hidden-dialog-trigger {
  display: none;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
