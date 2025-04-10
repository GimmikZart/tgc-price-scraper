<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <NuxtLink :to="product.url" target="_blank" class="border rounded p-5 flex flex-col gap-3 w-full h-full hover:scale-105 hover:cursor-pointer transition-transform duration-400 ease-in-out">
    <img :src="product.image_url" class="w-full h-auto" />
    <NuxtLink
      class="text-2xl font-bold hover:text-blue-600 hover:underline decoration-solid"
      :to="product.store.website"
    >
      {{ product.store.name }}
    </NuxtLink>
    <h4 class="text-xl">
      {{ product.set.game.name }}
    </h4>
    <h4 class="text-lg">
      {{ product.set.code }} ({{ product.lang.code }})
    </h4>
    <p class="ml-auto mt-4 text-lg">
      💸 Price: <strong>{{ product.price }} {{ product.currency.code }}</strong>
    </p>
  </NuxtLink>
</template>