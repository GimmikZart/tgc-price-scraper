<script setup>
import { fetchGames } from '@/api/games';
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
            <DialogsHandleGame @refresh-data="refreshData"/>
        </template>
    </Toolbar>
    <div class="grid grid-cols-2 lg:grid-cols-8 gap-10 ">
        <CardGame
            v-for="(game, idx) in games"
            :key="idx"
            :game="game"
            class="w-full"
            @edit-game="editGame(game)">
        </CardGame>
    </div>
</div>
</template>