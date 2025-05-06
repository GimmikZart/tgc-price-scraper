export async function useGetBrands() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('brands').select('*');
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function useGetBrand(id) {
  const client = useSupabaseClient()
  //fetch the sets relations too 
  const { data, error } = await client.from('brands').select("*, games(*)").eq('id', id).single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function useCreateBrand(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('brands').insert([formData])
  if (error) {
    throw new Error(error.message)
  }
}

export async function useUpdateBrand(id, formData) {
  const client = useSupabaseClient()
  
  const { error } = await client.from('brands').update(formData).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
