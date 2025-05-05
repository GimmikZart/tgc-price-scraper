export async function useScraperSingleProduct(product) {
    try {
        const result = await $fetch('/api/scrape', {
            method: 'POST',
            body: { url: product.url , regular_price: product.store.regular_price_selector, original_price: product.store.original_price_selector, discounted_price:product.store.discounted_price_selector, image: product.store.image_selector }
        })
        if(result.error) throw new Error(result.error)
        return {store: product.store, game: product.game, info: result.data}
    } catch (err) {
        return {store: product.store, game: product.game, info: null}
    }
}

export async function useScraperAllProducts(products) {
    const productsArray = products.map(product => ({
        id: product.id,
        url: product.url,
        regular_price: product.store.regular_price_selector,
        original_price: product.store.original_price_selector,
        discounted_price: product.store.discounted_price_selector,
        image: product.store.image_selector
    }))

    const result = await $fetch('/api/scrape', {
        method: 'POST',
        body: productsArray
    })

    if (result.error) {
        console.error('Errore scraping batch:', result.error)
        return []
    }

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

