<script setup>
import { ref, computed, watch } from "vue";

/**
 * Props:
 * - allCards: array di tutte le carte da filtrare
 * - colorList, typeList, setNameList, familyList, rarityList: array di possibili valori per i dropdown/autocomplete
 *
 * Emits:
 * - update:modelValue => nuovo array di carte filtrate
 * - close            => chiusura del pannello di filtro
 */
const props = defineProps({
  allCards: {
    type: Array,
    required: true,
  },
});

const {
  setNameList,
  typeList,
  familyList,
  rarityList,
  colorList,
  expansionCodeList,
  abilityKwList,
} = await useOnePieceCards();

const emit = defineEmits(["update:modelValue", "close"]);

// --- Ref interni per ogni filtro ---
const nameFilter = ref("");
const colorFilter = ref([]);
const typesFilter = ref([]);
const setNamesFilter = ref([]);
const familiesFilter = ref([]);
const abilityFilter = ref("");
const rarityFilter = ref([]);
const moreFilters = ref(false);

const filtered = computed(() => {
  return props.allCards.filter((card) => {
    const nameMatch =
      !nameFilter.value ||
      card.name.toLowerCase().includes(nameFilter.value.toLowerCase());

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
      card.ability.toLowerCase().includes(abilityFilter.value.toLowerCase());

    const rarityMatch =
      !rarityFilter.value.length || rarityFilter.value.includes(card.rarity);

    return (
      nameMatch &&
      colorMatch &&
      typeMatch &&
      setMatch &&
      familyMatch &&
      abilityMatch &&
      rarityMatch
    );
  });
});

watch(
  filtered,
  (newVal) => {
    emit("update:modelValue", newVal);
  },
  { immediate: true }
);

/**
 * Funzione per resettare tutti i filtri ai valori iniziali.
 */
function resetFilters() {
  nameFilter.value = "";
  colorFilter.value = [];
  typesFilter.value = [];
  setNamesFilter.value = [];
  familiesFilter.value = [];
  abilityFilter.value = "";
  rarityFilter.value = [];
}

function close() {
  emit("close");
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 p-3 bg-black rounded-lg shadow-md">
    <!-- PRIMA RIGA: filtri principali -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Filtra per nome -->
      <v-text-field
        v-model="nameFilter"
        density="compact"
        variant="outlined"
        label="Filtra per nome"
        class="w-full"
        clearable
        hide-details
      />

      <!-- Filtra per colore -->
      <v-select
        v-model="colorFilter"
        density="compact"
        variant="outlined"
        :items="colorList"
        label="Filtra per colore"
        multiple
        chips
        class="w-full"
        hide-details
        clearable
      />

      <!-- Filtra per tipo -->
      <v-select
        v-model="typesFilter"
        density="compact"
        variant="outlined"
        :items="typeList"
        label="Filtra per tipo"
        multiple
        chips
        class="w-full"
        hide-details
        clearable
      />
    </div>

    <!-- Bottone per mostrare/nascondere filtri aggiuntivi -->
    <v-btn
      density="compact"
      variant="text"
      class="w-fit mx-auto"
      @click="moreFilters = !moreFilters"
    >
      {{ moreFilters ? "Meno filtri" : "Più filtri" }}
      <v-icon>{{ moreFilters ? "mdi-arrow-down" : "mdi-arrow-up" }}</v-icon>
    </v-btn>

    <!-- SECONDA RIGA: filtri aggiuntivi (set, famiglia, rarità, effetto) -->
    <div v-if="moreFilters" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Filtra per set -->
      <v-autocomplete
        v-model="setNamesFilter"
        density="compact"
        variant="outlined"
        :items="setNameList"
        label="Filtra per set"
        multiple
        chips
        class="w-full"
        hide-details
        clearable
      />

      <!-- Filtra per famiglia -->
      <v-autocomplete
        v-model="familiesFilter"
        density="compact"
        variant="outlined"
        :items="familyList"
        label="Filtra per famiglia"
        multiple
        chips
        class="w-full"
        hide-details
        clearable
      />

      <!-- Filtra per rarità -->
      <v-select
        v-model="rarityFilter"
        density="compact"
        variant="outlined"
        :items="rarityList"
        label="Filtra per rarità"
        multiple
        chips
        class="w-full"
        hide-details
        clearable
      />
    </div>

    <!-- Filtra per effetto (solo se moreFilters=true) -->
    <v-textarea
      v-if="moreFilters"
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

    <!-- Pulsanti reset e chiudi -->
    <div class="flex gap-3">
      <v-btn color="purple" class="grow" @click="resetFilters"> Reset </v-btn>
      <v-btn class="grow" @click="close"> Chiudi </v-btn>
    </div>
  </div>
</template>

<style scoped>
/* Aggiungi qui eventuali stili custom per il pannello di filtro */
</style>
