<script setup>
import { getConditionMeta } from "@/utilities/enums/conditions";

const props = defineProps({
  listing: {
    type: Object,
    required: true,
  },
  priceLabel: {
    type: String,
    default: "Prezzo vendita x 1",
  },
  currency: {
    type: String,
    default: "EUR",
  },
  showCopies: {
    type: Boolean,
    default: true,
  },
  showPrice: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["open-card"]);

const hasListingCard = computed(() => Boolean(props.listing?.card));

const copiesInSale = computed(() => {
  const parsedValue = Number(props.listing?.quantity);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;
  return parsedValue;
});

const listingPriceValue = computed(() => {
  const parsedValue = Number(props.listing?.price);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});

const conditionMeta = computed(() => getConditionMeta(props.listing?.condition));
const conditionColor = computed(() => conditionMeta.value?.color ?? "#607d8b");
const conditionLabel = computed(() => {
  if (conditionMeta.value?.label) return conditionMeta.value.label;

  const fallbackValue = props.listing?.condition;
  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue.trim();
  }

  return "N/D";
});

const cardName = computed(() => props.listing?.card?.name ?? "Carta in vendita");
const cardRarity = computed(() => props.listing?.card?.rarity ?? "N/D");
const cardIllustration = computed(() => props.listing?.card?.illustration || "Base");
const cardSetName = computed(() => props.listing?.card?.setName ?? "Set non disponibile");

function handleCardOpen(card) {
  emit("open-card", card);
}
</script>

<template>
  <div v-if="hasListingCard" class="flex w-full gap-3">
    <div class="w-2/5 min-w-[100px]">
      <Card :card="listing.card" @open="handleCardOpen" />
    </div>

    <div class="w-full flex-1 flex flex-col justify-between gap-1">
      <div class="sell-card-summary">
        <p class="sell-card-name line-clamp-2">{{ cardName }}</p>
        <p v-if="showCopies" class="sell-card-copies mb-1 text-xs">{{ copiesInSale }} copie in vendita</p>
        <v-chip size="x-small" variant="flat" label :color="conditionColor" class="w-fit font-bold">
          {{ conditionLabel }}
        </v-chip>
      </div>

      <p class="text-xs font-bold">{{ cardRarity }} | {{ cardIllustration }}</p>
      <p class="text-xs font-thin line-clamp-2">{{ cardSetName }}</p>
      
      

      <CardPriceLink
        v-if="showPrice"
        class="mt-1 pb-0"
        :price="listingPriceValue"
        :show-outer-padding="false"
        :link-enabled="false"
        :label="priceLabel"
        :currency="currency"
      />
    </div>
  </div>
</template>

<style scoped>
.sell-card-name {
  color: rgba(248, 250, 252, 0.98);
  font-weight: 700;
  line-height: 1.2;
}

.sell-card-copies {
  color: orange;
  font-weight: 600;
}
</style>
