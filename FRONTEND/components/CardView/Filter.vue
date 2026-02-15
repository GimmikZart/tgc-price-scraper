<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";

const emit = defineEmits(["update:filtered", "close"]);

const props = defineProps({
  cardsList: {
    type: Array,
    default: () => [],
  },
  isLeaderFilter: {
    type: Boolean,
    default: false,
  },
  hideColorFilter: {
    type: Boolean,
    default: false,
  },
});

const {
  setNameList,
  typeList,
  familyList,
  rarityList,
  colorList,
  abilityKwList,
  nameList,
  powerLimits,
  counterList,
  attributeList,
  illustrationList,
} = await useOnePieceCards();

const DEFAULT_COST_FILTER = [0, 10];

function createDefaultPriceFilter() {
  return {
    min: 0,
    max: null,
  };
}

const nameFilter = ref(null);
const colorFilter = ref([]);
const isMulticolored = ref(false);
const typesFilter = ref([]);
const moreFilters = ref(false);
const setNamesFilter = ref(null);
const familiesFilter = ref([]);
const abilityFilter = ref("");
const rarityFilter = ref([]);
const abilityKwFilter = ref([]);
const costFilter = ref([...DEFAULT_COST_FILTER]);
const powerFilter = ref([powerLimits.min, powerLimits.max]);
const hasTriggerFilter = ref(false);
const counterFilter = ref([]);
const attributeFilter = ref([]);
const illustrationFilter = ref([]);
const priceFilter = ref(createDefaultPriceFilter());

const activeFiltersCount = computed(() => {
  let count = 0;

  if (nameFilter.value) count++;
  if (setNamesFilter.value) count++;
  if (colorFilter.value.length) count++;
  if (typesFilter.value.length) count++;
  if (isMulticolored.value) count++;
  if (familiesFilter.value.length) count++;
  if (abilityFilter.value?.trim()) count++;
  if (rarityFilter.value.length) count++;
  if (abilityKwFilter.value.length) count++;
  if (costFilter.value[0] !== 0 || costFilter.value[1] !== 10) count++;
  if (
    powerFilter.value[0] !== powerLimits.min ||
    powerFilter.value[1] !== powerLimits.max
  ) {
    count++;
  }
  if (hasTriggerFilter.value) count++;
  if (counterFilter.value.length) count++;
  if (attributeFilter.value.length) count++;
  if (illustrationFilter.value.length) count++;
  if (priceFilter.value.min || priceFilter.value.max) count++;

  return count;
});

