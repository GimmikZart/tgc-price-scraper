<script setup>
const route = useRoute();

const SELL_CARDS_PATH = "/community/sell-cards";
const CURRENT_SELLS_PATH = `${SELL_CARDS_PATH}/current-sells`;
const NEW_SELL_PATH = `${SELL_CARDS_PATH}/new-sell`;

definePageMeta({
  middleware: "auth",
});

if (route.path === SELL_CARDS_PATH || route.path === `${SELL_CARDS_PATH}/`) {
  await navigateTo(CURRENT_SELLS_PATH, { replace: true });
}

const showDefaultFloatMenu = computed(() => {
  return route.path !== NEW_SELL_PATH && route.path !== `${NEW_SELL_PATH}/`;
});
</script>

<template>
  <section class="relative h-full">
    <NuxtPage />
    <CommunitySellCardsFloatMenu v-if="showDefaultFloatMenu" />
  </section>
</template>
