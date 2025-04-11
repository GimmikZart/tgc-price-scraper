export async function useGetCurrencies() {
    const client = useSupabaseClient()
  
    const { data, error } = await client.from('currencies').select('*')
  
    if (error) {
      console.error('Errore Supabase:', error.message)
      return []
    }
  
    return data
  }
  
  export async function useCreateCurrency(formData) {
    const client = useSupabaseClient()
  
    const { data, error } = await client.from('currencies').insert([
      {
        code: formData.code,
      },
    ])
  
    if (error) {
      console.error('Errore creazione valuta:', error.message)
      return { success: false, error }
    }
  
    return { success: true, data }
  }
  
  export async function useUpdateCurrency(formData, currencyId) {
    const client = useSupabaseClient()
  
    const { data, error } = await client.from('currencies')
      .update({
        code: formData.code,
      })
      .eq('id', currencyId)
      .select('*')
  
    if (error) {
      console.error('Errore aggiornamento valuta:', error.message)
      return { success: false, error }
    }
  
    return { success: true, data }
  }
  
  export async function useDeleteCurrency(currencyId) {
    const client = useSupabaseClient()
  
    const { error } = await client.from('currencies').delete().eq('id', currencyId)
  
    if (error) {
      console.error('Errore eliminazione valuta:', error.message)
      return { success: false, error }
    }
  
    return { success: true }
  }
  