const filtered = computed(() => {
  return props.cardsList.filter((card) => {
    const cardColors = Array.isArray(card.color) ? card.color : [];
    const cardFamily = Array.isArray(card.family) ? card.family : [];
    const cardAbilityKeywords = Array.isArray(card.abilityKeywords)
      ? card.abilityKeywords
      : [];
    const cardPower = toFiniteNumber(card.power);
    const cardCost = toFiniteNumber(card.cost);
    const cardCounter = toFiniteNumber(card.counter);

    const nameMatch =
      !nameFilter.value ||
      (Array.isArray(nameFilter.value)
        ? nameFilter.value.includes(card.name)
        : nameFilter.value === card.name);

    const colorMatch =
      !colorFilter.value.length ||
      (isMulticolored.value
        ? colorFilter.value.every((c) => cardColors.includes(c))
        : cardColors.some((c) => colorFilter.value.includes(c)));

    const typeMatch =
      !typesFilter.value.length || typesFilter.value.includes(card.type);

    const setMatch =
      !setNamesFilter.value ||
      (Array.isArray(setNamesFilter.value)
        ? setNamesFilter.value.includes(card.setName)
        : setNamesFilter.value === card.setName);

    const familyMatch =
      !familiesFilter.value.length ||
      cardFamily.some((c) => familiesFilter.value.includes(c));

    const abilityMatch =
      !abilityFilter.value ||
      (card.effect &&
        card.effect.toLowerCase().includes(abilityFilter.value.toLowerCase()));

    const abilityKwMatch =
      !abilityKwFilter.value.length ||
      (cardAbilityKeywords.length &&
        abilityKwFilter.value.every((kw) =>
          cardAbilityKeywords.some((a) =>
            a.toLowerCase().includes(kw.toLowerCase())
          )
        ));

    const powerMatch =
      (powerFilter.value[0] === powerLimits.min &&
        powerFilter.value[1] === powerLimits.max) ||
      (cardPower !== null &&
        cardPower >= powerFilter.value[0] &&
        cardPower <= powerFilter.value[1]);

    const costMatch =
      (costFilter.value[0] === 0 && costFilter.value[1] === 10) ||
      (cardCost !== null &&
        cardCost >= costFilter.value[0] &&
        cardCost <= costFilter.value[1]);

    const rarityMatch =
      !rarityFilter.value.length || rarityFilter.value.includes(card.rarity);

    const hasTriggerMatch = hasTriggerFilter.value ? card.trigger : true;

    const counterMatch =
      !counterFilter.value.length ||
      (cardCounter !== null &&
        counterFilter.value.some((value) => toFiniteNumber(value) === cardCounter));

    const attributeMatch =
      !attributeFilter.value.length ||
      attributeFilter.value.includes(card.attribute);

    const illustrationMatch =
      !illustrationFilter.value.length ||
      illustrationFilter.value.includes(card.illustration);

    const priceMin = priceFilter.value.min || 0;
    const priceMax = priceFilter.value.max || Number.MAX_SAFE_INTEGER;
    const cardPrice = card.slugs
      ? parseFloat(card.price) || 0
      : null;
    const priceMatch = cardPrice >= priceMin && cardPrice <= priceMax;

    return (
      nameMatch &&
      colorMatch &&
      typeMatch &&
      setMatch &&
      familyMatch &&
      abilityMatch &&
      rarityMatch &&
      abilityKwMatch &&
      powerMatch &&
      costMatch &&
      hasTriggerMatch &&
      counterMatch &&
      attributeMatch &&
      illustrationMatch &&
      priceMatch
    );
  });
});

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resetFilters() {
  nameFilter.value = null;
  colorFilter.value = [];
  typesFilter.value = [];
  setNamesFilter.value = null;
  familiesFilter.value = [];
  abilityFilter.value = "";
  rarityFilter.value = [];
  abilityKwFilter.value = [];
  costFilter.value = [...DEFAULT_COST_FILTER];
  powerFilter.value = [powerLimits.min, powerLimits.max];
  hasTriggerFilter.value = false;
  counterFilter.value = [];
  attributeFilter.value = [];
  illustrationFilter.value = [];
  priceFilter.value = createDefaultPriceFilter();
}

watch(filtered, (newVal) => {
  emit("update:filtered", newVal);
});

function closeOverlay() {
  emit("close");
}

