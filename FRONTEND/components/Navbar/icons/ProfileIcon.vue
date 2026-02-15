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
      cx="11.3"
      cy="8"
      r="3.6"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
    />
    <path
      d="M4.8 18.7C5.2 15.6 7.8 13.3 11.1 13.3C14.5 13.3 17.2 15.6 17.7 18.7"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <circle
      cx="18.1"
      cy="16.8"
      r="3.4"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
      stroke="currentColor"
      :stroke-width="active ? 2.3 : 2"
    />
    <path
      d="M18.1 15.1L18.6 16.2L19.8 16.4L18.9 17.2L19.1 18.4L18.1 17.8L17.1 18.4L17.3 17.2L16.4 16.4L17.6 16.2L18.1 15.1Z"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 1 : 0"
      stroke="currentColor"
      :stroke-width="active ? 1.8 : 1.6"
      stroke-linejoin="round"
    />
  </svg>
</template>
