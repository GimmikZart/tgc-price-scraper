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
  <CardViewFilterWrapper
    title="Filtri"
    subtitle="Ricerca carte"
    :active-filters-count="activeFiltersCount"
    @close="closeOverlay"
    @confirm="closeOverlay"
    @reset="resetFilters"
  >
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
  </CardViewFilterWrapper>
</template>

<style scoped>
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.9rem;
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.78), rgba(8, 12, 20, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 9px 18px rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
}

.filter-pill-toggle {
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 0.75rem;
  background: linear-gradient(140deg, rgba(30, 41, 59, 0.52), rgba(15, 23, 42, 0.62));
}

.filter-advanced-toggle {
  border-color: rgba(255, 255, 255, 0.16) !important;
  background: rgba(148, 163, 184, 0.11) !important;
  color: rgba(241, 245, 249, 0.94) !important;
  justify-content: space-between !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
  font-weight: 600 !important;
}

.filter-range-slider {
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 0.78rem;
  background: rgba(15, 23, 42, 0.58);
  padding: 0.85rem 1rem 0.4rem;
}

:deep(.filter-number-input .v-field),
:deep(.filter-textarea .v-field) {
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 0.7rem !important;
  background: linear-gradient(130deg, rgba(20, 28, 43, 0.66), rgba(8, 12, 20, 0.9)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

:deep(.filter-number-input .v-field__outline),
:deep(.filter-textarea .v-field__outline) {
  opacity: 0;
}

:deep(.filter-number-input .v-field__overlay),
:deep(.filter-textarea .v-field__overlay) {
  opacity: 0;
}

:deep(.filter-number-input .v-field--focused),
:deep(.filter-textarea .v-field--focused) {
  border-color: rgba(255, 157, 82, 0.6);
  box-shadow:
    0 0 0 1px rgba(255, 157, 82, 0.26),
    0 10px 22px rgba(0, 0, 0, 0.24);
}

:deep(.filter-number-input .v-field-label),
:deep(.filter-number-input input),
:deep(.filter-textarea .v-field-label),
:deep(.filter-textarea textarea) {
  color: rgba(241, 245, 249, 0.94);
}

:deep(.filter-pill-toggle .v-label),
:deep(.filter-range-slider .v-label),
:deep(.filter-range-slider .v-slider-thumb__label) {
  color: rgba(226, 232, 240, 0.95);
}

:deep(.filter-range-slider .v-input__details) {
  padding-inline: 0.12rem;
}
</style>
