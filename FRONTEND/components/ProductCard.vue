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
  <div class="border rounded p-5 flex flex-col gap-3 w-full h-full hover:scale-105 hover:cursor-pointer transition-transform duration-400 ease-in-out">
    <v-btn v-if="isEditable" @click="startEdit">EDIT</v-btn>
    <img :src="product.image_url" class="w-full h-auto" />
    <NuxtLink
      class="text-2xl font-bold hover:text-blue-600 hover:underline decoration-solid"
      :to="product?.store?.website"
    >
      {{ product?.store?.name }}
    </NuxtLink>
    <h4 class="text-xl">
      {{ product?.set?.game?.name }}
    </h4>
    <h4 class="text-lg">
      {{ product?.set?.code }} ({{ product?.lang?.code }})
    </h4>
    <p class="ml-auto mt-4 text-lg">
      💸 Price: <strong>{{ product.price }} {{ product?.currency?.code }}</strong>
    </p>
  </div>
</template>