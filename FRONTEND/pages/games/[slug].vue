<script setup>
//get the slug in url
const route = useRoute()
const slug = route.params.slug

const {data: game} = await useAsyncData('game', () =>
    useGetGame(slug)
)

const orderedSets = computed(() => game.value.sets.sort((a, b) => {
    return new Date(b.publish_date) - new Date(a.publish_date)
}))

async function refreshData() {
    await refreshNuxtData(['game']);
}
</script>
<template>
    <div>
        
        <div class="flex gap-5 w-full">
            <v-img :src="game.logo_url" class="w-1/3"></v-img>
            <div class="w-2/3">
                <h1 class="text-5xl font-bold">{{ game.name }}</h1>
                <v-chip>{{ game.brand.name }}</v-chip>
                <h2 class="text-2xl">Code: {{ game.code }}</h2>
                <p class="text-2xl">Website: <a :href="game.website" target="_blank">{{ game.website }}</a></p>
                <p class="text-2xl">Slug: {{ game.slug }}</p>
                <DialogsHandleGame :game-id="game.id" :name="game.name" :brand="game.brand.id" :slug="game.slug" :logo-url="game.logo_url" :website="game.website" :code="game.code" @refresh-data="refreshData"/>
            </div>
        </div>
        <h1 class="text-5xl font-bold">SETS</h1>
        <DialogsHandleSet :game-id="game.id" @refresh-data="refreshData"/>
        <div class="grid grid-cols-6 gap-10 ">
            <SetCard
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
    </div>
</template>