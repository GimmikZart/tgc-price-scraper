<script setup>
import FriendsRelationTabs from "@/components/Tabs/FriendsRelationTabs.vue";
import { fetchFriendCollections } from "@/api/friends";

const FRIEND_TAB = {
  FOLLOWING: "following",
  FOLLOWERS: "followers",
  BLOCKED: "blocked",
};

const router = useRouter();
const route = useRoute();
const snackbar = useSnackbar();
const userAuth = useUserAuth();

const friendCollections = ref({
  following: [],
  followers: [],
  blocked: [],
});
const isLoading = ref(true);
const loadError = ref(null);
const fetchRequestId = ref(0);
const activeTab = ref(normalizeFriendTab(route.query.tab));

const currentUserId = computed(() => userAuth?.userLogged?.id ?? null);

const tabOptions = computed(() => [
  {
    label: "Seguiti",
    value: FRIEND_TAB.FOLLOWING,
    tone: "green",
  },
  {
    label: "Ti seguono",
    value: FRIEND_TAB.FOLLOWERS,
    tone: "orange",
  },
  {
    label: "Bloccati",
    value: FRIEND_TAB.BLOCKED,
    tone: "red",
  },
]);

const visibleProfiles = computed(() => friendCollections.value[activeTab.value] ?? []);
const hasVisibleProfiles = computed(() => visibleProfiles.value.length > 0);

const emptyStateLabel = computed(() => {
  if (activeTab.value === FRIEND_TAB.FOLLOWING) {
    return "Non stai seguendo nessun utente al momento.";
  }

  if (activeTab.value === FRIEND_TAB.FOLLOWERS) {
    return "Nessun utente ti segue al momento.";
  }

  return "Non hai ancora bloccato nessun utente.";
});

function normalizeFriendTab(value) {
  const normalizedValue = Array.isArray(value)
    ? String(value[0] ?? "")
    : String(value ?? "");

  switch (normalizedValue) {
    case FRIEND_TAB.FOLLOWERS:
      return FRIEND_TAB.FOLLOWERS;
    case FRIEND_TAB.BLOCKED:
      return FRIEND_TAB.BLOCKED;
    default:
      return FRIEND_TAB.FOLLOWING;
  }
}

function setActiveTab(nextTab) {
  const normalizedTab = normalizeFriendTab(nextTab);
  if (normalizedTab === activeTab.value) return;

  activeTab.value = normalizedTab;

  router.replace({
    query: {
      ...route.query,
      tab: normalizedTab,
    },
  });
}

function goToFriendSearch() {
  router.push("/community/friends/search");
}

async function loadCollections() {
  if (!currentUserId.value) {
    friendCollections.value = {
      following: [],
      followers: [],
      blocked: [],
    };
    isLoading.value = false;
    return;
  }

  const currentRequestId = ++fetchRequestId.value;
  isLoading.value = true;
  loadError.value = null;

  try {
    const collections = await fetchFriendCollections(currentUserId.value);

    if (currentRequestId !== fetchRequestId.value) return;

    friendCollections.value = {
      following: collections?.following ?? [],
      followers: collections?.followers ?? [],
      blocked: collections?.blocked ?? [],
    };
  } catch (error) {
    if (currentRequestId !== fetchRequestId.value) return;

    friendCollections.value = {
      following: [],
      followers: [],
      blocked: [],
    };
    loadError.value = error?.message || "Errore durante il recupero delle amicizie";
    snackbar.addMessage(loadError.value, "error");
  } finally {
    if (currentRequestId !== fetchRequestId.value) return;
    isLoading.value = false;
  }
}

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = normalizeFriendTab(tab);
  },
);

watch(
  currentUserId,
  () => {
    loadCollections();
  },
  { immediate: true },
);

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Amici" fixed />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1">
      <div class="space-y-4 pb-2">
        <FriendsRelationTabs
          :tabs="tabOptions"
          :active="activeTab"
          @change="setActiveTab"
        />

        <p v-if="isLoading" class="friends-state-message">
          Caricamento relazioni in corso...
        </p>

        <p v-else-if="loadError" class="friends-state-message friends-state-message--error">
          {{ loadError }}
        </p>

        <p v-else-if="!hasVisibleProfiles" class="friends-state-message">
          {{ emptyStateLabel }}
        </p>

        <div v-else class="space-y-3">
          <UserIdentityHeader
            v-for="profile in visibleProfiles"
            :key="profile.id"
            :username="profile.display_name ?? profile.username"
            :user-tag="profile.user_tag"
            :profile-tag="profile.user_tag"
            :avatar-url="profile.avatar_url"
          />
        </div>
      </div>
    </div>

    <MobileFloatMenu :cols="1">
      <template #buttons>
        <ButtonMenu
          icon="material-symbols:person-search-rounded"
          label="Cerca nuovi utenti"
          transition
          :delay="100"
          @click="goToFriendSearch"
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
