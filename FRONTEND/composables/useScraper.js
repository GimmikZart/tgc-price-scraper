export async function useScraperNewProduct(product) {
    const { connect, disconnect } = useScraperStream()
    connect()
    try {
        await $fetch('/api/scrape-new', {
            method: 'POST',
            body: product
        })
    } catch (error) {
        console.error('Errore scraping new:', error)
        throw new Error(error)
    } finally{
        disconnect()
    }
}

export async function useScraperSingleProduct(product) {
    const { connect, disconnect } = useScraperStream()
    connect()
    try {
        await $fetch('/api/scrape', {
            method: 'POST',
            body: product
        })
    } catch (error) {
        console.error('Errore scraping single:', error)
        throw new Error(error)
    } finally{
        disconnect()
    }
}

export async function useScraperAllProducts() {
    const { connect, disconnect } = useScraperStream()
    connect()
    try {
        await $fetch('/api/scrape-batch', {
            method: 'POST',
        })
    } catch (error) {
        console.error('Errore scraping batch:', error)
        throw new Error(error)
    } finally{
        disconnect()
    }
}

