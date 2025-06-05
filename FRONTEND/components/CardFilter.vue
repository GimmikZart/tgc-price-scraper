<script setup>
import { ref, computed, watch } from "vue";

const emit = defineEmits(["update:modelValue", "close"]);

const {
  allCards,
  setNameList,
  typeList,
  familyList,
  rarityList,
  colorList,
  abilityKwList,
  nameList,
  powerLimits,
} = await useOnePieceCards();

const openFilter = ref(false);
const nameFilter = ref([]);
const colorFilter = ref([]);
const typesFilter = ref([]);
const setNamesFilter = ref([]);
const familiesFilter = ref([]);
const abilityFilter = ref("");
const rarityFilter = ref([]);
const abilityKwFilter = ref([]);
const costFilter = ref([0, 10]);
const powerFilter = ref([powerLimits.min, powerLimits.max]);
const hasTriggerFilter = ref(false);
const moreFilters = ref(false);

const currentPage = ref(1);
const itemsPerPage = ref(32);

const filtered = computed(() => {
  return allCards.filter((card) => {
    const nameMatch =
      !nameFilter.value.length || nameFilter.value.includes(card.name);

    const colorMatch =
      !colorFilter.value.length ||
      card.color.some((c) => colorFilter.value.includes(c));

    const typeMatch =
      !typesFilter.value.length || typesFilter.value.includes(card.type);

    const setMatch =
      !setNamesFilter.value.length ||
      setNamesFilter.value.includes(card.setName);

    const familyMatch =
      !familiesFilter.value.length ||
      card.family.some((c) => familiesFilter.value.includes(c));

    const abilityMatch =
      !abilityFilter.value ||
      (card.effect &&
        card.effect.toLowerCase().includes(abilityFilter.value.toLowerCase()));

    const abilityKwMatch =
      !abilityKwFilter.value.length ||
      (card.abilityKeywords &&
        abilityKwFilter.value.every((kw) =>
          card.abilityKeywords.some((ability) =>
            ability.toLowerCase().includes(kw.toLowerCase())
          )
        ));

    const powerMatch =
      (powerFilter.value[0] === powerLimits.min &&
        powerFilter.value[1] === powerLimits.max) ||
      (card.power &&
        card.power >= powerFilter.value[0] &&
        card.power <= powerFilter.value[1]);

    const costMatch =
      (costFilter.value[0] === 0 && costFilter.value[1] === 10) ||
      (card.cost >= costFilter.value[0] && card.cost <= costFilter.value[1]);

    const rarityMatch =
      !rarityFilter.value.length || rarityFilter.value.includes(card.rarity);

    const hasTriggerMatch = hasTriggerFilter.value ? card.trigger : true;

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
      hasTriggerMatch
    );
  });
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filtered.value.length / itemsPerPage.value));
});

const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filtered.value.slice(start, start + itemsPerPage.value);
});

watch(
  paginated,
  (newVal) => {
    emit("update:modelValue", newVal);
  },
  { immediate: true }
);

watch(filtered, (newVal) => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1;
  }
});

function resetFilters() {
  nameFilter.value = [];
  colorFilter.value = [];
  typesFilter.value = [];
  setNamesFilter.value = [];
  familiesFilter.value = [];
  abilityFilter.value = "";
  rarityFilter.value = [];
}

watch(openFilter, (newVal) => {
  if (newVal) {
    document.documentElement.classList.add("overflow-hidden");
  } else {
    document.documentElement.classList.remove("overflow-hidden");
  }
});
</script>

<template>
  <div
    class="fixed overflow-hidden bottom-[60px] w-full flex flex-col"
    :class="{ 'h-screen': openFilter }"
  >
    <!-- LAYER SCURO -->
    <div
      v-if="openFilter"
      @click="openFilter = false"
      class="bg-black/30 backdrop-blur-[2px] -mb-5 h-full"
    ></div>
    <!-- SEZIONE -->
    <div
      class="p-3 bg-black rounded-t-3xl shadow-md text-white w-full right-0 z-10 p-2 bg-black lg:bottom-0 lg:w-full lg:right-0 lg:pl-[258px] lg:py-5 rounded-t-3xl"
    >
      <!-- PAGINATION -->
      <div v-if="!openFilter" class="py-0 px-0 grid grid-cols-8 gap-5">
        <div :class="openFilter ? 'col-span-8' : 'col-span-7'">
          <v-pagination
            density="compact"
            v-model="currentPage"
            :length="totalPages"
          ></v-pagination>
        </div>
        <div class="col-start-8 col-span-2">
          <v-btn
            class="text-white"
            variant="tonal"
            block
            @click="openFilter = true"
          >
            <v-icon size="30">mdi-magnify</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- FILTRI -->
      <div v-show="openFilter" class="flex flex-col gap-4">
        <h3 class="text-2xl font-bold text-center">Filtri</h3>
        <div class="grid grid-cols-1 gap-4 max-h-[500px] overflow-auto">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InputSelect
              v-model="nameFilter"
              :items="nameList"
              label="Filtra per nome"
            />

            <InputSelect
              v-model="colorFilter"
              :items="colorList"
              label="Filtra per colore"
            />

            <InputSelect
              v-model="typesFilter"
              :items="typeList"
              label="Filtra per tipo"
            />
          </div>

          <!-- PIU' FILTRI -->
          <div>
            <v-btn
              variant="outlined"
              block
              class="w-fit mx-auto text-white"
              @click="moreFilters = !moreFilters"
            >
              {{ moreFilters ? "Meno filtri" : "Più filtri" }}
              <v-icon>{{ moreFilters ? "mdi-minus" : "mdi-plus" }}</v-icon>
            </v-btn>
          </div>

          <div v-if="moreFilters" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <v-range-slider
              v-model="powerFilter"
              :min="0"
              :max="powerLimits.max"
              step="1000"
              color="white/30"
              hint="Range di potenza"
              persistent-hint
              thumb-label="always"
              class="ma-0 border-2 border-white/20 rounded p-4 pt-10"
            ></v-range-slider>

            <v-range-slider
              v-model="costFilter"
              :min="0"
              :max="10"
              step="1"
              color="white/30"
              hint="Range di costo"
              persistent-hint
              thumb-label="always"
              class="ma-0 border-2 border-white/20 rounded p-4 pt-10"
            ></v-range-slider>
            <InputSelect
              v-model="familiesFilter"
              :items="familyList"
              label="Filtra per famiglia"
            />
            <InputSelect
              v-model="abilityKwFilter"
              :items="abilityKwList"
              label="Filtra per abilità chiave"
            />
            <div
              class="border-2 border-white/20 rounded"
              @click="hasTriggerFilter = !hasTriggerFilter"
            >
              <v-checkbox
                v-model="hasTriggerFilter"
                hide-details
                label="Ha effetto Trigger"
              />
            </div>

            <InputSelect
              v-model="setNamesFilter"
              :items="setNameList"
              label="Filtra per set"
            />

            <InputSelect
              v-model="rarityFilter"
              :items="rarityList"
              label="Filtra per rarità"
            />
            <v-textarea
              v-model="abilityFilter"
              density="compact"
              variant="outlined"
              label="Filtra per effetto"
              class="w-full mb-2"
              clearable
              hide-details
              auto-grow
              rows="2"
            />
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="flex gap-3">
          <v-btn
            color="white"
            variant="tonal"
            class="grow"
            @click="resetFilters"
          >
            Reset
          </v-btn>
          <v-btn class="grow" @click="openFilter = false"> Chiudi </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>
