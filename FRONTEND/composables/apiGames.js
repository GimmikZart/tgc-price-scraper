export async function useGetGames() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('games').select(`
    *,
    brand (*)
  `);
  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  return data
}

export async function useGetGame(slug) {
  const client = useSupabaseClient()
  //fetch the sets relations too 
  const { data, error } = await client.from('games').select("*, sets(*), brand (*)").eq('slug', slug).single()
  console.log('Game data:', data);
  
  //const { data, error } = await client.from('games').select("*").eq('slug', slug).single()
  if (error) {
    console.error('Supabase error:', error)
    return null
  }
  return data
}

export async function useCreateGame(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('games').insert([formData])
  if (error) {
    console.error('Errore Supabase:', error)
    return { success: false, error }
  }
  return { success: true, data }
}

export async function useUpdateGame(id, formData) {
  const client = useSupabaseClient()
  
  const { data, error } = await client.from('games').update(formData).eq('id', id)
  if (error) {
    console.error('Errore Supabase:', error)
    return { success: false, error }
  }

  return { success: true, data }
}
