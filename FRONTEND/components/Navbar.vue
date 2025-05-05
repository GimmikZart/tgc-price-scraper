<script setup>

</script>
<template>
<div class="flex gap-5 items-center justify-start p-5">
    <h1 class="text-2xl font-bold">TGC Price Scraper 🃏</h1>
    <NuxtLink to="/brands"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">BRANDS</NuxtLink>
    <NuxtLink to="/games"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">GIOCHI</NuxtLink>
    <NuxtLink to="/stores" class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">NEGOZI</NuxtLink>
    <NuxtLink to="/products" on class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">PRODOTTI</NuxtLink>
    <NuxtLink to="/agents"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">AGENTI SPIA</NuxtLink>
    <v-spacer></v-spacer>
    <v-btn @click="useUpdateProductsBatch()">Update All</v-btn>
</div>
</template>