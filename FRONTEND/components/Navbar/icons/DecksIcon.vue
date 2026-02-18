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
      d="M6.7 8.2L8.9 4.9H18.1L16 8.2H6.7Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />

    <path
      d="M16 8.2L18.1 4.9L19.5 8.2L17.4 11.2L16 8.2Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />

    <rect
      x="6.4"
      y="8.4"
      width="11.2"
      height="12"
      rx="1.6"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />

    <path
      d="M6.4 8.8C8 8.1 16 8.1 17.6 8.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
      :opacity="active ? 1 : 0.9"
    />

    <rect
      x="8"
      y="9.6"
      width="8"
      height="2.5"
      rx="0.9"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.18 : 0"
    />

    <path
      d="M9.2 10.8H14.8M9.6 9.6V11.9M11 9.6V11.9M12.4 9.6V11.9M13.8 9.6V11.9"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      :opacity="active ? 1 : 0.88"
    />
  </svg>
</template>
