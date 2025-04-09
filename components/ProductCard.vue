<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

</script>
<template>
    <div class="border rounded p-5 flex flex-col gap-3 w-full">
        <img v-if="product.info.image" :src="product.info.image" class="w-full h-auto"/> 
        <a class="text-3xl font-bold hover:text-blue-600 hover:underline decoration-solid" :href="product.store.website">{{product.store.name}}</a>
        <h4 class="text-xl">{{product.game.name}} - {{product.game.expansion}} ({{product.game.lang}})</h4>
        <p v-if="product.info.price" class="ml-auto mt-4 text-lg">💸 Price: <strong>{{product.info.price }}</strong></p>
    </div>
</template>