<script setup>
import { getConditionMeta } from "@/utilities/enums/conditions";
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
});
const router = useRouter();

const conditionMeta = computed(() => getConditionMeta(props.listing?.condition));

const conditionLabel = computed(() => {
  if (conditionMeta.value?.label) return conditionMeta.value.label;
  const fallbackValue = props.listing?.condition;
  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue.trim();
  }
  return "N/D";
});

const conditionColor = computed(() => conditionMeta.value?.color ?? "#607d8b");

const quantityValue = computed(() => {
  const parsedValue = Number(props.listing?.quantity);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const proposalsCount = computed(() => {
  const parsedValue = Number(props.listing?.offersCount);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const unitPriceValue = computed(() => {
  const parsedValue = Number(props.listing?.price);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return null;
  return parsedValue.toFixed(2);
});

const totalPriceValue = computed(() => {
  const parsedTotal = Number(props.listing?.totalPrice);
  if (Number.isFinite(parsedTotal) && parsedTotal >= 0) {
    return parsedTotal.toFixed(2);
  }

  const parsedUnitPrice = Number(props.listing?.price);
  const parsedQuantity = Number(props.listing?.quantity);
  if (!Number.isFinite(parsedUnitPrice) || !Number.isFinite(parsedQuantity)) {
    return null;
  }

  return (parsedUnitPrice * parsedQuantity).toFixed(2);
});

const cardTraderUrl = computed(() => props.listing?.card?.slugs?.[0]?.url ?? null);
const cardName = computed(() => props.listing?.card?.name ?? "Card in vendita");
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
  <article class="sell-listing-card">
    <div class="sell-listing-image-shell">
      <Card :card="listing.card" :card-count="quantityValue" show-count/>
    </div>

    <div class="sell-listing-meta">
      <v-chip
        size="x-small"
        variant="flat"
        label
        :color="conditionColor"
        class="sell-listing-condition-chip"
      >
        {{ conditionLabel }}
      </v-chip>
      <v-chip 
        size="x-small"
        variant="flat"
        label
      >
        {{ proposalsCount }} Proposte
      </v-chip>
    </div>

    <div
      role="button"
      tabindex="0"
      class="w-full cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80"
      :aria-label="`Apri dettaglio vendita di ${cardName}`"
      @click="goToListingDetails"
      @keydown.enter.prevent="goToListingDetails"
      @keydown.space.prevent="goToListingDetails"
    >
      <CardPriceLink
        :price="unitPriceValue"
        :href="cardTraderUrl"
        label="Prezzo x 1"
        class="pointer-events-none w-full"
        :show-outer-padding="false"
        :link-enabled="false"
      />
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
  gap: 0.35rem;
}

.sell-listing-image-shell {
  width: 100%;
  aspect-ratio: 63 / 88;
  border-radius: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.04);
}

.sell-listing-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sell-listing-image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.72rem;
  line-height: 1.05;
  text-align: center;
}

.sell-listing-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-height: 1.2rem;
}

.sell-listing-condition-chip {
  font-weight: 700;
}

.sell-listing-qty {
  color: rgba(248, 250, 252, 0.95);
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1;
}
</style>
