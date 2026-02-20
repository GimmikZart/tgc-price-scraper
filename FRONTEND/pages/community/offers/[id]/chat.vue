<script setup>
definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <CommunityOfferListingChatView viewer-role="offerer" />
</template>
