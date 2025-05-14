export async function useGetGames() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('games').select(`
    *,
    brand (*)
  `);

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function useGetGame(slug) {
  const client = useSupabaseClient()
  const { data, error } = await client.from('games').select("*, sets(*), brand (*)").eq('slug', slug).single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function useCreateGame(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('games').insert([formData])
  
  
  if (error) {
    throw new Error(error.message)
  }
}

export async function useUpdateGame(formData, id) {
  const client = useSupabaseClient()
  console.log('formData', formData)
  console.log('id', id);
  
  const { data, error } = await client.from('games').update(formData).eq('id', id)

  console.log('data', data)
  console.log('error', error);
  if (error) {
    throw new Error(error.message)
  }
}
