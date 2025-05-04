export async function useScraper(product) {
    try {
        console.log('useScraper', {product});
        debugger;
        const result = await $fetch('/api/scrape', {
            method: 'POST',
            body: { url: product.url , price: product.store.price_selector, discount: product.store.discount_selector, image: product.store.image_selector }
        })
        console.log('useScraper',{result});
        if(result.error) throw new Error(result.error)
        
        
        return {store: product.store, game: product.game, info: result.data}
    } catch (err) {
        return {store: product.store, game: product.game, info: null}
    }
}