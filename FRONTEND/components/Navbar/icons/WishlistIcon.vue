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
    <path
      d="M6 4.4H18C18.9 4.4 19.6 5.1 19.6 6V20L12 16.2L4.4 20V6C4.4 5.1 5.1 4.4 6 4.4Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <path
      d="M12 9.1C11.3 8.2 10.2 7.9 9.2 8.3C7.8 8.8 7.3 10.5 8 11.8C8.6 13 10.2 14 12 15.2C13.8 14 15.4 13 16 11.8C16.7 10.5 16.2 8.8 14.8 8.3C13.8 7.9 12.7 8.2 12 9.1Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
  </svg>
</template>
