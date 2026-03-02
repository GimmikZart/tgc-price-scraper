<script setup>
import { searchDiscoverableProfiles } from "@/api/friends";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();

const searchInput = ref(extractRouteQuery(route.query.q));
const submittedQuery = ref(extractRouteQuery(route.query.q));
const searchResults = ref([]);
const isLoading = ref(false);
const loadError = ref(null);
const hasSearched = ref(Boolean(submittedQuery.value));
const fetchRequestId = ref(0);

function extractRouteQuery(queryValue) {
  const normalizedValue = Array.isArray(queryValue)
    ? String(queryValue[0] ?? "")
    : String(queryValue ?? "");

  return normalizedValue.trim();
}

async function runSearch() {
  const normalizedQuery = searchInput.value.trim();

  submittedQuery.value = normalizedQuery;
  loadError.value = null;

  router.replace({
    query: normalizedQuery
      ? { ...route.query, q: normalizedQuery }
      : Object.fromEntries(
          Object.entries(route.query).filter(([key]) => key !== "q")
        ),
  });

  if (!normalizedQuery) {
    searchResults.value = [];
    hasSearched.value = false;
    return;
  }

  const currentRequestId = ++fetchRequestId.value;
  isLoading.value = true;
  hasSearched.value = true;

  try {
    const profiles = await searchDiscoverableProfiles(normalizedQuery);

    if (currentRequestId !== fetchRequestId.value) return;

    searchResults.value = profiles ?? [];
  } catch (error) {
    if (currentRequestId !== fetchRequestId.value) return;

    searchResults.value = [];
    loadError.value = error?.message || "Errore durante la ricerca utenti";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    if (currentRequestId !== fetchRequestId.value) return;
    isLoading.value = false;
  }
}

watch(
  () => route.query.q,
  (queryValue) => {
    const normalizedQuery = extractRouteQuery(queryValue);
    searchInput.value = normalizedQuery;

    if (normalizedQuery === submittedQuery.value) return;

    submittedQuery.value = normalizedQuery;

    if (!normalizedQuery) {
      searchResults.value = [];
      hasSearched.value = false;
      loadError.value = null;
    }
  },
);

definePageMeta({
  middleware: "auth",
});

onMounted(() => {
  if (!submittedQuery.value) return;
  runSearch();
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Cerca nuovi amici" fixed back-button />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-32 pt-1">
      <p v-if="isLoading" class="friends-search-state-message">
        Ricerca utenti in corso...
      </p>

      <p v-else-if="loadError" class="friends-search-state-message friends-search-state-message--error">
        {{ loadError }}
      </p>

      <p v-else-if="!hasSearched" class="friends-search-state-message">
        Inserisci username o user tag per cercare nuovi utenti.
      </p>

      <p v-else-if="searchResults.length === 0" class="friends-search-state-message">
        Nessun utente trovato per "{{ submittedQuery }}".
      </p>

      <div v-else class="space-y-3 pb-2">
        <UserIdentityHeader
          v-for="profile in searchResults"
          :key="profile.id"
          :username="profile.display_name ?? profile.username"
          :user-tag="profile.user_tag"
          :profile-tag="profile.user_tag"
          :avatar-url="profile.avatar_url"
        />
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
            class="friends-search-input"
            @keydown.enter.prevent="runSearch"
          />

          <button
            type="button"
            class="friends-search-button"
            :disabled="isLoading"
            @click="runSearch"
          >
            Cerca
          </button>
        </div>
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.friends-search-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.friends-search-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.friends-search-input {
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

.friends-search-input::placeholder {
  color: rgba(148, 163, 184, 0.82);
}

.friends-search-input:focus {
  border-color: rgba(255, 157, 82, 0.45);
  box-shadow: 0 0 0 2px rgba(255, 157, 82, 0.18);
  background: rgba(15, 23, 42, 0.92);
}

.friends-search-button {
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

.friends-search-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 178, 125, 0.65);
  background: rgba(255, 122, 24, 0.28);
}

.friends-search-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
