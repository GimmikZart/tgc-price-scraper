<script setup>
const props = defineProps({
  actionOnDeck: {
    type: String,
    required: false,
    default: "info",
  },
});

const cardsInDeck = inject("cardsInDeck");
const addCardInDeck = inject("addCardInDeck");
const removeCardFromDeck = inject("removeCardFromDeck");

const singleCardsInDeck = computed(() => {
  const uniqueCards = new Map();
  cardsInDeck.value.forEach((card) => {
    if (uniqueCards.has(card.id)) {
      uniqueCards.get(card.id).count++;
    } else {
      uniqueCards.set(card.id, { ...card, count: 1 });
    }
  });
  return Array.from(uniqueCards.values()).sort((a, b) => {
    return a.cost - b.cost || a.name.localeCompare(b.name);
  });
});

function handleCardCopy(card) {
  if (props.actionOnDeck === "add") {
    addCardInDeck(card);
  } else if (props.actionOnDeck === "remove") {
    removeCardFromDeck(card);
  }
}
</script>
<template>
  <div class="h-full bg-black p-2 gap-8">
    <div class="w-full pb-32 grid grid-cols-4 gap-6 px-6">
      <div
        v-for="(card, idx) in singleCardsInDeck"
        :key="idx"
        class="relative h-fit w-full"
      >
        <Card
          v-for="(copy, ydx) in card.count"
          :key="ydx"
          :card="card"
          class="w-full top-0 left-0"
          :class="{
            absolute: ydx > 0,
            'border-[2px] animate-pulse rounded-lg border-red-500': copy > 4,
          }"
          :style="`transform: translateY(${ydx * 6}px) translateX(${
            ydx * 5
          }px) `"
          @click="handleCardCopy(card)"
          :disable-opening="actionOnDeck !== 'info'"
        >
          <template #open-bottom>
            <div class="text-3xl font-bold text-white">x {{ card.count }}</div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>
