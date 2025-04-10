// --- Parent Component: agents.vue ---
<script setup>
const openDialog = ref(false);
const editableAgent = ref(null);

const { data: products } = await useAsyncData('products', useGetProducts);
const { data: storesList } = await useAsyncData('stores', useGetStores);
const { data: langList } = await useAsyncData('langs', useGetLanguages);
const { data: setsList } = await useAsyncData('sets', useGetSets);
const { data: gamesList } = await useAsyncData('games', useGetGames);

const storeToSelect = computed(() => storesList.value.map(store => ({ id: store.id, name: store.name })));
const langToSelect = computed(() => langList.value.map(lang => ({ id: lang.id, name: lang.name })));
const setsToSelect = computed(() => setsList.value.map(set => ({ id: set.id, name: set.name, game: set.game.id })));
const gamesToSelect = computed(() => gamesList.value.map(game => ({ id: game.id, name: game.name })));

function editProduct(product) {
  editableAgent.value = {
    id: product.id,
    store: product.store.id,
    game: product.set.game.id,
    set: product.set.id,
    lang: product.lang.id,
    url: product.url
  };
  openDialog.value = true;
}

function createNewAgent() {
  editableAgent.value = null;
  openDialog.value = true;
}
</script>

<template>
  <div>
    <v-btn color="primary" class="mb-4" @click="createNewAgent">Nuovo Agente</v-btn>

    <DialogsHandleAgents
      v-model="openDialog"
      :agent-to-edit="editableAgent"
      :select-games="gamesList"
      :select-stores="storesList"
      :select-sets="setsList"
      :select-langs="langList"
    />

    <div class="grid grid-cols-8 grid-rows-3 gap-4">
      <ProductCard
        v-for="(product, idx) in products"
        :key="idx"
        :product="product"
        :id="idx"
        class="w-full"
        is-editable
        @edit-product="editProduct(product)"
      />
    </div>
  </div>
</template>