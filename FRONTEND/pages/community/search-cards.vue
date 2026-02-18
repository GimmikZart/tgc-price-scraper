<script setup>
const router = useRouter();

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <section class="relative h-full">
    <Toolbar label="Compra Carte" />

  </section>
</template>
