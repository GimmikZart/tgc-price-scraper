<script setup>
const route = useRoute()
const gameSlug = route.params.gameName
const { data: setList } = await useAsyncData('sets', () => useGetGameSet(gameSlug));

const openDialog = ref(false);
const editableAgent = ref(null);

async function refreshData() {
  await refreshNuxtData(['products']);
}

function createNewProduct() {
    editableAgent.value = null;
    openDialog.value = true;
}
</script>
<template>
    <section>
        <Toolbar backButton label="Sets">
            <template #actions>
                <v-btn color="green"  @click="createNewProduct()">
                    <v-icon icon="mdi-plus"></v-icon>
                </v-btn>
            </template>
        </Toolbar>
        <v-container fluid class="grid grid-cols-2 lg:grid-cols-8 gap-4">
            <ProductsSetCard
                v-for="set in setList"
                :key="set.id"
                :id="set.id"
                :name="set.name"
                :code="set.code"
                :setSlug="set.slug"
                :imageUrl="set.image_url"
                :publishDate="set.publish_date"
                :game-slug="gameSlug"
                :products="set.products"
            />
        </v-container>
    </section>
</template>