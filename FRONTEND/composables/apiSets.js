export async function useGetSets() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('sets').select(`
    *,
    game( id, name, code )
  `).order('publish_date', { ascending: true })
  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  
  return data
}

export async function useCreateSet(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('sets').insert([formData])
  return !error
}

export async function useUpdateSet(id, formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('sets').update(formData).eq('id', id)
  return !error
}
