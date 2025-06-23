/**
 * API Layer per operazioni sulle entità
 * Wrapper "grezzo" per chiamate HTTP al backend
 */

const BASE_URL = window.location.origin;

/**
 * Recupera tutte le entità di un tipo specifico
 * @param {string} entityType - Tipo di entità
 * @param {object} options - Opzioni aggiuntive
 * @returns {Promise<Array<object>>} Lista delle entità
 */
export async function getEntities(entityType, options = {}) {
    const { limit, offset } = options;
    const params = new URLSearchParams();
    
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    
    const url = `${BASE_URL}/api/entities/${entityType}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Errore durante il recupero entità ${entityType}: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Errore nel recupero entità');
    }
    
    return result.data;
}

/**
 * Esegue una ricerca testuale sulle entità.
 * @param {string} query - Il termine di ricerca.
 * @param {object} options - Opzioni di ricerca.
 * @param {string} [options.entityType] - Filtra per un tipo di entità specifico.
 * @param {number} [options.limit=10] - Limita il numero di risultati.
 * @returns {Promise<Array<object>>} La lista delle entità trovate.
 */
export async function search(query, options = {}) {
    const params = new URLSearchParams();
    params.append('search', query);
    
    if (options.entityType) {
        params.append('entityType', options.entityType);
    }
    params.append('limit', options.limit || 10);

    const response = await fetch(`${BASE_URL}/api/entities/search?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Errore durante la ricerca per "${query}": ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Errore nella ricerca');
    }
    
    return result.data || [];
}

/**
 * Crea una nuova entità
 * @param {object} entityData - Dati dell'entità da creare
 * @returns {Promise<object>} Entità creata
 */
export async function createEntity(entityData) {
    const response = await fetch(`${BASE_URL}/api/entities`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(entityData)
    });
    
    if (!response.ok) {
        throw new Error(`Errore durante la creazione entità: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Errore nella creazione entità');
    }
    
    return result.data;
}

/**
 * Aggiorna un attributo di un'entità
 * @param {string} entityId - ID dell'entità
 * @param {string} attributeName - Nome dell'attributo
 * @param {any} value - Nuovo valore
 * @returns {Promise<object>} Risultato dell'aggiornamento
 */
export async function updateAttribute(entityId, attributeName, value) {
    const response = await fetch(`${BASE_URL}/api/entity/${entityId}/attribute`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attributeName, value })
    });
    
    if (!response.ok) {
        throw new Error(`Errore durante l'aggiornamento attributo: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Errore nell\'aggiornamento attributo');
    }
    
    return result;
}

/**
 * Recupera una singola entità per ID
 * @param {string} entityId - ID dell'entità
 * @returns {Promise<object>} Entità trovata
 */
export async function getEntity(entityId) {
    const response = await fetch(`${BASE_URL}/api/entity/${entityId}`);
    
    if (!response.ok) {
        throw new Error(`Errore durante il recupero entità ${entityId}: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Entità non trovata');
    }
    
    return result.data;
}