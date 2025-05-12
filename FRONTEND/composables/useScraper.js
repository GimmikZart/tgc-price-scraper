export async function useScraperSingleProduct(product) {
    const { connect, disconnect } = useScraperStream()
    let finalResult;
    connect()
    console.log('useScraperSingleProduct');

    try {
        const productBody = {
            url: product.url , 
            regular_price: product.store.regular_price_selector, 
            original_price: product.store.original_price_selector, 
            discounted_price:product.store.discounted_price_selector, 
            image: product.store.image_selector,
            set: `${product.set.name}`,
            store: product.store.name
        }

        const result = await $fetch('/api/scrape', {
            method: 'POST',
            body: productBody
        })

        if(result.error){
            finalResult = null
            throw new Error(result.error)
        } 

        finalResult = { store: product.store, game: product.game, info: result.data }
    } catch (error) {
        console.error('Errore scraping batch:', error)
    } finally{
        disconnect()
        return finalResult;
    }
}

export async function useScraperAllProducts(products) {
    console.log('useScraperAllProducts', products);
    
    const { connect, disconnect } = useScraperStream()
    let finalResult;

    connect()

    try {
        const productsArray = products.map(product => ({
            id: product.id,
            url: product.url,
            regular_price: product.store.regular_price_selector,
            original_price: product.store.original_price_selector,
            discounted_price: product.store.discounted_price_selector,
            image: product.store.image_selector,
            set: `${product.set.name}`,
            store: product.store.name
        }))

        let scrapeResult = await $fetch('/api/scrape', {
            method: 'POST',
            body: productsArray
        })

        if (scrapeResult.error) {
            finalResult = []
            throw new Error(scrapeResult.error)
        } else {
            finalResult = scrapeResult.data.map(scraped => ({
                id: scraped.id,
                info: {
                    regularPrice: scraped.regularPrice,
                    originalPrice: scraped.originalPrice,
                    discountedPrice: scraped.discountedPrice,
                    image: scraped.image
                }
            }))
        }
    } catch (error) {
        console.error('Errore scraping batch:', error)
    } finally{
        disconnect()
        return finalResult;
    }
}

