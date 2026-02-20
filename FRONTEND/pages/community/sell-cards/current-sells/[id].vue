<script setup>
const route = useRoute();

const listingId = String(route.params.id ?? "").trim();
const targetPath = listingId
  ? `/community/sell-cards/${listingId}`
  : "/community/sell-cards";

await navigateTo(targetPath, { replace: true });
</script>
