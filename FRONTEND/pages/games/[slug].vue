<script setup>
import { fetchGame } from '@/api/games'
const route = useRoute()
const slug = route.params.slug

const {data: game} = await useAsyncData('game', () =>
    fetchGame(slug)
)

const orderedSets = computed(() => game.value.sets.sort((a, b) => {
    return new Date(b.publish_date) - new Date(a.publish_date)
}))

async function refreshData() {
    await refreshNuxtData(['game']);
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
    <div>
        <Toolbar backButton vertical :label="game.name">
            <template #actions>
                <div class="w-full p-3 flex gap-3">
                    <DialogsHandleGame :game-id="game.id" :name="game.name" :brand="game.brand.id" :slug="game.slug" :logo-url="game.logo_url" :website="game.website" :code="game.code" @refresh-data="refreshData"/>
                    <DialogsHandleSet :game-id="game.id" @refresh-data="refreshData"/>
                </div>
            </template>
        </Toolbar>
        <v-container>
            <div class="flex flex-col lg:flex-row gap-5 w-full">
                <v-img :src="game.logo_url" class="w-full lg:w-1/3"></v-img>
                <div class=" w-full lg:w-2/3">
                    <h1 class="text-3xl lg:text-5xl font-bold my-10">{{ game.name }}</h1>
                    <v-chip>{{ game.brand.name }}</v-chip>
                    <h2 class="text-2xl">Code: {{ game.code }}</h2>
                    <p class="text-2xl">Website: <a :href="game.website" target="_blank">{{ game.website }}</a></p>
                    <p class="text-2xl">Slug: {{ game.slug }}</p>
                </div>
            </div>
            <h1 class="text-3xl text-center my-10 lg:text-5xl font-bold">SETS</h1>
            
            <div class="grid grid-cols-1 lg:grid-cols-6 gap-5 lg:gap-10 ">
                <CardSet
                    v-for="(set, idx) in orderedSets"
                    :key="idx"
                    :id="set.id"
                    :name="set.name"
                    :game="game.name"
                    :game-id="game.id"
                    :code="set.code"
                    :imageUrl="set.image_url"
                    :publishDate="set.publish_date"
                    @refresh-data="refreshData"
                />
            </div>
        </v-container>
    </div>
</template>