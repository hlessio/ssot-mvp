import { api } from '../api/index.js';

/**
 * Servizio centralizzato per la ricerca di entità e la gestione dei risultati.
 * Fornisce caching, formattazione standardizzata e logiche aggiuntive
 * come l'opzione "Crea Nuovo".
 */

// Cache in-memory per le query per migliorare le performance della UI
const queryCache = new Map();
const CACHE_TIMEOUT = 3 * 60 * 1000; // 3 minuti

/**
 * Formatta un'entità grezza in un oggetto suggerimento standard.
 * @param {object} entity - L'entità dall'API.
 * @returns {object} L'oggetto suggerimento.
 */
function formatEntityToSuggestion(entity) {
    // Logica per trovare il miglior campo da visualizzare come etichetta
    const label = entity.nome || entity.name || entity.title || entity.titolo || 
                 entity.ragioneSociale || entity.companyName || entity.email || 
                 `ID: ${entity.id}`;
    
    return {
        type: 'entity',
        id: entity.id,
        label: label,
        context: entity.entityType || 'Entità', // Utile per la UI per mostrare il tipo
        data: entity, // L'oggetto entità completo per usi futuri
    };
}

/**
 * Crea un oggetto suggerimento per l'azione "Crea Nuovo".
 * @param {string} query - La query dell'utente.
 * @param {string} entityType - Il tipo di entità da creare.
 * @returns {object} L'oggetto suggerimento per l'azione.
 */
function createNewSuggestion(query, entityType) {
    return {
        type: 'action',
        id: `_create_new_${entityType.toLowerCase()}`,
        label: `Crea nuovo "${entityType}": ${query}`,
        action: 'create',
        entityType: entityType,
        initialValue: query
    };
}

/**
 * Funzione di ricerca principale del servizio.
 * @param {string} query - Il termine di ricerca.
 * @param {object} options - Opzioni di ricerca.
 * @param {string} [options.entityType] - Il tipo di entità da cercare.
 * @param {boolean} [options.allowCreate=false] - Se includere l'opzione "Crea Nuovo".
 * @param {number} [options.limit=10] - Limite dei risultati.
 * @returns {Promise<Array<object>>} Una lista di oggetti suggerimento standardizzati.
 */
async function search(query, options = {}) {
    if (!query || query.trim().length < 2) {
        return []; // Non cercare per query troppo brevi
    }

    const cacheKey = `${query}|${JSON.stringify(options)}`;
    
    // Controlla cache
    if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TIMEOUT) {
            console.log(`📦 SearchService cache hit: ${query}`);
            return cached.data;
        } else {
            // Rimuovi entry scaduta
            queryCache.delete(cacheKey);
        }
    }

    try {
        console.log(`🔍 SearchService: cercando "${query}" per tipo ${options.entityType || 'tutti'}`);
        
        const rawEntities = await api.entity.search(query, options);
        const suggestions = rawEntities.map(formatEntityToSuggestion);

        // Aggiungi l'opzione "Crea Nuovo" se abilitata e se non ci sono risultati perfetti
        if (options.allowCreate && options.entityType) {
            const exactMatch = suggestions.some(suggestion => 
                suggestion.label.toLowerCase() === query.toLowerCase()
            );
            
            if (!exactMatch) {
                suggestions.push(createNewSuggestion(query, options.entityType));
            }
        }

        // Salva il risultato formattato nella cache
        queryCache.set(cacheKey, {
            data: suggestions,
            timestamp: Date.now()
        });
        
        console.log(`✅ SearchService: trovati ${suggestions.length} risultati per "${query}"`);
        return suggestions;
        
    } catch (error) {
        console.error("❌ Errore nel SearchService:", error);
        // Restituisce un errore come un suggerimento, così la UI può mostrarlo
        return [{
            type: 'error',
            id: '_error',
            label: `Errore di ricerca: ${error.message}`
        }];
    }
}

/**
 * Crea una nuova entità utilizzando l'API
 * @param {string} entityType - Tipo di entità da creare
 * @param {string} suggestedName - Nome suggerito dall'utente
 * @returns {Promise<object>} Entità creata formattata come suggerimento
 */
async function createEntity(entityType, suggestedName) {
    try {
        console.log(`➕ SearchService: creando nuovo ${entityType} con nome "${suggestedName}"`);
        
        // Prepara i dati base per la creazione
        const entityData = prepareEntityDataFromName(entityType, suggestedName);
        entityData.entityType = entityType;
        
        const newEntity = await api.entity.createEntity(entityData);
        
        // Invalida la cache per future ricerche
        invalidateCache();
        
        console.log(`✅ SearchService: entità creata con ID ${newEntity.id}`);
        return formatEntityToSuggestion(newEntity);
        
    } catch (error) {
        console.error("❌ Errore nella creazione entità:", error);
        throw error;
    }
}

/**
 * Prepara i dati di base per la creazione di un'entità basandosi sul nome suggerito
 * @param {string} entityType - Tipo di entità
 * @param {string} suggestedName - Nome suggerito
 * @returns {object} Dati base per creazione entità
 */
function prepareEntityDataFromName(entityType, suggestedName) {
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
            delete baseData.nome; // Usa ragioneSociale invece di nome
            break;
            
        case 'project':
        case 'progetto':
            baseData.title = suggestedName;
            baseData.titolo = suggestedName;
            break;
            
        default:
            // Tipo generico, usa nome
            break;
    }

    return baseData;
}

// Pulisce la cache. Utile da chiamare dopo aver creato una nuova entità.
function invalidateCache() {
    queryCache.clear();
    console.log("🧹 SearchService: cache invalidata");
}

/**
 * Pulisce la cache per un tipo di entità specifico
 * @param {string} entityType - Tipo di entità
 */
function invalidateCacheForEntityType(entityType) {
    const keysToDelete = [];
    for (const key of queryCache.keys()) {
        if (key.includes(`"entityType":"${entityType}"`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => queryCache.delete(key));
    console.log(`🧹 SearchService: cache pulita per entity type: ${entityType}`);
}

/**
 * Ottiene statistiche della cache
 * @returns {object} Statistiche cache
 */
function getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    queryCache.forEach((entry) => {
        if (now - entry.timestamp < CACHE_TIMEOUT) {
            validEntries++;
        } else {
            expiredEntries++;
        }
    });

    return {
        totalEntries: queryCache.size,
        validEntries,
        expiredEntries,
        cacheTimeout: CACHE_TIMEOUT
    };
}

export const SearchService = {
    search,
    createEntity,
    invalidateCache,
    invalidateCacheForEntityType,
    getCacheStats,
    
    // Utility functions esposte per compatibilità
    formatEntityToSuggestion,
    prepareEntityDataFromName
};

export default SearchService;