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
      x="4.2"
      y="7.4"
      width="15.6"
      height="11.5"
      rx="2.2"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <path
      d="M7.2 10.1H12.2"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M10.6 8.6L12.2 10.1L10.6 11.6"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M16.8 15.9H11.8"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M13.4 14.4L11.8 15.9L13.4 17.4"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M4.8 7.1L7.2 4.8H16.8L19.2 7.1"
      stroke="currentColor"
      :stroke-width="active ? 1.4 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
