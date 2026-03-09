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
      cx="9"
      cy="9"
      r="2.4"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <circle
      cx="15.8"
      cy="9.8"
      r="2.2"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M5.1 17.4C5.5 15.2 7 13.8 9 13.8C11 13.8 12.5 15.2 12.9 17.4"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M13.6 16.8H17.8L19.7 18.6V16.8H20C20.8 16.8 21.4 16.2 21.4 15.4V12.7C21.4 11.9 20.8 11.3 20 11.3H14.8C14 11.3 13.4 11.9 13.4 12.7V15.4C13.4 16 13.8 16.6 14.4 16.7"
      stroke="currentColor"
      :stroke-width="active ? 1.4 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
