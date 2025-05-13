export async function useScraperNewProduct(product) {
    try {
        await $fetch('/api/scrape-new', {
            method: 'POST',
            body: product
        })
    } catch (error) {
        console.error('Errore scraping new:', error)
        throw new Error(error)
    } 
}

export async function useScraperSingleProduct(product) {
    try {
        await $fetch('/api/scrape', {
            method: 'POST',
            body: product
        })
    } catch (error) {
        console.error('Errore scraping single:', error)
        throw new Error(error)
    }
}

export async function useScraperAllProducts() {
    try {
        await $fetch('/api/scrape-batch', {
            method: 'POST',
        })
    } catch (error) {
        console.error('Errore scraping batch:', error)
        throw new Error(error)
    }
}

