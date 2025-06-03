/**
 * table_demo_dashboard.js - Dashboard per Demo Fase 2 Moduli Tabellari Dinamici
 * 
 * Gestisce:
 * - Apertura di nuovi moduli tabellari in finestre separate
 * - Gestione istanze di modulo salvate (CRUD)
 * - Sincronizzazione WebSocket per aggiornamenti real-time
 * - Comunicazione cross-window tramite BroadcastChannel
 */

class TableDemoDashboard {
    constructor() {
        this.websocketService = null;
        this.saveInstanceService = null;
        this.schemaService = null;
        this.openWindows = new Map(); // Traccia finestre aperte
        this.crossWindowChannel = null;
        this.instances = [];
        
        this.initializeServices();
        this.initializeElements();
        this.attachEventListeners();
        this.initCrossWindowCommunication();
        this.loadInitialData();
        
        this.debugLog('Dashboard Fase 2 inizializzata con successo! 🚀', 'success');
    }

    async initializeServices() {
        try {
            // Inizializza servizi core
            this.websocketService = new WebSocketService();
            this.saveInstanceService = new SaveInstanceService();
            this.schemaService = new SchemaService();

            // Connetti WebSocket con callback per aggiornamenti istanze
            await this.websocketService.connect();
            
            // Sottoscrivi eventi per istanze di modulo
            this.websocketService.subscribe('module-instance-*', (data) => {
                this.handleModuleInstanceUpdate(data);
            });

            // Sottoscrivi eventi per aggiornamenti schema
            this.websocketService.subscribe('schema-*', (data) => {
                this.handleSchemaUpdate(data);
            });

            this.updateConnectionStatus('🟢 Connesso', 'connected');
            this.debugLog('Servizi inizializzati e WebSocket connesso', 'success');
            
        } catch (error) {
            this.debugLog(`❌ Errore inizializzazione servizi: ${error.message}`, 'error');
            this.updateConnectionStatus('🔴 Errore connessione', 'disconnected');
        }
    }

    initializeElements() {
        // Elementi controllo
        this.entityTypeSelect = document.getElementById('entity-type-select');
        this.customEntityTypeInput = document.getElementById('custom-entity-type');
        this.btnOpenNewTable = document.getElementById('btn-open-new-table');
        this.btnRefreshSchemas = document.getElementById('btn-refresh-schemas');
        this.btnRefreshInstances = document.getElementById('btn-refresh-instances');
        
        // Elementi istanze
        this.instancesList = document.getElementById('instances-list');
        
        // Elementi debug
        this.debugMessages = document.getElementById('debug-messages');
        this.btnClearDebug = document.getElementById('btn-clear-debug');
        this.btnTestConnection = document.getElementById('btn-test-connection');
        
        // Status connection
        this.connectionStatus = document.getElementById('connection-status');
    }

