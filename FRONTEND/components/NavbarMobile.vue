<script setup>
import {useSnackbar} from '@/stores/useSnackbar'

const snackbar = useSnackbar()
const isLoading = ref(false);

async function updateAllProducts() {
    isLoading.value = true
    try {
        await useUpdateProductsBatch()
        snackbar.addMessage('Aggiornamento completato', 'success')
    } catch (error) {
        snackbar.addMessage(`Errore durante l'aggiornamento`, 'error', error)
    } finally {
        isLoading.value = false
    }
}

</script>
<template>
<div class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around p-2 bg-black">
    <NuxtLink to="/"  class="text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-cards"></v-icon>
    </NuxtLink>
    <NuxtLink to="/brands"  class="bg-black text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-domain"></v-icon>
    </NuxtLink>
    <NuxtLink to="/stores" class="bg-black text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-storefront"></v-icon>
    </NuxtLink>
    <v-btn :loading="isLoading" color="purple" @click="updateAllProducts()">
        <v-icon icon="mdi-update"></v-icon>
    </v-btn>
</div>
</template>