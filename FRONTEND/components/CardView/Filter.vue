<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
const emit = defineEmits(["update:filtered", "close"]);

const props = defineProps({
  cardsList: {
    type: Array,
    default: [],
  },
  isLeaderFilter: {
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
  illustrationList
} = await useOnePieceCards();

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
const costFilter = ref([0, 10]);
const powerFilter = ref([powerLimits.min, powerLimits.max]);
const hasTriggerFilter = ref(false);
const counterFilter = ref([]);
const attributeFilter = ref([]);
const illustrationFilter = ref([]);
const priceFilter = ref({
  min: 0,
  max: null
});

const filtered = computed(() => {
  return props.cardsList.filter((card) => {
    const nameMatch = 
      !nameFilter.value || nameFilter.value.includes(card.name);

    const colorMatch =
      !colorFilter.value.length ||
      (isMulticolored.value
        ? colorFilter.value.every((c) => card.color.includes(c))
        : card.color.some((c) => colorFilter.value.includes(c)));

    const typeMatch =
      !typesFilter.value.length || typesFilter.value.includes(card.type);

    const setMatch =
      !setNamesFilter.value || setNamesFilter.value.includes(card.setName);

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
          card.abilityKeywords.some((a) =>
            a.toLowerCase().includes(kw.toLowerCase())
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

    const hasTriggerMatch = 
      hasTriggerFilter.value ? card.trigger : true;

    const counterMatch =
      !counterFilter.value.length || counterFilter.value.includes(card.counter);

    const attributeMatch =
      !attributeFilter.value.length || attributeFilter.value.includes(card.attribute);

    const illustrationMatch =
      !illustrationFilter.value.length || illustrationFilter.value.includes(card.illustration);

    const priceMin = priceFilter.value.min || 0;
    const priceMax = priceFilter.value.max || Number.MAX_SAFE_INTEGER;
    const cardPrice = card.slugs ? parseFloat(card.slugs[0]?.current_price) || 0 : null;
    const priceMatch =
      cardPrice >= priceMin && cardPrice <= priceMax;

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

function resetFilters() {
  nameFilter.value = null;
  colorFilter.value = [];
  typesFilter.value = [];
  setNamesFilter.value = null;
  familiesFilter.value = [];
  abilityFilter.value = "";
  rarityFilter.value = [];
  abilityKwFilter.value = [];
  costFilter.value = [0, 10];
  powerFilter.value = [powerLimits.min, powerLimits.max];
  hasTriggerFilter.value = false;
  counterFilter.value = [];
  attributeFilter.value = [];
  illustrationFilter.value = [];
  priceFilter.value = {
    min: 0,
    max: null
  };
}

watch(
  filtered,
  (newVal) => {
    emit("update:filtered", newVal);
  },
);

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
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-all duration-300 ease-out"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      class="fixed flex flex-col justify-end bottom-[0px] right-0 inset-0 z-[2000] lg:ml-[250px]"
    >
      <!-- Layer scuro di sfondo -->
      <div
        class="h-[200%] fixed -top-full right-0 inset-0 bg-black/30 backdrop-blur-[2px]"
        @click="closeOverlay"
      ></div>
      <!-- Contenitore filtri -->
      <div
        class="relative rounded-t-3xl w-full text-white shadow-md bg-black px-6 pb-2"
      >
        <h3 class="text-2xl font-bold text-center bg-black z-10 my-3 w-full">
          Filtri
        </h3>
        <div class="flex flex-col max-h-[500px] overflow-y-auto w-full py-2">
          <!-- FILTRI BASE -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3 w-full">
            <InputSelect
              v-model="nameFilter"
              :items="nameList"
              autocomplete
              label="Filtra per nome"
            />

            <InputSelect
              v-model="setNamesFilter"
              :items="setNameList"
              autocomplete
              label="Filtra per set"
            />

            <div v-if="!props.hideColorFilter" class="flex items-center gap-2">
              <InputSelect
                v-model="colorFilter"
                :items="colorList"
                multiple
                label="Filtra per colore"
                class="grow"
              />
              <v-checkbox
                v-model="isMulticolored"
                label="Multi"
                hide-details
              ></v-checkbox>
            </div>

            <InputSelect
              v-if="!props.isLeaderFilter"
              v-model="typesFilter"
              :items="typeList"
              multiple
              label="Filtra per tipo"
            />
          </div>
          <!-- Pulsante “Più / Meno filtri” -->
          <div class="text-center">
            <v-btn
              variant="outlined"
              class="text-white"
              block
              @click="moreFilters = !moreFilters"
            >
              {{ moreFilters ? "Meno filtri" : "Più filtri" }}
              <v-icon>{{ moreFilters ? "mdi-minus" : "mdi-plus" }}</v-icon>
            </v-btn>
          </div>
          <!-- PIù FILTRI -->
          <div
            v-if="moreFilters"
            class="grid grid-cols-1 lg:grid-cols-3 gap-4 my-4"
          >
            <InputSelect
              v-model="abilityKwFilter"
              :items="abilityKwList"
              multiple
              label="Filtra per abilità chiave"
            />

            <InputSelect
              v-model="familiesFilter"
              :items="familyList"
              multiple
              autocomplete
              label="Filtra per famiglia"
            />

            <InputSelect
              v-model="rarityFilter"
              :items="rarityList"
              multiple
              label="Filtra per rarità"
            />

            <InputSelect
              v-model="illustrationFilter"
              :items="illustrationList"
              multiple
              label="Filtra per illustrazione"
            />

            <InputSelect
              v-model="counterFilter"
              :items="counterList"
              multiple
              label="Filtra per counter"
            />

            <InputSelect
              v-model="attributeFilter"
              :items="attributeList"
              multiple
              label="Filtra per attributo"
            />

            <div
              v-if="!props.isLeaderFilter"
              @click="hasTriggerFilter =!hasTriggerFilter"
              class="flex items-center border-2 border-white/20 rounded px-1 py-0"
            >
              <v-checkbox
                v-model="hasTriggerFilter"
                hide-details
                density="compact"
                label="Ha effetto Trigger"
              />
            </div>

            <div class="flex gap-5">
              <v-text-field
                v-model.number="priceFilter.min"
                type="number"
                label="Prezzo Minimo"
                clearable
                hide-details
              />
              <v-text-field
                v-model.number="priceFilter.max"
                type="number"
                label="Prezzo Massimo"
                clearable
                hide-details
              />
            </div>

            <v-range-slider
              v-model="powerFilter"
              :min="0"
              :max="powerLimits.max"
              step="1000"
              hint="Range di potenza"
              persistent-hint
              thumb-label="always"
              class="border-2 ma-0 border-white/20 rounded p-4 px-6 pt-10"
            ></v-range-slider>

            <v-range-slider
              v-if="!props.isLeaderFilter"
              v-model="costFilter"
              :min="0"
              :max="10"
              step="1"
              hint="Range di costo"
              persistent-hint
              thumb-label="always"
              class="border-2 ma-0 border-white/20 rounded p-4 px-6 pt-10"
            ></v-range-slider>

            <v-textarea
              v-model="abilityFilter"
              density="compact"
              variant="outlined"
              label="Filtra per effetto"
              class="w-full mb-2"
              clearable
              hide-details
              auto-grow
              rows="3"
            />
          </div>
        </div>
      </div>
      <!-- Bottoni di azione: Reset e Chiudi -->
      <div class="flex w-full gap-3 bg-black px-6 py-3 pt-0 pb-16">
        <v-btn
          color="white"
          variant="tonal"
          class="flex-1"
          @click="resetFilters"
        >
          Reset
        </v-btn>
        <v-btn class="flex-1" @click="closeOverlay"> Ok </v-btn>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Qui puoi aggiungere classi CSS base; lo stile preciso lo personalizzi tu dopo */
</style>
