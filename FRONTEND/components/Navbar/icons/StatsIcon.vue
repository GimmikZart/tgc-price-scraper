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
      d="M4.2 18.6H19.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <rect
      x="5.1"
      y="12.2"
      width="2.9"
      height="6.1"
      rx="0.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.16 : 0"
    />
    <rect
      x="10.4"
      y="9.6"
      width="2.9"
      height="8.7"
      rx="0.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.12 : 0"
    />
    <rect
      x="15.7"
      y="6.9"
      width="2.9"
      height="11.4"
      rx="0.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <path
      d="M5.6 9.8L9.1 8.1L12 9.4L17.7 5.6"
      stroke="currentColor"
      :stroke-width="active ? 1.6 : 1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
