<script setup>
import { ref, watch, inject } from "vue";
import { visibilityOptions } from "~/enums/visibility";

const emits = defineEmits(["updateVisibility"]);

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
  item.value.visibility = visibilityChoosen.value;
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
  />

  <DialogsBaseDialog
    v-model="dialog"
    width="90%"
    :fullscreen="false"
    card-class="border border-2 border-white"
    title-class="bg-black text-white font-bold text-2xl"
    actions-class="pa-3"
    variant="outlined"
    transition="dialog-bottom-transition"
  >
    <template #title>Modifica Visibilita</template>

    <v-select
      v-model="visibilityChoosen"
      :items="visibilityOptions"
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
