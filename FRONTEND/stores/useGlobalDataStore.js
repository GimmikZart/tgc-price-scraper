// stores/useGlobalDataStore.ts
import { useSnackbar } from '@/stores/useSnackbar'

export const useGlobalDataStore = defineStore('globalData', () => {
    const snackbar = useSnackbar()

    const games = ref([])
    const stores = ref([])
    const brands = ref([])
    const sets = ref([])
    const langs = ref([])
    const currencies = ref([])
    const categories= ref([])
    const isLoaded = ref(false)

    const updateAllProducts = async () => {
        isLoading.value = true;
        try {
            await useUpdateProductsBatch();
            snackbar.addMessage('Aggiornamento terminato', 'info')
        } catch (error) {
            snackbar.addMessage(`Errore aggiornamento prodotti`, 'error', error)
        } finally{
            isLoading.value = false;
        }
    }

    const loadInitialData = async () => {
        if (isLoaded.value) return
    
        const storesList = await useGetStores();
        const langList = await useGetLanguages();
        const setsList = await useGetSets();
        const gamesList = await useGetGames();
        const currencyList = await useGetCurrencies();
        const categoriesList = await useGetCategories();
        const brandsList = await useGetBrands();

        games.value = gamesList || []
        stores.value = storesList || []
        sets.value = setsList || []
        langs.value = langList || []
        currencies.value = currencyList || []
        categories.value = categoriesList || []
        brands.value = brandsList || []
        isLoaded.value = true
    }

    return { games, stores, sets, langs, currencies, categories, brands, loadInitialData, updateAllProducts }
})
