<script setup>
import { fetchProductsBySet } from '@/api/products';

const route = useRoute()
const setSlug = route.params.setSlug
const { data: productList } = await useAsyncData('products', () => fetchProductsBySet(setSlug));

const openDialog = ref(false);
const editableAgent = ref(null);

const editMode = ref(false);

const autoCompiledNewAgent = computed(() => {
    const productExample = productList.value[0];
    return {
        game: productExample.set.game.id,
        set: productExample.set.id,
    }
});

async function refreshData() {
    await refreshNuxtData(['products']);
}

function createNewProduct() {
    editableAgent.value = autoCompiledNewAgent.value;
    openDialog.value = true;
}

function editProduct(product) {
    editableAgent.value = {
        id: product.id,
        store: product.store.id,
        game: product.set.game.id,
        set: product.set.id,
        lang: product.lang.id,
        category: product.category,
        currency: product.currency.id,
        url: product.url
    };
    openDialog.value = true;
}
</script>
<template>
    <section>
        <Toolbar backButton label="Prodotti">
            <template #actions>
                <v-btn v-if="editMode" color="error"  @click="editMode = false">
                    <v-icon icon="mdi-pencil-off"></v-icon>
                </v-btn>
                <v-btn v-else color="warning"  @click="editMode = true">
                    <v-icon icon="mdi-pencil"></v-icon>
                </v-btn>
                <v-btn color="green"  @click="createNewProduct()">
                    <v-icon icon="mdi-plus"></v-icon>
                </v-btn>
            </template>
        </Toolbar>
        <div v-if="productList.length < 1" class="p-5">
            <h3 class="text-xl text-center text-black/50">Nessun prodotto trovato</h3>
        </div>
        <v-container fluid class="grid grid-cols-2 gap-2 pa-2 lg:pa-4 lg:grid-cols-8 lg:gap-4">
            <DialogsHandleAgents
                v-model="openDialog"
                :agent-to-edit="editableAgent"
                @refresh-data="refreshData"
            />
            <ProductCard 
                v-for="product in productList"
                :key="product.id"
                :product="product"
                :edit-mode="editMode"
                @edit-product="editProduct(product)"
            />
        </v-container>
    </section>
</template>