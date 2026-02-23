<script setup>
const route = useRoute();
const router = useRouter();

const SELL_CARDS_BASE_PATH = "/community/sell-cards";
const SELL_HISTORY_PATH = `${SELL_CARDS_BASE_PATH}/sell_history`;
const FILTER_QUERY_KEY = "open-filter";

const isRouteActive = (path) => {
  return route.path === path || route.path === `${path}/`;
};

function navigateToPath(path) {
  if (isRouteActive(path)) return;
  router.push(path);
}

function handleOpenFilter() {
  if (!isRouteActive(SELL_CARDS_BASE_PATH)) return;

  router.replace({
    path: SELL_CARDS_BASE_PATH,
    query: {
      ...route.query,
      [FILTER_QUERY_KEY]: String(Date.now()),
    },
  });
}
</script>

<template>
  <MobileFloatMenu :cols="2">
    <template #buttons>
      <ButtonMenu
        icon="mdi:format-list-bulleted"
        label="Storico"
        transition
        :delay="100"
        :icon-color="isRouteActive(SELL_HISTORY_PATH) ? 'orange' : null"
        @click="navigateToPath(SELL_HISTORY_PATH)"
      />

      <ButtonMenu
        icon="material-symbols:search-rounded"
        label="Filtra"
        transition
        :delay="200"
        @click="handleOpenFilter"
      />
    </template>
  </MobileFloatMenu>
</template>
