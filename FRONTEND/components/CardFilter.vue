<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  allCards: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "close"]);

const {
  setNameList,
  typeList,
  familyList,
  rarityList,
  colorList,
  expansionCodeList,
  abilityKwList,
} = await useOnePieceCards();

const openFilter = ref(false);
const nameFilter = ref("");
const colorFilter = ref([]);
const typesFilter = ref([]);
const setNamesFilter = ref([]);
const familiesFilter = ref([]);
const abilityFilter = ref("");
const rarityFilter = ref([]);
const moreFilters = ref(false);

const currentPage = ref(1);
const itemsPerPage = ref(32);

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
  <div
    class="fixed bottom-[60px] w-full flex flex-col"
    :class="{ 'h-dvh': openFilter }"
  >
    <div
      v-if="openFilter"
      @click="openFilter = false"
      class="bg-black/30 backdrop-blur-[2px] -mb-5 h-full"
    ></div>
    <div
      class="grid grid-cols-1 gap-4 p-3 bg-black rounded-t-3xl shadow-md text-white w-full right-0 z-10 p-2 bg-black lg:bottom-0 lg:w-full lg:right-0 lg:pl-[258px] lg:py-5 rounded-t-3xl"
    >
      <div class="py-0 px-0 grid grid-cols-8 gap-5">
        <div class="col-span-7">
          <v-pagination
            density="compact"
            v-model="currentPage"
            :length="totalPages"
          ></v-pagination>
        </div>
        <div class="col-start-8 col-span-2">
          <v-btn
            class="text-white"
            variant="outlined"
            block
            @click="openFilter = true"
          >
            <v-icon size="30">mdi-magnify</v-icon>
          </v-btn>
        </div>
      </div>

      <template v-if="openFilter">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <v-text-field
            v-model="nameFilter"
            density="compact"
            variant="outlined"
            label="Filtra per nome"
            class="w-full"
            clearable
            hide-details
          />

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

        <v-btn
          variant="outlined"
          block
          class="w-fit mx-auto text-white"
          @click="moreFilters = !moreFilters"
        >
          {{ moreFilters ? "Meno filtri" : "Più filtri" }}
          <v-icon>{{ moreFilters ? "mdi-minus" : "mdi-plus" }}</v-icon>
        </v-btn>

        <div v-if="moreFilters" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
      </template>
    </div>
  </div>
</template>
