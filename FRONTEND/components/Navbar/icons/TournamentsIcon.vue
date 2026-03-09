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
      d="M7.3 5.2H16.7V8.2C16.7 10.9 14.5 13.1 11.8 13.1H12.2C9.5 13.1 7.3 10.9 7.3 8.2V5.2Z"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <path
      d="M7.3 6H5.5C4.8 6 4.2 6.6 4.2 7.3V8C4.2 9.4 5.3 10.5 6.7 10.5H7.3"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M16.7 6H18.5C19.2 6 19.8 6.6 19.8 7.3V8C19.8 9.4 18.7 10.5 17.3 10.5H16.7"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M12 13.2V17"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
    <path
      d="M9.2 19.1H14.8"
      stroke="currentColor"
      :stroke-width="active ? 1.5 : 1"
      stroke-linecap="round"
    />
  </svg>
</template>
