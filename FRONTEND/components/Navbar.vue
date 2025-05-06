<script setup>
import {useSnackbar} from '@/stores/useSnackbar'

const snackbar = useSnackbar()
const isLoading = ref(false);
async function updateAll(){
    isLoading.value = true;
    try {
        await useUpdateProductsBatch();
        snackbar.addMessage('Prodotti aggiornati con successo', 'success')
    } catch (error) {
        snackbar.addMessage(`Errore aggiornamento prodotti`, 'error', error)
    } finally{
        isLoading.value = false;
    }
}   
</script>
<template>
<div class="flex gap-5 items-center justify-start p-5">
    <h1 class="text-2xl font-bold">TGC Price Scraper 🃏</h1>
    <NuxtLink to="/"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">AGENTI SPIA</NuxtLink>
    <NuxtLink to="/brands"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">BRANDS</NuxtLink>
    <NuxtLink to="/games"  class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">GIOCHI</NuxtLink>
    <NuxtLink to="/stores" class="bg-black text-white py-1 px-3 cursor-pointer rounded-lg">NEGOZI</NuxtLink>
    <v-spacer></v-spacer>
    <v-btn :loading="isLoading" @click="updateAll()">Update All</v-btn>
</div>
</template>