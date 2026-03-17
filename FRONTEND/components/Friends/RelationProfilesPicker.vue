<script setup>
import FriendsRelationTabs from "@/components/Tabs/FriendsRelationTabs.vue";

const FRIEND_TAB = Object.freeze({
  FOLLOWING: "following",
  FOLLOWERS: "followers",
});

const props = defineProps({
  relationCollections: {
    type: Object,
    default: () => ({
      following: [],
      followers: [],
    }),
  },
  activeTab: {
    type: String,
    required: true,
  },
  isLoadingRelations: {
    type: Boolean,
    default: false,
  },
  relationLoadError: {
    type: String,
    default: null,
  },
  searchResults: {
    type: Array,
    default: () => [],
  },
  hasSearched: {
    type: Boolean,
    default: false,
  },
  isSearching: {
    type: Boolean,
    default: false,
  },
  searchError: {
    type: String,
    default: null,
  },
  submittedQuery: {
    type: String,
    default: "",
  },
  searchTitle: {
    type: String,
    default: "Cerca utenti",
  },
  searchIdleLabel: {
    type: String,
    default: "Usa la barra in basso per cercare un utente.",
  },
  searchEmptyLabel: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["change-tab", "select"]);

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
]);

const visibleProfiles = computed(() => props.relationCollections?.[props.activeTab] ?? []);

const emptyStateLabel = computed(() => {
  if (props.activeTab === FRIEND_TAB.FOLLOWERS) {
    return "Nessun utente ti segue al momento.";
  }

  return "Non stai seguendo nessun utente al momento.";
});

const resolvedSearchEmptyLabel = computed(() => {
  if (props.searchEmptyLabel) return props.searchEmptyLabel;
  return `Nessun utente disponibile per "${props.submittedQuery}".`;
});

function handleSelect(profile) {
  if (!profile?.id) return;
  emit("select", profile);
}

function setActiveTab(tab) {
  emit("change-tab", tab);
}
</script>

<template>
  <div class="space-y-4 pb-2">
    <div>
      <FriendsRelationTabs
        :tabs="tabOptions"
        :active="activeTab"
        @change="setActiveTab"
      />

      <p v-if="isLoadingRelations" class="profile-picker-state-message">
        Caricamento relazioni in corso...
      </p>

      <p v-else-if="relationLoadError" class="profile-picker-state-message profile-picker-state-message--error">
        {{ relationLoadError }}
      </p>

      <p v-else-if="visibleProfiles.length === 0" class="profile-picker-state-message">
        {{ emptyStateLabel }}
      </p>

      <div v-else class="mt-3 space-y-2">
        <button
          v-for="profile in visibleProfiles"
          :key="profile.id"
          type="button"
          class="profile-picker-select"
          @click="handleSelect(profile)"
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

    <div>
      <h3 class="profile-picker-title">{{ searchTitle }}</h3>

      <p v-if="isSearching" class="profile-picker-state-message">
        Ricerca utenti in corso...
      </p>

      <p v-else-if="searchError" class="profile-picker-state-message profile-picker-state-message--error">
        {{ searchError }}
      </p>

      <p v-else-if="!hasSearched" class="profile-picker-state-message">
        {{ searchIdleLabel }}
      </p>

      <p v-else-if="searchResults.length === 0" class="profile-picker-state-message">
        {{ resolvedSearchEmptyLabel }}
      </p>

      <div v-else class="space-y-2">
        <button
          v-for="profile in searchResults"
          :key="profile.id"
          type="button"
          class="profile-picker-select"
          @click="handleSelect(profile)"
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
</template>

<style scoped>
.profile-picker-title {
  margin: 0 0 0.45rem;
  color: rgba(255, 237, 213, 0.96);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-picker-state-message {
  margin-top: 0.75rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.8);
  font-size: 0.86rem;
  font-weight: 600;
}

.profile-picker-state-message--error {
  color: rgba(254, 202, 202, 0.95);
}

.profile-picker-select {
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

.profile-picker-select:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 157, 82, 0.45);
  background: rgba(15, 23, 42, 0.65);
}
</style>
