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
      cy="8.4"
      r="2.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.18 : 0"
    />
    <circle
      cx="15.8"
      cy="9.3"
      r="2.4"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M3.9 18.5C4.3 15.7 6.3 13.8 8.9 13.8C11.7 13.8 13.8 15.8 14.2 18.5"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M13.2 18.5C13.5 16.6 14.9 15.2 16.8 15.2C18.8 15.2 20.2 16.7 20.5 18.5"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :opacity="active ? 1 : 0.85"
    />
  </svg>
</template>
