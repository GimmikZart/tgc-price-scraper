export async function useGetSets() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('sets').select(`
    *,
    game( id, name, code )
  `).order('publish_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

export async function useCreateSet(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('sets').insert([formData])
  if (error) {
    throw new Error(error.message)
  }
}

export async function useUpdateSet(id, formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('sets').update(formData).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
