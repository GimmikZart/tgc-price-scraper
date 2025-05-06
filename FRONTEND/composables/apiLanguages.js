export async function useGetLanguages() {
    const client = useSupabaseClient()
    const { data, error } = await client.from('languages').select("*")
    if (error) {
      throw new Error(error.message)
    }
    return data
  }
  
  export async function useCreateLanguage(formData) {
    const client = useSupabaseClient()
    const { error } = await client.from('languages').insert([formData])
    if (error) {
      throw new Error(error.message)
    }
  }
  
  export async function useUpdateLanguage(id, formData) {
    const client = useSupabaseClient()
    const { error } = await client.from('languages').update(formData).eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  }
  