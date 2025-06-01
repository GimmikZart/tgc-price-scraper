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
