<script setup>
defineProps({
  steps: {
    type: Array,
    default: () => [],
  },
  activeStep: {
    type: Number,
    default: 0,
  },
});
</script>

<template>
  <div class="tournament-create-stepper" aria-label="Avanzamento creazione torneo">
    <div class="tournament-create-stepper__track">
      <div
        v-for="(step, index) in steps"
        :key="step.key ?? index"
        class="tournament-create-stepper__item"
        :class="{
          'tournament-create-stepper__item--active': index === activeStep,
        }"
        :aria-current="index === activeStep ? 'step' : undefined"
      >
        <span
          class="tournament-create-stepper__dot"
          :class="`tournament-create-stepper__dot--${step.state ?? 'pending'}`"
        />
        <span class="tournament-create-stepper__label">{{ step.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tournament-create-stepper {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tournament-create-stepper::-webkit-scrollbar {
  display: none;
}

.tournament-create-stepper__track {
  display: flex;
  gap: 0.42rem;
  min-width: 100%;
  width: max-content;
}

.tournament-create-stepper__item {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.35rem 0.7rem;
  white-space: nowrap;
}

.tournament-create-stepper__item--active {
  border-color: rgba(255, 178, 125, 0.42);
  background: rgba(255, 122, 24, 0.2);
  box-shadow:
    0 0 20px rgba(255, 122, 24, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: rgba(255, 224, 194, 0.98);
}

.tournament-create-stepper__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  box-shadow: 0 0 0 0.12rem rgba(255, 255, 255, 0.08);
}

.tournament-create-stepper__dot--pending {
  background: #facc15;
}

.tournament-create-stepper__dot--complete {
  background: #4ade80;
}

.tournament-create-stepper__dot--error {
  background: #f87171;
}

.tournament-create-stepper__label {
  letter-spacing: 0.02em;
}
</style>
