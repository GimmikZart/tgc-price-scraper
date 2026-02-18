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
      x="3.4"
      y="4.1"
      width="17.2"
      height="15.8"
      rx="2.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <path
      d="M9.4 5V19"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <circle cx="6.35" cy="8.3" r="0.8" fill="currentColor" />
    <circle cx="6.35" cy="12" r="0.8" fill="currentColor" />
    <circle cx="6.35" cy="15.7" r="0.8" fill="currentColor" />
    <rect
      x="12.2"
      y="7.4"
      width="5.5"
      height="3.1"
      rx="0.9"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
    <rect
      x="12.2"
      y="12.2"
      width="2.2"
      height="2.2"
      rx="0.6"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
    <rect
      x="15.5"
      y="12.2"
      width="2.2"
      height="2.2"
      rx="0.6"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
    <rect
      x="12.2"
      y="15.4"
      width="5.5"
      height="2.2"
      rx="0.7"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.2 : 0"
    />
  </svg>
</template>
