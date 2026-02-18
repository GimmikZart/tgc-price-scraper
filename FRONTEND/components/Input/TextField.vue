<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "text",
  },
  min: {
    type: [String, Number],
    default: undefined,
  },
  max: {
    type: [String, Number],
    default: undefined,
  },
  step: {
    type: [String, Number],
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: "off",
  },
});

const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>

<template>
  <v-text-field
    v-model="model"
    :label="label"
    :placeholder="placeholder"
    :type="type"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :clearable="clearable"
    :autocomplete="autocomplete"
    variant="outlined"
    density="comfortable"
    hide-details="auto"
    class="app-text-field"
  />
</template>

<style scoped>
:deep(.app-text-field .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.9rem;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.7), rgba(8, 12, 20, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 22px rgba(0, 0, 0, 0.2);
}

:deep(.app-text-field .v-field__outline) {
  opacity: 0;
}

:deep(.app-text-field .v-field__overlay) {
  opacity: 0;
}

:deep(.app-text-field .v-field--focused) {
  border-color: rgba(255, 157, 82, 0.62);
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.14), rgba(12, 18, 29, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 216, 182, 0.28),
    0 0 0 1px rgba(255, 157, 82, 0.34),
    0 12px 24px rgba(0, 0, 0, 0.28);
}

:deep(.app-text-field .v-field-label),
:deep(.app-text-field input) {
  color: rgba(241, 245, 249, 0.94);
}

:deep(.app-text-field input::placeholder) {
  color: rgba(203, 213, 225, 0.66);
}

:deep(.app-text-field .v-messages__message) {
  color: rgba(248, 250, 252, 0.74);
}
</style>
