<script setup>
import { useUserAuth } from '@/stores/useUserAuth';
import cardsListFromJson from '@/public/data/cards/cards.json'

const filtered = computed(() => {
    return cardsListFromJson.slice(0, 300)
})

const currentPage = ref(2)
const itemsPerPage = ref(20)

const totalPages = computed(() => Math.max(1,Math.ceil(filtered.value.length / itemsPerPage.value))) 
const paginated = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    return filtered.value.slice(start, start + itemsPerPage.value)
})

//const userAuth = useUserAuth()
</script>
<template>
    <section class="pb-[60px]">
        <Toolbar label="Lista Carte"> 
        </Toolbar>
        <v-container class="grid grid-cols-2 gap-2 px-2 pt-2 lg:pa-4 lg:grid-cols-8 lg:gap-4">
            <Card v-for="(card, ix) in paginated" :key="ix" :card="card"/>
        </v-container>
        <div class="fixed bottom-[96px] lg:bottom-0 left-0 right-0 z-10 p-2 lg:p-5 bg-black">
            <div class="py-0 px-4">
                <v-pagination
                    density="compact"
                    v-model="currentPage"
                    :length="totalPages"
                    class="w-full"
                ></v-pagination>
            </div>
                
            
        </div>
    </section>
</template>