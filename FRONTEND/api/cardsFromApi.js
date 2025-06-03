export async function fetchCardsFromApi() {
    try {
        await $fetch('/api/get-cards-list', {
            method: 'GET',
        })
    } catch (error) {
        console.error('Errore scraping new:', error)
        throw new Error(error)
    } 
}

export async function fetchCardsFromOfficialWebSite(infoSet) {
    try {
        return await $fetch('/api/get-cards-list-official', {
            method: 'POST',
            body: infoSet
        })
    } catch (error) {
        console.error('Errore scraping from official:', error)
        throw new Error(error)
    } 
}