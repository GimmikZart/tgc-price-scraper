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
      x="3.6"
      y="5.4"
      width="11.8"
      height="13.6"
      rx="2.2"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <path
      d="M6.3 9.2H12.7M6.3 12.2H10.7"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <path
      d="M14.7 11.8L19 10.1L21 12.2L19.3 16.4L15 18.1L13 16L14.7 11.8Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.15 : 0"
    />
    <circle
      cx="17"
      cy="14.1"
      r="1.1"
      stroke="currentColor"
      :stroke-width="active ? 2.1 : 1.9"
    />
  </svg>
</template>
