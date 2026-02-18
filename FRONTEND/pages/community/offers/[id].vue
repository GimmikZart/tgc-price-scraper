<script setup>
import { fetchActiveSellListingById } from "@/api/sellListings";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <CommunitySellListingOffersDetails :fetch-listing-by-id="fetchActiveSellListingById" />
</template>
