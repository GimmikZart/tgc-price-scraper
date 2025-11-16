<script setup>
import { onMounted, onBeforeUnmount, getCurrentInstance } from "vue";
import { onClickOutside } from "@vueuse/core";

const props = defineProps({
  fromBottom: { type: Number, default: null },
  acceptLabel: { type: String, default: "Salva" },
  acceptColor: { type: String, default: "success" },
});
const emits = defineEmits(["confirm"]);
const gs = useGlobalSettings();
const rootEl = ref(null);

const dialog = ref(false);

// uid univoco per ogni istanza (serve a chiuderne una quando se ne apre un'altra)
const uid = `dlg_${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`;

function openDialog() {
  // emettiamo un evento globale che dice "sto aprendo la dialog X"
  document.dispatchEvent(new CustomEvent("dialogs:open", { detail: { uid } }));
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
}

function handleConfirm() {
  emits("confirm");
  closeDialog();
}

// Chiude quando un'altra dialog viene aperta
function handleGlobalOpen(e) {
  const openedUid = e?.detail?.uid;
  if (openedUid && openedUid !== uid) {
    closeDialog();
  }
}

onClickOutside(rootEl, () => {
  closeDialog();
});

// ESC per chiudere
function handleKeydown(e) {
  if (e.key === "Escape") closeDialog();
}

onMounted(() => {
  document.addEventListener("dialogs:open", handleGlobalOpen);
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("dialogs:open", handleGlobalOpen);
  document.removeEventListener("keydown", handleKeydown);
});

const bottomDistance = computed(() => {
  if (!dialog.value) return -1000; // fuori viewport
  return props.fromBottom ?? (gs.navbarHeight + gs.floatMenuHeight);
});
</script>

<template>
  <!-- Bottone trigger -->
  <button
    class="text-white border border-white mt-2 cursor-pointer rounded-lg relative flex flex-col items-center justify-center"
    @click="openDialog"
  >
    <slot name="button"></slot>
  </button>

  <Teleport to="body">
    <!-- BACKDROP full-screen: click sul backdrop chiude; click sul contenuto no -->
    <div
      ref="rootEl"
      :class="dialog ? 'z-[2]' : '-z-[10]'"
      class="fixed inset-0 flex items-end"
      @click.self="closeDialog"
    >
      <!-- Bottom sheet container -->
      <div
        id="dialog-generic"
        class="w-full h-auto transition-all duration-500"
        :style="{ bottom: `${bottomDistance - 15}px`, position: 'fixed', left: 0 }"
      >
        <v-card class="bg-black rounded-t-xl pb-5">
          <v-card-title class="text-white font-bold text-2xl">
            <slot name="title"></slot>
          </v-card-title>

          <v-card-text>
            <slot name="content"></slot>
          </v-card-text>

          <v-card-actions class="pa-3">
            <v-spacer />
            <v-btn text @click.stop="closeDialog">Annulla</v-btn>
            <v-btn :color="acceptColor" @click="handleConfirm">{{ acceptLabel }}</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </div>
  </Teleport>
</template>
