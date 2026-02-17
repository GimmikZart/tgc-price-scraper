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
    <circle
      cx="12"
      cy="8"
      r="3.2"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.18 : 0"
    />
    <path
      d="M5.4 18.2C5.8 15.1 8.3 12.9 11.7 12.9C15.2 12.9 17.9 15.2 18.4 18.2"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M19.5 8.3L20.1 9.4L21.3 9.6L20.4 10.4L20.6 11.6L19.5 11L18.5 11.6L18.7 10.4L17.8 9.6L19 9.4L19.5 8.3Z"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 1 : 0"
      stroke="currentColor"
      :stroke-width="active ? 1.8 : 1.6"
      stroke-linejoin="round"
    />
  </svg>
</template>
