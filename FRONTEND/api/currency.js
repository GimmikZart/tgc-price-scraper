export async function fetchCurrencies() {
    const client = useSupabaseClient()
  
    const { data, error } = await client.from('currencies').select('*')
  
    if (error) {
      throw new Error(error.message)
    }
  
    return data
  }
  
  export async function createCurrency(formData) {
    const client = useSupabaseClient()
  
    const { error } = await client.from('currencies').insert([
      {
        code: formData.code,
      },
    ])
  
    if (error) {
      throw new Error(error.message)
    }
  }
  
  export async function updateCurrency(formData, currencyId) {
    const client = useSupabaseClient()
  
    const { error } = await client.from('currencies')
      .update({
        code: formData.code,
      })
      .eq('id', currencyId)
      .select('*')
  
    if (error) {
      throw new Error(error.message)
    }
  }
  
  export async function deleteCurrency(currencyId) {
    const client = useSupabaseClient()
  
    const { error } = await client.from('currencies').delete().eq('id', currencyId)
  
    if (error) {
      throw new Error(error.message)
    }
  }
  