    attachEventListeners() {
        // Apertura nuovo modulo tabellare
        this.btnOpenNewTable.addEventListener('click', () => {
            this.openNewTableModule();
        });

        // Refresh schemi disponibili
        this.btnRefreshSchemas.addEventListener('click', () => {
            this.refreshAvailableSchemas();
        });

        // Refresh istanze
        this.btnRefreshInstances.addEventListener('click', () => {
            this.loadInstances();
        });

        // Debug controls
        this.btnClearDebug.addEventListener('click', () => {
            this.clearDebugMessages();
        });

        this.btnTestConnection.addEventListener('click', () => {
            this.testConnection();
        });

        // Auto-switch tra select e custom input
        this.entityTypeSelect.addEventListener('change', () => {
            if (this.entityTypeSelect.value) {
                this.customEntityTypeInput.value = '';
            }
        });

        this.customEntityTypeInput.addEventListener('input', () => {
            if (this.customEntityTypeInput.value.trim()) {
                this.entityTypeSelect.value = '';
            }
        });

        // Gestione chiusura finestra
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    initCrossWindowCommunication() {
        try {
            if ('BroadcastChannel' in window) {
                this.crossWindowChannel = new BroadcastChannel('ssot-sync');
                this.crossWindowChannel.onmessage = (event) => {
                    this.handleCrossWindowMessage(event.data);
                };
                this.debugLog('Comunicazione cross-window inizializzata (BroadcastChannel)', 'info');
            } else {
                // Fallback localStorage per browser più vecchi
                window.addEventListener('storage', (event) => {
                    if (event.key === 'ssot-sync') {
                        try {
                            const data = JSON.parse(event.newValue);
                            this.handleCrossWindowMessage(data);
                        } catch (error) {
                            this.debugLog(`Errore parsing messaggio cross-window: ${error.message}`, 'error');
                        }
                    }
                });
                this.debugLog('Comunicazione cross-window inizializzata (localStorage fallback)', 'info');
            }
        } catch (error) {
            this.debugLog(`Errore inizializzazione cross-window: ${error.message}`, 'error');
        }
    }

    async loadInitialData() {
        try {
            this.debugLog('Caricamento dati iniziali...', 'info');
            
            // Carica istanze salvate
            await this.loadInstances();
            
            // Carica schemi disponibili per la select
            await this.refreshAvailableSchemas();
            
            this.debugLog('Dati iniziali caricati con successo', 'success');
        } catch (error) {
            this.debugLog(`Errore caricamento dati iniziali: ${error.message}`, 'error');
        }
    }

    async openNewTableModule() {
        try {
            // Determina il tipo di entità
            let entityType = this.entityTypeSelect.value || this.customEntityTypeInput.value.trim();
            
            if (!entityType) {
                alert('⚠️ Seleziona o inserisci un tipo di entità');
                return;
            }

            // Normalizza il nome del tipo entità
            entityType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();

            // URL per modulo tabellare con entityType
            const moduleUrl = `module_loader.html?module=tabular&entityType=${encodeURIComponent(entityType)}`;
            
            // Calcola posizione finestra
            const windowFeatures = this.calculateWindowPosition();
            
            // Apri nuova finestra
            const newWindow = window.open(moduleUrl, `tabular_${entityType}_${Date.now()}`, windowFeatures);
            
            if (!newWindow) {
                throw new Error('Impossibile aprire la finestra. Controlla le impostazioni popup del browser.');
            }

            // Traccia la finestra aperta
            const windowId = `tabular_${entityType}_${Date.now()}`;
            this.openWindows.set(windowId, {
                window: newWindow,
                entityType: entityType,
                moduleType: 'tabular',
                openedAt: new Date()
            });

            // Monitora chiusura finestra
            const checkClosed = setInterval(() => {
                if (newWindow.closed) {
                    this.openWindows.delete(windowId);
                    clearInterval(checkClosed);
                    this.debugLog(`Finestra ${entityType} chiusa`, 'info');
                }
            }, 1000);

            this.debugLog(`🚀 Modulo tabellare aperto per: ${entityType}`, 'success');
            
            // Reset form
            this.entityTypeSelect.value = '';
            this.customEntityTypeInput.value = '';

        } catch (error) {
            this.debugLog(`❌ Errore apertura modulo: ${error.message}`, 'error');
            alert(`Errore apertura modulo: ${error.message}`);
        }
    }

    calculateWindowPosition() {
        // Calcola posizione per evitare sovrapposizioni
        const offset = this.openWindows.size * 30;
        const width = Math.min(1200, screen.width - 100);
        const height = Math.min(800, screen.height - 100);
        const left = Math.min(100 + offset, screen.width - width - 50);
        const top = Math.min(100 + offset, screen.height - height - 50);
        
        return `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    }

    async loadInstances() {
        try {
            this.debugLog('Caricamento istanze salvate...', 'info');
            
            const response = await this.saveInstanceService.listInstances();
            // Estrae l'array di istanze dalla risposta del servizio
            this.instances = response?.instances || [];
            
            this.renderInstancesList();
            this.debugLog(`Caricate ${this.instances.length} istanze`, 'success');
            
        } catch (error) {
            this.debugLog(`Errore caricamento istanze: ${error.message}`, 'error');
            this.instances = [];
            this.renderInstancesList();
        }
    }

    renderInstancesList() {
        if (this.instances.length === 0) {
            this.instancesList.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3em; margin-bottom: 15px; opacity: 0.5;">📋</div>
                    <p>Nessuna istanza salvata</p>
                    <p style="font-size: 0.9em; margin-top: 10px;">Crea e salva viste personalizzate dai moduli tabellari aperti</p>
                </div>
            `;
            return;
        }

        const instancesHTML = this.instances.map(instance => this.renderInstanceItem(instance)).join('');
        this.instancesList.innerHTML = instancesHTML;
    }

