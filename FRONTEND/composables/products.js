export async function useSupaProduct(){
    const client = useSupabaseClient()
    const query = `
        url,
        image_url,
        price,
        store:stores (
            name,
            website
        ),
        set:sets (
            code,
            name,
            game:games (
                name
            )
        ),
        lang:languages (
            code
        ),
        currency:currencies (
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
