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
        this.openWindows = new Map(); // Tiene traccia delle finestre aperte
        this.crossWindowChannel = null; // BroadcastChannel per comunicazione cross-window
        
        this.initializeApp();
    }

    async initializeApp() {
        this.debugLog('Inizializzazione MVP SSOT Dinamico...', 'info');
        
        // Inizializza elementi DOM
        this.initializeDOMElements();
        
        // Attacca event listeners
        this.attachEventListeners();
        
        // Inizializza comunicazione cross-window
        this.initCrossWindowCommunication();
        
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
        
        // Gestione chiusura finestra per cleanup WebSocket e finestre figlie
        window.addEventListener('beforeunload', () => {
            // Chiudi tutte le finestre figlie
            this.openWindows.forEach((windowData, windowId) => {
                if (windowData.window && !windowData.window.closed) {
                    windowData.window.close();
                }
            });
            
            // Chiudi WebSocket
            if (this.websocket) {
                this.websocket.close();
            }
            
            // Chiudi canale cross-window
            if (this.crossWindowChannel) {
                this.crossWindowChannel.close();
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
                await window.tabularModule.init();
            } else if (moduleName === 'contact' && window.contactCardModule) {
                await window.contactCardModule.init();
            }
        } catch (error) {
            this.debugLog(`Errore nel caricamento dati modulo ${moduleName}: ${error.message}`, 'error');
        }
    }

    async loadInitialData() {
        this.debugLog('Caricamento dati iniziali...', 'info');
        
        try {
            // Inizializza entrambi i moduli usando il loro metodo init()
            await Promise.all([
                window.tabularModule ? window.tabularModule.init() : Promise.resolve(),
                window.contactCardModule ? window.contactCardModule.init() : Promise.resolve()
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

    // Gestione finestre separate per moduli
    openModuleInNewWindow(moduleType) {
        this.debugLog(`Apertura modulo ${moduleType} in nuova finestra`, 'info');
        
        // Costruisci URL con parametri per il tipo di entità
        let windowUrl = `module_loader.html?module=${moduleType}`;
        
        // Se stiamo aprendo il modulo tabellare, passa il tipo di entità corrente
        if (moduleType === 'tabular' && window.tabularModule && window.tabularModule.entityType) {
            windowUrl += `&entityType=${encodeURIComponent(window.tabularModule.entityType)}`;
        }
        
        const windowFeatures = 'width=1000,height=700,resizable=yes,scrollbars=yes,status=yes';
        
        try {
            const newWindow = window.open(windowUrl, `ssot-${moduleType}-${Date.now()}`, windowFeatures);
            
            if (newWindow) {
                // Traccia la finestra aperta
                const windowId = `${moduleType}-${Date.now()}`;
                this.openWindows.set(windowId, {
                    window: newWindow,
                    moduleType: moduleType,
                    opened: Date.now()
                });
                
                // Monitora la chiusura della finestra
                const checkClosed = setInterval(() => {
                    if (newWindow.closed) {
                        this.debugLog(`Finestra modulo ${moduleType} chiusa`, 'info');
                        this.openWindows.delete(windowId);
                        clearInterval(checkClosed);
                    }
                }, 1000);
                
                this.debugLog(`Finestra modulo ${moduleType} aperta con ID: ${windowId} (entityType: ${window.tabularModule?.entityType || 'default'})`, 'success');
            } else {
                throw new Error('Impossibile aprire la finestra. Verifica le impostazioni del browser per i popup.');
            }
        } catch (error) {
            this.debugLog(`Errore apertura finestra modulo ${moduleType}: ${error.message}`, 'error');
        }
    }

    initCrossWindowCommunication() {
        // Inizializza BroadcastChannel per comunicazione cross-window
        if ('BroadcastChannel' in window) {
            this.crossWindowChannel = new BroadcastChannel('ssot-sync');
            this.crossWindowChannel.onmessage = (event) => {
                this.handleCrossWindowMessage(event.data);
            };
            this.debugLog('Comunicazione cross-window inizializzata (BroadcastChannel)', 'info');
        } else {
            // Fallback a localStorage events per browser più vecchi
            window.addEventListener('storage', (event) => {
                if (event.key === 'ssot-sync') {
                    try {
                        const data = JSON.parse(event.newValue);
                        this.handleCrossWindowMessage(data);
                    } catch (error) {
                        console.error('Errore parsing messaggio cross-window:', error);
                    }
                }
            });
            this.debugLog('Comunicazione cross-window inizializzata (localStorage fallback)', 'info');
        }
    }

    handleCrossWindowMessage(data) {
        if (data.type === 'entity-update') {
            this.debugLog(`Ricevuto aggiornamento cross-window: ${data.entityId}:${data.attributeName} = ${data.newValue}`, 'info');
            
            // Propaga l'aggiornamento ai moduli locali (evitando loop)
            if (window.tabularModule && window.tabularModule.handleExternalUpdate) {
                window.tabularModule.handleExternalUpdate(data.entityId, data.attributeName, data.newValue);
            }
            
            if (window.contactCardModule && window.contactCardModule.handleExternalUpdate) {
                window.contactCardModule.handleExternalUpdate(data.entityId, data.attributeName, data.newValue);
            }
        } else if (data.type === 'schema-update') {
            this.debugLog(`Ricevuto aggiornamento schema cross-window: ${data.entityType} + ${data.newAttribute}`, 'info');
            
            // Propaga l'aggiornamento di schema ai moduli locali
            if (window.tabularModule && window.tabularModule.handleSchemaUpdate) {
                window.tabularModule.handleSchemaUpdate(data);
            }
        }
    }

    broadcastToOtherWindows(entityId, attributeName, newValue) {
        const message = {
            type: 'entity-update',
            entityId,
            attributeName,
            newValue,
            timestamp: Date.now(),
            source: 'main-window'
        };

        if (this.crossWindowChannel) {
            this.crossWindowChannel.postMessage(message);
        } else {
            // Fallback localStorage
            localStorage.setItem('ssot-sync', JSON.stringify(message));
            // Rimuovi subito per triggerare l'evento storage
            setTimeout(() => localStorage.removeItem('ssot-sync'), 10);
        }
        
        this.debugLog(`Trasmesso aggiornamento cross-window: ${entityId}:${attributeName}`, 'info');
    }
}

// Funzione globale per la navigazione (chiamata dai pulsanti)
window.showModule = function(moduleName) {
    if (window.mvpApp) {
        window.mvpApp.showModule(moduleName);
    }
};

// Funzione globale per aprire moduli in nuove finestre (chiamata dai bottoni)
window.openModuleInNewWindow = function(moduleType) {
    if (window.mvpApp) {
        window.mvpApp.openModuleInNewWindow(moduleType);
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
