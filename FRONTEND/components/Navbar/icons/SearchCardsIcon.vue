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
      x="3.8"
      y="4.7"
      width="10.9"
      height="14.1"
      rx="2.1"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M6.4 8.3H12.1M6.4 11.3H10.9M6.4 14.3H9.5"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      :opacity="active ? 1 : 0.88"
    />
    <circle
      cx="16.9"
      cy="15.1"
      r="3.3"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.16 : 0"
    />
    <path
      d="M19.5 17.6L21 19.1"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
    />
  </svg>
</template>
