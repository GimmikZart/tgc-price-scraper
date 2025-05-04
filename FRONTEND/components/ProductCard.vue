<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  isEditable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['edit-product']);

function startEdit() {
  emit('edit-product', props.product);
}
</script>

<template>
  <div class="border rounded flex flex-col w-full h-full hover:scale-105 transition-transform duration-400 ease-in-out">
    <v-btn variant="tonal" v-if="isEditable" @click="startEdit">EDIT</v-btn>
    <img :src="product.image_url" class="w-full h-auto" />
    <div class="p-5">
      <NuxtLink
        class="text-2xl font-bold hover:text-blue-600 hover:underline decoration-solid"
        :to="product?.store?.website"
        external
        target="_blank"
      >
        {{ product?.store?.name }}
      </NuxtLink>
      <v-chip v-if="product?.category">{{ product?.category?.name }}</v-chip>
      <h4 class="text-xl">
        {{ product?.set?.game?.name }}
      </h4>
      <h4 class="text-lg">
        {{ product?.set?.code }} ({{ product?.lang?.code }})
      </h4>
      <div class="ml-auto mt-4 text-lg flex justify-end">
        <span class="mr-3">💸 Prezzo:</span>
        <div v-if="product.original_price && product.discounted_price">
          <span class="text-gray-500 font-bold line-through mr-1">{{ product.original_price }} </span>
          <span class="text-red-500 font-bold">{{ product.discounted_price }}{{ product?.currency?.code }}</span>
        </div>
        <span v-else class="font-bold">{{ product.regular_price}} {{ product?.currency?.code }}</span>
      </div>
    </div>
    
    <div class="flex">
      <v-btn variant="tonal" :href="product.url" target="_blank" class="w-100 p-3 bg-black">Vai al prodotto</v-btn>
    </div>
  </div>
</template>