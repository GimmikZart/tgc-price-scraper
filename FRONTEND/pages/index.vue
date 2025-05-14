<script setup>
const { data: gamesList } = await useAsyncData('games', useGetGames);

const openDialog = ref(false);
const editableAgent = ref(null);

async function refreshData() {
  await refreshNuxtData(['games']);
}

function createNewProduct() {
    editableAgent.value = null;
    openDialog.value = true;
}
</script>
<template>
    <section>
        <Toolbar label="Prodotti">
            <template #actions>
                <v-btn v-if="!openFilters" color="green"  @click="createNewProduct">
                    <v-icon icon="mdi-plus"></v-icon>
                </v-btn>
            </template>
        </Toolbar>
        <DialogsHandleAgents
            v-model="openDialog"
            :agent-to-edit="editableAgent"
            @refresh-data="refreshData"
        />
        <v-container class="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <ProductsGameCard 
                v-for="(game, id) in gamesList" 
                :key="id"
                :id="game.id"
                :name="game.name"
                :brand="game.brand.name"
                :slug="game.slug"
                :logo-url="game.logo_url"
                :website="game.website"
            />
        </v-container>
    </section>
</template>