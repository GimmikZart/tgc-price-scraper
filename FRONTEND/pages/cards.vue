<script setup>
import { useUserAuth } from '@/stores/useUserAuth';
import cardsListFromJson from '@/public/data/cards/cards.json'
import colorsFilterJson from '@/public/data/filters/colors.json'

import setNamesFilterJson from '@/public/data/filters/setNames.json'
import typesFilterJson from '@/public/data/filters/types.json'
import familiesFilterJson from '@/public/data/filters/families.json'
import raritiesFilterJson from '@/public/data/filters/rarities.json'

const filtered = computed(() => {
    const testList = cardsListFromJson.slice(0, 100)
    return testList.filter(card => {
        const nameMatch = !nameFilter.value ||
            card.name.toLowerCase().includes(nameFilter.value.toLowerCase())

        const colorMatch = !colorFilter.value.length ||
            card.color.some(c => colorFilter.value.includes(c))

        const typeMatch = !typesFilter.value.length ||
            typesFilter.value.includes(card.type)

        const setMatch = !setNamesFilter.value.length ||
            setNamesFilter.value.includes(card.setName)

        const familyMatch = !familiesFilter.value.length ||
            familiesFilter.value.includes(card.family)

        const abilityMatch = !abilityFilter.value ||
            card.ability.toLowerCase().includes(abilityFilter.value.toLowerCase())

        return nameMatch && colorMatch && typeMatch && setMatch && familyMatch && abilityMatch
    })
})

const openFilter = ref(false)
const colorFilter = ref([])
const nameFilter = ref('')
const abilityFilter = ref('')
const setNamesFilter = ref([])
const typesFilter = ref([])
const familiesFilter = ref([])
const moreFilters = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(32)

const totalPages = computed(() => Math.max(1,Math.ceil(filtered.value.length / itemsPerPage.value))) 
const paginated = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    console.log("Paginated Start:", start)
    console.log('items per page', itemsPerPage.value)
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
        <v-container class="grid grid-cols-2 gap-2 px-2 pt-2 lg:pa-4 lg:grid-cols-8 lg:gap-4">
            <Card v-for="(card, ix) in paginated" :key="ix" :card="card"/>
        </v-container>
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
                        :items="colorsFilterJson"
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
                        :items="typesFilterJson"
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
                        :items="setNamesFilterJson"
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
                        :items="familiesFilterJson"
                        label="Filtra per famiglia"
                        multiple
                        chips
                        class="w-full"
                        hide-details
                        clearable
                    >
                    </v-autocomplete>
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