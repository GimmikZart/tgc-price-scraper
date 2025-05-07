import { useSnackbar } from '@/stores/useSnackbar'

export function useScraperStream() {
    const snackbar = useSnackbar()

    let eventSource = null
    
    const connect = () => {
        eventSource = new EventSource('/api/scrape-stream')

        eventSource.onopen = () => {
            console.log('SSE connesso')
        }

        eventSource.onerror = (error) => {
            console.error('Errore SSE:', error)
            snackbar.addMessage('Errore SSE', 'error', 'Connessione interrotta')
        }

        // Evento di benvenuto
        eventSource.addEventListener('connected', (e) => {
            console.log('SSE:', e.data)
        })

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
            snackbar.addMessage('Scraping completato', 'success', `Durata: ${duration}s | RAM: ${ramUsed} MB`)
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
