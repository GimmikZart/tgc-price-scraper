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
      d="M7.4 6.2L10.7 9.5L7 13.2L3.8 10L7.4 6.2Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M16.6 6.2L13.3 9.5L17 13.2L20.2 10L16.6 6.2Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <path
      d="M9.9 10.2L14.1 14.4"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M10.2 14.5L8.4 16.3"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M13.8 14.5L15.6 16.3"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M8.4 16.3L7.2 17.5"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
    <path
      d="M15.6 16.3L16.8 17.5"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
    />
  </svg>
</template>
