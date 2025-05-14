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
  editMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['edit-product']);

const editClass = computed(() => {
  return {
    'border border-4 border-yellow-500 swing-anim': props.editMode,
  }
});

const lastUpdate = computed(() => {
  if (props.product?.last_update) {
    return dayjs(props.product.last_update).fromNow()
  }
  return null
});

function handleClick() {
  if (props.editMode) {
    emit('edit-product', props.product)
  } else {
    window.open(props.product.url, '_blank')
  }
}
</script>

<template>
  <v-card flat class="h-100 pa-2" :class="editClass" @click="handleClick" style="transition: all 0.1s ease-in-out;">
    <v-img
      width="100%"
      height="200px"
      :src="product.image_url"
      contain
    ></v-img>
    <h3 v-if="lastUpdate" class="text-xs font-italic">
      {{ lastUpdate }}
    </h3>
    <h3 class="font-bold lg:text-xl">
      {{ product?.store?.name }}
    </h3>
    <div class="flex items-center py-3">
      <v-spacer></v-spacer>
      <div v-if="product.original_price && product.discounted_price" class="flex items-center justify-end">
          <span class="text-black/40 line-through mr-1 text-xs lg:text-base">{{ product.original_price }} </span>
          <span class="font-bold text-xs lg:text-base">{{ product.discounted_price }}{{ product?.currency?.code }}</span>
        </div>
        <span v-else class="ml-auto font-bold text-xs lg:text-base">{{ product.regular_price}} {{ product?.currency?.code }}</span>
    </div>
  </v-card>
</template>
<style>
@keyframes swing {
  0%   { transform: rotate(-0.5deg); }
  50%  { transform: rotate(0.5deg); }
  100% { transform: rotate(-0.5deg); }
}

.swing-anim {
  animation: swing 0.5s infinite ease-in-out;
}

</style>