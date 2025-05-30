/**
 * app.js - Applicazione principale MVP SSOT Dinamico
 * 
 * Questo file coordina l'intera applicazione frontend come specificato nella Fase 6 del manuale.
 * Responsabilità:
 * - Gestione navigazione tra moduli
 * - Connessione e gestione WebSocket
 * - Inizializzazione moduli
 * - Coordinamento comunicazione tra moduli
 */

class MVPApp {
    constructor() {
        this.currentModule = 'tabular'; // Modulo attivo di default
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000;
        
        this.initializeApp();
    }

    async initializeApp() {
        this.debugLog('Inizializzazione MVP SSOT Dinamico...', 'info');
        
        // Inizializza elementi DOM
        this.initializeDOMElements();
        
        // Attacca event listeners
        this.attachEventListeners();
        
        // Connetti WebSocket
        this.connectWebSocket();
        
        // Carica dati iniziali
        await this.loadInitialData();
        
        // Mostra il modulo di default
        this.showModule(this.currentModule);
        
        this.debugLog('Applicazione inizializzata con successo', 'success');
    }

    initializeDOMElements() {
        // Elementi di navigazione
        this.btnTabular = document.getElementById('btn-tabular');
        this.btnContact = document.getElementById('btn-contact');
        
        // Container dei moduli
        this.tabularContainer = document.getElementById('tabular-module-container');
        this.contactContainer = document.getElementById('contact-card-module-container');
        
        // Elementi di status
        this.connectionIndicator = document.getElementById('connection-indicator');
        this.connectionMessage = document.getElementById('connection-message');
        
        // Debug panel
        this.debugMessages = document.getElementById('debug-messages');
        this.btnClearDebug = document.getElementById('btn-clear-debug');
    }

    attachEventListeners() {
        // Event listeners per il debug panel
        this.btnClearDebug.addEventListener('click', () => this.clearDebugMessages());
        
        // Gestione chiusura finestra per cleanup WebSocket
        window.addEventListener('beforeunload', () => {
            if (this.websocket) {
                this.websocket.close();
            }
        });
    }

    // Gestione navigazione tra moduli
    showModule(moduleName) {
        this.debugLog(`Passaggio a modulo: ${moduleName}`, 'info');
        
        // Aggiorna lo stato corrente
        this.currentModule = moduleName;
        
        // Aggiorna classi dei pulsanti di navigazione
        this.btnTabular.classList.toggle('active', moduleName === 'tabular');
        this.btnContact.classList.toggle('active', moduleName === 'contact');
        
        // Mostra/nascondi container dei moduli
        this.tabularContainer.style.display = moduleName === 'tabular' ? 'block' : 'none';
        this.contactContainer.style.display = moduleName === 'contact' ? 'block' : 'none';
        
        // Carica dati del modulo se necessario
        this.loadModuleData(moduleName);
    }

    async loadModuleData(moduleName) {
        try {
            if (moduleName === 'tabular' && window.tabularModule) {
                await window.tabularModule.loadData();
            } else if (moduleName === 'contact' && window.contactCardModule) {
                await window.contactCardModule.loadEntities();
            }
        } catch (error) {
            this.debugLog(`Errore nel caricamento dati modulo ${moduleName}: ${error.message}`, 'error');
        }
    }

    async loadInitialData() {
        this.debugLog('Caricamento dati iniziali...', 'info');
        
        try {
            // Carica dati per entrambi i moduli in parallelo
            await Promise.all([
                window.tabularModule ? window.tabularModule.loadData() : Promise.resolve(),
                window.contactCardModule ? window.contactCardModule.loadEntities() : Promise.resolve()
            ]);
            
            this.debugLog('Dati iniziali caricati', 'success');
        } catch (error) {
            this.debugLog(`Errore nel caricamento dati iniziali: ${error.message}`, 'error');
        }
    }

    // Gestione WebSocket
    connectWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.debugLog(`Connessione WebSocket a: ${wsUrl}`, 'info');
            this.updateConnectionStatus('Connessione in corso...', 'disconnected');
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = (event) => {
                this.onWebSocketOpen(event);
            };
            
            this.websocket.onmessage = (event) => {
                this.onWebSocketMessage(event);
            };
            
            this.websocket.onclose = (event) => {
                this.onWebSocketClose(event);
            };
            
