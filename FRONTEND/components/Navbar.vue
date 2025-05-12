<script setup>
import {useSnackbar} from '@/stores/useSnackbar'

const snackbar = useSnackbar()
const isLoading = ref(false);
async function updateAll(){
    isLoading.value = true;
    try {
        await useUpdateProductsBatch();
        snackbar.addMessage('Aggiornamento terminato', 'info')
    } catch (error) {
        snackbar.addMessage(`Errore aggiornamento prodotti`, 'error', error)
    } finally{
        isLoading.value = false;
    }
}   
</script>
<template>
<div class="md:flex gap-5 items-center justify-start p-5">
    <h1 class="text-2xl font-bold my-3">TGC Price Scraper 🃏</h1>
    <div class="flex flex-wrap gap-5 items-center justify-start">
        <NuxtLink to="/"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">AGENTI SPIA</NuxtLink>
        <NuxtLink to="/brands"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">BRANDS</NuxtLink>
        <NuxtLink to="/games"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">GIOCHI</NuxtLink>
        <NuxtLink to="/stores" class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">NEGOZI</NuxtLink>
        <v-spacer></v-spacer>
        <v-btn :loading="isLoading" color="purple" @click="updateAll()">Aggiorna Agenti</v-btn>
    </div>
    
</div>
</template>