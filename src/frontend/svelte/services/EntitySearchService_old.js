/**
 * EntitySearchService.js - Servizio Svelte per Ricerca Entità
 * 
 * Implementa il servizio frontend per l'autocomplete delle entità nel modulo tabellare dinamico.
 * Interfaccia con gli endpoint esistenti per la ricerca e creazione di entità.
 */

class EntitySearchService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.cache = new Map(); // Cache per evitare chiamate ripetute
        this.cacheTimeout = 3 * 60 * 1000; // 3 minuti cache timeout
        
        console.log('👥 EntitySearchService inizializzato');
    }

    /**
     * Cerca entità per tipo e query text
     * @param {string} entityType - Tipo di entità (es. 'Persona', 'Contact')
     * @param {string} query - Testo di ricerca
     * @param {Object} options - Opzioni aggiuntive (limit, offset)
     * @returns {Promise<Array>} Array di entità trovate
     */
    async searchEntities(entityType, query = '', options = {}) {
        try {
            const { limit = 10, offset = 0 } = options;
            
            // Crea chiave cache
            const cacheKey = `search:${entityType}:${query.toLowerCase()}:${limit}:${offset}`;
            
            // Controlla cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(`📦 Cache hit per entity search: ${cacheKey}`);
                    return cached.data;
                }
            }

            // Usa endpoint evoluto se disponibile, altrimenti fallback MVP
            let url = `${this.baseUrl}/api/evolved/entities/${entityType}`;
            
            // Se c'è una query, prova prima l'endpoint evoluto
            if (query) {
                // Per ora utilizziamo l'endpoint esistente e filtriamo client-side
                // In futuro si potrebbe aggiungere un endpoint /api/entities/search dedicato
            }

            console.log(`👥 Searching entities: ${entityType} con query "${query}"`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Errore nel recupero entità');
            }

            let entities = result.data || [];
            
            // Filtro client-side per query (temporaneo, da ottimizzare)
            if (query && query.length > 0) {
                const queryLower = query.toLowerCase();
                entities = entities.filter(entity => {
                    const searchFields = [
                        entity.nome, entity.name, entity.cognome, entity.surname,
                        entity.ragioneSociale, entity.companyName,
                        entity.email, entity.telefono, entity.phone
                    ].filter(Boolean);
                    
                    return searchFields.some(field => 
                        field && field.toString().toLowerCase().includes(queryLower)
                    );
                });
            }

            // Applica limit
            entities = entities.slice(offset, offset + limit);
            
            // Cache del risultato
            this.cache.set(cacheKey, {
                data: entities,
                timestamp: Date.now()
            });

            console.log(`✅ Entity search completata: ${entities.length} risultati per ${entityType}`);
            
            return entities;

        } catch (error) {
            console.error('❌ Errore EntitySearchService.searchEntities:', error);
            throw error;
        }
    }

    /**
     * Crea una nuova entità
     * @param {string} entityType - Tipo di entità da creare
     * @param {Object} entityData - Dati iniziali dell'entità
     * @returns {Promise<Object>} Entità creata
     */
    async createEntity(entityType, entityData) {
        try {
            console.log(`➕ Creando nuova entità ${entityType}:`, entityData);

            const response = await fetch(`${this.baseUrl}/api/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entityType: entityType,
                    initialData: entityData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Errore nella creazione entità');
            }

            const newEntity = result.data;
            
            // Invalida cache per future ricerche
            this.clearCacheForEntityType(entityType);

            console.log(`✅ Entità creata: ${newEntity.id} (${entityType})`);
            
            return newEntity;

        } catch (error) {
            console.error('❌ Errore EntitySearchService.createEntity:', error);
            throw error;
        }
    }

    /**
     * Funzione di convenienza per creare searchFunction per SmartInput
     * @param {string} entityType - Tipo di entità
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Function} searchFunction pronta per SmartInput
     */
    createEntitySearchFunction(entityType, options = {}) {
        return async (query) => {
            try {
                const entities = await this.searchEntities(entityType, query, options);
                return entities;
            } catch (error) {
                console.error('❌ Errore in entity search function:', error);
                return [];
            }
        };
    }

    /**
     * Label function per formattare display delle entità
     * @param {Object} entity - Oggetto entità
     * @returns {string} Label formattato per display
     */
    static formatEntityLabel(entity) {
        if (typeof entity === 'string') {
            return entity;
        }

        // Priorità: nome completo, ragione sociale, email, ID
        if (entity.nome && entity.cognome) {
            return `${entity.nome} ${entity.cognome}`;
        }
        
        if (entity.name && entity.surname) {
            return `${entity.name} ${entity.surname}`;
        }
        
        if (entity.ragioneSociale) {
            return entity.ragioneSociale;
        }
        
        if (entity.companyName) {
            return entity.companyName;
        }
        
        if (entity.nome || entity.name) {
            return entity.nome || entity.name;
        }
        
        if (entity.email) {
            return entity.email;
        }
        
        return entity.id || 'Entità senza nome';
    }

    /**
     * Funzione per estrarre nome per value dell'input
     * @param {Object} entity - Oggetto entità
     * @returns {string} Nome da inserire nell'input
     */
    static extractEntityDisplayName(entity) {
        return this.formatEntityLabel(entity);
    }

    /**
     * Funzione per determinare se mostrare opzione "Crea nuovo"
     * @param {string} query - Testo di ricerca
     * @param {Array} entities - Array di entità attuali
     * @returns {boolean} True se mostrare opzione create
     */
    static shouldAllowCreateEntity(query, entities) {
        if (!query || query.length < 2) return false;
        
        // Permetti creazione se non c'è match esatto
        const exactMatch = entities.some(entity => 
            this.formatEntityLabel(entity).toLowerCase() === query.toLowerCase()
        );
        
        return !exactMatch;
    }

    /**
     * Label per opzione "Crea nuovo"
     * @param {string} query - Testo di ricerca  
     * @param {string} entityType - Tipo di entità
     * @returns {string} Label per opzione create
     */
    static getCreateEntityLabel(query, entityType = 'Entità') {
        return `➕ Crea nuovo ${entityType}: "${query}"`;
    }

    /**
     * Funzione di helper per gestire creazione entità da nome
     * @param {string} entityType - Tipo di entità
     * @param {string} suggestedName - Nome suggerito
     * @returns {Object} Dati base per creazione entità
     */
    static prepareEntityDataFromName(entityType, suggestedName) {
        const baseData = {
            nome: suggestedName
        };

        // Logica specifica per tipo
        switch (entityType.toLowerCase()) {
            case 'persona':
            case 'person':
                // Se contiene spazio, dividi in nome e cognome
                if (suggestedName.includes(' ')) {
                    const parts = suggestedName.split(' ');
                    baseData.nome = parts[0];
                    baseData.cognome = parts.slice(1).join(' ');
                }
                break;
                
            case 'contact':
                baseData.name = suggestedName;
                break;
                
            case 'company':
            case 'azienda':
                baseData.ragioneSociale = suggestedName;
                break;
                
            default:
                // Tipo generico, usa nome
                break;
        }

        return baseData;
    }

    /**
     * Pulisce cache per un tipo di entità specifico
     * @param {string} entityType - Tipo di entità
     */
    clearCacheForEntityType(entityType) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(`:${entityType}:`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🧹 Cache pulita per entity type: ${entityType}`);
    }

    /**
     * Pulisce tutta la cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache EntitySearchService pulita');
    }

    /**
     * Recupera statistiche della cache
     * @returns {Object} Statistiche cache
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        this.cache.forEach((entry) => {
            if (now - entry.timestamp < this.cacheTimeout) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        });

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Export per utilizzo in Svelte e vanilla JS
export default EntitySearchService;

// Per compatibilità con window global
if (typeof window !== 'undefined') {
    window.EntitySearchService = EntitySearchService;
}