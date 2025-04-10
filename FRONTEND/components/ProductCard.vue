<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <a :href="product.scraper.url" target="_blank" class="border rounded p-5 flex flex-col gap-3 w-full h-full hover:scale-105 hover:cursor-pointer transition-transform duration-400 ease-in-out">
    <template v-if="product.status === 'pending'">Loading...</template>
    <template v-if="product.status === 'success'">
      <img :src="product.info.image" class="w-full h-auto" />
      <a
        class="text-2xl font-bold hover:text-blue-600 hover:underline decoration-solid"
        :href="product.store.website"
      >
        {{ product.store.name }}
      </a>
      <h4 class="text-xl">
        {{ product.game.name }} - {{ product.game.set }} ({{ product.game.lang }})
      </h4>
      <p class="ml-auto mt-4 text-lg">
        💸 Price: <strong>{{ product.info.price }}</strong>
      </p>
    </template>
    <template v-if="product.status === 'error'">ERRORE</template>
  </a>
</template>