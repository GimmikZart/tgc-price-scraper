<script setup>
import { getOfferStatusMeta } from "@/utilities/enums/offerStatus";
import { useRouter } from "vue-router";

const props = defineProps({
  offerListing: {
    type: Object,
    required: true,
  },
  chatPathBase: {
    type: String,
    default: null,
  },
});

const router = useRouter();

const statusMeta = computed(() => getOfferStatusMeta(props.offerListing?.status));
const statusLabel = computed(() => statusMeta.value?.label ?? props.offerListing?.status ?? "N/D");
const statusColor = computed(() => statusMeta.value?.color ?? "#607d8b");
const statusIcon = computed(() => statusMeta.value?.icon ?? "mdi-help");

const username = computed(() => {
  const value = props.offerListing?.offererUsername ?? props.offerListing?.offererProfile?.username;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "Utente";
});

const userTag = computed(() => {
  const value = props.offerListing?.offererUserTag ?? props.offerListing?.offererProfile?.user_tag;
  if (typeof value === "string" && value.trim()) {
    const normalizedTag = value.trim();
    return normalizedTag.startsWith("@") ? normalizedTag : `@${normalizedTag}`;
  }
  return "@user-tag";
});

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

const canOpenChat = computed(() => Boolean(chatPath.value));

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
    <div class="flex justify-between w-full items-center gap-[0.6rem]">
      <div class="flex gap-2 items-center">
        <div
          class="grid h-[2.15rem] w-[2.15rem] place-content-center rounded-full border-2 border-[rgba(248,250,252,0.78)] text-[0.82rem] font-extrabold text-[rgba(241,245,249,0.95)]"
        >
          {{ usernameInitial }}
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
          <v-chip
            v-if="canOpenChat"
            size="x-small"
            color="orange"
            variant="tonal"
            class="font-bold"
            label
          >
            <v-icon start size="13">mdi-chat-processing</v-icon>
            Chat
          </v-chip>

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
    <p class="flex items-center gap-2 leading-[1.1] text-[rgba(248,250,252,0.95)]"> 
      Offro 
      <v-chip class="text-orange" density="compact" variant="tonal">
        {{ offerValue }} € 
      </v-chip>
      per 
      <span class="text-orange">
        {{ quantityValue }}{{ quantityValue === 1 ? " copia" : " copie" }}.
      </span>
    </p>
    
    <!-- <div class="flex items-center gap-[0.4rem]">
      <v-chip size="small" color="default" variant="flat" class="font-bold" label>
        x {{ quantityValue }}
      </v-chip>

      <div class="min-w-[4.8rem] rounded-[0.55rem] border border-[rgba(255,255,255,0.2)] px-[0.35rem] py-[0.35rem] text-center text-[0.84rem] font-bold text-[rgba(255,244,234,0.95)]">
        {{ offerValue }} EUR
      </div>

    </div> -->
  </article>
</template>
