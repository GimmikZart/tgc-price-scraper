export async function useScraper(product) {
    try {
        const result = await $fetch('/api/scrape', {
            method: 'POST',
            body: { url: product.scraper.url , price: product.scraper.priceSelector, image: product.scraper.imageSelector }
        })
        if(result.error) throw new Error(result.error)
        return {store: product.store, game: product.game, info: result.data}
    } catch (err) {
        return {store: product.store, game: product.game, info: null}
    }
}