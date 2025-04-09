<template>
  <div class="mx-auto p-6 space-y-4">
    <h1 class="text-2xl font-bold">TGC Price Scraper 🃏</h1>
    <div class="grid grid-cols-8 grid-rows-3 gap-4">
      <ProductCard v-for="(product, idx) in productList" :key="idx" :product="product" :id="idx" class="w-full"/>
    </div>

  </div>
</template>

<script setup>
const productList = await useProductList()
</script>
