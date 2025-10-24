<script setup>
const props = defineProps({
  actionOnDeck: {
    type: String,
    required: false,
    default: "info",
  },
  singleCardsInDeck: {
    type: Array,
    required: true,
  },
});

const addCardInDeck = inject("addCardInDeck");
const removeCardFromDeck = inject("removeCardFromDeck");

const { show: viewerOpen, index: viewerIndex, open: openViewer } = useCardViewer(props.singleCardsInDeck);

function handleCardCopy(card) {
  if (props.actionOnDeck === "add") {
    addCardInDeck(card);
  } else if (props.actionOnDeck === "remove") {
    removeCardFromDeck(card);
  }
}
</script>
<template>
  <div class="h-auto bg-black p-2 gap-8">
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
          @open="openViewer(card)"
          :disable-opening="actionOnDeck !== 'info'"
        />
      </div>
    </div>

    <FullscreenCardViewer
      v-model:show="viewerOpen"
      v-model:index="viewerIndex"
      :cards="singleCardsInDeck"
      @close="viewerOpen = false"
    />
  </div>
</template>
