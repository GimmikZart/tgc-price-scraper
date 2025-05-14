// stores/useGlobalDataStore.ts
export const useGlobalDataStore = defineStore('globalData', () => {
    const games = ref([])
    const stores = ref([])
    const sets = ref([])
    const langs = ref([])
    const currencies = ref([])
    const categories= ref([])
    const isLoaded = ref(false)

    const loadInitialData = async () => {
        if (isLoaded.value) return
    
        const storesList = await useGetStores();
        const langList = await useGetLanguages();
        const setsList = await useGetSets();
        const gamesList = await useGetGames();
        const currencyList = await useGetCurrencies();
        const categoriesList = await useGetCategories();

        games.value = gamesList || []
        stores.value = storesList || []
        sets.value = setsList || []
        langs.value = langList || []
        currencies.value = currencyList || []
        categories.value = categoriesList || []
        isLoaded.value = true
    }

    return { games, stores, sets, langs, currencies, categories, loadInitialData }
})
