
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
        throw new Error(error.message)
    }

    return data
}

export async function useCreateProduct(formData) {
    try {
        await useScraperNewProduct(formData)
    } catch (error) {
        throw new Error(error)
    }
}

export async function useUpdateProduct(formData, id) {
    try {
        formData.id = id
        await useScraperSingleProduct(formData)
    } catch (error) {
        throw new Error(error)
    }
}

export async function useUpdateProductsBatch() {
    try {
        await useScraperAllProducts()
    } catch (error) {
        throw new Error(error)
    }
}

