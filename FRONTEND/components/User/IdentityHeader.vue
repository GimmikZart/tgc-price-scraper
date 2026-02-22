<script setup>
const props = defineProps({
  username: {
    type: String,
    default: null,
  },
  userTag: {
    type: String,
    default: null,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md"].includes(value),
  },
});

const hasAvatarError = ref(false);

const normalizedAvatarUrl = computed(() => {
  if (typeof props.avatarUrl !== "string") return null;
  const normalizedUrl = props.avatarUrl.trim();
  return normalizedUrl || null;
});

watch(normalizedAvatarUrl, () => {
  hasAvatarError.value = false;
});

const resolvedUsername = computed(() => {
  if (typeof props.username === "string" && props.username.trim()) {
    return props.username.trim();
  }
  return "Utente";
});

const resolvedUserTag = computed(() => {
  if (typeof props.userTag === "string" && props.userTag.trim()) {
    const normalizedTag = props.userTag.trim();
    return normalizedTag.startsWith("@") ? normalizedTag : `@${normalizedTag}`;
  }

  return "@utente";
});

const usernameInitial = computed(() => {
  const normalizedUsername = resolvedUsername.value.trim();
  if (!normalizedUsername) return "?";
  return normalizedUsername[0].toUpperCase();
});

const shouldShowAvatarImage = computed(() => {
  return Boolean(normalizedAvatarUrl.value) && !hasAvatarError.value;
});

function handleAvatarError() {
  hasAvatarError.value = true;
}
</script>

<template>
  <div class="user-identity" :class="{ 'user-identity--small': size === 'sm' }">
    <div class="user-identity-avatar">
      <img
        v-if="shouldShowAvatarImage"
        :src="normalizedAvatarUrl"
        :alt="`Avatar di ${resolvedUsername}`"
        class="user-identity-avatar-image"
        @error="handleAvatarError"
      />
      <span v-else class="user-identity-avatar-fallback">{{ usernameInitial }}</span>
    </div>

    <div class="user-identity-content">
      <p class="user-identity-name">{{ resolvedUsername }}</p>
      <p class="user-identity-tag">{{ resolvedUserTag }}</p>
    </div>

    <div v-if="$slots.trailing" class="user-identity-trailing">
      <slot name="trailing" />
    </div>
  </div>
</template>

<style scoped>
.user-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.45rem 0.55rem;
}

.user-identity-avatar {
  width: 2.55rem;
  height: 2.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  flex-shrink: 0;
  display: grid;
  place-content: center;
}

.user-identity-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-identity-avatar-fallback {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(248, 250, 252, 0.95);
}

.user-identity-content {
  min-width: 0;
  flex: 1;
}

.user-identity-trailing {
  margin-left: auto;
  align-self: flex-center;
  display: flex;
  align-items: center;
}

.user-identity-name {
  color: rgba(248, 250, 252, 0.95);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.1;
}

.user-identity-tag {
  color: rgba(203, 213, 225, 0.82);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.14em;
}

.user-identity--small {
  padding: 0.28rem 0.35rem;
  border-radius: 0.8rem;
  gap: 0.48rem;
}

.user-identity--small .user-identity-avatar {
  width: 1.8rem;
  height: 1.8rem;
}

.user-identity--small .user-identity-avatar-fallback {
  font-size: 0.66rem;
}

.user-identity--small .user-identity-name {
  font-size: 1rem;
  line-height: 1;
}

.user-identity--small .user-identity-tag {
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  line-height: 1;
}
</style>
