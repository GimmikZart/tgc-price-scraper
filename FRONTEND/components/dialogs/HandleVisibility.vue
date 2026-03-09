<script setup>
import { ref, watch, inject } from "vue";
import { visibilityOptions } from "~/enums/visibility";

const emits = defineEmits(["updateVisibility"]);
const props = defineProps({
  options: {
    type: Array,
    default: () => visibilityOptions,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const item = inject("item");
const dialog = ref(false);
const visibilityChoosen = ref(null);

watch(
  item,
  (newVal) => {
    if (newVal) {
      visibilityChoosen.value = newVal.visibility;
    }
  },
  { immediate: true, deep: true }
);

async function changeVisibility() {
  if (!visibilityChoosen.value) return;
  emits("updateVisibility", visibilityChoosen.value);
  dialog.value = false;
}
</script>

<template>
  <ButtonMenu
    @click="dialog = true"
    icon="mdi:show"
    transition
    :delay="100"
    label="Visibilita"
    :disabled="disabled"
  />

  <DialogsBaseDialog
    v-model="dialog"
    width="90%"
    :fullscreen="false"
    actions-class="pa-3"
    variant="outlined"
    transition="dialog-bottom-transition"
  >
    <template #title>Modifica Visibilita</template>

    <v-select
      v-model="visibilityChoosen"
      :items="props.options"
      item-title="label"
      item-value="value"
      label="Visibilita"
    />

    <template #actions>
      <v-spacer />
      <v-btn variant="outlined" @click="dialog = false">Annulla</v-btn>
      <v-btn variant="outlined" @click="changeVisibility">
        Cambia Visibilita
      </v-btn>
    </template>
  </DialogsBaseDialog>
</template>
