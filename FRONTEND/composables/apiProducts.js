
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

    const scrapedData = await useScraper(formData)
    
    const { data, error } = await client.from('products').insert([{
        store: formData.store.id,
        set: formData.set,
        lang: formData.lang,
        url: formData.url,
        currency: formData.currency,
        regular_price: scrapedData.info.price ?? null,
        original_price: scrapedData.info.original_price ?? null,
        discounted_price: scrapedData.info.discount_price ?? null,
        image_url: scrapedData.info.image,
    }])

    if (error) {
        console.error('Errore Supabase:', error)
        return { success: false, error }
    }

    return { success: true, data }
}

export async function useUpdateProduct(formData, id) {
    const client = useSupabaseClient()
    
    const scrapedData = await useScraper(formData)

    const { data, error } = await client
      .from('products')
      .update({
        store: formData.store.id,
        set: formData.set.id,
        lang: formData.lang.id,
        url: formData.url,
        currency: 1,
        category: formData.category,
        regular_price: parsePrice(scrapedData.info.regularPrice),
        original_price: parsePrice(scrapedData.info.originalPrice) ?? null,
        discounted_price: parsePrice(scrapedData.info.discountedPrice) ?? null,
        image_url: scrapedData.info.image
      })
      .eq('id', id)
  
    if (error) {
      console.error('Errore aggiornamento Supabase:', error)
      return { success: false, error }
    }
  
    return { success: true, data }
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
  

