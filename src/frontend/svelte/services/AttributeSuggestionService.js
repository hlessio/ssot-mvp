/**
 * AttributeSuggestionService.js - Servizio Svelte per Suggerimenti Attributi
 * 
 * Implementa il servizio frontend per l'autocomplete degli attributi nel modulo tabellare dinamico.
 * Interfaccia con l'endpoint backend /api/attribute-suggestions per recuperare:
 * - Attributi intrinseci (da SchemaManager)  
 * - Attributi relazionali (da ModuleRelationService)
 * - Suggerimenti comuni intelligenti
 */

class AttributeSuggestionService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.cache = new Map(); // Cache per evitare chiamate ripetute
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti cache timeout
        
        console.log('🔍 AttributeSuggestionService inizializzato');
    }

    /**
     * Recupera suggerimenti attributi per autocomplete
     * @param {string} entityType - Tipo di entità (es. 'Persona', 'Contact')
     * @param {string} moduleId - ID del ModuleInstance (opzionale, per attributi relazionali)
     * @param {string} query - Testo di ricerca per filtrare attributi
     * @returns {Promise<Array>} Array di suggestion objects
     */
    async getAttributeSuggestions(entityType, moduleId = null, query = '') {
        try {
            // Crea chiave cache
            const cacheKey = `${entityType}:${moduleId}:${query.toLowerCase()}`;
            
            // Controlla cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(`📦 Cache hit per attribute suggestions: ${cacheKey}`);
                    return cached.data;
                }
            }

            // Costruisci URL con parametri query
            const params = new URLSearchParams({
                entityType: entityType
            });
            
            if (moduleId) {
                params.append('moduleId', moduleId);
            }
            
            if (query) {
                params.append('query', query);
            }

            const url = `${this.baseUrl}/api/attribute-suggestions?${params.toString()}`;
            console.log(`🔍 Fetching attribute suggestions: ${url}`);

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
                throw new Error(result.error || 'Errore nel recupero suggerimenti attributi');
            }

            const suggestions = result.data || [];
            
            // Cache del risultato
            this.cache.set(cacheKey, {
                data: suggestions,
                timestamp: Date.now()
            });

            console.log(`✅ Attribute suggestions recuperati: ${suggestions.length} per ${entityType}${moduleId ? ` (modulo ${moduleId})` : ''}`);
            
            return suggestions;

        } catch (error) {
            console.error('❌ Errore AttributeSuggestionService.getAttributeSuggestions:', error);
            throw error;
        }
    }

    /**
     * Funzione di convenienza per creare searchFunction per SmartInput
     * @param {string} entityType - Tipo di entità
     * @param {string} moduleId - ID del modulo (opzionale)
     * @returns {Function} searchFunction pronta per SmartInput
     */
    createAttributeSearchFunction(entityType, moduleId = null) {
        return async (query) => {
            try {
                const suggestions = await this.getAttributeSuggestions(entityType, moduleId, query);
                return suggestions;
            } catch (error) {
                console.error('❌ Errore in attribute search function:', error);
                return [];
            }
        };
    }

    /**
     * Label function per formattare display degli attributi
     * @param {Object} suggestion - Oggetto suggestion dall'API
     * @returns {string} Label formattato per display
     */
    static formatAttributeLabel(suggestion) {
        if (typeof suggestion === 'string') {
            return suggestion;
        }

        const name = suggestion.name || suggestion.label || suggestion.toString();
        const sourceLabel = suggestion.source === 'intrinsic' ? 'Intrinseco' : 'Relazionale';
        const typeLabel = suggestion.type ? ` (${suggestion.type})` : '';
        
        return `${name}${typeLabel} - ${sourceLabel}`;
    }

    /**
     * Value function per estrarre il valore dall'oggetto suggestion
     * @param {Object} suggestion - Oggetto suggestion dall'API
     * @returns {string} Valore da inserire nell'input
     */
    static extractAttributeValue(suggestion) {
        if (typeof suggestion === 'string') {
            return suggestion;
        }

        return suggestion.name || suggestion.value || suggestion.label || suggestion.toString();
    }

    /**
     * Funzione per determinare se mostrare opzione "Crea nuovo attributo"
     * @param {string} query - Testo di ricerca
     * @param {Array} suggestions - Array di suggerimenti attuali
     * @returns {boolean} True se mostrare opzione create
     */
    static shouldAllowCreateAttribute(query, suggestions) {
        if (!query || query.length < 2) return false;
        
        // Non permettere creazione se esiste già un attributo con questo nome
        const existingMatch = suggestions.some(s => 
            (s.name || s).toLowerCase() === query.toLowerCase()
        );
        
        return !existingMatch;
    }

    /**
     * Label per opzione "Crea nuovo attributo"
     * @param {string} query - Testo di ricerca
     * @returns {string} Label per opzione create
     */
    static getCreateAttributeLabel(query) {
        return `➕ Definisci nuovo attributo "${query}"`;
    }

    /**
     * Filtra suggerimenti per tipo di source
     * @param {Array} suggestions - Array di suggerimenti
     * @param {string} sourceType - 'intrinsic' | 'relational' | 'all'
     * @returns {Array} Suggerimenti filtrati
     */
    static filterBySource(suggestions, sourceType = 'all') {
        if (sourceType === 'all') return suggestions;
        
        return suggestions.filter(s => s.source === sourceType);
    }

    /**
     * Raggruppa suggerimenti per source type
     * @param {Array} suggestions - Array di suggerimenti
     * @returns {Object} Oggetto con chiavi 'intrinsic' e 'relational'
     */
    static groupBySource(suggestions) {
        const grouped = {
            intrinsic: [],
            relational: []
        };

        suggestions.forEach(suggestion => {
            const source = suggestion.source || 'intrinsic';
            if (grouped[source]) {
                grouped[source].push(suggestion);
            }
        });

        return grouped;
    }

    /**
     * Pulisce la cache (utile per testing o refresh forzato)
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache AttributeSuggestionService pulita');
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
export default AttributeSuggestionService;

// Per compatibilità con window global
if (typeof window !== 'undefined') {
    window.AttributeSuggestionService = AttributeSuggestionService;
}