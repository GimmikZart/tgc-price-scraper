export async function useGetBrands() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('brands').select('*');
  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  return data
}

export async function useGetBrand(id) {
  const client = useSupabaseClient()
  //fetch the sets relations too 
  const { data, error } = await client.from('brands').select("*, games(*)").eq('id', id).single()

  if (error) {
    console.error('Supabase error:', error)
    return null
  }
  return data
}

export async function useCreateBrand(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('brands').insert([formData])
  if (error) {
    console.error('Errore Supabase:', error)
    return { success: false, error }
  }
  return { success: true, data }
}

export async function useUpdateBrand(id, formData) {
  const client = useSupabaseClient()
  
  const { data, error } = await client.from('brands').update(formData).eq('id', id)
  if (error) {
    console.error('Errore Supabase:', error)
    return { success: false, error }
  }

  return { success: true, data }
}
