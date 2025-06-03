<script setup>
import { useSnackbar } from '@/stores/useSnackbar'
import { updateProductsBatch } from '@/api/products'
import { useUserAuth } from '@/stores/useUserAuth';
import { fetchCardsFromApi } from '@/api/cardsFromApi'
import { signOutApi } from '@/api/auth';

const snackbar = useSnackbar()
const isLoading = ref(false);
const userAuth = useUserAuth()

async function updateAllProducts() {
    isLoading.value = true
    try {
        await updateProductsBatch()
        snackbar.addMessage('Aggiornamento completato', 'success')
    } catch (error) {
        snackbar.addMessage(`Errore durante l'aggiornamento`, 'error', error)
    } finally {
        isLoading.value = false
    }
}

async function fetchCards() {
    isLoading.value = true
    try {
        await fetchCardsFromApi()
        snackbar.addMessage('Carte aggiornate con successo', 'success')
    } catch (error) {
        snackbar.addMessage(`Errore durante l'aggiornamento delle carte`, 'error', error)
    } finally {
        isLoading.value = false
    }
}

async function signOut() {
    isLoading.value = true
    try {
        await signOutApi()
    } catch (error) {
        snackbar.addMessage(`Errore durante il logout`, 'error', error)
    } finally {
        isLoading.value = false
    }
}
</script>
<template>
<div class="w-screen flex gap-5 fixed bottom-0 right-0 items-center justify-around p-2 bg-black">
    <NuxtLink v-if="userAuth.isAdmin" to="/admin"  class="text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-security"></v-icon>
    </NuxtLink>
    <NuxtLink to="/"  class="text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-shopping"></v-icon>
    </NuxtLink>
    <NuxtLink to="/cards"  class="text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-cards"></v-icon>
    </NuxtLink>
    <NuxtLink v-if="userAuth.isAdmin" to="/brands"  class="bg-black text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-domain"></v-icon>
    </NuxtLink>
    <NuxtLink v-if="userAuth.isAdmin" to="/stores" class="bg-black text-white p-2 cursor-pointer rounded-lg">
        <v-icon size="30" icon="mdi-storefront"></v-icon>
    </NuxtLink>
    <v-btn @click="signOut">
        <v-icon size="30" icon="mdi-logout"></v-icon>
    </v-btn>
    <!-- <v-btn v-if="userAuth.isAdmin" :loading="isLoading" color="purple" @click="fetchCards()">
        <v-icon icon="mdi-update"></v-icon>
    </v-btn> -->
</div>
</template>