<script setup>
import { fetchGames } from '@/api/games';
import { useUserAuth } from '@/stores/useUserAuth';

const { data: gamesList } = await useAsyncData('games', fetchGames);

const openDialog = ref(false);
const editableGame = ref(null);
const userAuth = useUserAuth()

const editMode = ref(false);

async function refreshData() {
    await refreshNuxtData(['games']);
}

function createNewProduct() {
    editableGame.value = null;
    openDialog.value = true;
}

function editGame(game) {
    console.log({game});
    
    editableGame.value = {
        id: game.id,
        name: game.name,
        logo_url: game.logo_url,
        website: game.website,
        code: game.code,
        slug: game.slug,
        brand: game.brand.id,
    };
    openDialog.value = true;
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
    <section>
        <Toolbar label="Scegli Gioco">
            <template #actions>
                <v-btn v-if="userAuth.isAdmin && editMode" color="error"  @click="editMode = false">
                    <v-icon icon="mdi-pencil-off"></v-icon>
                </v-btn>
                <v-btn v-else-if="userAuth.isAdmin && !editMode" color="warning"  @click="editMode = true">
                    <v-icon icon="mdi-pencil"></v-icon>
                </v-btn>
                <v-btn v-if="userAuth.isAdmin" color="green"  @click="createNewProduct()">
                    <v-icon icon="mdi-plus"></v-icon>
                </v-btn>
            </template>
        </Toolbar>
        <DialogsHandleGame v-model="openDialog" :game-to-edit="editableGame" @refresh-data="refreshData"/>
        <v-container class="grid grid-cols-2 gap-2 pa-2 lg:pa-4 lg:grid-cols-8 lg:gap-4">
            <AppCardGame 
                v-for="(game, id) in gamesList" 
                :key="id"
                :game="game"
                :edit-mode="editMode"
                @edit-game="editGame(game)"
            />
        </v-container>
    </section>
</template>