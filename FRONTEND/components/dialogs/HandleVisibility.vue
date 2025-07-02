<script setup>
import { ref, watch, inject } from "vue";
import { Icon } from "@iconify/vue";
import { Visibility, visibilityOptions } from "~/enums/visibility";

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
  <v-btn density="compact" variant="text" @click="dialog = true">
    <div>Visibilità</div>
    <Icon class="text-sm ml-3" icon="fa-eye" />
  </v-btn>

  <v-dialog
    v-model="dialog"
    width="90%"
    variant="outlined"
    transition="dialog-bottom-transition"
    style="z-index: 2000"
  >
    <v-card class="border border-2 border-white">
      <v-card-title class="bg-black text-white font-bold text-2xl">
        Modifica Visibilità
      </v-card-title>

      <v-card-text>
        <v-select
          v-model="visibilityChoosen"
          :items="visibilityOptions"
          item-title="label"
          item-value="value"
          label="Visibilità"
        />
      </v-card-text>

      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="outlined" @click="dialog = false">Annulla</v-btn>
        <v-btn variant="outlined" @click="changeVisibility">
          Cambia Visibilità
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
