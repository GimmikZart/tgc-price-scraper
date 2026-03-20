import { fetchLoggedUserPendingPurchaseOfferListingsCount } from "@/api/sellListings";

const BUY_CARDS_BASE_PATH = "/community/buy-cards";
const BUY_CARDS_MAP_PATH = `${BUY_CARDS_BASE_PATH}/map`;
const BUY_CARDS_LIST_PATH = `${BUY_CARDS_BASE_PATH}/list`;
const BUY_PENDING_PURCHASES_PATH = `${BUY_CARDS_BASE_PATH}/current_purchases`;

export function useBuyCardsTabs() {
  const pendingPurchaseOffersCount = useState("buy-cards-pending-purchase-offers-count", () => null);
  const isLoadingPendingPurchaseOffersCount = useState("buy-cards-pending-purchase-offers-count-loading", () => false);

  const hasPendingPurchaseOffers = computed(() => {
    return Number(pendingPurchaseOffersCount.value) > 0;
  });

  const sectionTabs = computed(() => {
    const tabs = [];

    if (hasPendingPurchaseOffers.value) {
      tabs.push({ label: "In corso", path: BUY_PENDING_PURCHASES_PATH });
    }

    tabs.push(
      { label: "Mappa", path: BUY_CARDS_MAP_PATH },
      { label: "Lista", path: BUY_CARDS_LIST_PATH },
    );

    return tabs;
  });

  async function refreshPendingPurchaseOffersCount() {
    if (isLoadingPendingPurchaseOffersCount.value) return pendingPurchaseOffersCount.value;

    isLoadingPendingPurchaseOffersCount.value = true;

    try {
      pendingPurchaseOffersCount.value = await fetchLoggedUserPendingPurchaseOfferListingsCount();
    } catch (error) {
      pendingPurchaseOffersCount.value = 0;
    } finally {
      isLoadingPendingPurchaseOffersCount.value = false;
    }

    return pendingPurchaseOffersCount.value;
  }

  function setPendingPurchaseOffersCount(value) {
    const parsedValue = Number(value);
    pendingPurchaseOffersCount.value = Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0;
  }

  return {
    sectionTabs,
    hasPendingPurchaseOffers,
    pendingPurchaseOffersCount,
    isLoadingPendingPurchaseOffersCount,
    refreshPendingPurchaseOffersCount,
    setPendingPurchaseOffersCount,
  };
}
