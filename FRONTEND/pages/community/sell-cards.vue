<script setup>
const route = useRoute();

const SELL_CARDS_PATH = "/community/sell-cards";
const CURRENT_SELLS_PATH = `${SELL_CARDS_PATH}/current-sells`;

definePageMeta({
  middleware: "auth",
});

if (route.path === SELL_CARDS_PATH || route.path === `${SELL_CARDS_PATH}/`) {
  await navigateTo(CURRENT_SELLS_PATH, { replace: true });
}
</script>

<template>
  <section class="relative h-full">
    <NuxtPage />
    <CommunitySellCardsFloatMenu />
  </section>
</template>
