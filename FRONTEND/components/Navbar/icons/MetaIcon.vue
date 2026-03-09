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
      cx="9.8"
      cy="11.2"
      r="4.9"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.06 : 0"
    />
    <path
      d="M5 11.2H14.6"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <path
      d="M9.8 6.4C8.4 7.8 7.6 9.5 7.6 11.2C7.6 12.9 8.4 14.6 9.8 16"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <path
      d="M9.8 6.4C11.2 7.8 12 9.5 12 11.2C12 12.9 11.2 14.6 9.8 16"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <path
      d="M6.4 8.3C7.4 9 8.6 9.4 9.8 9.4C11 9.4 12.2 9 13.2 8.3"
      stroke="currentColor"
      :stroke-width="active ? 1.4 : 1"
      stroke-linecap="round"
    />
    <path
      d="M6.4 14.1C7.4 13.4 8.6 13 9.8 13C11 13 12.2 13.4 13.2 14.1"
      stroke="currentColor"
      :stroke-width="active ? 1.4 : 1"
      stroke-linecap="round"
    />
    <rect
      x="13.5"
      y="7.3"
      width="5.8"
      height="8.6"
      rx="1.1"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M14.8 9.6H17.9"
      stroke="currentColor"
      :stroke-width="active ? 1.4 : 1"
      stroke-linecap="round"
    />
  </svg>
</template>
