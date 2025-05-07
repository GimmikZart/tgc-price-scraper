export async function useScraperSingleProduct(product) {
    const { connect, disconnect } = useScraperStream()

    connect()

    console.log('useScraperSingleProduct');

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
    
    if(result.error) throw new Error(result.error)

    disconnect()
    return {store: product.store, game: product.game, info: result.data}
}

export async function useScraperAllProducts(products) {
    console.log('useScraperAllProducts', products);
    
    const { connect, disconnect } = useScraperStream()
    
    connect()

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

    const result = await $fetch('/api/scrape', {
        method: 'POST',
        body: productsArray
    })

    if (result.error) {
        console.error('Errore scraping batch:', result.error)
        return []
    }

    disconnect()

    return result.data.map(scraped => ({
        id: scraped.id,
        info: scraped.error ? null : {
            regularPrice: scraped.regularPrice,
            originalPrice: scraped.originalPrice,
            discountedPrice: scraped.discountedPrice,
            image: scraped.image
        },
        error: scraped.error || null
    }))
}

