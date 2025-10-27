<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: false,
    default: "orange", // colore del testo/bordo base
  },
  iconColor: {
    type: String,
    default: null, // se non passato, usa lo stesso di color
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["click"]);
</script>

<template>
  <button
    class="p-2 border rounded-lg relative flex flex-col items-center justify-center transition-all duration-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="`border-${color} text-white`"
    :disabled="disabled"
    @click="emit('click')"
  >
    <Icon
      :icon="icon"
      class="text-2xl"
      :style="{ color: iconColor || color }"
    />
    <span class="text-xs mt-0.5">{{ label }}</span>
  </button>
</template>
