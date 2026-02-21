<script setup>
import { onMounted, onBeforeUnmount, getCurrentInstance } from "vue";
import { onClickOutside } from "@vueuse/core";

const props = defineProps({
  fromBottom: { type: Number, default: null },
  acceptLabel: { type: String, default: "Salva" },
  acceptColor: { type: String, default: "success" },
  disabled: { type: Boolean, default: false },
});
const emits = defineEmits(["confirm"]);
const gs = useGlobalSettings();
const rootEl = ref(null);

const dialog = ref(false);

// uid univoco per ogni istanza (serve a chiuderne una quando se ne apre un'altra)
const uid = `dlg_${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`;

function openDialog() {
  if (props.disabled) return;
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

defineExpose({
  openDialog,
  closeDialog,
});

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
  return props.fromBottom ?? (gs.navbarHeight + gs.floatMenuHeight - 20);
});
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="inline-flex focus:outline-none"
    :class="props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
    @click="openDialog"
    @keydown.enter.prevent="openDialog"
    @keydown.space.prevent="openDialog"
  >
    <slot name="button"></slot>
  </div>

  <Teleport to="body">
    <!-- BACKDROP full-screen: click sul backdrop chiude; click sul contenuto no -->
    <div
      ref="rootEl"
      :class="
        dialog
          ? 'z-[2] pointer-events-auto'
          : '-z-[10] pointer-events-none opacity-0'
      "
      class="fixed inset-0 flex items-end transition-opacity duration-300"
      @click.self="closeDialog"
    >
      <!-- Bottom sheet container -->
      <div
        id="dialog-generic"
        class="generic-sheet w-full h-auto transition-all duration-500"
        :class="dialog ? 'translate-y-0' : 'translate-y-3'"
        :style="{ bottom: `${bottomDistance - 15}px`, position: 'fixed', left: 0 }"
      >
        <v-card theme="dark" class="overflow-hidden rounded-t-2xl border border-white/10 bg-[#070b14] shadow-[0_16px_36px_rgba(0,0,0,0.55)]">
          <h5 class="relative border-b border-white/10 bg-gradient-to-r from-[#ff7a18]/18 via-[#ff7a18]/5 to-transparent px-4 py-3 text-lg font-bold tracking-wide text-slate-100">
            <span class="pointer-events-none absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#ff9d52] shadow-[0_0_16px_rgba(255,122,24,0.75)]" />
            <span class="block pl-2">
              <slot name="title"></slot>
            </span>
          </h5>

          <v-card-text class="px-4 py-4">
            <slot name="content"></slot>
          </v-card-text>

          <v-card-actions class="border-t border-white/10 bg-black/30 px-4 py-3 pb-10">
            <v-spacer />
            <v-btn class="generic-btn generic-btn--cancel" variant="text" @click.stop="closeDialog">Annulla</v-btn>
            <v-btn class="generic-btn generic-btn--accept" :color="acceptColor" variant="flat" @click="handleConfirm">{{ acceptLabel }}</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.generic-sheet :deep(.v-input .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.75rem;
  background: rgba(9, 14, 26, 0.88);
  box-shadow: none;
}

.generic-sheet :deep(.v-input .v-field__outline) {
  opacity: 0;
}

.generic-sheet :deep(.v-input .v-field__overlay) {
  opacity: 0;
}

.generic-sheet :deep(.v-input .v-field--focused) {
  border-color: rgba(255, 157, 82, 0.6);
  background: rgba(255, 157, 82, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 157, 82, 0.3);
}

.generic-sheet :deep(.v-input .v-field-label),
.generic-sheet :deep(.v-input input),
.generic-sheet :deep(.v-input textarea) {
  color: rgba(241, 245, 249, 0.92);
}

.generic-sheet :deep(.v-messages__message) {
  color: rgba(248, 250, 252, 0.72);
}

.generic-btn {
  min-width: 110px;
  border-radius: 0.75rem !important;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.generic-btn--cancel {
  color: rgba(241, 245, 249, 0.9) !important;
}

.generic-btn--accept {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}
</style>
