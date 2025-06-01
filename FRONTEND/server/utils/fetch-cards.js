// server/utils/fetch-cards.js
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export default async function fetchCardsList() {
  const cardList = []

  const primoRisultato = await $fetch(
    'https://apitcg.com/api/one-piece/cards',
    {
      method: 'GET',
      query: { limit: 100, page: 1 },
      headers: {
        'x-api-key': '046f9a484e0e948988b5f5257a438f0a662f50b76b59114c8c1b6dad40ce5c68'
        // TODO: in produzione sposta questa chiave in process.env.API_KEY
      }
    }
  )

  if (!primoRisultato) {
    throw new Error('Nessuna risposta dalla prima chiamata')
  }

  console.log(`Totale pagine: ${primoRisultato.totalPages}`);

  const totalPages = primoRisultato.totalPages || 1

  
  if (Array.isArray(primoRisultato.data)) {
    cardList.push(...primoRisultato.data)
  }

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const result = await $fetch(
        'https://apitcg.com/api/one-piece/cards',
        {
          method: 'GET',
          query: { limit: 100, page },
          headers: {
            'x-api-key': '046f9a484e0e948988b5f5257a438f0a662f50b76b59114c8c1b6dad40ce5c68'
          }
        }
      )

      if (result && Array.isArray(result.data)) {
        cardList.push(...result.data)
      }
    }
  }


  try {
    const outputDir = join(process.cwd(), 'public', 'cards')
    await mkdir(outputDir, { recursive: true })

    const outputPath = join(outputDir, 'cards.json')

    const jsonString = JSON.stringify(cardList, null, 2)

    await writeFile(outputPath, jsonString, 'utf-8')

    console.log(`File JSON salvato correttamente in: ${outputPath}`)
    return { success: true }

  } catch (fsError) {
    console.error('Errore durante la scrittura del file JSON:', fsError)
    throw new Error('Impossibile scrivere il file JSON: ' + fsError.message)
  }
}
