import { useSnackbar } from '@/stores/useSnackbar'

export function useScraperStream() {
    const snackbar = useSnackbar()

    let eventSource = null
    
    const connect = () => {
        eventSource = new EventSource('/api/scrape-stream')

        // Eventi di scraping per i prezzi dei prodotti:
        eventSource.addEventListener('scraping_product_success', (e) => {
            const { set, store } = JSON.parse(e.data)
            snackbar.addMessage(`Scraping riuscito per ${set} di ${store}`, 'success')
        })

        eventSource.addEventListener('scraping_product_error', (e) => {
            const { set, store, error } = JSON.parse(e.data)
            snackbar.addMessage(`Errore scraping per ${set} di ${store}`, 'error', error)
        })

        
        // Eventi per lo scraping dei dati delle carte
        eventSource.addEventListener('scraping_card_success', (e) => {
            const { name, code } = JSON.parse(e.data)
            snackbar.addMessage(`Scraping riuscito per ${name} | ${code}`, 'success')
        })

        eventSource.addEventListener('scraping_card_fail', (e) => {
            const { name, id } = JSON.parse(e.data)
            snackbar.addMessage(`Scraping fallito per ${name} | ${id}`, 'error')
        })

        // Eventi generici
        eventSource.addEventListener('scraping_started', (e) => {
            snackbar.addMessage('Scraping iniziato', 'info')
        })

        eventSource.addEventListener('generic_error', (message) => {
            snackbar.addMessage(`Errore durante lo scraping: ${message.data}`, 'error')
        })

        eventSource.addEventListener('generic_info', (message) => {
            snackbar.addMessage(message.data, 'info')
        })

        eventSource.addEventListener('generic_success', (message) => {
            snackbar.addMessage(message.data, 'success')
        })

        eventSource.onerror = (error) => {
            snackbar.addMessage('SSE, connessione interrotta:', 'error', error)
        }

        eventSource.addEventListener('scraping_completed', (e) => {
            const { duration, ramUsed } = JSON.parse(e.data)
            snackbar.addMessage('Scraping completato', 'info', `Durata: ${duration}s | RAM: ${ramUsed} MB`)
        })

        return eventSource
    }

    const disconnect = () => {
        if (eventSource) {
            eventSource.close()
            eventSource = null
            snackbar.addMessage('SSE chiusa', 'info')
        }
    }

    return { connect, disconnect }
}
