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
      d="M4.8 7.8H15.5"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M12.8 5.2L15.9 7.8L12.8 10.4"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.16 : 0"
    />
    <path
      d="M19.2 16.2H8.5"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M11.2 18.8L8.1 16.2L11.2 13.6"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.16 : 0"
    />
    <rect
      x="3.9"
      y="4.1"
      width="16.2"
      height="15.8"
      rx="2.2"
      stroke="currentColor"
      :stroke-width="active ? 1.4 : 1"
      :opacity="active ? 1 : 0.75"
    />
  </svg>
</template>
