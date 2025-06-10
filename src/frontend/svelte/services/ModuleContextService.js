/**
 * ModuleContextService - Gestisce il contesto e stato del modulo corrente
 * Integra con le API ModuleRelationService del backend
 */
export class ModuleContextService {
    constructor() {
        this.currentModule = null;
        this.currentProject = null;
        this.websocket = null;
        this.listeners = new Map();
        
        this.initWebSocketConnection();
    }
    
    /**
     * Inizializza connessione WebSocket per real-time updates
     */
    initWebSocketConnection() {
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}`;
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('🔌 WebSocket connesso per ModuleContextService');
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('❌ Errore parsing WebSocket message:', error);
                }
            };
            
            this.websocket.onclose = () => {
                console.log('🔌 WebSocket disconnesso, tentativo riconnessione...');
                setTimeout(() => this.initWebSocketConnection(), 5000);
            };
            
        } catch (error) {
            console.error('❌ Errore inizializzazione WebSocket:', error);
        }
    }
    
    /**
     * Gestisce messaggi WebSocket in arrivo
     */
    handleWebSocketMessage(message) {
        console.log('📨 WebSocket message ricevuto:', message);
        
        switch (message.type) {
            case 'relationChange':
                this.handleRelationChange(message.data);
                break;
            case 'attributeChange':
                this.handleAttributeChange(message.data);
                break;
            case 'schemaChange':
                this.handleSchemaChange(message.data);
                break;
        }
    }
    
    /**
     * Gestisce cambiamenti nelle relazioni
     */
    handleRelationChange(data) {
        if (data.relationType === 'MEMBER_OF' && 
            data.targetEntityId === this.currentModule?.id) {
            // Notifica listeners che i membri del modulo sono cambiati
            this.notifyListeners('membersChanged', data);
        }
    }
    
    /**
     * Gestisce cambiamenti negli attributi
     */
    handleAttributeChange(data) {
        this.notifyListeners('attributeChanged', data);
    }
    
    /**
     * Gestisce cambiamenti negli schemi
     */
    handleSchemaChange(data) {
        this.notifyListeners('schemaChanged', data);
    }
    
    /**
     * Imposta il contesto del modulo corrente
     */
    async setModuleContext(moduleId, projectId = null) {
        try {
            console.log('🎯 Impostazione contesto modulo:', { moduleId, projectId });
            
            // Carica dati modulo
            if (moduleId) {
                this.currentModule = await this.loadModuleData(moduleId);
            }
            
            // Carica dati progetto se specificato
            if (projectId) {
                this.currentProject = await this.loadProjectData(projectId);
            }
            
            this.notifyListeners('contextChanged', {
                module: this.currentModule,
                project: this.currentProject
            });
            
            return { module: this.currentModule, project: this.currentProject };
            
        } catch (error) {
            console.error('❌ Errore impostazione contesto modulo:', error);
            throw error;
        }
    }
    
    /**
     * Carica dati del modulo dal backend
     */
    async loadModuleData(moduleId) {
        try {
            // Per ora ritorniamo dati mock, da sostituire con API reale
            return {
                id: moduleId,
                instanceName: `ModuleInstance ${moduleId}`,
                moduleType: 'CrewList',
                createdAt: new Date().toISOString(),
                configuration: {
                    columns: ['Nome', 'Ruolo', 'Fee', 'Data Inizio'],
                    entityType: 'Persona'
                }
            };
        } catch (error) {
            console.error('❌ Errore caricamento dati modulo:', error);
            return null;
        }
    }
    
    /**
     * Carica dati del progetto dal backend
     */
    async loadProjectData(projectId) {
        try {
            // Per ora ritorniamo dati mock, da sostituire con API reale
            return {
                id: projectId,
                name: `Progetto ${projectId}`,
                type: 'Film',
                status: 'In Produzione'
            };
        } catch (error) {
            console.error('❌ Errore caricamento dati progetto:', error);
            return null;
        }
    }
    
    /**
     * Ottiene suggerimenti per autocomplete basati sul contesto
     */
    async getContextualSuggestions(cellType, query, column = null) {
        try {
            const suggestions = [];
            
            if (cellType === 'header') {
                // Suggerimenti per colonne/attributi
                suggestions.push('Nome', 'Ruolo', 'Fee', 'Data Inizio', 'Data Fine', 'Telefono', 'Email');
            } else if (cellType === 'content') {
                // Suggerimenti basati sulla colonna
                switch (column?.toLowerCase()) {
                    case 'ruolo':
                        suggestions.push('Director', 'Actor', 'Producer', 'Cinematographer', 'Composer', 'Editor');
                        break;
                    case 'nome':
                        // TODO: Integrare con search entità esistenti
                        suggestions.push('Christopher Nolan', 'Leonardo DiCaprio', 'Marion Cotillard');
                        break;
                    default:
                        // Suggerimenti generici
                        break;
                }
            }
            
            // Filtra suggerimenti basati sulla query
            return query ? 
                suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())) :
                suggestions.slice(0, 5);
                
        } catch (error) {
            console.error('❌ Errore recupero suggerimenti:', error);
            return [];
        }
    }
    
    /**
     * Registra un listener per eventi del contesto
     */
    addEventListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
    }
    
    /**
     * Rimuove un listener
     */
    removeEventListener(eventType, callback) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).delete(callback);
        }
    }
    
    /**
     * Notifica tutti i listeners di un evento
     */
    notifyListeners(eventType, data) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ Errore callback listener:', error);
                }
            });
        }
    }
    
    /**
     * Ottiene il contesto corrente
     */
    getCurrentContext() {
        return {
            module: this.currentModule,
            project: this.currentProject
        };
    }
    
    /**
     * Cleanup risorse
     */
    destroy() {
        if (this.websocket) {
            this.websocket.close();
        }
        this.listeners.clear();
    }
}

// Istanza singleton
export const moduleContextService = new ModuleContextService();