    renderInstanceItem(instance) {
        const createdDate = new Date(instance.createdAt).toLocaleDateString('it-IT');
        const hasOverrides = instance.instanceConfigOverrides && Object.keys(JSON.parse(instance.instanceConfigOverrides || '{}')).length > 0;
        
        return `
            <div class="instance-item" data-instance-id="${instance.id}">
                <div class="instance-header">
                    <span class="instance-name">📊 ${instance.instanceName}</span>
                </div>
                <div class="instance-meta">
                    <strong>Tipo:</strong> ${instance.targetEntityType} | 
                    <strong>Template:</strong> ${instance.templateModuleId} | 
                    <strong>Creata:</strong> ${createdDate}
                    ${hasOverrides ? ' | <span style="color: #4CAF50;">✨ Personalizzata</span>' : ''}
                </div>
                ${instance.description ? `<div style="font-size: 0.9em; color: #6c757d; margin-bottom: 10px;">${instance.description}</div>` : ''}
                <div class="instance-actions">
                    <button class="btn" onclick="window.demoApp.openInstanceInNewWindow('${instance.id}')">
                        🚀 Apri
                    </button>
                    <button class="btn btn-secondary" onclick="window.demoApp.editInstance('${instance.id}')">
                        ✏️ Modifica
                    </button>
                    <button class="btn btn-secondary" onclick="window.demoApp.duplicateInstance('${instance.id}')">
                        📋 Duplica
                    </button>
                    <button class="btn btn-danger" onclick="window.demoApp.deleteInstance('${instance.id}')">
                        🗑️ Elimina
                    </button>
                </div>
            </div>
        `;
    }

    async openInstanceInNewWindow(instanceId) {
        try {
            const instance = this.instances.find(i => i.id === instanceId);
            if (!instance) {
                throw new Error('Istanza non trovata');
            }

            // Per ora apriamo un modulo tabellare standard per il tipo di entità dell'istanza
            // In futuro potremo passare l'istanza ID per applicare le configurazioni
            const moduleUrl = `module_loader.html?module=tabular&entityType=${encodeURIComponent(instance.targetEntityType)}&instanceId=${instanceId}`;
            
            const windowFeatures = this.calculateWindowPosition();
            const newWindow = window.open(moduleUrl, `instance_${instanceId}`, windowFeatures);
            
            if (!newWindow) {
                throw new Error('Impossibile aprire la finestra');
            }

            this.debugLog(`🚀 Istanza "${instance.instanceName}" aperta in nuova finestra`, 'success');
            
        } catch (error) {
            this.debugLog(`❌ Errore apertura istanza: ${error.message}`, 'error');
            alert(`Errore apertura istanza: ${error.message}`);
        }
    }

    async editInstance(instanceId) {
        try {
            const instance = this.instances.find(i => i.id === instanceId);
            if (!instance) {
                throw new Error('Istanza non trovata');
            }

            const newName = prompt('Nuovo nome istanza:', instance.instanceName);
            if (!newName || newName === instance.instanceName) {
                return;
            }

            const updatedInstance = {
                ...instance,
                instanceName: newName
            };

            await this.saveInstanceService.updateInstance(instanceId, updatedInstance);
            
            this.debugLog(`✏️ Istanza "${newName}" aggiornata`, 'success');
            await this.loadInstances(); // Ricarica lista
            
        } catch (error) {
            this.debugLog(`❌ Errore modifica istanza: ${error.message}`, 'error');
            alert(`Errore modifica istanza: ${error.message}`);
        }
    }

    async duplicateInstance(instanceId) {
        try {
            const instance = this.instances.find(i => i.id === instanceId);
            if (!instance) {
                throw new Error('Istanza non trovata');
            }

            const newName = prompt('Nome per la copia:', `${instance.instanceName} (Copia)`);
            if (!newName) {
                return;
            }

            const duplicatedInstance = await this.saveInstanceService.duplicateInstance(instanceId, { instanceName: newName });
            
            this.debugLog(`📋 Istanza duplicata: "${newName}"`, 'success');
            await this.loadInstances(); // Ricarica lista
            
        } catch (error) {
            this.debugLog(`❌ Errore duplicazione istanza: ${error.message}`, 'error');
            alert(`Errore duplicazione istanza: ${error.message}`);
        }
    }

    async deleteInstance(instanceId) {
        try {
            const instance = this.instances.find(i => i.id === instanceId);
            if (!instance) {
                throw new Error('Istanza non trovata');
            }

            if (!confirm(`Sei sicuro di voler eliminare l'istanza "${instance.instanceName}"?`)) {
                return;
            }

            await this.saveInstanceService.deleteInstance(instanceId);
            
            this.debugLog(`🗑️ Istanza "${instance.instanceName}" eliminata`, 'success');
            await this.loadInstances(); // Ricarica lista
            
        } catch (error) {
            this.debugLog(`❌ Errore eliminazione istanza: ${error.message}`, 'error');
            alert(`Errore eliminazione istanza: ${error.message}`);
        }
    }

