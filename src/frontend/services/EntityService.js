/**
 * EntityService.js - Servizio per gestire le operazioni CRUD delle entità
 * 
 * Responsabilità:
 * - Gestire le operazioni CRUD per le entità
 * - Fornire interfaccia unificata per API MVP e evolute
 * - Cache delle entità per performance
 * - Preparazione per integrazione con EntityEngine evoluto
 */

class EntityService {
    constructor() {
        this.entityCache = new Map();
        this.entitiesListCache = new Map(); // ✨ Cache per liste di entità per tipo
        this.cacheTimeout = 30000; // 30 secondi
        this.pendingRequests = new Map(); // Per evitare richieste duplicate
    }

    /**
     * Ottiene una singola entità per ID
     * @param {string} entityId - ID dell'entità
     * @param {Object} options - Opzioni (includeReferences, forceRefresh)
     * @returns {Promise<Object>} - Entità recuperata
     */
    async getEntity(entityId, options = {}) {
        try {
            const cacheKey = `entity_${entityId}`;
            
            // Controlla cache se non forzato refresh
            if (!options.forceRefresh && this.entityCache.has(cacheKey)) {
                const cached = this.entityCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(`🔄 [EntityService] Cache hit per entità ${entityId}`);
                    return cached.data;
                }
            }

            // Evita richieste duplicate
            if (this.pendingRequests.has(entityId)) {
                console.log(`⏳ [EntityService] Attesa richiesta in corso per ${entityId}`);
                return await this.pendingRequests.get(entityId);
            }

            console.log(`📥 [EntityService] Caricamento entità ${entityId}...`);

            const requestPromise = this.performGetEntity(entityId, options);
            this.pendingRequests.set(entityId, requestPromise);

            try {
                const entity = await requestPromise;
                this.cacheEntity(cacheKey, entity);
                console.log(`✅ [EntityService] Entità ${entityId} caricata`);
                return entity;
            } finally {
                this.pendingRequests.delete(entityId);
            }

        } catch (error) {
            console.error(`❌ [EntityService] Errore recupero entità ${entityId}:`, error);
            throw error;
        }
    }

    /**
     * Esegue la richiesta GET per una singola entità
     * @param {string} entityId - ID dell'entità
     * @param {Object} options - Opzioni
     * @returns {Promise<Object>} - Entità recuperata
     */
    async performGetEntity(entityId, options) {
        // Prima prova API evoluta (se disponibili opzioni avanzate)
        if (options.includeReferences !== undefined) {
            try {
                const params = new URLSearchParams();
                if (options.includeReferences) {
                    params.append('includeReferences', 'true');
                }

                const response = await fetch(`/api/entity/${entityId}?${params}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        return result.data;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ [EntityService] API evoluta fallita per ${entityId}:`, error.message);
            }
        }

        // Fallback API MVP
        const response = await fetch(`/api/entity/${entityId}`);
        
        if (!response.ok) {
            throw new Error(`Entità non trovata: ${entityId} (Status: ${response.status})`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Errore nel recupero entità');
        }

        return result.data;
    }

    /**
     * ✨ NUOVO: Esegue effettivamente la richiesta per ottenere entità per tipo
     * @param {string} entityType - Tipo di entità
     * @returns {Promise<Array>} - Lista delle entità
     */
    async performGetEntities(entityType) {
        const url = `/api/entities/${entityType}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Errore nel caricamento entità tipo ${entityType} (Status: ${response.status})`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Errore nel recupero entità');
        }

        return result.data || [];
    }

    /**
     * Ottiene tutte le entità di un tipo specifico - OTTIMIZZATO
     * @param {string} entityType - Tipo di entità
     * @param {boolean} forceRefresh - Forzare refresh della cache
     * @returns {Promise<Array>} - Lista delle entità
     */
    async getEntities(entityType, forceRefresh = false) {
        try {
            const cacheKey = `entities_${entityType}`;
            
            // ✨ Controlla cache per liste entità
            if (!forceRefresh && this.entitiesListCache.has(cacheKey)) {
                const cached = this.entitiesListCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(`🔄 [EntityService] Cache hit per entità tipo ${entityType} (${cached.data.length} entità)`);
                    return cached.data;
                }
            }

            // ✨ Evita richieste duplicate per stesso tipo
            const pendingKey = `entities_${entityType}`;
            if (this.pendingRequests.has(pendingKey)) {
                console.log(`⏳ [EntityService] Attesa richiesta in corso per tipo ${entityType}`);
                return await this.pendingRequests.get(pendingKey);
            }

            console.log(`📥 [EntityService] Caricamento entità tipo ${entityType}...`);

            const requestPromise = this.performGetEntities(entityType);
            this.pendingRequests.set(pendingKey, requestPromise);

            try {
                const entities = await requestPromise;
                // ✨ Cache il risultato
                this.entitiesListCache.set(cacheKey, {
                    data: entities,
                    timestamp: Date.now()
                });
                
                // ✨ Cache anche le singole entità
                entities.forEach(entity => {
                    this.cacheEntity(`entity_${entity.id}`, entity);
                });
                
                console.log(`✅ [EntityService] ${entities.length} entità tipo ${entityType} caricate e cachate`);
                return entities;
            } finally {
                this.pendingRequests.delete(pendingKey);
            }

        } catch (error) {
            console.error(`❌ [EntityService] Errore recupero entità tipo ${entityType}:`, error);
            throw error;
        }
    }

    /**
     * Crea una nuova entità
     * @param {string} entityType - Tipo di entità
     * @param {Object} data - Dati dell'entità
     * @returns {Promise<Object>} - Entità creata
     */
    async createEntity(entityType, data) {
        try {
            console.log(`📝 [EntityService] Creazione entità tipo ${entityType}...`);
            console.log(`🔍 [EntityService] DEBUG: Dati ricevuti:`, data);

            const requestBody = {
                entityType: entityType,
                ...data
            };
            
            console.log(`🔍 [EntityService] DEBUG: Request body completo:`, requestBody);
            console.log(`🔍 [EntityService] DEBUG: Request body stringificato:`, JSON.stringify(requestBody));

            const response = await fetch('/api/entities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log(`🔍 [EntityService] DEBUG: Response status:`, response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`🔍 [EntityService] DEBUG: Error response:`, errorText);
                throw new Error(`Errore nella creazione entità (Status: ${response.status})`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Errore nella creazione entità');
            }

            const newEntity = result.data;
            
            // Cache la nuova entità
            if (newEntity.id) {
                const cacheKey = `entity_${newEntity.id}`;
                this.cacheEntity(cacheKey, newEntity);
            }

            console.log(`✅ [EntityService] Entità creata con ID: ${newEntity.id}`);
            return newEntity;

        } catch (error) {
            console.error(`❌ [EntityService] Errore creazione entità tipo ${entityType}:`, error);
            throw error;
        }
    }

    /**
     * Aggiorna un attributo di un'entità
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @param {*} value - Nuovo valore
     * @returns {Promise<Object>} - Risultato dell'aggiornamento
     */
    async updateEntityAttribute(entityId, attributeName, value) {
        try {
            console.log(`📝 [EntityService] Aggiornamento ${attributeName} per entità ${entityId}...`);

            const response = await fetch(`/api/entity/${entityId}/attribute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attributeName: attributeName,
                    value: value
                })
            });

            if (!response.ok) {
                throw new Error(`Errore nell'aggiornamento attributo (Status: ${response.status})`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Errore nell\'aggiornamento attributo');
            }

            // Invalida cache per l'entità
            this.invalidateEntityCache(entityId);

            console.log(`✅ [EntityService] Attributo ${attributeName} aggiornato per ${entityId}`);
            return result;

        } catch (error) {
            console.error(`❌ [EntityService] Errore aggiornamento attributo ${attributeName}:`, error);
            throw error;
        }
    }

    /**
     * Elimina un'entità
     * @param {string} entityId - ID dell'entità da eliminare
     * @returns {Promise<Object>} - Risultato dell'eliminazione
     */
    async deleteEntity(entityId) {
        try {
            console.log(`🗑️ [EntityService] Eliminazione entità ${entityId}...`);

            const response = await fetch(`/api/entity/${entityId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Errore nell'eliminazione entità (Status: ${response.status})`);
            }

            const result = await response.json();
            
            // Rimuovi da cache
            this.invalidateEntityCache(entityId);

            console.log(`✅ [EntityService] Entità ${entityId} eliminata`);
            return result;

        } catch (error) {
            console.error(`❌ [EntityService] Errore eliminazione entità ${entityId}:`, error);
            throw error;
        }
    }

    /**
     * Risolve i reference di un'entità (API evoluta)
     * @param {string} entityId - ID dell'entità
     * @param {Array} attributeNames - Nomi degli attributi reference da risolvere
     * @returns {Promise<Object>} - Reference risolte
     */
    async resolveEntityReferences(entityId, attributeNames = []) {
        try {
            console.log(`🔗 [EntityService] Risoluzione reference per entità ${entityId}...`);

            const params = new URLSearchParams();
            if (attributeNames.length > 0) {
                params.append('attributes', attributeNames.join(','));
            }

            const response = await fetch(`/api/entity/${entityId}/references?${params}`);
            
            if (!response.ok) {
                throw new Error(`Errore nella risoluzione reference (Status: ${response.status})`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Errore nella risoluzione reference');
            }

            console.log(`✅ [EntityService] Reference risolte per ${entityId}`);
            return result.data;

        } catch (error) {
            console.error(`❌ [EntityService] Errore risoluzione reference per ${entityId}:`, error);
            throw error;
        }
    }

    /**
     * Cache un'entità
     * @param {string} cacheKey - Chiave cache
     * @param {Object} entity - Entità da cachare
     */
    cacheEntity(cacheKey, entity) {
        this.entityCache.set(cacheKey, {
            data: entity,
            timestamp: Date.now()
        });
    }

    /**
     * Invalida la cache per una singola entità
     * @param {string} entityId - ID dell'entità
     */
    invalidateEntityCache(entityId) {
        const cacheKey = `entity_${entityId}`;
        this.entityCache.delete(cacheKey);
        console.log(`🧹 [EntityService] Cache invalidata per entità ${entityId}`);
    }

    /**
     * Pulisce la cache per un tipo specifico
     */
    clearTypeCache(entityType) {
        const cacheKey = `entities_${entityType}`;
        this.entitiesListCache.delete(cacheKey);
        console.log(`🗑️ [EntityService] Cache pulita per tipo ${entityType}`);
    }

    /**
     * Pulisce tutta la cache
     */
    clearAllCache() {
        this.entityCache.clear();
        this.entitiesListCache.clear();
        this.pendingRequests.clear();
        console.log('🗑️ [EntityService] Tutta la cache pulita');
    }

    /**
     * Ottiene statistiche del servizio
     * @returns {Object} - Statistiche del servizio
     */
    getStats() {
        return {
            cacheSize: this.entityCache.size,
            pendingRequests: this.pendingRequests.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Istanza singleton globale
window.EntityService = new EntityService();

console.log('✅ [EntityService] Servizio registrato globalmente'); 