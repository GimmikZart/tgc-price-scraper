<script setup>
import { fetchGames } from '@/api/games';
import { useUserAuth } from '@/stores/useUserAuth';

const userAuth = useUserAuth()

const {data: games} = await useAsyncData('games', () =>
    fetchGames()
)

async function refreshData() {
    await refreshNuxtData(['games']);
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
<div>
    <Toolbar label="Giochi">
        <template #actions>
            <DialogsHandleGame v-if="userAuth.isAdmin" @refresh-data="refreshData"/>
        </template>
    </Toolbar>
    <div class="grid grid-cols-2 lg:grid-cols-8 gap-10 ">
        <AppCardGame
            v-for="(game, idx) in games"
            :key="idx"
            :game="game"
            class="w-full"
            @edit-game="editGame(game)">
        </AppCardGame>
    </div>
</div>
</template>