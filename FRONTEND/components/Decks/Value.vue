<script setup>
import { Icon } from "@iconify/vue";
const props = defineProps({
  cards: {
    type: Array,
    required: true,
  },
});

const cardWithoutPrice = computed(() => {
  return props.cards.filter(card => !card.price);
});
const totalValue = computed(() => {
  return props.cards.reduce((sum, card) => {
    return sum + (card.price || 0) * (card.count || 1);
  }, 0).toFixed(2);
});
</script>
<template>
  <div class="flex justify-between items-center px-5">
    <div class="flex flex-col justify-center">
      <p class="text-xs">Valore del mazzo</p>
      <p v-if="cardWithoutPrice.length > 0" class="flex items-center gap-1 text-xs text-red">
        <Icon color="red" icon="mdi-error"></Icon>
        {{ cardWithoutPrice.length }} carte senza prezzo
      </p>
    </div>
    
    <p class="text-2xl font-bold">{{ totalValue }} €</p>
    
  </div>
</template>