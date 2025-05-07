<script setup>
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/it'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)
dayjs.locale('it')

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

const lastUpdate = computed(() => {
  if (props.product?.last_update) {
    return dayjs(props.product.last_update).fromNow()
  }
  return null
});

function startEdit() {
  emit('edit-product', props.product);
}
</script>

<template>
  <div class="border rounded flex flex-col w-full h-full hover:scale-105 transition-transform duration-400 ease-in-out">
    <v-btn variant="tonal" v-if="isEditable" @click="startEdit">EDIT</v-btn>
    <img :src="product.image_url" class="w-full bg-white h-auto" />
    <div class="p-5 h-full flex flex-col justify-between">
      <div class="flex flex-col">
        <h3 v-if="lastUpdate" class="text-xs font-bold mb-2">
          {{ lastUpdate }}
        </h3>
        <NuxtLink
          class="lg:text-2xl d-block font-bold hover:text-blue-600 hover:underline decoration-solid"
          :to="product?.store?.website"
          external
          target="_blank"
        >
          {{ product?.store?.name }}
        </NuxtLink>
        <v-chip  v-if="product?.category" class="d-none lg:d-block">
          <span class="text-xs lg:text-base">{{ product?.category?.name }}</span>
        </v-chip>
        <h4 class="lg:text-xl d-none lg:d-block">
          {{ product?.set?.game?.name }}
        </h4>
        <h4 class="text-sm font-italic my-2 lg:text-lg">
          {{ product?.set?.name }}
        </h4>
        <h4 class="text-sm lg:text-lg font-bold">
          {{ product?.set?.code }} ({{ product?.lang?.code }})
        </h4>
      </div>
      
      <div class="ml-auto mt-4 text-lg flex flex-col lg:flex-row justify-end">
        <span class="mr-3">💸 Prezzo:</span>
        <div v-if="product.original_price && product.discounted_price" class="flex items-center justify-end">
          <span class="text-gray-500 font-bold line-through mr-1">{{ product.original_price }} </span>
          <span class="text-red-500 font-bold">{{ product.discounted_price }}{{ product?.currency?.code }}</span>
        </div>
        <span v-else class="font-bold ml-auto">{{ product.regular_price}} {{ product?.currency?.code }}</span>
      </div>
    </div>
    
    <div class="flex">
      <v-btn variant="tonal" :href="product.url" target="_blank" class="w-100 p-3 bg-black">Vai al prodotto</v-btn>
    </div>
  </div>
</template>