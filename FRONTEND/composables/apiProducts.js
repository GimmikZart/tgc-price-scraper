
export async function useGetProducts(){
    const client = useSupabaseClient()
    const query = `
        id,
        url,
        image_url,
        price,
        discount_price,
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
    console.log('CREAAAAA', {formData});
    
    const client = useSupabaseClient()

    const scrapedData = await useScraper(formData)

    console.log('scrapedData', scrapedData);
    console.log('formData', formData);
    
    

    const { data, error } = await client.from('products').insert([{
        store: formData.store.id,
        set: formData.set,
        lang: formData.lang,
        url: formData.url,
        currency: formData.currency,
        price: scrapedData.info.price,
        discount_price: scrapedData.info.discount_price ?? null,
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
    console.log('UPDATE', formData);
    
    // Facciamo lo scraping solo se serve (es. url cambiato), oppure sempre se preferisci
    const scrapedData = await useScraper(formData)

    console.log('scrapedData', scrapedData);
    console.log({
        store: formData.store.id,
        set: formData.set,
        lang: formData.lang.id,
        url: formData.url,
        currency: 1,
        price: scrapedData.info.price,
        discount_price: scrapedData.info.discount_price ?? null,
        image_url: scrapedData.info.image
    });
    
    const { data, error } = await client
      .from('products')
      .update({
        store: formData.store.id,
        set: formData.set,
        lang: formData.lang.id,
        url: formData.url,
        currency: 1,
        price: scrapedData.info.price,
        discount_price: scrapedData.info.discount_price ?? null,
        image_url: scrapedData.info.image
      })
      .eq('id', id)
  
    if (error) {
      console.error('Errore aggiornamento Supabase:', error)
      return { success: false, error }
    }
  
    return { success: true, data }
  }
  

