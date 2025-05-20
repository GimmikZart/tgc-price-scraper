export async function fetchBrands() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('brands').select('*');
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function fetchBrand(id) {
  const client = useSupabaseClient()
  //fetch the sets relations too 
  const { data, error } = await client.from('brands').select("*, games(*)").eq('id', id).single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function createBrand(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('brands').insert([formData])
  if (error) {
    throw new Error(error.message)
  }
}

export async function updateBrand(id, formData) {
  const client = useSupabaseClient()
  
  const { error } = await client.from('brands').update(formData).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
