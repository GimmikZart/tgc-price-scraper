<script setup>
const route = useRoute();

const SELL_CARDS_PATH = "/community/sell-cards";
const NEW_SELL_PATH = `${SELL_CARDS_PATH}/new-sell`;

definePageMeta({
  middleware: "auth",
});

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
