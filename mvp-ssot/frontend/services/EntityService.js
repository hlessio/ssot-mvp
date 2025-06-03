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
     * Ottiene una lista di entità per tipo
     * @param {string} entityType - Tipo di entità
     * @param {Object} queryParams - Parametri di query (limit, offset, filter)
     * @returns {Promise<Array>} - Array delle entità
     */
    async getEntities(entityType, queryParams = {}) {
        try {
            console.log(`📥 [EntityService] Caricamento entità tipo ${entityType}...`);

            const params = new URLSearchParams();
            
            // Aggiungi parametri di query
            Object.keys(queryParams).forEach(key => {
                if (queryParams[key] !== undefined && queryParams[key] !== null) {
                    params.append(key, queryParams[key]);
                }
            });

            const url = `/api/entities/${entityType}${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Errore nel caricamento entità tipo ${entityType} (Status: ${response.status})`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Errore nel recupero entità');
            }

            const entities = result.data || [];
            console.log(`✅ [EntityService] Caricate ${entities.length} entità tipo ${entityType}`);
            
            // Cache ogni entità individualmente
            entities.forEach(entity => {
                if (entity.id) {
                    const cacheKey = `entity_${entity.id}`;
                    this.cacheEntity(cacheKey, entity);
                }
            });

            return entities;

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

            const requestBody = {
                entityType: entityType,
                ...data
            };

            const response = await fetch('/api/entities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
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
            
            if (!result.success) {
                throw new Error(result.error || 'Errore nell\'eliminazione entità');
            }

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
     * Pulisce tutta la cache
     */
    clearCache() {
        this.entityCache.clear();
        this.pendingRequests.clear();
        console.log('🧹 [EntityService] Cache completamente pulita');
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

// Esporta istanza singleton
window.entityService = new EntityService();

console.log('✅ [EntityService] Servizio registrato globalmente'); 