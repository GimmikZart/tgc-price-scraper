<script setup>
const {data: games} = await useAsyncData('GAMES', () =>
    useGetGames()
)
</script>
<template>
<div>
    <v-btn color="primary" class="mb-4" @click="createNewAgent">Nuovo Gioco</v-btn>
    <div class="grid grid-cols-4 gap-10 ">
        <GameCard
            v-for="(game, idx) in games"
            :key="idx"
            :id="game.id"
            :name="game.name"
            :brand="game.brand.name"
            :logoUrl="game.logo_url"
            :website="game.website"
            :slug="game.slug"
            class="w-full"
            is-editable
            @edit-game="editGame(game)">
        </GameCard>
    </div>
</div>
</template>