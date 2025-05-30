/**
 * app_module.js - Script per gestire moduli in finestre figlie
 * Gestisce la comunicazione cross-window e la sincronizzazione con il backend
 */

class ModuleWindowManager {
    constructor() {
        this.currentModule = null;
        this.moduleType = null;
        this.socket = null;
        this.isConnected = false;
        this.crossWindowChannel = null;
        
        this.init();
    }

    async init() {
        // Estrai il tipo di modulo dai parametri URL
        const urlParams = new URLSearchParams(window.location.search);
        this.moduleType = urlParams.get('module');
        
        if (!this.moduleType) {
            this.showError('Tipo di modulo non specificato');
            return;
        }

        // Aggiorna il titolo della finestra
        this.updateWindowTitle();
        
        // Inizializza comunicazione cross-window
        this.initCrossWindowCommunication();
        
        // Connetti al backend WebSocket
        await this.connectWebSocket();
        
        // Carica il modulo specifico
        await this.loadModule();
        
        this.debugLog(`Modulo ${this.moduleType} caricato in finestra separata`);
    }

    updateWindowTitle() {
        const titles = {
            'tabular': '📊 Modulo Tabellare',
            'contact': '👤 Scheda Contatto'
        };
        
        const title = titles[this.moduleType] || '🪟 Modulo SSOT';
        document.getElementById('window-title').textContent = title;
        document.title = `${title} - MVP SSOT`;
    }

    initCrossWindowCommunication() {
        // Usa BroadcastChannel per comunicazione cross-window (più robusta)
        if ('BroadcastChannel' in window) {
            this.crossWindowChannel = new BroadcastChannel('ssot-sync');
            this.crossWindowChannel.onmessage = (event) => {
                this.handleCrossWindowMessage(event.data);
            };
            this.debugLog('Comunicazione cross-window inizializzata (BroadcastChannel)');
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
            this.debugLog('Comunicazione cross-window inizializzata (localStorage fallback)');
        }
        
        // Aggiorna indicatore di sincronizzazione
        this.updateSyncIndicator(true);
    }

