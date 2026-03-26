<script setup>
const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  clickable: {
    type: Boolean,
    default: true,
  },
  showCopies: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["open"]);

const cardPrice = computed(() => {
  const parsedValue = Number(props.card?.price);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return parsedValue.toFixed(2);
});

const cardPriceUrl = computed(() => {
  if (!props.card?.price) return null;
  return props.card?.slugs?.[0]?.url ?? null;
});

function handleOpen() {
  if (!props.clickable) return;
  emit("open", props.card);
}
</script>

<template>
  <div class="sell-draft-card-summary">
    <div class="sell-draft-card-summary__card">
      <Card :card="card" @open="handleOpen" />
    </div>

    <div class="sell-draft-card-summary__content">
      <div class="sell-draft-card-summary__head">
        <p class="sell-draft-card-summary__name line-clamp-2">{{ card.name }}</p>
        <p
          v-if="showCopies"
          class="sell-draft-card-summary__copies"
        >
          {{ card.copiesInCollection }} copie in collezione
        </p>
      </div>

      <p class="sell-draft-card-summary__meta">
        {{ card.illustration }} | {{ card.rarity }}
      </p>
      <p class="sell-draft-card-summary__set">{{ card.setName }}</p>

      <CardPriceLink
        :price="cardPrice"
        :href="cardPriceUrl"
        :show-outer-padding="false"
        label="CardTrader"
      />
    </div>
  </div>
</template>

<style scoped>
.sell-draft-card-summary {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  width: 100%;
}

.sell-draft-card-summary__card {
  width: 40%;
  max-width: 9rem;
  flex-shrink: 0;
}

.sell-draft-card-summary__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.45rem;
}

.sell-draft-card-summary__head {
  display: grid;
  gap: 0.18rem;
}

.sell-draft-card-summary__name,
.sell-draft-card-summary__copies,
.sell-draft-card-summary__meta,
.sell-draft-card-summary__set {
  margin: 0;
}

.sell-draft-card-summary__name {
  color: rgba(248, 250, 252, 0.98);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.sell-draft-card-summary__copies {
  color: rgba(255, 183, 124, 0.96);
  font-size: 0.8rem;
  font-weight: 700;
}

.sell-draft-card-summary__meta {
  color: rgba(226, 232, 240, 0.92);
  font-size: 0.75rem;
  font-weight: 700;
}

.sell-draft-card-summary__set {
  color: rgba(203, 213, 225, 0.74);
  font-size: 0.74rem;
  font-weight: 500;
}
</style>
