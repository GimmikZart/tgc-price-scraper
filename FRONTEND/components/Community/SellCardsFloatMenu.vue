<script setup>
const route = useRoute();
const router = useRouter();

const SELL_CARDS_BASE_PATH = "/community/sell-cards";
const CURRENT_SELLS_PATH = `${SELL_CARDS_BASE_PATH}/current-sells`;
const NEW_SELL_PATH = `${SELL_CARDS_BASE_PATH}/new-sell`;

const isRouteActive = (path) => {
  return route.path === path || route.path === `${path}/`;
};

function navigateToPath(path) {
  if (isRouteActive(path)) return;
  router.push(path);
}
</script>

<template>
  <MobileFloatMenu :cols="2">
    <template #buttons>
      <ButtonMenu
        icon="mdi:clipboard-clock-outline"
        label="Vendite in corso"
        transition
        :delay="200"
        :icon-color="isRouteActive(CURRENT_SELLS_PATH) ? 'orange' : null"
        @click="navigateToPath(CURRENT_SELLS_PATH)"
      />
      <ButtonMenu
        icon="mdi:cash-plus"
        label="Nuova Vendita"
        transition
        :delay="100"
        :icon-color="isRouteActive(NEW_SELL_PATH) ? 'orange' : null"
        @click="navigateToPath(NEW_SELL_PATH)"
      />
    </template>
  </MobileFloatMenu>
</template>