onMounted(async () => {
  await nextTick();
  emit("update:filtered", filtered.value);
  resetFilters();
});
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
              Ricerca carte
            </p>
            <h3 class="truncate text-2xl font-bold">Filtri</h3>
          </div>
          <div class="filter-count-chip">
            {{ activeFiltersCount }} attivi
          </div>
        </div>

        <div class="filter-sheet__body">
          <div class="filter-grid">
            <div class="filter-item-shell">
              <InputSelect
                v-model="nameFilter"
                :items="nameList"
                autocomplete
                label="Filtra per nome"
              />
            </div>

            <div class="filter-item-shell">
              <InputSelect
                v-model="setNamesFilter"
                :items="setNameList"
                autocomplete
                label="Filtra per set"
              />
            </div>

            <div v-if="!props.hideColorFilter" class="filter-item-shell">
              <div class="flex items-center gap-2">
                <InputSelect
                  v-model="colorFilter"
                  :items="colorList"
                  multiple
                  label="Filtra per colore"
                  class="grow"
                />
                <div class="filter-pill-toggle px-2 py-1">
                  <v-checkbox
                    v-model="isMulticolored"
                    label="Multi"
                    hide-details
                    density="compact"
                    color="#ff9d52"
                    class="m-0"
                  />
                </div>
              </div>
            </div>

            <div v-if="!props.isLeaderFilter" class="filter-item-shell">
              <InputSelect
                v-model="typesFilter"
                :items="typeList"
                multiple
                label="Filtra per tipo"
              />
            </div>
          </div>

          <v-btn
            variant="outlined"
            class="filter-advanced-toggle mt-3"
            block
            @click="moreFilters = !moreFilters"
          >
            <span>{{ moreFilters ? "Meno filtri" : "Piu filtri" }}</span>
            <v-icon size="18">{{ moreFilters ? "mdi-minus" : "mdi-plus" }}</v-icon>
          </v-btn>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="moreFilters" class="filter-grid mt-4">
              <div class="filter-item-shell">
                <InputSelect
                  v-model="abilityKwFilter"
                  :items="abilityKwList"
                  multiple
                  label="Filtra per abilita chiave"
                />
              </div>

              <div class="filter-item-shell">
                <InputSelect
                  v-model="familiesFilter"
                  :items="familyList"
                  multiple
                  autocomplete
                  label="Filtra per famiglia"
                />
              </div>

              <div class="filter-item-shell">
                <InputSelect
                  v-model="rarityFilter"
                  :items="rarityList"
                  multiple
                  label="Filtra per rarita"
                />
              </div>

              <div class="filter-item-shell">
                <InputSelect
                  v-model="illustrationFilter"
                  :items="illustrationList"
                  multiple
                  label="Filtra per illustrazione"
                />
              </div>

              <div class="filter-item-shell">
                <InputSelect
                  v-model="counterFilter"
                  :items="counterList"
                  multiple
                  label="Filtra per counter"
                />
              </div>

              <div class="filter-item-shell">
                <InputSelect
                  v-model="attributeFilter"
                  :items="attributeList"
                  multiple
                  label="Filtra per attributo"
                />
              </div>

              <div v-if="!props.isLeaderFilter" class="filter-item-shell">
                <div class="filter-pill-toggle h-full px-2 py-1">
                  <v-checkbox
                    v-model="hasTriggerFilter"
                    hide-details
                    density="compact"
                    label="Ha effetto Trigger"
                    color="#ff9d52"
                  />
                </div>
              </div>

              <div class="filter-item-shell">
                <div class="grid grid-cols-2 gap-3">
                  <v-text-field
                    v-model.number="priceFilter.min"
                    type="number"
                    label="Prezzo minimo"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    class="filter-number-input"
                  />
                  <v-text-field
                    v-model.number="priceFilter.max"
                    type="number"
                    label="Prezzo massimo"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    class="filter-number-input"
                  />
                </div>
              </div>

              <div class="filter-item-shell">
                <v-range-slider
                  v-model="powerFilter"
                  :min="0"
                  :max="powerLimits.max"
                  step="1000"
                  hint="Range di potenza"
                  persistent-hint
                  thumb-label="always"
                  color="#ff9d52"
                  track-color="rgba(255,255,255,0.2)"
                  class="filter-range-slider ma-0"
                />
              </div>

              <div v-if="!props.isLeaderFilter" class="filter-item-shell">
                <v-range-slider
                  v-model="costFilter"
                  :min="0"
                  :max="10"
                  step="1"
                  hint="Range di costo"
                  persistent-hint
                  thumb-label="always"
                  color="#ff9d52"
                  track-color="rgba(255,255,255,0.2)"
                  class="filter-range-slider ma-0"
                />
              </div>

              <div class="filter-item-shell">
                <v-textarea
                  v-model="abilityFilter"
                  density="compact"
                  variant="outlined"
                  label="Filtra per effetto"
                  clearable
                  hide-details
                  auto-grow
                  rows="3"
                  class="filter-textarea"
                />
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="filter-sheet__footer mx-2 mb-0 rounded-b-2xl pb-16 sm:mx-3">
        <v-btn
          color="white"
          variant="tonal"
          class="filter-action-btn flex-1"
          @click="resetFilters"
        >
          Reset
        </v-btn>
        <v-btn class="filter-action-btn filter-action-btn--primary flex-1" @click="closeOverlay">
          Ok
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

.filter-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 1024px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.filter-item-shell {
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 0.9rem;
  background: linear-gradient(130deg, rgba(17, 24, 39, 0.66), rgba(8, 12, 20, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 20px rgba(0, 0, 0, 0.22);
  padding: 0.5rem;
}

.filter-pill-toggle {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
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

.filter-advanced-toggle {
  border-color: rgba(255, 183, 124, 0.45) !important;
  background: rgba(255, 122, 24, 0.1) !important;
  color: #ffd9b7 !important;
  justify-content: space-between !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
}

.filter-range-slider {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.78rem;
  padding: 0.85rem 1rem 0.4rem;
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

:deep(.filter-number-input .v-field),
:deep(.filter-textarea .v-field) {
  border-radius: 0.7rem !important;
  background: rgba(255, 255, 255, 0.03) !important;
}

:deep(.filter-number-input .v-field__outline),
:deep(.filter-textarea .v-field__outline) {
  --v-field-border-opacity: 0.22;
}
</style>
