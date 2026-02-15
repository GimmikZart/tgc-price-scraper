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
  cardClass: { type: [String, Array, Object], default: "" },
  titleClass: { type: [String, Array, Object], default: "" },
  contentClass: { type: [String, Array, Object], default: "" },
  actionsClass: { type: [String, Array, Object], default: "" },
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
    v-model="dialogModel"
    :max-width="maxWidth"
    :width="width"
    :variant="variant"
    :transition="transition"
    :fullscreen="isFullscreen"
    :style="dialogStyle"
  >
    <v-card :class="cardClass">
      <v-card-title v-if="$slots.title || title" :class="titleClass">
        <slot name="title">{{ title }}</slot>
      </v-card-title>

      <v-card-text :class="contentClass">
        <slot />
      </v-card-text>

      <v-card-actions v-if="showActions" :class="actionsClass">
        <slot name="actions" :close-dialog="closeDialog">
          <v-spacer />
          <v-btn :disabled="closeDisabled" :text="closeLabel" @click="closeDialog" />
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