    async refreshAvailableSchemas() {
        try {
            this.debugLog('Aggiornamento schemi disponibili...', 'info');
            
            // Per ora manteniamo la lista hardcoded, ma in futuro potremmo 
            // caricare dinamicamente i tipi di entità dal backend
            const availableTypes = ['Contatto', 'Persona', 'Azienda', 'Task', 'TestEvoluzione'];
            
            // Aggiorna la select mantenendo la selezione corrente
            const currentValue = this.entityTypeSelect.value;
            this.entityTypeSelect.innerHTML = '<option value="">-- Seleziona Tipo Entità --</option>';
            
            availableTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                this.entityTypeSelect.appendChild(option);
            });
            
            this.entityTypeSelect.value = currentValue;
            this.debugLog('Schemi aggiornati', 'success');
            
        } catch (error) {
            this.debugLog(`Errore aggiornamento schemi: ${error.message}`, 'error');
        }
    }

    // Event Handlers

    handleCrossWindowMessage(data) {
        switch (data.type) {
            case 'module-instance-created':
                this.debugLog(`📋 Nuova istanza creata: ${data.instanceName}`, 'info');
                this.loadInstances(); // Ricarica lista
                break;
                
            case 'entity-update':
                this.debugLog(`🔄 Aggiornamento entità ricevuto: ${data.entityId}`, 'info');
                break;
                
            case 'schema-update':
                this.debugLog(`🔧 Aggiornamento schema ricevuto: ${data.entityType}`, 'info');
                break;
                
            default:
                this.debugLog(`📨 Messaggio cross-window: ${data.type}`, 'info');
        }
    }

    handleModuleInstanceUpdate(data) {
        this.debugLog(`📋 Aggiornamento istanza via WebSocket: ${data.operation}`, 'info');
        this.loadInstances(); // Ricarica lista
    }

    handleSchemaUpdate(data) {
        this.debugLog(`🔧 Aggiornamento schema via WebSocket: ${data.entityType}`, 'info');
        // Potremmo aggiornare la lista dei tipi disponibili
    }

    async testConnection() {
        try {
            this.debugLog('🔗 Test connessione in corso...', 'info');
            
            if (this.websocketService && this.websocketService.isConnected()) {
                this.debugLog('✅ WebSocket connesso e funzionante', 'success');
                this.updateConnectionStatus('🟢 Connesso', 'connected');
            } else {
                this.debugLog('❌ WebSocket non connesso', 'error');
                this.updateConnectionStatus('🔴 Disconnesso', 'disconnected');
                
                // Tenta riconnessione
                await this.websocketService.connect();
            }
            
        } catch (error) {
            this.debugLog(`❌ Errore test connessione: ${error.message}`, 'error');
            this.updateConnectionStatus('🔴 Errore', 'disconnected');
        }
    }

    // Utility Methods

    updateConnectionStatus(message, status) {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = message;
            this.connectionStatus.className = `connection-status ${status}`;
        }
    }

    debugLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('it-IT');
        const typeLabel = type.toUpperCase();
        const emoji = {
            info: 'ℹ️',
            success: '✅', 
            error: '❌',
            warning: '⚠️'
        }[type] || 'ℹ️';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `debug-message ${type}`;
        messageDiv.innerHTML = `<strong>[${timestamp}] ${emoji} ${typeLabel}:</strong> ${message}`;
        
        if (this.debugMessages) {
            this.debugMessages.appendChild(messageDiv);
            this.debugMessages.scrollTop = this.debugMessages.scrollHeight;
        }
        
        // Log anche in console per debug
        console.log(`[TableDemoDashboard] [${typeLabel}] ${message}`);
    }

    clearDebugMessages() {
        if (this.debugMessages) {
            this.debugMessages.innerHTML = `
                <div class="debug-message info">
                    <strong>[INFO]</strong> Log debug pulito - Dashboard operativa
                </div>
            `;
        }
    }

    cleanup() {
        try {
            // Chiudi tutte le finestre aperte
            this.openWindows.forEach((windowData, windowId) => {
                if (windowData.window && !windowData.window.closed) {
                    windowData.window.close();
                }
            });
            
            // Chiudi WebSocket
            if (this.websocketService) {
                this.websocketService.disconnect();
            }
            
            // Chiudi canale cross-window
            if (this.crossWindowChannel) {
                this.crossWindowChannel.close();
            }
            
            this.debugLog('Cleanup completato', 'info');
        } catch (error) {
            console.error('Errore durante cleanup:', error);
        }
    }
} 