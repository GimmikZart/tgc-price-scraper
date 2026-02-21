<script setup>
import {
  fetchRegisteredProfiles,
  fetchRegisteredProfileTags,
} from "@/api/profiles";

const snackbar = useSnackbar();
const router = useRouter();

const USERS_PER_PAGE = 12;

const profiles = ref([]);
const availableTags = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const isLoading = ref(true);
const loadError = ref(null);
const openFilter = ref(false);
const selectedTags = ref([]);
const fetchRequestId = ref(0);

const selectedTagsKey = computed(() => {
  return [...selectedTags.value]
    .map((tag) => String(tag))
    .sort((tagA, tagB) => tagA.localeCompare(tagB))
    .join("|");
});

const hasRegisteredUsers = computed(() => totalItems.value > 0);
const hasFilteredUsers = computed(() => profiles.value.length > 0);

watch(openFilter, (isOpen) => {
  document.documentElement.classList.toggle("overflow-hidden", isOpen);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("overflow-hidden");
});

async function loadProfiles() {
  const currentRequestId = ++fetchRequestId.value;
  isLoading.value = true;
  loadError.value = null;

  try {
    const response = await fetchRegisteredProfiles({
      excludeLoggedUser: true,
      paginated: true,
      page: currentPage.value,
      pageSize: USERS_PER_PAGE,
      selectedTags: selectedTags.value,
    });

    if (currentRequestId !== fetchRequestId.value) return;

    profiles.value = response?.profiles ?? [];
    totalPages.value = response?.totalPages ?? 1;
    totalItems.value = response?.totalItems ?? profiles.value.length;

    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
      return;
    }
  } catch (error) {
    if (currentRequestId !== fetchRequestId.value) return;
    profiles.value = [];
    totalPages.value = 1;
    totalItems.value = 0;
    loadError.value = error?.message || "Errore durante il recupero utenti";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    if (currentRequestId !== fetchRequestId.value) return;
    isLoading.value = false;
  }
}

async function loadAvailableTags() {
  try {
    availableTags.value = await fetchRegisteredProfileTags({
      excludeLoggedUser: true,
    });
  } catch (error) {
    availableTags.value = [];
    snackbar.addMessage(
      error?.message || "Errore durante il recupero tag utenti",
      "error"
    );
  }
}

function openProfile(profileTag) {
  if (typeof profileTag !== "string") return;

  const normalizedTagSlug = profileTag.trim().replace(/^@+/, "");
  if (!normalizedTagSlug) return;

  router.push(`/profile/${encodeURIComponent(normalizedTagSlug)}`);
}

watch(currentPage, () => {
  loadProfiles();
});

watch(selectedTagsKey, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
    return;
  }

  loadProfiles();
});

definePageMeta({
  middleware: "auth",
});

onMounted(async () => {
  await loadAvailableTags();
  await loadProfiles();
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Community: Amici" fixed />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <p v-if="isLoading" class="friends-state-message">
        Caricamento utenti in corso...
      </p>

      <p v-else-if="loadError" class="friends-state-message friends-state-message--error">
        {{ loadError }}
      </p>

      <p v-else-if="!hasRegisteredUsers" class="friends-state-message">
        Nessun utente iscritto disponibile.
      </p>

      <p v-else-if="!hasFilteredUsers" class="friends-state-message">
        Nessun utente trovato con i tag selezionati.
      </p>

      <div v-else class="space-y-3 pb-2">
        <article
          v-for="profile in profiles"
          :key="profile.id"
          class="rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
        >
          <button
            type="button"
            class="w-full text-left"
            @click="openProfile(profile.user_tag)"
          >
            <UserIdentityHeader
              :username="profile.display_name ?? profile.username"
              :user-tag="profile.user_tag"
              :avatar-url="profile.avatar_url"
            />
          </button>
        </article>
      </div>
    </div>

    <CommunityFriendsTagFilter
      v-show="openFilter"
      v-model="selectedTags"
      :tag-options="availableTags"
      @close="openFilter = false"
    />

    <MobileFloatMenu :cols="2">
      <template #buttons>
        <MobilePaginationControl
          :page="currentPage"
          :total-pages="totalPages"
          :disabled="isLoading"
          @update:page="currentPage = $event"
        />

        <ButtonMenu
          icon="material-symbols:search-rounded"
          label="Filtra"
          transition
          :delay="100"
          :icon-color="selectedTags.length ? 'orange' : null"
          @click="openFilter = true"
        />
      </template>
    </MobileFloatMenu>
  </section>
</template>

<style scoped>
.friends-state-message {
  margin-top: 1rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
}

.friends-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}
</style>
