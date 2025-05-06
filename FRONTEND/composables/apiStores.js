export async function useGetStores(){
    const client = useSupabaseClient()

    const { data, error } = await client.from('stores').select("*")
    
    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function useUpdateStores(formData, storeId) {
    const client = useSupabaseClient();

    const { data, error } = await client.from('stores')
        .update({
            name: formData.name,
            logo_url: formData.logoUrl,
            website: formData.website,
            regular_price_selector: formData.regular_price_selector,
            original_price_selector: formData.original_price_selector,
            discounted_price_selector: formData.discounted_price_selector,
            image_selector: formData.image_selector,
        })
        .eq('id', storeId)
        .select('*')
    
    if (error) {
        throw new Error(error.message)
    }

    return data
}


export async function useCreateStores(formData) {
    const client = useSupabaseClient();

    const { data, error } = await client.from('stores').insert({
        name: formData.name,
        logo_url: formData.logoUrl,
        website: formData.website,
        regular_price_selector: formData.regular_price_selector,
        original_price_selector: formData.original_price_selector,
        discounted_price_selector: formData.discounted_price_selector,
        image_selector: formData.imageSelector,
        created_at: new Date().toISOString()
    });

    if (error) {
        throw new Error(`Errore creazione store: ${error.message}`)
    }

    return data
}

