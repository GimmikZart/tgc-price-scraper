export async function fetchCategories() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('categories').select(`*`)
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}
