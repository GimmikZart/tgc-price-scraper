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

const openFilters = ref(false)
const selectedGames = ref([])
const selectedSets = ref([])
const selectedLangs = ref([])
const selectedStores = ref([])
const selectedCategories = ref([])
const selectedSort = ref(null)
const sortableOptions = [
  { text: 'Prezzo crescente', value: 'price_asc' },
  { text: 'Prezzo decrescente', value: 'price_desc' }
]

const filteredProducts = computed(() => {
  if (!products.value) return []

  let result = products.value.filter(product => {
    const matchGame = selectedGames.value.length === 0 || selectedGames.value.includes(product.set.game.id)
    const matchSet = selectedSets.value.length === 0 || selectedSets.value.includes(product.set.id)
    const matchLang = selectedLangs.value.length === 0 || selectedLangs.value.includes(product.lang.id)
    const matchStore = selectedStores.value.length === 0 || selectedStores.value.includes(product.store.id)
    const matchCategory = selectedCategories.value.length === 0 || selectedCategories.value.includes(product.category.id)

    return matchGame && matchSet && matchLang && matchStore && matchCategory
  })

  if (selectedSort.value === 'price_asc') {
    result = result.sort((a, b) => {
      const priceA = parseFloat(a.discounted_price || a.regular_price) || Infinity
      const priceB = parseFloat(b.discounted_price || b.regular_price) || Infinity
      return priceA - priceB
    })
  } else if (selectedSort.value === 'price_desc') {
    result = result.sort((a, b) => {
      const priceA = parseFloat(a.discounted_price || a.regular_price) || -Infinity
      const priceB = parseFloat(b.discounted_price || b.regular_price) || -Infinity
      return priceB - priceA
    })
  }

  return result
})

const appliedFiltersCount = computed(() => {
  return selectedGames.value.length + selectedSets.value.length + selectedLangs.value.length + selectedStores.value.length + selectedCategories.value.length
})

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

function resetFilters() {
  selectedGames.value = []
  selectedSets.value = []
  selectedLangs.value = []
  selectedStores.value = []
  selectedCategories.value = []
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
    <div class="border p-3 flex flex-wrap items-center gap-3 mb-5">
      <div>
        <v-btn color="primary" v-if="openFilters" @click="openFilters = false" tile>NASCONDI FILTRI</v-btn>
        <v-btn color="primary" v-else @click="openFilters = true" tile>MOSTRA FILTRI</v-btn>
        <v-btn v-if="appliedFiltersCount > 0" color="red" @click="resetFilters" tile>
          <v-icon>mdi-delete-forever</v-icon>
        </v-btn>
      </div>
      <v-btn v-if="!openFilters" color="green"  @click="createNewAgent">Nuovo Agente</v-btn>
      <v-switch 
        v-if="!openFilters" 
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

    <div v-if="openFilters" class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 border p-3">
      <v-select
        v-model="selectedGames"
        :items="gamesList"
        item-title="name"
        item-value="id"
        label="Gioco"
        multiple clearable chips
      />
      <v-select
        v-model="selectedSets"
        :items="setsList"
        item-title="name"
        item-value="id"
        label="Set"
        multiple clearable chips
      />
      <v-select
        v-model="selectedLangs"
        :items="langList"
        item-title="name"
        item-value="id"
        label="Lingua"
        multiple clearable chips
      />
      <v-select
        v-model="selectedStores"
        :items="storesList"
        item-title="name"
        item-value="id"
        label="Negozio"
        multiple clearable chips
      />
      <v-select
        v-model="selectedCategories"
        :items="categoriesList"
        item-title="name"
        item-value="id"
        label="Categoria"
        multiple clearable chips 
      />
      <v-select
        v-model="selectedSort"
        :items="sortableOptions"
        label="Ordina per"
        item-title="text"
        item-value="value"
        clearable
      />
    </div>

    <div v-if="visualizeGrid" class="grid grid-cols-2 lg:grid-cols-8 grid-rows-3 gap-1 lg:gap-4">
      <ProductCard
        v-for="(product, idx) in filteredProducts"
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
      :items="filteredProducts"
      class="elevation-1"
      pagination
      :items-per-page="10"
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