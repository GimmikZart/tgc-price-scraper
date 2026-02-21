<script setup>
const props = defineProps({
  title: {
    type: String,
    default: "Filtri",
  },
  subtitle: {
    type: String,
    default: "Ricerca",
  },
  activeFiltersCount: {
    type: Number,
    default: 0,
  },
  resetLabel: {
    type: String,
    default: "Reset",
  },
  confirmLabel: {
    type: String,
    default: "Ok",
  },
});

const emit = defineEmits(["close", "reset", "confirm"]);

function closeOverlay() {
  emit("close");
}

function handleReset() {
  emit("reset");
}

function handleConfirm() {
  emit("confirm");
}
</script>

<template>
  <Transition
    appear
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-250 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      class="fixed inset-0 right-0 z-[2000] flex flex-col justify-end lg:ml-[250px]"
    >
      <div
        class="filter-overlay__backdrop fixed inset-0 h-[200%] -top-full right-0"
        @click="closeOverlay"
      />

      <div class="filter-sheet mx-2 mb-0 rounded-t-3xl text-white sm:mx-3">
        <div class="filter-sheet__header">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-400/90">
              {{ subtitle }}
            </p>
            <h3 class="truncate text-2xl font-bold">{{ title }}</h3>
          </div>
          <div class="filter-count-chip">
            {{ activeFiltersCount }} attivi
          </div>
        </div>

        <div class="filter-sheet__body">
          <slot />
        </div>
      </div>

      <div class="filter-sheet__footer mx-2 mb-0 rounded-b-2xl pb-16 sm:mx-3">
        <v-btn
          color="white"
          variant="tonal"
          class="filter-action-btn flex-1"
          @click="handleReset"
        >
          {{ resetLabel }}
        </v-btn>
        <v-btn
          class="filter-action-btn filter-action-btn--primary flex-1"
          @click="handleConfirm"
        >
          {{ confirmLabel }}
        </v-btn>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.filter-overlay__backdrop {
  background: linear-gradient(180deg, rgba(1, 6, 15, 0.52), rgba(0, 0, 0, 0.82));
  backdrop-filter: blur(3px);
}

.filter-sheet {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-bottom: 0;
  background: linear-gradient(155deg, rgba(10, 17, 30, 0.95), rgba(6, 9, 16, 0.97));
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.filter-sheet::before {
  content: "";
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 1.5rem 1.5rem 0 0;
  background:
    radial-gradient(120% 90% at 50% -18%, rgba(255, 150, 71, 0.18), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 26%);
}

.filter-sheet__header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 1rem 0.85rem;
}

.filter-sheet__body {
  position: relative;
  z-index: 2;
  max-height: min(66vh, 560px);
  overflow-y: auto;
  padding: 0.9rem 1rem 1rem;
}

.filter-count-chip {
  border: 1px solid rgba(255, 180, 118, 0.4);
  border-radius: 999px;
  background: linear-gradient(140deg, rgba(255, 122, 24, 0.22), rgba(25, 30, 42, 0.84));
  color: #ffd9b7;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.32rem 0.64rem;
  white-space: nowrap;
}

.filter-sheet__footer {
  display: flex;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 0;
  background: linear-gradient(160deg, rgba(10, 16, 28, 0.94), rgba(6, 10, 18, 0.97));
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.48);
  padding: 0.75rem 1rem 0.9rem;
}

.filter-action-btn {
  text-transform: none !important;
  font-weight: 600;
}

.filter-action-btn--primary {
  border: 1px solid rgba(255, 187, 129, 0.44) !important;
  background: linear-gradient(130deg, rgba(255, 122, 24, 0.92), rgba(167, 70, 13, 0.92)) !important;
  color: #fff7f0 !important;
}
</style>
