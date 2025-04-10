<script setup>
import { useProductManager } from '@/composables/useProductManager';
import { useSupaProduct } from '@/composables/products';

const rawProductList = await useProductList(); // Lista iniziale dei prodotti
const { filteredAndSortedProducts, filter, sortByPrice } = useProductManager(rawProductList);

const {data: products} = await useAsyncData('products', () =>
  useSupaProduct()
)

</script>
<template>
  <div class="mx-auto p-6 space-y-4">
    <div>
      <input v-model="filter" placeholder="Filter by name..." class="border p-2 rounded" />
      <button @click="sortByPrice" class="ml-2 p-2 bg-blue-500 text-white rounded">Sort by Price</button>
    </div>
    <div class="grid grid-cols-8 grid-rows-3 gap-4">
      <ProductCard
        v-for="(product, idx) in products"
        :key="idx"
        :product="product"
        :id="idx"
        class="w-full"
      />
    </div>
  </div>
</template>
