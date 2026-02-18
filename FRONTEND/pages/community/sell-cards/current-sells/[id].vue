<script setup>
import { fetchLoggedUserSellListingById } from "@/api/sellListings";
</script>

<template>
  <CommunitySellListingOffersDetails :fetch-listing-by-id="fetchLoggedUserSellListingById" />
</template>
