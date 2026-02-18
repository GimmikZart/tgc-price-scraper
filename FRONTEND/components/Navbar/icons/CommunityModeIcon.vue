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
      cx="8.3"
      cy="9"
      r="2.6"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <circle
      cx="15.8"
      cy="9"
      r="2.6"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M4.8 18.2C5.1 15.8 6.9 14.1 9.1 14.1C10.7 14.1 12.1 15 12.9 16.4"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M19.3 18.2C19 15.8 17.2 14.1 15 14.1C13.4 14.1 12 15 11.2 16.4"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M9.8 12.2H14.2"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      :opacity="active ? 1 : 0.85"
    />
  </svg>
</template>
