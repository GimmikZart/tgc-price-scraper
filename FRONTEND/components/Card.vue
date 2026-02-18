<script setup>
import { ref, computed, toRefs } from "vue";
import { getShortSetName } from "@/utilities/cardsFieldsParser";

const props = defineProps({
  card: { type: Object, required: true },
  chooseCard: { type: Boolean, default: false },
  handleCards: { type: Boolean, default: false },
  disableOpening: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
  showCount: { type: Boolean, default: false },
  showPrice: { type: Boolean, default: false },
});
const emit = defineEmits(["remove-card", "add-card", "choose-card", "open"]);
const { card, chooseCard, handleCards, disableOpening, cardCount, showCount, showPrice } = toRefs(props);
const isLoaded = ref(false);

const cardClass = computed(() => ({
  "card-shell card-shell--framed": handleCards.value || !isLoaded.value,
  relative: showCount.value || showPrice.value,
}));

const shortSetName = computed(() => getShortSetName(card.value?.setName));
const cardUrl = computed(() => (card.value?.price ? card.value?.slugs?.[0]?.url ?? null : null));

function onLoad() {
  if (!isLoaded.value) isLoaded.value = true;
}
function openCard() {
  if (!disableOpening.value) emit("open", card.value);
}
</script>

<template>
  <div :key="card.id" class="flex flex-col" :class="cardClass">
    <v-skeleton-loader
      v-if="!isLoaded"
      type="image"
      color="black"
      class="image-skeleton w-full overflow-hidden aspect-[63/88] rounded-lg"
    />

    <div
      v-if="!handleCards && showCount && isLoaded"
      class="card-count-badge absolute right-1/2 top-2 z-20 -translate-y-1/2 translate-x-1/2 px-4 py-[2px] text-[11px] font-semibold tabular-nums"
    >
      x {{ cardCount }}
    </div>

    <div class="card-shell card-surface relative flex h-auto flex-col justify-end overflow-hidden rounded-lg">
      <NuxtImg
        v-show="card.image"
        :src="card.image"
        format="webp"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        class="card-image block w-full border border-white/15 shadow-[0_10px_20px_rgba(0,0,0,0.55)]"
        :class="{ 'h-[1px]': !isLoaded, 'h-auto': isLoaded }"
        fit="cover"
        :alt="card.name"
        @load="onLoad"
        @click="openCard"
        placeholder
      />
      <div
        v-if="isLoaded && (showPrice || handleCards)"
        class="card-meta border-t border-white/10 px-2 pt-1 text-[11px] text-slate-200/90"
      >
        <span class="font-semibold">{{ shortSetName }}</span>
        <span> | {{ card.rarity ?? "Base" }}</span>
        <span class="font-light"> | {{ card.illustration ?? "Base" }}</span>
      </div>
      <CardPriceLink
        v-if="showPrice && isLoaded"
        :price="card.price"
        :href="cardUrl"
        :handle-cards="handleCards"
      />
    </div>

    <CardCounter
      v-if="handleCards && isLoaded"
      :model-value="cardCount"
      @decrement="$emit('remove-card', card)"
      @increment="$emit('add-card', card)"
    />

    <v-btn
      v-if="chooseCard && isLoaded"
      class="card-choose-btn mt-1"
      block
      variant="outlined"
      @click="$emit('choose-card', card)"
    >
      SCEGLI
    </v-btn>
  </div>
</template>

<style scoped>
:deep(.v-skeleton-loader.image-skeleton .v-skeleton-loader__bone.v-skeleton-loader__image) {
  height: 100%;
  border-radius: 0.75rem;
}

.card-shell--framed {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.9rem;
  background: linear-gradient(120deg, rgba(11, 18, 32, 0.92) 0%, rgba(8, 12, 20, 0.95) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 14px 30px rgba(0, 0, 0, 0.5);
}

.card-surface::before {
  content: "";
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(115% 90% at 50% -12%, rgba(255, 161, 95, 0.28) 0%, rgba(255, 161, 95, 0.06) 44%, transparent 70%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 40%, rgba(0, 0, 0, 0.18) 100%);
}

.card-image {
  position: relative;
  z-index: 0;
  cursor: zoom-in;
}

.card-meta {
  position: relative;
  z-index: 2;
  backdrop-filter: blur(6px);
  background: linear-gradient(180deg, rgba(12, 16, 26, 0.2), rgba(9, 12, 21, 0.84));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-count-badge {
  border: 1px solid rgba(255, 183, 124, 0.60);
  border-radius: 999px;
  color: #ffe4cb;
  background: linear-gradient(120deg, rgba(255, 122, 24, 0.92), rgba(173, 72, 11, 0.9));
  box-shadow:
    0 8px 18px rgba(255, 122, 24, 0.80),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}

.card-choose-btn {
  border-color: rgba(255, 183, 124, 0.4) !important;
  color: white !important;
  background: linear-gradient(120deg, rgba(255, 122, 24, 0.18), rgba(16, 24, 38, 0.84)) !important;
}
</style>
