export async function useScraper() {
    const productList = await useProductList()
    const resultList = []
    for (const product of productList) {
        try {
            const result = await $fetch('/api/scrape', {
                method: 'POST',
                body: { url: product.scraper.url , price: product.scraper.priceSelector, image: product.scraper.imageSelector }
            })
            console.log({result});
            if(result.error) throw new Error(result.error)
            resultList.push({store: product.store, game: product.game, info: result.data})
        } catch (err) {
            resultList.push({store: product.store, game: product.game, info: null})
        }
    }
    console.log({resultList});
    return resultList;
}