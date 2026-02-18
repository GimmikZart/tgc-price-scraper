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

const username = computed(() => {
  const value = props.offerListing?.offererUsername ?? props.offerListing?.offererProfile?.username;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "Username";
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
      <div class="offer-value-box offer-value-box--qty">
        {{ quantityValue }}
      </div>
      <div class="offer-value-box offer-value-box--offer">
        {{ offerValue }} EUR
      </div>
    </div>
  </article>

  <div class="offer-row-status">
    <v-chip size="x-small" variant="flat" label :color="statusColor" class="font-bold">
      {{ statusLabel }}
    </v-chip>
  </div>
</template>

<style scoped>
.offer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.9rem;
  background: rgba(241, 245, 249, 0.88);
  color: rgba(15, 23, 42, 0.95);
  padding: 0.45rem 0.55rem;
}

.offer-row-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.offer-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 2px solid rgba(15, 23, 42, 0.9);
  display: grid;
  place-content: center;
  font-size: 0.82rem;
  font-weight: 800;
}

.offer-user {
  min-width: 0;
}

.offer-username {
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.1;
}

.offer-user-tag {
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.1;
  color: rgba(51, 65, 85, 0.85);
}

.offer-row-values {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.offer-value-box {
  min-width: 4.4rem;
  text-align: center;
  border: 2px solid rgba(15, 23, 42, 0.9);
  border-radius: 0.55rem;
  padding: 0.35rem 0.25rem;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1;
  background: #ffffff;
}

.offer-value-box--qty {
  min-width: 3.4rem;
}

.offer-row-status {
  margin-top: 0.3rem;
  display: flex;
  justify-content: flex-end;
}
</style>
