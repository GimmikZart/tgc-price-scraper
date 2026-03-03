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
const sellerProfileTag = computed(() => {
  const value = props.listing?.sellerUserTag ?? props.listing?.sellerProfile?.user_tag;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
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
const showStandaloneProposalsHeader = computed(() => {
  return props.showProposalsInHeaderSlot && !props.showSellerIdentity;
});
const showBottomProposalsMeta = computed(() => !props.showProposalsInHeaderSlot);

function goToListingDetails() {
  if (!props.listing?.id) return;
  router.push(`${normalizedDetailsPathBase.value}/${props.listing.id}`);
}
</script>

<template>
<div>
  <div v-if="showStandaloneProposalsHeader" class="sell-listing-inline-proposals">
    <v-chip size="small" density="comfortable" variant="outlined" color="gray" label class="identity-proposals-chip identity-proposals-chip--inline">
      {{ proposalsCount }} Proposte
    </v-chip>
  </div>
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
      :profile-tag="sellerProfileTag"
      :avatar-url="sellerAvatarUrl"
      size="sm"
    >
      <template v-if="showProposalsInHeaderSlot" #trailing>
        <v-chip size="small" variant="outlined" color="gray" label class="identity-proposals-chip">
          {{ proposalsCount }} Proposte
        </v-chip>
      </template>
    </UserIdentityHeader>
    
    <CommunitySellListingInfoCard
      :listing="listing"
      @open-card="goToListingDetails"
    />
  </article>
</div>
</template>

<style scoped>
.sell-listing-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.9rem 0rem 0.9rem 0.9rem;
  background: linear-gradient(140deg, rgba(14, 21, 33, 0.96), rgba(9, 13, 22, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 14px 26px rgba(0, 0, 0, 0.45);
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sell-listing-inline-proposals {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  min-height: 0.8rem;
  background: transparent;
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

.identity-proposals-chip--inline {
  min-height: 1.4rem;
  padding-left: 0.52rem !important;
  padding-right: 0.52rem !important;
  border-radius: 0.72rem 0.72rem 0rem 0rem !important;
  border-color: rgba(255, 255, 255, 0.24) !important;
  border-bottom: 0px;
  margin-bottom: -2px;
  z-index: 2;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(8, 12, 20, 0.96)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 6px 14px rgba(2, 6, 23, 0.18);
}
</style>
