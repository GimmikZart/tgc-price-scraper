<script setup>
const props = defineProps({
  modelValue: {
    type: [Number, String, null],
    default: 0,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: Infinity,
  },
  outerPadding: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update:modelValue", "increment", "decrement"]);

const normalizedMax = computed(() => {
  if (!Number.isFinite(props.max)) return null;
  return Math.max(props.min, Math.floor(props.max));
});

const numericValue = computed(() => {
  const parsedValue = Number(props.modelValue);
  if (!Number.isFinite(parsedValue)) return props.min;

  let nextValue = Math.max(props.min, Math.floor(parsedValue));
  if (normalizedMax.value !== null) {
    nextValue = Math.min(nextValue, normalizedMax.value);
  }

  return nextValue;
});

function increment() {
  const nextValue = numericValue.value + 1;
  if (normalizedMax.value !== null && nextValue > normalizedMax.value) return;
  emit("update:modelValue", nextValue);
  emit("increment", nextValue);
}

function decrement() {
  const nextValue = numericValue.value - 1;
  if (nextValue < props.min) return;
  emit("update:modelValue", nextValue);
  emit("decrement", nextValue);
}
</script>

<template>
  <div :class="[outerPadding ? 'px-1 pb-1 pt-1.5' : '']">
    <div class="card-counter-wrap flex items-center justify-between gap-2 px-1.5 py-1">
      <v-btn
        variant="tonal"
        color="white"
        class="card-counter-btn card-counter-btn--minus"
        density="comfortable"
        size="small"
        icon
        @click="decrement"
      >
        <v-icon size="16">mdi-minus</v-icon>
      </v-btn>
      <span class="card-counter-value text-[14px] font-semibold tabular-nums">{{ numericValue }}</span>
      <v-btn
        variant="tonal"
        color="white"
        class="card-counter-btn card-counter-btn--plus"
        density="comfortable"
        size="small"
        icon
        @click="increment"
      >
        <v-icon size="16">mdi-plus</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.card-counter-wrap {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: linear-gradient(120deg, rgba(15, 23, 36, 0.86), rgba(10, 15, 25, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.3);
}

.card-counter-btn {
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  min-width: 30px !important;
  width: 30px !important;
  height: 30px !important;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.card-counter-btn:hover {
  transform: translateY(-1px);
}

.card-counter-btn--minus {
  color: rgba(255, 152, 152, 0.95) !important;
}

.card-counter-btn--minus:hover {
  border-color: rgba(255, 140, 140, 0.4) !important;
  background: rgba(255, 80, 80, 0.1) !important;
}

.card-counter-btn--plus {
  color: rgba(163, 237, 184, 0.95) !important;
}

.card-counter-btn--plus:hover {
  border-color: rgba(122, 224, 159, 0.4) !important;
  background: rgba(48, 190, 114, 0.12) !important;
}

.card-counter-value {
  min-width: 42px;
  padding: 3px 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: rgba(232, 239, 247, 0.96);
  background: rgba(255, 255, 255, 0.04);
}
</style>
