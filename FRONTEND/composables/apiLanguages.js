export async function useGetLanguages() {
    const client = useSupabaseClient()
    const { data, error } = await client.from('languages').select("*")
    if (error) {
      console.error('Supabase error:', error)
      return []
    }
    return data
  }
  
  export async function useCreateLanguage(formData) {
    const client = useSupabaseClient()
    const { error } = await client.from('languages').insert([formData])
    return !error
  }
  
  export async function useUpdateLanguage(id, formData) {
    const client = useSupabaseClient()
    const { error } = await client.from('languages').update(formData).eq('id', id)
    return !error
  }
  