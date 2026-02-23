<script setup>
import { useRouter } from "vue-router";

const props = defineProps({
  listing: {
    type: Object,
    required: true,
  },
  detailsPathBase: {
    type: String,
    default: "/community/sell-cards/current-sells",
  },
  showProposalsInHeaderSlot: {
    type: Boolean,
    default: false,
  },
  showSellerIdentity:{
    type: Boolean,
    required: false,
    default: true
  }
});
const router = useRouter();

const proposalsCount = computed(() => {
  const parsedValue = Number(props.listing?.offersCount);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const cardName = computed(() => props.listing?.card?.name ?? "Card in vendita");
const sellerName = computed(() => {
  const value = props.listing?.sellerDisplayName ??
    props.listing?.sellerUsername ??
    props.listing?.sellerProfile?.display_name ??
    props.listing?.sellerProfile?.username;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "Venditore";
});
const sellerTag = computed(() => {
  const value = props.listing?.sellerUserTag ?? props.listing?.sellerProfile?.user_tag;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "@venditore";
});
const sellerAvatarUrl = computed(() => {
  const value = props.listing?.sellerAvatarUrl ?? props.listing?.sellerProfile?.avatar_url;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
});
const normalizedDetailsPathBase = computed(() => {
  const path = typeof props.detailsPathBase === "string" ? props.detailsPathBase.trim() : "";
  if (!path) return "/community/sell-cards/current-sells";
  return path.endsWith("/") ? path.slice(0, -1) : path;
});

function goToListingDetails() {
  if (!props.listing?.id) return;
  router.push(`${normalizedDetailsPathBase.value}/${props.listing.id}`);
}
</script>

<template>
  <article
    role="button"
    tabindex="0"
    class="sell-listing-card cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80"
    :aria-label="`Apri dettaglio vendita di ${cardName}`"
    @click="goToListingDetails"
    @keydown.enter.prevent="goToListingDetails"
    @keydown.space.prevent="goToListingDetails"
  >
    <UserIdentityHeader
      v-if="showSellerIdentity"
      :username="sellerName"
      :user-tag="sellerTag"
      :avatar-url="sellerAvatarUrl"
      size="sm"
    >
      <template v-if="showProposalsInHeaderSlot" #trailing>
        <v-chip size="small" variant="outlined" color="gray" label class="identity-proposals-chip">
          {{ proposalsCount }} Proposte
        </v-chip>
      </template>
    </UserIdentityHeader>

    <CommunitySellListingInfoCard :listing="listing" @open-card="goToListingDetails" />

    <div v-if="!showProposalsInHeaderSlot" class="sell-listing-meta">
      <v-chip size="x-small" variant="flat" label>
        {{ proposalsCount }} Proposte
      </v-chip>
    </div>
  </article>
</template>

<style scoped>
.sell-listing-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.9rem;
  background: linear-gradient(140deg, rgba(14, 21, 33, 0.96), rgba(9, 13, 22, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 14px 26px rgba(0, 0, 0, 0.45);
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sell-listing-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}
.identity-proposals-chip {
  border-radius: 0.72rem !important;
  padding-left: 0.6rem !important;
  padding-right: 0.6rem !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  min-height: 1.6rem;
  font-size: 0.68rem;
}
</style>
