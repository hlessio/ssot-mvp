/**
 * ModuleDefinitionService.js - Servizio per gestire le definizioni dei template dei moduli
 * 
 * Responsabilità:
 * - Caricare e gestire le definizioni dei template dei moduli da file JSON
 * - Fornire API per accedere alle definizioni dei moduli
 * - Cache delle definizioni per performance
 * 
 * Fase 1: Caricamento da file JSON locali in frontend/definitions/
 * Futuro: Possibile integrazione con backend per template persistiti
 */

class ModuleDefinitionService {
    constructor() {
        this.definitionsCache = new Map();
        this.availableDefinitions = [];
        this.isInitialized = false;
    }

    /**
     * Inizializza il servizio caricando la lista delle definizioni disponibili
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🔧 [ModuleDefinitionService] Inizializzazione...');
            
            // Per ora, definiamo staticamente le definizioni disponibili
            // In futuro potrebbe essere un endpoint /api/module-definitions
            this.availableDefinitions = [
                'StandardContactCard',
                'SimpleContactCard', 
                'CompactContactCard',
                'TaskRowItem'
            ];

            this.isInitialized = true;
            console.log('✅ [ModuleDefinitionService] Inizializzato con successo');
        } catch (error) {
            console.error('❌ [ModuleDefinitionService] Errore inizializzazione:', error);
            throw error;
        }
    }

    /**
     * Carica una definizione di modulo per ID
     * @param {string} moduleId - ID del modulo da caricare
     * @returns {Promise<Object>} - Definizione del modulo
     */
    async getDefinition(moduleId) {
        try {
            // Controlla cache
            if (this.definitionsCache.has(moduleId)) {
                console.log(`🔄 [ModuleDefinitionService] Cache hit per ${moduleId}`);
                return this.definitionsCache.get(moduleId);
            }

            console.log(`📥 [ModuleDefinitionService] Caricamento definizione: ${moduleId}`);

            // Carica da file JSON
            const response = await fetch(`/definitions/${moduleId}.json`);
            
            if (!response.ok) {
                throw new Error(`Definition file not found: ${moduleId}.json (Status: ${response.status})`);
            }

            const definition = await response.json();
            
            // Validazione base della definizione
            this.validateDefinition(definition);
            
            // Cache la definizione
            this.definitionsCache.set(moduleId, definition);
            
            console.log(`✅ [ModuleDefinitionService] Definizione ${moduleId} caricata`);
            return definition;

        } catch (error) {
            console.error(`❌ [ModuleDefinitionService] Errore caricamento ${moduleId}:`, error);
            throw error;
        }
    }

    /**
     * Restituisce la lista delle definizioni disponibili
     * @returns {Promise<Array>} - Array degli ID delle definizioni disponibili
     */
    async listDefinitions() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return [...this.availableDefinitions];
    }

    /**
     * Valida una definizione di modulo
     * @param {Object} definition - Definizione da validare
     */
    validateDefinition(definition) {
        const required = ['moduleId', 'moduleVersion', 'targetEntityType', 'description', 'defaultView'];
        
        for (const field of required) {
            if (!definition[field]) {
                throw new Error(`Missing required field in module definition: ${field}`);
            }
        }

        if (!definition.defaultView.renderer) {
            throw new Error('defaultView must specify a renderer');
        }

        console.log(`✅ [ModuleDefinitionService] Definizione validata: ${definition.moduleId}`);
    }

    /**
     * Ottiene le definizioni per un tipo di entità specifico
     * @param {string} entityType - Tipo di entità target
     * @returns {Promise<Array>} - Array delle definizioni compatibili
     */
    async getDefinitionsForEntityType(entityType) {
        const allDefinitions = [];
        
        for (const moduleId of this.availableDefinitions) {
            try {
                const definition = await this.getDefinition(moduleId);
                
                // Controlla se il modulo è compatibile con il tipo di entità
                if (this.isCompatibleWithEntityType(definition, entityType)) {
                    allDefinitions.push(definition);
                }
            } catch (error) {
                console.warn(`⚠️ [ModuleDefinitionService] Impossibile caricare ${moduleId}:`, error.message);
            }
        }

        return allDefinitions;
    }

    /**
     * Controlla se una definizione è compatibile con un tipo di entità
     * @param {Object} definition - Definizione del modulo
     * @param {string} entityType - Tipo di entità
     * @returns {boolean} - True se compatibile
     */
    isCompatibleWithEntityType(definition, entityType) {
        const targetTypes = Array.isArray(definition.targetEntityType) 
            ? definition.targetEntityType 
            : [definition.targetEntityType];
            
        return targetTypes.includes(entityType) || targetTypes.includes('*');
    }

    /**
     * Pulisce la cache delle definizioni
     */
    clearCache() {
        this.definitionsCache.clear();
        console.log('🧹 [ModuleDefinitionService] Cache pulita');
    }

    /**
     * Ottiene statistiche del servizio
     * @returns {Object} - Statistiche del servizio
     */
    getStats() {
        return {
            cacheSize: this.definitionsCache.size,
            availableDefinitions: this.availableDefinitions.length,
            isInitialized: this.isInitialized
        };
    }
}

// Esporta istanza singleton
window.moduleDefinitionService = new ModuleDefinitionService();

export default window.moduleDefinitionService; 