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
      x="2.7"
      y="6.1"
      width="8.8"
      height="12.3"
      rx="2"
      transform="rotate(-15 2.7 6.1)"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :opacity="active ? 1 : 0.95"
    />
    <rect
      x="12.6"
      y="3.6"
      width="8.8"
      height="12.3"
      rx="2"
      transform="rotate(13 12.6 3.6)"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :opacity="active ? 1 : 0.95"
    />
    <rect
      x="6.8"
      y="4.2"
      width="10.8"
      height="14.4"
      rx="2.2"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M12.2 8.3L14.6 10.7L12.2 13.1L9.8 10.7L12.2 8.3Z"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.28 : 0"
    />
  </svg>
</template>
