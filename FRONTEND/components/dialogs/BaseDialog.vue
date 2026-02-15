<script setup>
import { useDisplay } from "vuetify";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: "" },
  maxWidth: { type: [Number, String], default: 1000 },
  width: { type: [Number, String], default: undefined },
  fullscreen: { type: Boolean, default: undefined },
  variant: { type: String, default: undefined },
  transition: { type: String, default: undefined },
  zIndex: { type: [Number, String], default: 2000 },
  cardClass: { type: [String, Array, Object], default: "dialog-card" },
  titleClass: { type: [String, Array, Object], default: "dialog-title" },
  contentClass: { type: [String, Array, Object], default: "dialog-content" },
  actionsClass: { type: [String, Array, Object], default: "dialog-actions" },
  showActions: { type: Boolean, default: true },
  closeLabel: { type: String, default: "Chiudi" },
  closeDisabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "close"]);

const { mdAndDown } = useDisplay();

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const isFullscreen = computed(() => {
  return props.fullscreen ?? mdAndDown.value;
});

const dialogStyle = computed(() => ({ zIndex: props.zIndex }));

function closeDialog() {
  if (!dialogModel.value) return;
  dialogModel.value = false;
}

watch(
  () => props.modelValue,
  (isOpen, wasOpen) => {
    if (wasOpen && !isOpen) {
      emit("close");
    }
  }
);
</script>

<template>
  <v-dialog
    class="dialog-shell"
    v-model="dialogModel"
    :max-width="maxWidth"
    :width="width"
    :variant="variant"
    :transition="transition"
    :fullscreen="isFullscreen"
    :style="dialogStyle"
  >
    <v-card theme="dark" :class="cardClass">
      <v-card-title v-if="$slots.title || title" :class="titleClass">
        <slot name="title">{{ title }}</slot>
      </v-card-title>

      <v-card-text :class="contentClass">
        <slot />
      </v-card-text>

      <v-card-actions v-if="showActions" :class="actionsClass">
        <slot name="actions" :close-dialog="closeDialog">
          <v-spacer />
          <v-btn :disabled="closeDisabled" color="white" variant="text" :text="closeLabel" @click="closeDialog" />
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-shell :deep(.v-overlay__scrim) {
  background: rgba(2, 6, 23, 0.76);
}

.dialog-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1rem !important;
  background:
    radial-gradient(110% 80% at 15% 0%, rgba(255, 122, 24, 0.14), transparent 44%),
    linear-gradient(160deg, rgba(6, 10, 18, 0.98) 0%, rgba(2, 6, 14, 0.96) 100%);
  box-shadow:
    0 26px 55px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.dialog-title {
  position: relative;
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(248, 250, 252, 0.98);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, rgba(255, 122, 24, 0.2), rgba(255, 122, 24, 0.03) 38%, rgba(2, 6, 14, 0.08));
}

.dialog-title::after {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 999px 999px 0;
  background: #ff9d52;
  box-shadow: 0 0 16px rgba(255, 122, 24, 0.75);
}

.dialog-content {
  padding: 1rem 1.1rem;
}

.dialog-actions {
  padding: 0.75rem 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.12));
}

.dialog-card :deep(.v-input .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.75rem;
  background: rgba(9, 14, 26, 0.88);
  box-shadow: none;
}

.dialog-card :deep(.v-input .v-field__outline) {
  opacity: 0;
}

.dialog-card :deep(.v-input .v-field__overlay) {
  opacity: 0;
}

.dialog-card :deep(.v-input .v-field--focused) {
  border-color: rgba(255, 157, 82, 0.6);
  background: rgba(255, 157, 82, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 157, 82, 0.3);
}

.dialog-card :deep(.v-input .v-field-label),
.dialog-card :deep(.v-input input),
.dialog-card :deep(.v-input textarea),
.dialog-card :deep(.v-input .v-select__selection-text) {
  color: rgba(241, 245, 249, 0.92);
}

.dialog-card :deep(.v-messages__message) {
  color: rgba(248, 250, 252, 0.72);
}

@media (min-width: 1024px) {
  .dialog-title,
  .dialog-content,
  .dialog-actions {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}
</style>
