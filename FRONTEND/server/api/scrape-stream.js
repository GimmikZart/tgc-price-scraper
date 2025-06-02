const clients = [] // Lista di connessioni SSE

export default defineEventHandler(async (event) => {
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    const clientId = Date.now()
    const res = event.node.res

    const send = (type, data) => {
        res.write(`event: ${type}\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Invia subito un messaggio di connessione
    send('connected', { message: 'Connessione SSE stabilita' })

    // Salva il client per inviare eventi più tardi
    clients.push({ id: clientId, res })

    /* console.log(`👤 Client SSE connesso (${clientId}). Totale: ${clients.length}`) */

    // Pulisci la connessione quando il client chiude
    event.node.req.on('close', () => {
        const index = clients.findIndex(c => c.id === clientId)
        if (index !== -1) {
            clients.splice(index, 1)
            /* console.log(`❌ Client SSE disconnesso (${clientId}). Rimasti: ${clients.length}`) */
        }
    })
})

// Esporta una funzione per inviare eventi a tutti i client
export function broadcastEvent(type, data) {
    for (const client of clients) {
        client.res.write(`event: ${type}\n`)
        client.res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
}
