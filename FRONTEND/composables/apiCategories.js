export async function useGetCategories() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('categories').select(`*`)
  if (error) {
    console.error('Supabase error:', error)
    return []
  }
  console.log('Sets data:', data);
  
  return data
}
