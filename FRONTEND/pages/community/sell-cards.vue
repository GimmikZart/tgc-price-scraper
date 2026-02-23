<script setup>
const route = useRoute();

const SELL_CARDS_PATH = "/community/sell-cards";
const NEW_SELL_PATH = `${SELL_CARDS_PATH}/new-sell`;
const SELL_HISTORY_PATH = `${SELL_CARDS_PATH}/sell_history`;

definePageMeta({
  middleware: "auth",
});

const isListingDetailRoute = computed(() => Boolean(route.params?.id));
const isSellHistoryRoute = computed(() => route.path === SELL_HISTORY_PATH || route.path === `${SELL_HISTORY_PATH}/`);

const showDefaultFloatMenu = computed(() => {
  const isNewSellRoute = route.path === NEW_SELL_PATH || route.path === `${NEW_SELL_PATH}/`;
  const isChatRoute = route.path.includes("/chat");
  return !isNewSellRoute && !isChatRoute && !isListingDetailRoute.value && !isSellHistoryRoute.value;
});
</script>

<template>
  <section class="relative h-full">
    <NuxtPage />
    <CommunitySellCardsFloatMenu v-if="showDefaultFloatMenu" />
  </section>
</template>
