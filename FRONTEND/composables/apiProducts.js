
export async function useGetProducts(){
    const client = useSupabaseClient()
    const query = `
        id,
        url,
        image_url,
        regular_price,
        original_price,
        category(*),
        discounted_price,
        last_update,
        store:stores (
            id,
            name,
            website
        ),
        set:sets (
            id,
            code,
            name,
            game:games (
                id,
                name
            )
        ),
        lang:languages (
            id,
            code
        ),
        currency:currencies (
            id,
            code
        )
    `

    const { data, error } = await client.from('products').select(query)
    
    if (error) {
        console.error('Supabase error:', error)
        return []
    }

    return data
}

export async function useCreateProduct(formData) {
    
    const client = useSupabaseClient()

    const scrapedData = await useScraperSingleProduct(formData)
    
    const { data, error } = await client.from('products').insert([{
        store: formData.store.id,
        set: formData.set,
        lang: formData.lang,
        url: formData.url,
        currency: formData.currency,
        category: formData.category,
        regular_price: scrapedData.info.price ?? null,
        original_price: scrapedData.info.original_price ?? null,
        discounted_price: scrapedData.info.discount_price ?? null,
        image_url: scrapedData.info.image,
        last_update: new Date()
    }])

    if (error) {
        console.error('Errore Supabase:', error)
        return { success: false, error }
    }

    return { success: true, data }
}

export async function useUpdateProduct(formData, id) {
    const client = useSupabaseClient()
    
    const scrapedData = await useScraperSingleProduct(formData)
    
    const { data, error } = await client
      .from('products')
      .update({
        store: formData.store.id,
        set: formData.set,
        lang: formData.lang,
        url: formData.url,
        currency: formData.currency,
        category: formData.category,
        regular_price: parsePrice(scrapedData.info.regularPrice),
        original_price: parsePrice(scrapedData.info.originalPrice) ?? null,
        discounted_price: parsePrice(scrapedData.info.discountedPrice) ?? null,
        image_url: scrapedData.info.image,
        last_update: new Date()
      })
      .eq('id', id)
  
    if (error) {
      console.error('Errore aggiornamento Supabase:', error)
      return { success: false, error }
    }
  
    return { success: true, data }
}

export async function useUpdateProductsBatch() {
    console.log('Inizio scraping batch...');
    
    const client = useSupabaseClient()

    // 1️⃣ Recupera i prodotti
    const { data: products, error } = await client
        .from('products')
        .select(`id, url, set:sets(name), store:stores (name, regular_price_selector, original_price_selector, discounted_price_selector, image_selector)`)

    if (error) {
        console.error('Errore nel recuperare i prodotti:', error)
        return
    }

    // 2️⃣ Passa i prodotti allo scraper
    const scrapedResults = await useScraperAllProducts(products)

    // 3️⃣ Salva i risultati nel DB
    for (const scraped of scrapedResults) {
        if (scraped.error) {
            console.log(`❌ Errore scraping per prodotto ${scraped.id}: ${scraped.error}`)
            continue
        }
        console.log(`✅ Prodotto ${scraped.id} in corso di scraping...`);
        
        const { error } = await client
            .from('products')
            .update({
                regular_price: parsePrice(scraped.info.regularPrice),
                original_price: parsePrice(scraped.info.originalPrice) ?? null,
                discounted_price: parsePrice(scraped.info.discountedPrice) ?? null,
                image_url: scraped.info.image,
                last_update: new Date()
            })
            .eq('id', scraped.id)

        if (error) {
            console.error(`❌ Errore aggiornamento DB per prodotto ${scraped.id}: ${error.message}`)
        } else {
            console.log(`✅ Prodotto ${scraped.id} aggiornato`)
        }
    }
}


function parsePrice(priceString) {
    if (!priceString) return null;
    let cleaned = priceString.replace(/[^\d,\.]/g, '').trim();
    if (cleaned.includes(',')) {
        if (cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '');
        }
        cleaned = cleaned.replace(',', '.');
    }
    let number = parseFloat(cleaned);
    if (isNaN(number)) return 0.00;
    
    return number.toFixed(2);
}

