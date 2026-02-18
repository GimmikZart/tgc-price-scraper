<script setup>
const props = defineProps({
  price: {
    type: [String, Number, null],
    default: null,
  },
  href: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: "CardTrader",
  },
  currency: {
    type: String,
    default: "€",
  },
  handleCards: {
    type: Boolean,
    default: false,
  },
  showOuterPadding: {
    type: Boolean,
    default: true,
  },
  linkEnabled: {
    type: Boolean,
    default: true,
  },
});

const canOpenLink = computed(() => Boolean(props.linkEnabled && props.href));
const displayPrice = computed(() => {
  if (props.price === null || props.price === undefined || props.price === "") {
    return `--- ${props.currency}`;
  }

  return `${props.price} ${props.currency}`;
});
</script>

<template>
  <div :class="[showOuterPadding ? 'px-1' : '', handleCards ? 'pt-2' : 'py-2']">
    <component
      :is="canOpenLink ? 'a' : 'div'"
      class="card-price-link flex w-full flex-col items-center justify-between gap-1 rounded-lg px-4 py-1 text-center text-white"
      :href="canOpenLink ? href : undefined"
      :target="canOpenLink ? '_blank' : undefined"
      :rel="canOpenLink ? 'noopener noreferrer' : undefined"
    >
      <span class="text-[10px] uppercase tracking-[0.08em] text-[#ffd4aa]/90">{{ label }}</span>
      <div class="w-full text-center text-xs font-bold">{{ displayPrice }}</div>
    </component>
  </div>
</template>

<style scoped>
.card-price-link {
  border: 2px solid rgba(255, 255, 255, 0.14);
}
</style>
