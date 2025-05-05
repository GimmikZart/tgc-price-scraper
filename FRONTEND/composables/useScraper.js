export async function useScraper(product) {
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