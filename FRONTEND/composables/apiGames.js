export async function useGetGames() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('games').select("*")
  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  return data
}

export async function useCreateGame(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('games').insert([formData])
  return !error
}

export async function useUpdateGame(id, formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('games').update(formData).eq('id', id)
  return !error
}
