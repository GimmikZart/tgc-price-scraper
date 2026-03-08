<script setup>
const route = useRoute();
const router = useRouter();

const SELL_CARDS_BASE_PATH = "/community/sell-cards";
const SELL_HISTORY_PATH = `${SELL_CARDS_BASE_PATH}/sell_history`;
const NEW_SELL_PATH = `${SELL_CARDS_BASE_PATH}/new-sell`;
const FILTER_QUERY_KEY = "open-filter";
const PRICE_SORT_QUERY_KEY = "sort-price";

const isRouteActive = (path) => {
  return route.path === path || route.path === `${path}/`;
};

function normalizePriceSortDirection(value) {
  const normalizedValue = Array.isArray(value)
    ? String(value[0] ?? "")
    : String(value ?? "");
  return normalizedValue === "asc" ? "asc" : "desc";
}

const isSellListRoute = computed(() => isRouteActive(SELL_CARDS_BASE_PATH));
const isSellHistoryRoute = computed(() => isRouteActive(SELL_HISTORY_PATH));
const activePriceSortDirection = computed(() => normalizePriceSortDirection(route.query[PRICE_SORT_QUERY_KEY]));
const priceSortButtonLabel = computed(() => (activePriceSortDirection.value === "asc" ? "Prezzo ASC" : "Prezzo DESC"));
const priceSortButtonIcon = computed(() => (
  activePriceSortDirection.value === "asc"
    ? "mdi:sort-numeric-ascending"
    : "mdi:sort-numeric-descending"
));
const floatMenuColumns = computed(() => (isSellHistoryRoute.value ? 1 : 3));

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

function handleTogglePriceSort() {
  const nextSortDirection = activePriceSortDirection.value === "asc" ? "desc" : "asc";

  router.replace({
    path: route.path,
    query: {
      ...route.query,
      [PRICE_SORT_QUERY_KEY]: nextSortDirection,
    },
  });
}
</script>

<template>
  <MobileFloatMenu :cols="floatMenuColumns">
    <template #buttons>
      <ButtonMenu
        :icon="priceSortButtonIcon"
        :label="priceSortButtonLabel"
        transition
        :delay="100"
        icon-color="orange"
        @click="handleTogglePriceSort"
      />

      <template v-if="isSellListRoute">
        <ButtonMenu
          icon="mdi:cash-plus"
          label="Nuova vendita"
          transition
          :delay="100"
          icon-color="green"
          @click="navigateToPath(NEW_SELL_PATH)"
        />

        <ButtonMenu
          icon="material-symbols:search-rounded"
          label="Filtra"
          transition
          :delay="200"
          @click="handleOpenFilter"
        />
      </template>
    </template>
  </MobileFloatMenu>
</template>
