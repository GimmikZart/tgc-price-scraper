<script setup>
import { getOfferStatusMeta } from "@/utilities/enums/offerStatus";

const props = defineProps({
  offerListing: {
    type: Object,
    required: true,
  },
});

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
</script>

<template>
  <article class="offer-row">
    <div class="offer-row-main">
      <div class="offer-avatar">{{ usernameInitial }}</div>

      <div class="offer-user">
        <p class="offer-username">{{ username }}</p>
        <p class="offer-user-tag">{{ userTag }}</p>
      </div>
    </div>

    <div class="offer-row-values">
      <v-chip size="small" color="default" variant="flat" class="offer-qty-chip" label>
        x {{ quantityValue }}
      </v-chip>

      <div class="offer-price-box">
        {{ offerValue }} €
      </div>

      <div class="offer-status-dot" :style="{ backgroundColor: statusColor }" :title="statusLabel">
        <v-icon size="14" color="white">{{ statusIcon }}</v-icon>
      </div>
    </div>
  </article>
</template>

<style scoped>
.offer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.9rem;
  background: linear-gradient(140deg, rgba(14, 21, 33, 0.96), rgba(9, 13, 22, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 22px rgba(0, 0, 0, 0.34);
  padding: 0.5rem 0.55rem;
}

.offer-row-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.offer-avatar {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  border: 2px solid rgba(248, 250, 252, 0.78);
  display: grid;
  place-content: center;
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(241, 245, 249, 0.95);
}

.offer-user {
  min-width: 0;
}

.offer-username {
  color: rgba(248, 250, 252, 0.95);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.1;
}

.offer-user-tag {
  color: rgba(203, 213, 225, 0.84);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.1;
}

.offer-row-values {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.offer-qty-chip {
  font-weight: 700;
}

.offer-price-box {
  min-width: 4.8rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.55rem;
  padding: 0.35rem 0.35rem;
  font-size: 0.84rem;
  font-weight: 700;
  color: rgba(255, 244, 234, 0.95);
}

.offer-status-dot {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  display: grid;
  place-content: center;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.14),
    0 8px 12px rgba(0, 0, 0, 0.22);
}
</style>
