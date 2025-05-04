export async function useGetSets() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('sets').select(`
    *,
    game:games ( id, name, code )
  `)
  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  return data
}

export async function useCreateSet(formData) {
  console.log('formData', formData);
  
  const client = useSupabaseClient()
  
  const { error } = await client.from('sets').insert([formData])
  return !error
}

export async function useUpdateSet(id, formData) {
  console.log('id', id)
  console.log('formData', formData);
  
  const client = useSupabaseClient()
  const { error } = await client.from('sets').update(formData).eq('id', id)
  return !error
}