    handleCrossWindowMessage(data) {
        if (data.type === 'entity-update' && this.currentModule) {
            this.debugLog(`Ricevuto aggiornamento cross-window: ${data.entityId}:${data.attributeName} = ${data.newValue}`);
            
            // Propaga l'aggiornamento al modulo locale
            if (this.currentModule.handleExternalUpdate) {
                this.currentModule.handleExternalUpdate(data.entityId, data.attributeName, data.newValue);
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
            source: 'window-' + this.moduleType
        };

        if (this.crossWindowChannel) {
            this.crossWindowChannel.postMessage(message);
        } else {
            // Fallback localStorage
            localStorage.setItem('ssot-sync', JSON.stringify(message));
            // Rimuovi subito per triggerare l'evento storage
            setTimeout(() => localStorage.removeItem('ssot-sync'), 10);
        }
        
        this.debugLog(`Trasmesso aggiornamento cross-window: ${entityId}:${attributeName}`);
    }

    async connectWebSocket() {
        try {
            this.socket = new WebSocket('ws://localhost:3000');
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus(true);
                this.debugLog('WebSocket connesso');
            };
            
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.debugLog('WebSocket disconnesso');
                
                // Tenta riconnessione dopo 3 secondi
                setTimeout(() => this.connectWebSocket(), 3000);
            };
            
            this.socket.onerror = (error) => {
                console.error('Errore WebSocket:', error);
                this.debugLog('Errore WebSocket', 'error');
            };
            
        } catch (error) {
            console.error('Errore connessione WebSocket:', error);
            this.debugLog('Errore connessione WebSocket', 'error');
        }
    }

    handleWebSocketMessage(data) {
        if (data.type === 'entity-updated' && this.currentModule) {
            this.debugLog(`Ricevuto aggiornamento dal server: ${data.entityId}:${data.attributeName} = ${data.newValue}`);
            
            // Propaga al modulo locale
            if (this.currentModule.handleExternalUpdate) {
                this.currentModule.handleExternalUpdate(data.entityId, data.attributeName, data.newValue);
            }
        }
    }

    async loadModule() {
        const container = document.getElementById('module-container');
        
        try {
            if (this.moduleType === 'tabular') {
                await this.loadTabularModule(container);
            } else if (this.moduleType === 'contact') {
                await this.loadContactModule(container);
            } else {
                throw new Error(`Tipo di modulo non supportato: ${this.moduleType}`);
            }
        } catch (error) {
            console.error('Errore caricamento modulo:', error);
            this.showError(`Errore caricamento modulo: ${error.message}`);
        }
    }

    async loadTabularModule(container) {
        // Crea la struttura HTML per il modulo tabellare
        container.innerHTML = `
            <div class="module-header">
                <h2>📊 Modulo Tabellare (Finestra Separata)</h2>
                <p>Modifiche sincronizzate in tempo reale con altre finestre</p>
                
                <div class="module-controls">
                    <button id="btn-add-row" class="control-btn">➕ Aggiungi Riga</button>
                    <button id="btn-add-column" class="control-btn">📝 Aggiungi Colonna</button>
                    <button id="btn-refresh-table" class="control-btn">🔄 Aggiorna</button>
                </div>
            </div>
            
            <div class="table-container">
                <table id="entities-table">
                    <thead>
                        <tr id="table-header">
                            <th>ID</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
                    </tbody>
                </table>
            </div>
        `;

        // Inizializza il modulo tabellare DOPO aver creato l'HTML
        this.currentModule = new TabularModule();
        
        // Sovrascrivi il metodo di notifica per includere comunicazione cross-window
        const originalNotifyUpdate = this.currentModule.notifyEntityUpdate;
        this.currentModule.notifyEntityUpdate = (entityId, attributeName, newValue) => {
            // Chiama il metodo originale
            originalNotifyUpdate.call(this.currentModule, entityId, attributeName, newValue);
            
            // Aggiungi comunicazione cross-window
            this.broadcastToOtherWindows(entityId, attributeName, newValue);
        };
        
        // Ora inizializza il modulo
        await this.currentModule.init();
    }

    async loadContactModule(container) {
        // Crea la struttura HTML per il modulo scheda
        container.innerHTML = `
            <div class="module-header">
                <h2>👤 Scheda Contatto (Finestra Separata)</h2>
                <p>Modifiche sincronizzate in tempo reale con altre finestre</p>
                
                <div class="module-controls">
                    <label for="entity-selector">Seleziona Entità:</label>
                    <select id="entity-selector">
                        <option value="">-- Seleziona un'entità --</option>
                    </select>
                    <button id="btn-refresh-entities" class="control-btn">🔄 Aggiorna Lista</button>
                </div>
            </div>
            
            <div class="contact-card">
                <div id="entity-details">
                    <p class="no-entity">Nessuna entità selezionata</p>
                </div>
            </div>
        `;

        // Inizializza il modulo scheda DOPO aver creato l'HTML
        this.currentModule = new ContactCardModule();
        
        // Sovrascrivi il metodo di notifica per includere comunicazione cross-window
        const originalNotifyUpdate = this.currentModule.notifyEntityUpdate;
        this.currentModule.notifyEntityUpdate = (entityId, attributeName, newValue) => {
            // Chiama il metodo originale
            originalNotifyUpdate.call(this.currentModule, entityId, attributeName, newValue);
            
            // Aggiungi comunicazione cross-window
            this.broadcastToOtherWindows(entityId, attributeName, newValue);
        };
        
        // Ora inizializza il modulo
        await this.currentModule.init();
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-indicator');
        if (connected) {
            indicator.textContent = '🟢 Connesso';
            indicator.className = 'status-connected';
        } else {
            indicator.textContent = '⚫ Disconnesso';
            indicator.className = 'status-disconnected';
        }
    }

    updateSyncIndicator(active) {
        const indicator = document.getElementById('sync-indicator');
        if (active) {
            indicator.textContent = '🟢 Sincronizzato';
            indicator.className = 'sync-indicator sync-active';
        } else {
            indicator.textContent = '⚫ Non sincronizzato';
            indicator.className = 'sync-indicator sync-inactive';
        }
    }

    showError(message) {
        const container = document.getElementById('module-container');
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #dc3545;">
                <h3>❌ Errore</h3>
                <p>${message}</p>
                <button onclick="window.close()" class="control-btn" style="background: #dc3545;">
                    Chiudi Finestra
                </button>
            </div>
        `;
    }

    debugLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${this.moduleType.toUpperCase()}] ${message}`);
    }
}

// Inizializza il manager quando la pagina è caricata
document.addEventListener('DOMContentLoaded', () => {
    window.moduleManager = new ModuleWindowManager();
});

// Gestisci la chiusura della finestra
window.addEventListener('beforeunload', () => {
    if (window.moduleManager && window.moduleManager.crossWindowChannel) {
        window.moduleManager.crossWindowChannel.close();
    }
}); 