/**
 * WebSocketService.js - Servizio per gestire la connessione WebSocket e eventi real-time
 * 
 * Responsabilità:
 * - Gestire la connessione WebSocket con reconnect automatico
 * - Fornire API per sottoscrizioni granulari
 * - Gestire propagazione eventi dal backend (attributeChange, schemaEvolution, relation events)
 * - Preparazione per integrazione con AttributeSpace evoluto
 */

class WebSocketService {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000;
        this.subscriptions = new Map(); // Gestione sottoscrizioni
        this.messageQueue = []; // Coda messaggi per quando non connesso
        this.connectionListeners = [];
        this.isReconnecting = false;
    }

    /**
     * Inizializza la connessione WebSocket
     * @param {string} url - URL del WebSocket (opzionale, default auto-detect)
     * @returns {Promise<void>}
     */
    async connect(url = null) {
        try {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                console.log('⚠️ [WebSocketService] Connessione già attiva');
                return;
            }

            const wsUrl = url || this.buildWebSocketUrl();
            console.log(`🔌 [WebSocketService] Connessione a: ${wsUrl}`);

            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = (event) => this.handleOpen(event);
            this.websocket.onmessage = (event) => this.handleMessage(event);
            this.websocket.onclose = (event) => this.handleClose(event);
            this.websocket.onerror = (event) => this.handleError(event);

        } catch (error) {
            console.error('❌ [WebSocketService] Errore connessione:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Costruisce l'URL del WebSocket automaticamente
     * @returns {string} - URL del WebSocket
     */
    buildWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}`;
    }

    /**
     * Gestisce l'evento di apertura connessione
     * @param {Event} event - Evento di apertura
     */
    handleOpen(event) {
        console.log('✅ [WebSocketService] Connessione WebSocket stabilita');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        // Notifica listeners
        this.notifyConnectionListeners('connected');

        // Invia messaggi in coda
        this.flushMessageQueue();

        // Re-registra sottoscrizioni se è una riconnessione
        this.reregisterSubscriptions();
    }

    /**
     * Gestisce i messaggi WebSocket in arrivo
     * @param {MessageEvent} event - Evento messaggio
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log(`📨 [WebSocketService] Messaggio ricevuto: ${message.type}`);

            // Propaga il messaggio ai sottoscrittori appropriati
            this.distributeMessage(message);

        } catch (error) {
            console.error('❌ [WebSocketService] Errore parsing messaggio:', error);
        }
    }

    /**
     * Gestisce la chiusura della connessione
     * @param {CloseEvent} event - Evento di chiusura
     */
    handleClose(event) {
        console.log(`🔌 [WebSocketService] Connessione chiusa (Code: ${event.code})`);
        this.isConnected = false;

        // Notifica listeners
        this.notifyConnectionListeners('disconnected');

        // Riconnetti se non è una chiusura intenzionale
        if (!event.wasClean && !this.isReconnecting) {
            this.scheduleReconnect();
        }
    }

    /**
     * Gestisce gli errori WebSocket
     * @param {Event} event - Evento di errore
     */
    handleError(event) {
        console.error('❌ [WebSocketService] Errore WebSocket:', event);
        this.notifyConnectionListeners('error');
    }

    /**
     * Sottoscrive a un pattern di eventi
     * @param {string} eventPattern - Pattern dell'evento (es. 'attributeChange', 'entity:*', 'schema:Contact')
     * @param {Function} callback - Callback da chiamare quando riceve l'evento
     * @returns {string} - ID della sottoscrizione per unsubscribe
     */
    subscribe(eventPattern, callback) {
        const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.subscriptions.set(subscriptionId, {
            pattern: eventPattern,
            callback: callback,
            created: Date.now()
        });

        console.log(`📋 [WebSocketService] Sottoscrizione creata: ${eventPattern} (ID: ${subscriptionId})`);

        // Se connesso, invia registrazione sottoscrizione al server (per future implementazioni)
        if (this.isConnected) {
            this.sendSubscriptionToServer(eventPattern, 'subscribe');
        }

        return subscriptionId;
    }

    /**
     * Rimuove una sottoscrizione
     * @param {string} subscriptionId - ID della sottoscrizione
     */
    unsubscribe(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
            this.subscriptions.delete(subscriptionId);
            console.log(`📋 [WebSocketService] Sottoscrizione rimossa: ${subscription.pattern}`);

            // Notifica server se connesso
            if (this.isConnected) {
                this.sendSubscriptionToServer(subscription.pattern, 'unsubscribe');
            }
        }
    }

    /**
     * Distribuisce un messaggio ai sottoscrittori appropriati
     * @param {Object} message - Messaggio da distribuire
     */
    distributeMessage(message) {
        let matchedSubscriptions = 0;

        this.subscriptions.forEach((subscription, subscriptionId) => {
            if (this.matchesPattern(message, subscription.pattern)) {
                try {
                    subscription.callback(message);
                    matchedSubscriptions++;
                } catch (error) {
                    console.error(`❌ [WebSocketService] Errore in callback sottoscrizione ${subscriptionId}:`, error);
                }
            }
        });

        if (matchedSubscriptions === 0) {
            console.log(`⚠️ [WebSocketService] Nessuna sottoscrizione per messaggio tipo: ${message.type}`);
        }
    }

    /**
     * Verifica se un messaggio corrisponde a un pattern
     * @param {Object} message - Messaggio da verificare
     * @param {string} pattern - Pattern da verificare
     * @returns {boolean} - True se corrisponde
     */
    matchesPattern(message, pattern) {
        // Pattern esatti
        if (pattern === message.type) {
            return true;
        }

        // Pattern wildcard (es. 'entity:*')
        if (pattern.includes('*')) {
            const regexPattern = pattern.replace(/\*/g, '.*');
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(message.type);
        }

        // Pattern con entity type (es. 'attributeChange:Contact')
        if (pattern.includes(':') && message.data && message.data.entityType) {
            const [eventType, entityType] = pattern.split(':');
            return message.type === eventType && message.data.entityType === entityType;
        }

        return false;
    }

    /**
     * Invia un messaggio al server
     * @param {Object} message - Messaggio da inviare
     */
    send(message) {
        if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
            try {
                this.websocket.send(JSON.stringify(message));
                console.log(`📤 [WebSocketService] Messaggio inviato: ${message.type}`);
            } catch (error) {
                console.error('❌ [WebSocketService] Errore invio messaggio:', error);
            }
        } else {
            console.log('📥 [WebSocketService] Messaggio in coda (non connesso)');
            this.messageQueue.push(message);
        }
    }

    /**
     * Invia sottoscrizione al server (per future implementazioni)
     * @param {string} pattern - Pattern della sottoscrizione
     * @param {string} action - 'subscribe' o 'unsubscribe'
     */
    sendSubscriptionToServer(pattern, action) {
        this.send({
            type: 'subscription',
            action: action,
            pattern: pattern,
            timestamp: Date.now()
        });
    }

    /**
     * Svuota la coda dei messaggi inviando tutto
     */
    flushMessageQueue() {
        if (this.messageQueue.length > 0) {
            console.log(`📤 [WebSocketService] Invio ${this.messageQueue.length} messaggi in coda`);
            
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.send(message);
            }
        }
    }

    /**
     * Re-registra le sottoscrizioni dopo riconnessione
     */
    reregisterSubscriptions() {
        this.subscriptions.forEach((subscription) => {
            this.sendSubscriptionToServer(subscription.pattern, 'subscribe');
        });
    }

    /**
     * Pianifica una riconnessione
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [WebSocketService] Tentativi riconnessione esauriti');
            this.notifyConnectionListeners('failed');
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Backoff esponenziale
        
        console.log(`🔄 [WebSocketService] Riconnessione in ${delay}ms (tentativo ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Aggiunge un listener per eventi di connessione
     * @param {Function} listener - Callback che riceve (status, event)
     */
    addConnectionListener(listener) {
        this.connectionListeners.push(listener);
    }

    /**
     * Rimuove un listener per eventi di connessione
     * @param {Function} listener - Callback da rimuovere
     */
    removeConnectionListener(listener) {
        const index = this.connectionListeners.indexOf(listener);
        if (index >= 0) {
            this.connectionListeners.splice(index, 1);
        }
    }

    /**
     * Notifica tutti i listener di connessione
     * @param {string} status - Stato della connessione
     */
    notifyConnectionListeners(status) {
        this.connectionListeners.forEach(listener => {
            try {
                listener(status, { isConnected: this.isConnected, attempts: this.reconnectAttempts });
            } catch (error) {
                console.error('❌ [WebSocketService] Errore in connection listener:', error);
            }
        });
    }

    /**
     * Chiude la connessione WebSocket
     */
    disconnect() {
        if (this.websocket) {
            console.log('🔌 [WebSocketService] Chiusura connessione...');
            this.websocket.close(1000, 'Disconnect requested');
        }
    }

    /**
     * Ottiene lo stato della connessione
     * @returns {Object} - Stato della connessione
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: this.websocket ? this.websocket.readyState : -1,
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: this.subscriptions.size,
            queuedMessages: this.messageQueue.length
        };
    }

    /**
     * Ottiene statistiche del servizio
     * @returns {Object} - Statistiche del servizio
     */
    getStats() {
        return {
            ...this.getConnectionStatus(),
            connectionListeners: this.connectionListeners.length,
            isReconnecting: this.isReconnecting
        };
    }
}

// Esporta istanza singleton
window.webSocketService = new WebSocketService();

export default window.webSocketService; 