            this.websocket.onerror = (event) => {
                this.onWebSocketError(event);
            };
            
        } catch (error) {
            this.debugLog(`Errore nella creazione WebSocket: ${error.message}`, 'error');
            this.updateConnectionStatus('Errore di connessione', 'disconnected');
        }
    }

    onWebSocketOpen(event) {
        this.debugLog('Connessione WebSocket stabilita', 'success');
        this.updateConnectionStatus('Connesso e in ascolto', 'connected');
        this.reconnectAttempts = 0;
        
        // Imposta WebSocket sui moduli
        if (window.tabularModule) {
            window.tabularModule.setWebSocket(this.websocket);
        }
        if (window.contactCardModule) {
            window.contactCardModule.setWebSocket(this.websocket);
        }
    }

    onWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.debugLog(`Messaggio WebSocket ricevuto: ${message.type}`, 'info');
            
            switch (message.type) {
                case 'connection':
                    this.debugLog(message.message, 'success');
                    break;
                    
                case 'attributeChange':
                    this.handleAttributeChange(message.data);
                    break;
                    
                default:
                    this.debugLog(`Tipo messaggio WebSocket sconosciuto: ${message.type}`, 'error');
            }
        } catch (error) {
            this.debugLog(`Errore nel parsing messaggio WebSocket: ${error.message}`, 'error');
        }
    }

    onWebSocketClose(event) {
        this.debugLog(`Connessione WebSocket chiusa: ${event.code} - ${event.reason}`, 'error');
        this.updateConnectionStatus('Disconnesso', 'disconnected');
        
        // Tentativo di riconnessione automatica
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.debugLog(`Tentativo di riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval/1000}s...`, 'info');
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.reconnectInterval);
            
            // Aumenta l'intervallo per i prossimi tentativi
            this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, 30000);
        } else {
            this.debugLog('Massimo numero di tentativi di riconnessione raggiunto', 'error');
            this.updateConnectionStatus('Connessione persa', 'disconnected');
        }
    }

    onWebSocketError(event) {
        this.debugLog('Errore WebSocket', 'error');
        console.error('WebSocket error:', event);
    }

    // Gestisce i cambiamenti di attributi ricevuti via WebSocket
    handleAttributeChange(changeData) {
        this.debugLog(`Propagazione cambiamento: ${changeData.attributeName} = "${changeData.newValue}" per entità ${changeData.entityId}`, 'info');
        
        // Propaga il cambiamento a entrambi i moduli
        if (window.tabularModule) {
            window.tabularModule.handleAttributeChange(changeData);
        }
        
        if (window.contactCardModule) {
            window.contactCardModule.handleAttributeChange(changeData);
        }
    }

    // Aggiorna lo status della connessione
    updateConnectionStatus(message, status) {
        if (this.connectionMessage) {
            this.connectionMessage.textContent = message;
        }
        
        if (this.connectionIndicator) {
            this.connectionIndicator.className = `status-${status}`;
            this.connectionIndicator.textContent = status === 'connected' ? '🟢 Connesso' : '🔴 Disconnesso';
        }
    }

    // Pulisce i messaggi di debug
    clearDebugMessages() {
        if (this.debugMessages) {
            this.debugMessages.innerHTML = '<p>Panel di debug pulito...</p>';
        }
    }

    // Utility per debug logging
    debugLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        
        if (this.debugMessages) {
            const p = document.createElement('p');
            p.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="${type}">[APP]</span> ${message}`;
            this.debugMessages.appendChild(p);
            this.debugMessages.scrollTop = this.debugMessages.scrollHeight;
            
            // Limita il numero di messaggi per evitare accumulo eccessivo
            const messages = this.debugMessages.children;
            if (messages.length > 100) {
                this.debugMessages.removeChild(messages[0]);
            }
        }
    }
}

// Funzione globale per la navigazione (chiamata dai pulsanti)
window.showModule = function(moduleName) {
    if (window.mvpApp) {
        window.mvpApp.showModule(moduleName);
    }
};

// Inizializzazione dell'app quando la pagina è caricata
document.addEventListener('DOMContentLoaded', () => {
    window.mvpApp = new MVPApp();
});

// Gestione errori globali per migliore debugging
window.addEventListener('error', (event) => {
    if (window.mvpApp) {
        window.mvpApp.debugLog(`Errore JavaScript: ${event.error.message} in ${event.filename}:${event.lineno}`, 'error');
    }
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    if (window.mvpApp) {
        window.mvpApp.debugLog(`Promise rifiutata: ${event.reason}`, 'error');
    }
    console.error('Unhandled promise rejection:', event.reason);
});
