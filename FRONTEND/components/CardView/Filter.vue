<script setup>
import { ref, computed, watch } from "vue";
const emit = defineEmits(["update:filtered", "close"]);

// Prendo tutte le carte dal composable
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

// Stato dei filtri
const nameFilter = ref(null);
const colorFilter = ref([]);
const typesFilter = ref([]);
const moreFilters = ref(false);
const setNamesFilter = ref([]);
const familiesFilter = ref([]);
const abilityFilter = ref("");
const rarityFilter = ref([]);
const abilityKwFilter = ref([]);
const costFilter = ref([0, 10]);
const powerFilter = ref([powerLimits.min, powerLimits.max]);
const hasTriggerFilter = ref(false);

// Filtra **solo** la lista completa (allCards) senza occuparsi di paginazione
const filtered = computed(() => {
  return allCards.filter((card) => {
    const nameMatch = !nameFilter.value || nameFilter.value.includes(card.name);
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

// Ogni volta che “filtered” cambia, emetto l’array filtrato verso il genitore
watch(
  filtered,
  (newVal) => {
    emit("update:filtered", newVal);
  },
  { immediate: true }
);

// Funzione per resettare i filtri all’impostazione iniziale
function resetFilters() {
  nameFilter.value = null;
  colorFilter.value = [];
  typesFilter.value = [];
  setNamesFilter.value = [];
  familiesFilter.value = [];
  abilityFilter.value = "";
  rarityFilter.value = [];
  abilityKwFilter.value = [];
  costFilter.value = [0, 10];
  powerFilter.value = [powerLimits.min, powerLimits.max];
  hasTriggerFilter.value = false;
}

// Quando l’utente clicca fuori per chiudere i filtri, emetto l’evento di close
function closeOverlay() {
  emit("close");
}

onMounted(() => {
  document.documentElement.classList.add("overflow-hidden");
});
onUnmounted(() => {
  document.documentElement.classList.remove("overflow-hidden");
});
</script>

<template>
  <div
    class="fixed flex flex-col justify-end bottom-[50px] right-0 inset-0 z-20"
  >
    <!-- il genitore deciderà quando mostrare/ togliere questo componente -->
    <!-- Layer scuro di sfondo -->
    <div class="h-screen inset-0 bg-black/30" @click="closeOverlay"></div>

    <!-- Contenitore filtri -->
    <div
      class="relative rounded-t-3xl w-full text-white shadow-md bg-black px-6"
    >
      <h3 class="text-2xl font-bold text-center bg-black z-10 my-3 w-full">
        Filtri
      </h3>
      <div class="flex flex-col max-h-[500px] overflow-y-auto">
        <!-- FILTRI BASE -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3">
          <InputSelect
            v-model="nameFilter"
            :items="nameList"
            autocomplete
            label="Filtra per nome"
          />

          <InputSelect
            v-model="colorFilter"
            :items="colorList"
            multiple
            label="Filtra per colore"
          />

          <InputSelect
            v-model="typesFilter"
            :items="typeList"
            multiple
            label="Filtra per tipo"
          />
        </div>
        <!-- Pulsante “Più / Meno filtri” -->
        <div class="mb-4 text-center">
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
          class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
        >
          <v-range-slider
            v-model="powerFilter"
            :min="0"
            :max="powerLimits.max"
            step="1000"
            hint="Range di potenza"
            persistent-hint
            thumb-label="always"
            class="border-2 ma-0 border-white/20 rounded p-4 pt-10"
          ></v-range-slider>

          <v-range-slider
            v-model="costFilter"
            :min="0"
            :max="10"
            step="1"
            hint="Range di costo"
            persistent-hint
            thumb-label="always"
            class="border-2 ma-0 border-white/20 rounded p-4 pt-10"
          ></v-range-slider>

          <InputSelect
            v-model="familiesFilter"
            :items="familyList"
            multiple
            label="Filtra per famiglia"
          />

          <InputSelect
            v-model="abilityKwFilter"
            :items="abilityKwList"
            multiple
            label="Filtra per abilità chiave"
          />

          <div
            class="flex items-center border-2 border-white/20 rounded px-2 py-1"
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
            autocomplete
            label="Filtra per set"
          />

          <InputSelect
            v-model="rarityFilter"
            :items="rarityList"
            multiple
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
    </div>
    <!-- Bottoni di azione: Reset e Chiudi -->
    <div class="flex w-full gap-3 pt-4 bg-black px-6 py-3">
      <v-btn color="white" variant="tonal" class="flex-1" @click="resetFilters">
        Reset
      </v-btn>
      <v-btn class="flex-1" @click="closeOverlay"> Chiudi </v-btn>
    </div>
  </div>
</template>

<style scoped>
/* Qui puoi aggiungere classi CSS base; lo stile preciso lo personalizzi tu dopo */
</style>
