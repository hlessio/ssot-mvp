/**
 * RelationService - Servizio per gestire le relazioni nel sistema SSOT
 * Fase 3: Relazioni, Sub-moduli e Riutilizzo Avanzato
 * 
 * Interagisce con il RelationEngine del backend per:
 * - CRUD relazioni tipizzate
 * - Recupero entità correlate
 * - Gestione schemi di relazione
 * - Statistiche e monitoring
 */
class RelationService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.cache = new Map(); // Cache per relazioni frequenti
        this.cacheTimeout = 30000; // 30 secondi
        this.pendingRequests = new Map(); // Deduplicazione richieste
        
        // Callback per eventi WebSocket relazioni
        this.relationEventCallbacks = new Set();
        
        console.log('🔗 RelationService inizializzato');
    }

    /**
     * Inizializza il servizio con WebSocket per eventi real-time
     * @param {WebSocketService} webSocketService - Servizio WebSocket
     */
    initialize(webSocketService) {
        this.webSocketService = webSocketService;
        
        // Sottoscrizione eventi relazioni
        this.webSocketService.subscribe('relation-created', (data) => {
            this.handleRelationEvent('created', data);
        });
        
        this.webSocketService.subscribe('relation-updated', (data) => {
            this.handleRelationEvent('updated', data);
        });
        
        this.webSocketService.subscribe('relation-deleted', (data) => {
            this.handleRelationEvent('deleted', data);
        });
        
        console.log('✅ RelationService integrato con WebSocket');
    }

    /**
     * Crea una nuova relazione tipizzata
     * @param {string} relationType - Tipo di relazione
     * @param {string} sourceEntityId - ID entità sorgente
     * @param {string} targetEntityId - ID entità target
     * @param {object} attributes - Attributi della relazione
     * @returns {Promise<object>} La relazione creata
     */
    async createRelation(relationType, sourceEntityId, targetEntityId, attributes = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/relations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    relationType,
                    sourceEntityId,
                    targetEntityId,
                    attributes
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Errore creazione relazione`);
            }

            const result = await response.json();
            
            // Invalida cache per entità coinvolte
            this.invalidateCacheForEntity(sourceEntityId);
            this.invalidateCacheForEntity(targetEntityId);
            
            console.log(`✅ Relazione ${relationType} creata:`, result.data);
            return result.data;

        } catch (error) {
            console.error('❌ Errore createRelation:', error);
            throw error;
        }
    }

    /**
     * Trova relazioni basate su pattern di ricerca
     * @param {object} pattern - Pattern di ricerca
     * @param {boolean} useCache - Se utilizzare la cache (default: true)
     * @returns {Promise<Array>} Array delle relazioni trovate
     */
    async findRelations(pattern = {}, useCache = true) {
        const cacheKey = `relations:${JSON.stringify(pattern)}`;
        
        // Controlla cache se richiesto
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 RelationService: Returning cached relations for pattern');
                return cached.data;
            }
        }

        // Deduplicazione richieste parallele
        if (this.pendingRequests.has(cacheKey)) {
            console.log('⏳ RelationService: Waiting for pending request');
            return this.pendingRequests.get(cacheKey);
        }

        try {
            const queryParams = new URLSearchParams();
            Object.keys(pattern).forEach(key => {
                if (pattern[key] !== null && pattern[key] !== undefined) {
                    queryParams.append(key, pattern[key]);
                }
            });

            const requestPromise = fetch(`${this.baseUrl}/api/relations?${queryParams.toString()}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: Errore ricerca relazioni`);
                    }
                    return response.json();
                })
                .then(result => {
                    console.log(`✅ Trovate ${result.data.length} relazioni per pattern:`, pattern);
                    return result.data;
                });

            this.pendingRequests.set(cacheKey, requestPromise);

            const relations = await requestPromise;

            // Salva in cache
            if (useCache) {
                this.cache.set(cacheKey, {
                    data: relations,
                    timestamp: Date.now()
                });
            }

            this.pendingRequests.delete(cacheKey);
            return relations;

        } catch (error) {
            this.pendingRequests.delete(cacheKey);
            console.error('❌ Errore findRelations:', error);
            throw error;
        }
    }

    /**
     * Recupera tutte le entità correlate a una specifica entità
     * @param {string} entityId - ID dell'entità
     * @param {string} relationType - Tipo di relazione (opzionale)
     * @param {string} direction - Direzione ('out', 'in', 'both')
     * @param {boolean} useCache - Se utilizzare la cache
     * @returns {Promise<Array>} Array delle entità correlate
     */
    async getRelatedEntities(entityId, relationType = null, direction = 'both', useCache = true) {
        const cacheKey = `related:${entityId}:${relationType || 'all'}:${direction}`;
        
        // Controlla cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 RelationService: Returning cached related entities');
                return cached.data;
            }
        }

        try {
            const queryParams = new URLSearchParams({ direction });
            if (relationType) {
                queryParams.append('relationType', relationType);
            }

            const response = await fetch(`${this.baseUrl}/api/entities/${entityId}/relations?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Errore recupero entità correlate`);
            }

            const result = await response.json();
            
            // Salva in cache
            if (useCache) {
                this.cache.set(cacheKey, {
                    data: result.data,
                    timestamp: Date.now()
                });
            }

            console.log(`✅ Trovate ${result.data.length} entità correlate per ${entityId}`);
            return result.data;

        } catch (error) {
            console.error('❌ Errore getRelatedEntities:', error);
            throw error;
        }
    }

    /**
     * Recupera una relazione specifica per ID
     * @param {string} relationId - ID della relazione
     * @returns {Promise<object>} La relazione
     */
    async getRelation(relationId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/relations/${relationId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Relazione non trovata: ${relationId}`);
                }
                throw new Error(`HTTP ${response.status}: Errore recupero relazione`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('❌ Errore getRelation:', error);
            throw error;
        }
    }

    /**
     * Aggiorna gli attributi di una relazione
     * @param {string} relationId - ID della relazione
     * @param {object} attributes - Nuovi attributi
     * @returns {Promise<object>} La relazione aggiornata
     */
    async updateRelationAttributes(relationId, attributes) {
        try {
            const response = await fetch(`${this.baseUrl}/api/relations/${relationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ attributes })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Errore aggiornamento relazione`);
            }

            const result = await response.json();
            
            // Invalida cache correlate
            this.invalidateRelationCache(relationId);
            
            console.log(`✅ Relazione ${relationId} aggiornata`);
            return result.data;

        } catch (error) {
            console.error('❌ Errore updateRelationAttributes:', error);
            throw error;
        }
    }

    /**
     * Elimina una relazione
     * @param {string} relationId - ID della relazione da eliminare
     * @returns {Promise<boolean>} True se eliminata con successo
     */
    async deleteRelation(relationId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/relations/${relationId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Errore eliminazione relazione`);
            }

            // Invalida cache correlate
            this.invalidateRelationCache(relationId);
            
            console.log(`✅ Relazione ${relationId} eliminata`);
            return true;

        } catch (error) {
            console.error('❌ Errore deleteRelation:', error);
            throw error;
        }
    }

    /**
     * Recupera statistiche sulle relazioni
     * @returns {Promise<object>} Statistiche delle relazioni
     */
    async getRelationStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/relations/stats`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Errore recupero statistiche relazioni`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('❌ Errore getRelationStats:', error);
            throw error;
        }
    }

    /**
     * Registra callback per eventi relazioni WebSocket
     * @param {Function} callback - Callback da chiamare (eventType, data)
     */
    onRelationEvent(callback) {
        this.relationEventCallbacks.add(callback);
    }

    /**
     * Rimuove callback per eventi relazioni
     * @param {Function} callback - Callback da rimuovere
     */
    offRelationEvent(callback) {
        this.relationEventCallbacks.delete(callback);
    }

    /**
     * Gestisce eventi WebSocket delle relazioni
     * @private
     */
    handleRelationEvent(eventType, data) {
        console.log(`🔄 RelationService: ${eventType} event`, data);
        
        // Invalida cache appropriata
        if (eventType === 'created' && data.data) {
            this.invalidateCacheForEntity(data.data.sourceEntityId);
            this.invalidateCacheForEntity(data.data.targetEntityId);
        } else if (eventType === 'updated' && data.data) {
            this.invalidateRelationCache(data.data.relationId || data.data.id);
        } else if (eventType === 'deleted' && data.data) {
            this.invalidateRelationCache(data.data.relationId);
        }
        
        // Notifica tutti i callback registrati
        this.relationEventCallbacks.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (error) {
                console.error('❌ Errore callback RelationService:', error);
            }
        });
    }

    /**
     * Invalida cache per una specifica entità
     * @private
     */
    invalidateCacheForEntity(entityId) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(`related:${entityId}`) || key.includes(`"${entityId}"`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cache invalidata per entità ${entityId}: ${keysToDelete.length} entries`);
    }

    /**
     * Invalida cache per una specifica relazione
     * @private
     */
    invalidateRelationCache(relationId) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(relationId)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cache invalidata per relazione ${relationId}: ${keysToDelete.length} entries`);
    }

    /**
     * Pulisce la cache (utile per testing o reset)
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache RelationService pulita');
    }

    /**
     * Restituisce informazioni sulla cache (per debugging)
     * @returns {object} Informazioni sulla cache
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            pendingRequests: this.pendingRequests.size
        };
    }
}

// Istanza singleton globale
window.RelationService = window.RelationService || new RelationService(); 