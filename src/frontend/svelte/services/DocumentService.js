/**
 * DocumentService Frontend - SSOT-4000 Fase 2
 * 
 * Client-side service per gestione CompositeDocument con caching,
 * error handling e integrazione WebSocket per real-time updates.
 */

class DocumentService {
    constructor() {
        this.baseUrl = '/api/documents';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        this.listeners = new Set();
        
        // WebSocket connection per real-time updates
        this.ws = null;
        this.wsReconnectAttempts = 0;
        this.wsMaxReconnectAttempts = 5;
        this.wsReconnectDelay = 1000;
        
        this.initWebSocket();
        
        console.log('📄 DocumentService frontend inizializzato');
    }
    
    /**
     * Inizializza connessione WebSocket per real-time updates
     */
    initWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('📡 WebSocket connesso per DocumentService');
                this.wsReconnectAttempts = 0;
                
                // Subscribe agli eventi CompositeDocument
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    pattern: {
                        entityType: 'CompositeDocument'
                    }
                }));
                
                // Subscribe agli eventi CONTAINS_MODULE
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    pattern: {
                        relationType: 'CONTAINS_MODULE'
                    }
                }));
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Errore parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('📡 WebSocket disconnesso');
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('Errore WebSocket:', error);
            };
            
        } catch (error) {
            console.error('Errore inizializzazione WebSocket:', error);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Schedula riconnessione WebSocket
     */
    scheduleReconnect() {
        if (this.wsReconnectAttempts < this.wsMaxReconnectAttempts) {
            this.wsReconnectAttempts++;
            const delay = this.wsReconnectDelay * Math.pow(2, this.wsReconnectAttempts - 1);
            
            console.log(`📡 Riconnessione WebSocket in ${delay}ms (tentativo ${this.wsReconnectAttempts})`);
            
            setTimeout(() => {
                this.initWebSocket();
            }, delay);
        }
    }
    
    /**
     * Gestisce messaggi WebSocket
     */
    handleWebSocketMessage(data) {
        if (data.type === 'change') {
            // Invalida cache per documento modificato
            if (data.entityType === 'CompositeDocument') {
                this.invalidateCache(data.entityId);
            }
            
            // Notifica listeners
            this.notifyListeners(data);
        }
    }
    
    /**
     * Aggiunge listener per eventi real-time
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    /**
     * Notifica tutti i listeners
     */
    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Errore notifica listener:', error);
            }
        });
    }
    
    /**
     * Effettua richiesta HTTP con error handling
     */
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : data;
            
        } catch (error) {
            console.error(`Errore richiesta ${url}:`, error);
            throw error;
        }
    }
    
    /**
     * Gestione cache con TTL
     */
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    setCached(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    invalidateCache(documentId = null) {
        if (documentId) {
            this.cache.delete(`document:${documentId}`);
            this.cache.delete('documents:list');
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * Recupera lista documenti
     */
    async getDocuments() {
        const cacheKey = 'documents:list';
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        const documents = await this.makeRequest(this.baseUrl);
        this.setCached(cacheKey, documents);
        return documents;
    }
    
    /**
     * Recupera singolo documento con moduli
     */
    async getDocument(documentId) {
        const cacheKey = `document:${documentId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        const document = await this.makeRequest(`${this.baseUrl}/${documentId}`);
        this.setCached(cacheKey, document);
        return document;
    }
    
    /**
     * Crea nuovo documento
     */
    async createDocument(documentData) {
        const document = await this.makeRequest(this.baseUrl, {
            method: 'POST',
            body: JSON.stringify(documentData)
        });
        
        // Invalida cache lista
        this.invalidateCache();
        
        return document;
    }
    
    /**
     * Aggiorna documento
     */
    async updateDocument(documentId, updates) {
        const document = await this.makeRequest(`${this.baseUrl}/${documentId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        // Invalida cache documento
        this.invalidateCache(documentId);
        
        return document;
    }
    
    /**
     * Elimina documento
     */
    async deleteDocument(documentId) {
        await this.makeRequest(`${this.baseUrl}/${documentId}`, {
            method: 'DELETE'
        });
        
        // Invalida cache
        this.invalidateCache(documentId);
        
        return true;
    }
    
    /**
     * Gestisce moduli del documento
     */
    async updateDocumentModules(documentId, action, moduleId, layoutConfig = {}) {
        const result = await this.makeRequest(`${this.baseUrl}/${documentId}/modules`, {
            method: 'PUT',
            body: JSON.stringify({
                action,
                moduleId,
                layoutConfig
            })
        });
        
        // Invalida cache documento
        this.invalidateCache(documentId);
        
        return result;
    }
    
    /**
     * Aggiunge modulo al documento
     */
    async addModule(documentId, moduleType, position = {}, config = {}) {
        const moduleId = `${moduleType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const layoutConfig = {
            position: { x: position.x || 0, y: position.y || 0 },
            size: { w: position.w || 4, h: position.h || 3 },
            type: moduleType,
            config: config
        };
        
        return await this.updateDocumentModules(documentId, 'add', moduleId, layoutConfig);
    }
    
    /**
     * Rimuove modulo dal documento
     */
    async removeModule(documentId, moduleId) {
        return await this.updateDocumentModules(documentId, 'remove', moduleId);
    }
    
    /**
     * Aggiorna layout modulo
     */
    async updateModuleLayout(documentId, moduleId, layoutConfig) {
        return await this.updateDocumentModules(documentId, 'update', moduleId, layoutConfig);
    }
    
    /**
     * Salva layout documento
     */
    async saveDocumentLayout(documentId, layout) {
        return await this.updateDocument(documentId, { layout });
    }
    
    /**
     * Cleanup - chiude connessioni
     */
    cleanup() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.cache.clear();
        this.listeners.clear();
    }
}

// Istanza singleton
export const documentService = new DocumentService();

// Export per utilizzo con stores
export default documentService;

// Cleanup automatico al unload della pagina
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        documentService.cleanup();
    });
}