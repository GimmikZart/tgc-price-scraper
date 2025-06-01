import { useSnackbar } from '@/stores/useSnackbar'

export function useScraperStream() {
    const snackbar = useSnackbar()

    let eventSource = null
    
    const connect = () => {
        eventSource = new EventSource('/api/scrape-stream')

        /* eventSource.onopen = () => {
            snackbar.addMessage('Apertura SSE', 'info')
        } */

        eventSource.onerror = (error) => {
            console.error('Errore SSE:', error)
            snackbar.addMessage('Errore SSE, connessione interrotta:', 'error', error)
        }

        // Evento di benvenuto
        /* eventSource.addEventListener('connected', (e) => {
            snackbar.addMessage('SSE connesso:', 'info', e.data)
        }) */

        // Quando ricevi eventi di scraping:
        eventSource.addEventListener('scraping_started', (e) => {
            snackbar.addMessage('Scraping iniziato', 'info')
        })

        eventSource.addEventListener('scraping_product_success', (e) => {
            const { set, store } = JSON.parse(e.data)
            snackbar.addMessage(`Scraping riuscito per ${set} di ${store}`, 'success')
        })

        eventSource.addEventListener('scraping_product_error', (e) => {
            const { set, store, error } = JSON.parse(e.data)
            snackbar.addMessage(`Errore scraping per ${set} di ${store}`, 'error', error)
        })

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
