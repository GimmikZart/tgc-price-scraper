<script setup>
import { DeckLocation, getDeckLocationLabel } from "~/enums/deckLocation";

const props = defineProps({
  decks: {
    type: Array,
    default: () => [],
  },
  deckLocation: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["confirm"]);
const dialogRef = ref(null);

const locationLabel = computed(() => getDeckLocationLabel(props.deckLocation));
const deletionSourceLabel = computed(() => (
  props.deckLocation === DeckLocation.DEVICE ? "dal dispositivo" : "dal cloud"
));

function openDialog() {
  dialogRef.value?.openDialog?.();
}

function closeDialog() {
  dialogRef.value?.closeDialog?.();
}

defineExpose({
  openDialog,
  closeDialog,
});
</script>

<template>
  <DialogsGeneric
    ref="dialogRef"
    :disabled="disabled"
    accept-label="Conferma"
    accept-color="red"
    @confirm="emit('confirm')"
  >
    <template #button>
      <span class="delete-decks-dialog-trigger" aria-hidden="true" />
    </template>

    <template #title>Conferma eliminazione</template>

    <template #content>
      <div class="space-y-4">
        <p class="text-sm text-slate-200/90">
          Stai per eliminare
          <span class="font-semibold text-white">{{ decks.length }}</span>
          deck
          {{ deletionSourceLabel }}.
        </p>

        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p class="text-[11px] uppercase tracking-[0.16em] text-slate-400/80">
            Mazzi selezionati
          </p>

          <ul class="mt-3 space-y-2">
            <li
              v-for="deck in decks"
              :key="deck.id ?? deck.slug"
              class="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2"
            >
              <span class="truncate text-sm font-medium text-slate-100">
                {{ deck.name }}
              </span>
              <span
                class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                :class="deckLocation === DeckLocation.DEVICE
                  ? 'bg-orange/15 text-orange'
                  : 'bg-green/15 text-green'"
              >
                {{ locationLabel }}
              </span>
            </li>
          </ul>
        </div>

        <p class="text-xs text-slate-400/85">
          Operazione irreversibile.
        </p>
      </div>
    </template>
  </DialogsGeneric>
</template>

<style scoped>
.delete-decks-dialog-trigger {
  display: none;
}
</style>
