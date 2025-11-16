<script setup>

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
});

const availabilityOpen = inject("availabilityOpen");

const collectionAvailabilityClass = function(count) {
  return {
    "bg-green": (count <= props.card.userCountInCollection),
    "bg-red": (count > props.card.userCountInCollection)
  }
}
</script>
<template>
  <div v-show="availabilityOpen" class="py-2">
    <span class="text-xs text-left">{{ card.price ?? '???' }} € </span>
    <div class="w-full flex justify-start gap-1">
      <div 
        v-for="count in card.count" 
        :key="count"
        class="rounded-full w-[5px] h-[5px]"
        :class="collectionAvailabilityClass(count)"
      >
      </div>
    </div>
  </div>
</template>