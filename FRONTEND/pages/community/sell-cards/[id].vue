<script setup>
import {
  fetchLoggedUserSellListingById,
  fetchOfferListingsBySellListingId,
} from "@/api/sellListings";

const snackbar = useSnackbar();
const offerListings = ref([]);
const isLoadingOfferListings = ref(false);

function handleListingUpdated(listing) {
  offerListings.value = [];

  if (!listing?.id) return;
  loadOfferListings(listing.id);
}

async function loadOfferListings(sellListingId) {
  isLoadingOfferListings.value = true;

  try {
    offerListings.value = await fetchOfferListingsBySellListingId(sellListingId);
  } catch (error) {
    offerListings.value = [];
    snackbar.addMessage(error.message || "Errore durante il recupero delle proposte", "error");
  } finally {
    isLoadingOfferListings.value = false;
  }
}
</script>

<template>
  <CommunitySellListingOffersDetails
    :fetch-listing-by-id="fetchLoggedUserSellListingById"
    :proposals="offerListings"
    :is-loading-proposals="isLoadingOfferListings"
    @listing-updated="handleListingUpdated"
  />
</template>
