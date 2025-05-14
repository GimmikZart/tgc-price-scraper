<script setup>
const {data: games} = await useAsyncData('games', () =>
    useGetGames()
)

async function refreshData() {
  await refreshNuxtData(['games']);
}
</script>
<template>
<div>
    <Toolbar label="Giochi">
        <template #actions>
            <DialogsHandleGame @refresh-data="refreshData"/>
        </template>
    </Toolbar>
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-10 ">
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