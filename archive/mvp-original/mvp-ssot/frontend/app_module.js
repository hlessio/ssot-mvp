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

        // Inizializza comunicazione cross-window
        this.initCrossWindowCommunication();
        
        // Connetti al backend WebSocket
        await this.connectWebSocket();
        
        // Carica il modulo specifico
        await this.loadModule();
        
        this.debugLog(`Modulo ${this.moduleType} caricato in finestra separata`);
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
    }

    handleCrossWindowMessage(data) {
        if (data.type === 'entity-update' && this.currentModule) {
            this.debugLog(`Ricevuto aggiornamento cross-window: ${data.entityId}:${data.attributeName} = ${data.newValue}`);
            
            // Propaga l'aggiornamento al modulo locale
            if (this.currentModule.handleExternalUpdate) {
                this.currentModule.handleExternalUpdate(data.entityId, data.attributeName, data.newValue);
            }
        } else if (data.type === 'schema-update' && this.currentModule) {
            this.debugLog(`Ricevuto aggiornamento schema cross-window: ${data.entityType} + ${data.newAttribute}`);
            
            // Propaga l'aggiornamento di schema al modulo locale
            if (this.currentModule.handleSchemaUpdate) {
                this.currentModule.handleSchemaUpdate(data);
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
                this.debugLog('WebSocket connesso');
            };
            
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
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
        // Crea solo la struttura essenziale della tabella, stile web primitivo + pulsante Fase 2
        container.innerHTML = `
            <div style="padding: 10px; font-family: monospace; background: white;">
                <p style="margin: 5px 0; font-weight: bold;">TABELLA ENTITÀ</p>
                
                <div style="margin-bottom: 10px;">
                    <input type="button" id="btn-add-row" value="[Aggiungi Riga]" style="margin-right: 5px; font-family: monospace; border: 1px solid black; background: #f0f0f0; padding: 2px 6px;">
                    <input type="button" id="btn-add-column" value="[Aggiungi Colonna]" style="margin-right: 5px; font-family: monospace; border: 1px solid black; background: #f0f0f0; padding: 2px 6px;">
                    <input type="button" id="btn-refresh-table" value="[Aggiorna]" style="margin-right: 5px; font-family: monospace; border: 1px solid black; background: #f0f0f0; padding: 2px 6px;">
                    <input type="button" id="btn-save-instance" value="[💾 Salva Vista Come...]" style="font-family: monospace; border: 1px solid black; background: #e6ffe6; padding: 2px 6px;">
                </div>
                
                <div style="border: 2px inset #c0c0c0; background: white; overflow: auto; height: calc(100vh - 80px);">
                    <table id="entities-table" border="1" cellpadding="3" cellspacing="0" style="width: 100%; font-family: monospace; font-size: 12px; border-collapse: collapse;">
                        <thead>
                            <tr id="table-header" style="background: #c0c0c0;">
                                <th style="border: 1px solid black; text-align: left; padding: 3px;">ID</th>
                            </tr>
                        </thead>
                        <tbody id="table-body">
                        </tbody>
                    </table>
                </div>
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
        // Crea solo la struttura essenziale della scheda, stile web primitivo
        container.innerHTML = `
            <div style="padding: 10px; font-family: monospace; background: white;">
                <p style="margin: 5px 0; font-weight: bold;">SCHEDA CONTATTO</p>
                
                <div style="margin-bottom: 10px;">
                    <label style="font-family: monospace;">Entità:</label>
                    <select id="entity-selector" style="font-family: monospace; border: 1px solid black; background: white; padding: 1px;">
                        <option value="">-- Seleziona --</option>
                    </select>
                    <input type="button" id="btn-refresh-entities" value="[Aggiorna]" style="margin-left: 5px; font-family: monospace; border: 1px solid black; background: #f0f0f0; padding: 2px 6px;">
                </div>
                
                <div style="border: 2px inset #c0c0c0; background: white; padding: 10px; height: calc(100vh - 80px); overflow: auto;">
                    <div id="entity-details">
                        <p style="text-align: center; font-family: monospace; color: #666;">Nessuna entità selezionata</p>
                    </div>
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