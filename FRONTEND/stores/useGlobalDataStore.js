import { useSnackbar } from '@/stores/useSnackbar'
import { fetchStores } from '@/api/stores' 
import { fetchGames } from '@/api/games'
import { fetchSets } from '@/api/sets'
import { fetchLanguages } from '@/api/languages'
import { fetchCurrencies } from '@/api/currency'
import { fetchCategories } from '@/api/categories'
import { fetchBrands } from '@/api/brands'
import { updateProductsBatch } from '@/api/products'

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
            await updateProductsBatch();
            snackbar.addMessage('Aggiornamento terminato', 'info')
        } catch (error) {
            snackbar.addMessage(`Errore aggiornamento prodotti`, 'error', error)
        } finally{
            isLoading.value = false;
        }
    }

    const loadInitialData = async () => {
        if (isLoaded.value) return
    
        const storesList = await fetchStores();
        const langList = await fetchLanguages();
        const setsList = await fetchSets();
        const gamesList = await fetchGames();
        const currencyList = await fetchCurrencies();
        const categoriesList = await fetchCategories();
        const brandsList = await fetchBrands();

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
