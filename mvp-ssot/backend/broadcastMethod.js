/**
     * Invia un messaggio a tutti i client WebSocket connessi
     * @param {object} message - Il messaggio da inviare
     */
    broadcastMessage(message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
        console.log(`📡 Messaggio broadcast inviato a ${this.clients.size} client:`, message.type);
    }
