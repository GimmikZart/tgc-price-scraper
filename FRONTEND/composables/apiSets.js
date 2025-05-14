export async function useGetSets() {
  const client = useSupabaseClient()
  const { data, error } = await client.from('sets').select(`
    *,
    game( id, name, code )
  `).order('publish_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function useGetGameSet(gameSlug) {
  console.log('gameSlug', gameSlug);
  const client = useSupabaseClient()

  const { data: game, error: gameError } = await client
    .from('games')
    .select('id')
    .eq('slug', gameSlug)
    .single()
  
  if (gameError) {
    throw new Error(gameError.message)
  }

  const { data, error } = await client
      .from('sets')
      .select(`
        *,
        game( id, name, slug ),
        products(count)
      `)
      .eq('game', game.id)
      .order('publish_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const setsWithCount = data.map(set => ({
    ...set,
    products: set.products[0]?.count || 0
  }))

  return setsWithCount
}

export async function useCreateSet(formData) {
  const client = useSupabaseClient()
  const { error } = await client.from('sets').insert([formData])
  if (error) {
    throw new Error(error.message)
  }
}

export async function useUpdateSet(id, formData) {
  console.log('id', id);
  console.log('formData', formData);
  
  const client = useSupabaseClient()
  const { error } = await client.from('sets').update(formData).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
