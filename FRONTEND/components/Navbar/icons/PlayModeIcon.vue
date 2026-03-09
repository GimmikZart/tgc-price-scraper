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
      d="M6.9 8.2H17.1C18.6 8.2 19.9 9.4 20.1 10.9L20.6 14.1C20.9 16.2 19.3 18 17.2 18H6.8C4.7 18 3.1 16.2 3.4 14.1L3.9 10.9C4.1 9.4 5.4 8.2 6.9 8.2Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <path
      d="M8 12.1H11.2"
      stroke="currentColor"
      :stroke-width="active ? 1.7 : 1.2"
      stroke-linecap="round"
    />
    <path
      d="M9.6 10.5V13.7"
      stroke="currentColor"
      :stroke-width="active ? 1.7 : 1.2"
      stroke-linecap="round"
    />
    <circle
      cx="15.2"
      cy="11.8"
      r="1.1"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
    <circle
      cx="17.6"
      cy="13.7"
      r="1.1"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
  </svg>
</template>
