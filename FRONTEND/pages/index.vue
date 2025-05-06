<script setup>
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/it'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)
dayjs.locale('it')

const openDialog = ref(false);
const editableAgent = ref(null);

const { data: products } = await useAsyncData('products', useGetProducts);
const { data: storesList } = await useAsyncData('stores', useGetStores);
const { data: langList } = await useAsyncData('langs', useGetLanguages);
const { data: setsList } = await useAsyncData('sets', useGetSets);
const { data: gamesList } = await useAsyncData('games', useGetGames);
const { data: currencyList } = await useAsyncData('currency', useGetCurrencies);
const { data: categoriesList } = await useAsyncData('categories', useGetCategories);

const visualizeGrid = ref(true);
const activeSwitchLabel= computed(() => visualizeGrid.value ? 'Visualizza come griglia' : 'Visualizza come lista');

const productHeaders = [
  { title: 'Image', key: 'image_url' },
  { title: 'Category', key: 'category' },
  { title: 'Set', key: 'set' },
  { title: 'Store', key: 'store' },
  { title: 'Lang', key: 'lang' },
  { title: 'Original Price', key: 'original_price' },
  { title: 'Final Price', key: 'regular_price' },
  { title: 'Ultimo update', key: 'last_update' },
  { title: 'Url', key: 'url' }
]

function getDateDifferenceFromNow(date) {
  if (date) {
    return dayjs(date).fromNow()
  }
  return null
};

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

function createNewAgent() {
  editableAgent.value = null;
  openDialog.value = true;
}

async function refreshData() {
  await refreshNuxtData(['products', 'stores', 'langs', 'sets', 'games', 'currency', 'categories']);
}
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-5">
      <v-btn color="primary"  @click="createNewAgent">Nuovo Agente</v-btn>
      <v-switch 
        v-model="visualizeGrid"
        color="primary" 
        hide-details inset
        :label="activeSwitchLabel"
      ></v-switch>
    </div>

    <DialogsHandleAgents
      v-model="openDialog"
      :agent-to-edit="editableAgent"
      :select-games="gamesList"
      :select-stores="storesList"
      :select-sets="setsList"
      :select-langs="langList"
      :select-currency="currencyList"
      :select-categories="categoriesList"
      @refresh-data="refreshData"
    />

    <div v-if="visualizeGrid" class="grid grid-cols-8 grid-rows-3 gap-4">
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
    <v-data-table
      v-else
      :headers="productHeaders"
      :items="products"
      class="elevation-1"
      hide-default-footer
    >
      <template v-slot:item.image_url="{ value }">
        <img :src="value" class="h-[70px] transition w-[70px] p-3 hover:scale-[5] hover:translate-x-full"/>
      </template>
      <template v-slot:item.category="{ value, item }">
        {{ value.name }}
      </template>
      <template v-slot:item.set="{ value }">
        {{ value.name }}
      </template>
      <template v-slot:item.store="{ value }">
        {{ value.name }}
      </template>
      <template v-slot:item.lang="{ value }">
        {{ value.code }}
      </template>
      <template v-slot:item.original_price="{ value, item }">
        <span v-if="value" class=" line-through">{{value}}{{ item?.currency?.code }}</span>
      </template>
      <template v-slot:item.regular_price="{ value, item }">
        <span class="font-bold">{{  item.discounted_price || item.regular_price }}{{ item?.currency?.code }}</span>
      </template>
      <template v-slot:item.last_update="{ value, item }">
        {{ getDateDifferenceFromNow(value) }} 
      </template>
      <template v-slot:item.url="{ value }">
        <v-btn :href="value" variant="plain" icon="mdi-arrow-right" target="_blank"></v-btn>
      </template>
    </v-data-table>
  </div>
</template>