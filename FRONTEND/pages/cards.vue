<script setup>
import { useUserAuth } from '@/stores/useUserAuth';

const {
  allCards,
  setNameList,
  typeList,
  familyList,
  rarityList,
  colorList,
  expansionCodeList,
  abilityKwList
} = await useOnePieceCards()

const filtered = computed(() => {
    //const testList = allCards.slice(0, 100)
    return allCards.filter(card => {
        const nameMatch = !nameFilter.value ||
            card.name.toLowerCase().includes(nameFilter.value.toLowerCase())

        const colorMatch = !colorFilter.value.length ||
            card.color.some(c => colorFilter.value.includes(c))

        const typeMatch = !typesFilter.value.length ||
            typesFilter.value.includes(card.type)

        const setMatch = !setNamesFilter.value.length ||
            setNamesFilter.value.includes(card.setName)

        const familyMatch = !familiesFilter.value.length ||
            card.family.some(c => familiesFilter.value.includes(c))

        const abilityMatch = !abilityFilter.value ||
            card.ability.toLowerCase().includes(abilityFilter.value.toLowerCase())

        const rarityMatch =
            !rarityFilter.value.length ||
            rarityFilter.value.includes(card.rarity)

        return nameMatch && colorMatch && typeMatch && setMatch && familyMatch && abilityMatch && rarityMatch
    })
})

const openFilter = ref(false)
const colorFilter = ref([])
const nameFilter = ref('')
const abilityFilter = ref('')
const setNamesFilter = ref([])
const typesFilter = ref([])
const familiesFilter = ref([])
const rarityFilter = ref([])
const moreFilters = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(32)

const totalPages = computed(() => Math.max(1,Math.ceil(filtered.value.length / itemsPerPage.value))) 
const paginated = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    return filtered.value.slice(start, start + itemsPerPage.value)
})

function resetFilters() {
    colorFilter.value = []
    nameFilter.value = ''
}
</script>
<template>
    <section class="relative min-h-dvh">
        <Toolbar label="Lista Carte">
            <template #actions>
                <v-btn variant="text" class="text-white" @click="openFilter = true">
                    <v-icon size="30">mdi-magnify</v-icon>
                </v-btn> 
            </template>
        </Toolbar>
        <div class="grid grid-cols-2 gap-2 px-2 pt-2 max-sm:pb-5 lg:px-4 lg:pb-20 lg:grid-cols-8 lg:gap-4">
            <Card v-for="(card, ix) in paginated" :key="ix" :card="card"/>
        </div>
        <div class="fixed bottom-[60px] w-full right-0 z-10 p-2 bg-black | lg:bottom-0 lg:w-full lg:right-0 lg:pl-[258px] lg:py-5">
            <div class="py-0 px-4">
                <v-pagination
                    density="compact"
                    v-model="currentPage"
                    :length="totalPages"
                    class="w-full"
                ></v-pagination>
            </div>
            <div v-if="openFilter" class="grid grid-cols-1 gap-4 p-3">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <v-text-field
                        v-model="nameFilter"
                        density="compact"
                        variant="outlined"
                        label="Filtra per nome"
                        class="w-full"
                        clearable
                        hide-details
                    >
                    </v-text-field>
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
                    >
                    </v-select>
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
                    ></v-select>
                </div>
                
                
                <v-btn density="compact" variant="text" class="w-fit mx-auto" @click="moreFilters = !moreFilters">
                    {{ moreFilters ? 'Meno filtri' : 'Più filtri'}}
                    <v-icon>{{moreFilters ? 'mdi-arrow-down' : 'mdi-arrow-up'}}</v-icon>
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
                    >
                    </v-autocomplete>
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
                    >
                    </v-autocomplete>
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
                    >

                    </v-select>
                </div>
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
                    >
                    </v-textarea>
                <div class="flex gap-3">
                    <v-btn color="purple" class="grow" @click="resetFilters()">
                        Reset
                    </v-btn>
                    <v-btn class="grow" @click="openFilter = false">
                        Chiudi
                    </v-btn>
                </div>
            </div>
        </div>
    </section>
</template>