<script setup>
import { OfferStatus, getOfferStatusMeta } from "@/utilities/enums/offerStatus";
import { useRouter } from "vue-router";

const props = defineProps({
  offerListing: {
    type: Object,
    required: true,
  },
  identityRole: {
    type: String,
    default: "offerer",
    validator: (value) => ["offerer", "seller"].includes(value),
  },
  chatPathBase: {
    type: String,
    default: null,
  },
  offerAmountLabel: {
    type: String,
    default: "Offro",
  },
  showCompletionDate: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();

const statusMeta = computed(() => getOfferStatusMeta(props.offerListing?.status));
const statusLabel = computed(() => statusMeta.value?.label ?? props.offerListing?.status ?? "N/D");
const statusColor = computed(() => statusMeta.value?.color ?? "#607d8b");
const statusIcon = computed(() => statusMeta.value?.icon ?? "mdi-help");
const isAcceptedOffer = computed(() => props.offerListing?.status === OfferStatus.Accepted);

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim();
  return normalizedValue || null;
}

function normalizeTag(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;
  return normalizedValue.startsWith("@") ? normalizedValue : `@${normalizedValue}`;
}

const sellerIdentity = computed(() => ({
  username:
    normalizeText(props.offerListing?.sellerDisplayName) ??
    normalizeText(props.offerListing?.sellerUsername) ??
    normalizeText(props.offerListing?.sellerProfile?.display_name) ??
    normalizeText(props.offerListing?.sellerProfile?.username),
  userTag:
    normalizeTag(props.offerListing?.sellerUserTag) ??
    normalizeTag(props.offerListing?.sellerProfile?.user_tag),
  avatarUrl:
    normalizeText(props.offerListing?.sellerAvatarUrl) ??
    normalizeText(props.offerListing?.sellerProfile?.avatar_url),
}));

const offererIdentity = computed(() => ({
  username:
    normalizeText(props.offerListing?.offererDisplayName) ??
    normalizeText(props.offerListing?.offererUsername) ??
    normalizeText(props.offerListing?.offererProfile?.display_name) ??
    normalizeText(props.offerListing?.offererProfile?.username),
  userTag:
    normalizeTag(props.offerListing?.offererUserTag) ??
    normalizeTag(props.offerListing?.offererProfile?.user_tag),
  avatarUrl:
    normalizeText(props.offerListing?.offererAvatarUrl) ??
    normalizeText(props.offerListing?.offererProfile?.avatar_url),
}));

const identity = computed(() => {
  const primaryIdentity = props.identityRole === "seller"
    ? sellerIdentity.value
    : offererIdentity.value;
  const fallbackIdentity = props.identityRole === "seller"
    ? offererIdentity.value
    : sellerIdentity.value;

  return {
    username: primaryIdentity.username ?? fallbackIdentity.username ?? "Utente",
    userTag: primaryIdentity.userTag ?? fallbackIdentity.userTag ?? "@user-tag",
    avatarUrl: primaryIdentity.avatarUrl ?? fallbackIdentity.avatarUrl ?? null,
  };
});

const username = computed(() => identity.value.username);
const userTag = computed(() => identity.value.userTag);
const avatarUrl = computed(() => identity.value.avatarUrl);

const hasAvatarError = ref(false);
const shouldShowAvatarImage = computed(() => Boolean(avatarUrl.value) && !hasAvatarError.value);

watch(avatarUrl, () => {
  hasAvatarError.value = false;
});

function handleAvatarError() {
  hasAvatarError.value = true;
}

const quantityValue = computed(() => {
  const parsedValue = Number(props.offerListing?.quantity);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const offerValue = computed(() => {
  const parsedValue = Number(props.offerListing?.offer);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return "0.00";
  return parsedValue.toFixed(2);
});
const resolvedOfferAmountLabel = computed(() => {
  if (typeof props.offerAmountLabel !== "string") return "Offro";
  const normalizedLabel = props.offerAmountLabel.trim();
  return normalizedLabel || "Offro";
});
const completionDateLabel = computed(() => {
  if (!props.showCompletionDate) return null;

  const rawValue = props.offerListing?.received_at ?? props.offerListing?.delivered_at ?? null;
  if (typeof rawValue !== "string" || !rawValue.trim()) return null;

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
});

const usernameInitial = computed(() => {
  const normalizedUsername = username.value.trim();
  if (!normalizedUsername) return "?";
  return normalizedUsername[0].toUpperCase();
});

const normalizedChatPathBase = computed(() => {
  if (typeof props.chatPathBase !== "string") return null;
  const normalizedPath = props.chatPathBase.trim();
  if (!normalizedPath) return null;
  return normalizedPath.endsWith("/") ? normalizedPath.slice(0, -1) : normalizedPath;
});

const chatPath = computed(() => {
  const parsedOfferListingId = Number(props.offerListing?.id);
  if (!Number.isInteger(parsedOfferListingId) || parsedOfferListingId <= 0) return null;
  if (!normalizedChatPathBase.value) return null;
  return `${normalizedChatPathBase.value}/${parsedOfferListingId}/chat`;
});

const canOpenChat = computed(() => Boolean(chatPath.value) && !isAcceptedOffer.value);

function handleOpenChat() {
  if (!canOpenChat.value) return;
  router.push(chatPath.value);
}
</script>

<template>
  <article
    class="flex flex-col justify-between gap-[0.6rem] rounded-[0.9rem] border border-[rgba(255,255,255,0.16)] bg-[linear-gradient(140deg,rgba(14,21,33,0.96),rgba(9,13,22,0.96))] px-[0.55rem] py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_22px_rgba(0,0,0,0.34)]"
    :class="canOpenChat ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80' : ''"
    :role="canOpenChat ? 'button' : null"
    :tabindex="canOpenChat ? 0 : null"
    @click="handleOpenChat"
    @keydown.enter.prevent="handleOpenChat"
    @keydown.space.prevent="handleOpenChat"
  >
    <div class="offer-listing-row-shell">
      <div v-if="$slots.left" class="offer-listing-row-left-slot">
        <slot
          name="left"
          :offer-listing="offerListing"
          :can-open-chat="canOpenChat"
          :open-chat="handleOpenChat"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-col justify-between gap-[0.6rem]">
        <div class="flex justify-between w-full items-center gap-[0.6rem]">
          <div class="flex gap-2 items-center">
            <div
              class="offer-listing-avatar"
            >
              <img
                v-if="shouldShowAvatarImage"
                :src="avatarUrl"
                :alt="`Avatar di ${username}`"
                class="offer-listing-avatar-image"
                @error="handleAvatarError"
              />
              <span v-else class="offer-listing-avatar-fallback">{{ usernameInitial }}</span>
            </div>

            <div class="min-w-0">
              <p class="text-[0.9rem] font-bold leading-[1.1] text-[rgba(248,250,252,0.95)]">{{ username }}</p>
              <p class="text-[0.72rem] font-semibold leading-[1.1] text-[rgba(203,213,225,0.84)]">{{ userTag }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <slot
              name="right"
              :offer-listing="offerListing"
              :status-label="statusLabel"
              :status-color="statusColor"
              :status-icon="statusIcon"
              :can-open-chat="canOpenChat"
              :open-chat="handleOpenChat"
            >
              <div
                class="grid h-[1.7rem] w-[1.7rem] place-content-center rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.14),0_8px_12px_rgba(0,0,0,0.22)]"
                :style="{ backgroundColor: statusColor }"
                :title="statusLabel"
              >
                <v-icon size="14" color="white">{{ statusIcon }}</v-icon>
              </div>
            </slot>
          </div>
        </div>

        <div class="offer-listing-footer">
          <p class="offer-listing-footer__amount">
            {{ resolvedOfferAmountLabel }}
            <v-chip class="text-orange" density="compact" variant="tonal">
              {{ offerValue }} &euro;
            </v-chip>
            per
            <span class="text-orange">
              {{ quantityValue }}{{ quantityValue === 1 ? " copia" : " copie" }}.
            </span>
          </p>

          <p v-if="completionDateLabel" class="offer-listing-footer__completion-date">
            Concluso il {{ completionDateLabel }}
          </p>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.offer-listing-avatar {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 9999px;
  overflow: hidden;
  border: 2px solid rgba(248, 250, 252, 0.78);
  background: rgba(15, 23, 42, 0.8);
  display: grid;
  place-content: center;
  flex: 0 0 auto;
}

.offer-listing-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.offer-listing-avatar-fallback {
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(241, 245, 249, 0.95);
}

.offer-listing-row-shell {
  display: flex;
  width: 100%;
  min-height: 0;
  align-items: stretch;
  gap: 0.6rem;
}

.offer-listing-row-left-slot {
  display: flex;
  flex: 0 0 auto;
  width: auto;
  min-height: 0;
  align-self: stretch;
}

.offer-listing-row-left-slot :slotted(*) {
  width: auto;
  height: 100%;
}

.offer-listing-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.45rem 0.8rem;
}

.offer-listing-footer__amount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  line-height: 1.1;
  color: rgba(248, 250, 252, 0.95);
}

.offer-listing-footer__completion-date {
  margin: 0 0 0 auto;
  text-align: right;
  color: rgba(203, 213, 225, 0.78);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.1;
}
</style>
