<script setup>
import { Icon } from "@iconify/vue";
import { ref, computed, onMounted } from "vue";
import { onClickOutside } from "@vueuse/core";

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, default: "orange" },
  iconColor: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  multi: { type: Boolean, default: false },
  direction: { type: String, default: "up" },    // up | down | left | right

  transition: { type: Boolean, default: false },  // <-- attiva/disattiva animazione
  duration: { type: Number, default: 500 },       // ms
  delay: { type: Number, default: 0 }             // ms
});

const emit = defineEmits(["click"]);
const multiOpened = ref(false);
const rootEl = ref(null); //

// se transition=false, partiamo già "entrati" (nessuna animazione)
const entered = ref(!props.transition);

onClickOutside(rootEl, () => {
  closeMenu();
});

function closeMenu() {
  multiOpened.value = false;
}

onMounted(() => {
  if (!props.transition) return;
  // prossimo frame per applicare lo stato iniziale prima del target
  requestAnimationFrame(() => (entered.value = true));
});

const startClasses = computed(() => {
  if (!props.transition) return "";
  switch (props.direction) {
    case "up":    return "opacity-0 translate-y-full";
    case "down":  return "opacity-0 -translate-y-full";
    case "left":  return "opacity-0 translate-x-full";
    case "right": return "opacity-0 -translate-x-full";
    default:      return "opacity-0 translate-y-full";
  }
});

const endClasses = computed(() => {
  if (!props.transition) return "";
  else if(props.transition && props.disabled) {
    return "opacity-50 translate-x-0 translate-y-0 cursor-not-allowed";
  } else {
    return "opacity-100 translate-x-0 translate-y-0";
  } 
});

// timing solo se la transizione è attiva
const timingStyle = computed(() =>
  props.transition
    ? {
        transitionDuration: `${props.duration}ms`,
        transitionDelay: `${props.delay}ms`
      }
    : null
);

const animateBase = computed(() =>
  props.transition ? "will-change-transform transition-all ease-out" : ""
);
</script>

<template>
  <div ref="rootEl" class="flex bg-black mt-2 items-center justify-end flex-col relative">
    <Icon v-if="multi" :class="multiOpened ? 'rotate-180' : 'rotate-0'" class="transition-all absolute -top-0 left-1/2 -translate-x-1/2" icon="lucide:chevron-up" />
    <button
      :style="timingStyle"
      :class="[
        `p-2  border rounded-lg flex flex-col items-center justify-center hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white border-${color}`,
        animateBase,
        entered ? endClasses : startClasses,
        multi ? 'pt-4' : '',
      ]"
      :disabled="disabled"
      @click="multi ? (multiOpened = !multiOpened) : emit('click')"
    >
      <Icon :icon="icon" class="text-2xl" :style="{ color: iconColor || color }" />
      <span class="text-xs mt-0.5">{{ label }}</span>
    </button>

    <div
      v-if="multiOpened"
      @click="closeMenu()"
      class="absolute z-10 bg-black p-3 px-5 rounded-lg z-[10000]"
      :class="{
        'bottom-full mb-2 flex flex-col items-center': direction === 'up',
      'top-full mt-2 flex flex-col items-center': direction === 'down',
      'right-full mr-2 flex flex-col items-center': direction === 'left',
      'left-full ml-2 flex flex-col items-center': direction === 'right'
      }"
    >
      <slot name="buttons"></slot>
    </div>
  </div>
</template>
