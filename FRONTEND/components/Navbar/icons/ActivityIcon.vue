<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="3.7"
      y="4.2"
      width="16.6"
      height="15.6"
      rx="2.3"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <path
      d="M5.9 15.2H8.3L10.1 10L12.4 16.2L14.2 12.7H18.1"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
