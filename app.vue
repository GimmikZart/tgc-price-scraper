<template>
  <div class="mx-auto p-6 space-y-4">
    <h1 class="text-2xl font-bold">TGC Price Scraper 🃏</h1>

    <button
      @click="getPrice"
      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Get Price
    </button>

    <div class="grid grid-cols-8 grid-rows-3 gap-4">
      <ProductCard v-for="(product, idx) in products" :key="idx" :product="product" class="w-full"/>
    </div>

  </div>
</template>

<script setup>
const products = ref([]);
const getPrice = async () => {
  products.value = await useScraper()
}
</script>
