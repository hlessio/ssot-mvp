/**
 * SchemaService.js - Servizio per gestire informazioni sugli schemi delle entità
 * 
 * Responsabilità:
 * - Interagire con il backend per recuperare informazioni sugli schemi
 * - Fornire fallback tra API evolute e MVP
 * - Cache delle informazioni schema per performance
 * - Preparazione per integrazione completa con SchemaManager evoluto
 */

class SchemaService {
    constructor() {
        this.schemaCache = new Map();
        this.attributeCache = new Map();
        this.cacheTimeout = 30000; // 30 secondi
    }

    /**
     * Ottiene gli attributi per un tipo di entità
     * @param {string} entityType - Tipo di entità
     * @returns {Promise<Array>} - Array dei nomi degli attributi
     */
    async getAttributes(entityType) {
        try {
            const cacheKey = `attributes_${entityType}`;
            
            // Controlla cache
            if (this.attributeCache.has(cacheKey)) {
                const cached = this.attributeCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(`🔄 [SchemaService] Cache hit per attributi ${entityType}`);
                    return cached.data;
                }
            }

            console.log(`📥 [SchemaService] Caricamento attributi per ${entityType}...`);

            // Prima prova API evolute
            try {
                const response = await fetch(`/api/schema/entity/${entityType}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data && result.data.attributes) {
                        const attributes = result.data.attributes.map(attr => attr.name);
                        this.cacheAttributes(cacheKey, attributes);
                        console.log(`✅ [SchemaService] Attributi ${entityType} da API evoluta:`, attributes);
                        return attributes;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ [SchemaService] API evoluta fallita per ${entityType}:`, error.message);
            }

            // Fallback API MVP
            try {
                const fallbackResponse = await fetch(`/api/schema/${entityType}/attributes`);
                if (fallbackResponse.ok) {
                    const attributes = await fallbackResponse.json();
                    this.cacheAttributes(cacheKey, attributes);
                    console.log(`✅ [SchemaService] Attributi ${entityType} da API MVP:`, attributes);
                    return attributes;
                }
            } catch (error) {
                console.warn(`⚠️ [SchemaService] API MVP fallita per ${entityType}:`, error.message);
            }

            // Se tutto fallisce, restituisci attributi di default
            const defaultAttributes = ['id', 'nome', 'email'];
            console.log(`🔄 [SchemaService] Usando attributi default per ${entityType}:`, defaultAttributes);
            return defaultAttributes;

        } catch (error) {
            console.error(`❌ [SchemaService] Errore recupero attributi ${entityType}:`, error);
            throw error;
        }
    }

    /**
     * Ottiene lo schema completo per un tipo di entità (API evoluta)
     * @param {string} entityType - Tipo di entità
     * @returns {Promise<Object>} - Schema completo dell'entità
     */
    async getEntitySchema(entityType) {
        try {
            const cacheKey = `schema_${entityType}`;
            
            // Controlla cache
            if (this.schemaCache.has(cacheKey)) {
                const cached = this.schemaCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(`🔄 [SchemaService] Cache hit per schema ${entityType}`);
                    return cached.data;
                }
            }

            console.log(`📥 [SchemaService] Caricamento schema completo per ${entityType}...`);

            const response = await fetch(`/api/schema/entity/${entityType}`);
            
            if (!response.ok) {
                throw new Error(`Schema non trovato per ${entityType} (Status: ${response.status})`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Errore nel recupero schema');
            }

            const schema = result.data;
            this.cacheSchema(cacheKey, schema);
            
            console.log(`✅ [SchemaService] Schema ${entityType} caricato:`, schema);
            return schema;

        } catch (error) {
            console.error(`❌ [SchemaService] Errore recupero schema ${entityType}:`, error);
            throw error;
        }
    }

    /**
     * Ottiene informazioni dettagliate su un attributo specifico
     * @param {string} entityType - Tipo di entità
     * @param {string} attributeName - Nome dell'attributo
     * @returns {Promise<Object>} - Informazioni dettagliate dell'attributo
     */
    async getAttributeInfo(entityType, attributeName) {
        try {
            const schema = await this.getEntitySchema(entityType);
            
            if (schema.attributes && schema.attributes.length > 0) {
                const attributeInfo = schema.attributes.find(attr => attr.name === attributeName);
                if (attributeInfo) {
                    console.log(`✅ [SchemaService] Info attributo ${attributeName}:`, attributeInfo);
                    return attributeInfo;
                }
            }

            // Fallback: restituisci informazioni di base
            const basicInfo = {
                name: attributeName,
                type: 'string',
                required: false,
                description: `Attributo ${attributeName}`
            };
            
            console.log(`🔄 [SchemaService] Info attributo base per ${attributeName}:`, basicInfo);
            return basicInfo;

        } catch (error) {
            console.error(`❌ [SchemaService] Errore recupero info attributo ${attributeName}:`, error);
            throw error;
        }
    }

    /**
     * Ottiene la lista di tutti i tipi di entità disponibili
     * @returns {Promise<Array>} - Array dei tipi di entità
     */
    async getAvailableEntityTypes() {
        try {
            console.log('📥 [SchemaService] Caricamento tipi entità disponibili...');

            // Prima prova API evoluta
            try {
                const response = await fetch('/api/schema/entities');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        const entityTypes = result.data.map(schema => schema.entityType);
                        console.log(`✅ [SchemaService] Tipi entità da API evoluta:`, entityTypes);
                        return entityTypes;
                    }
                }
            } catch (error) {
                console.warn('⚠️ [SchemaService] API evoluta fallita per tipi entità:', error.message);
            }

            // Fallback: tipi di entità hardcoded
            const defaultTypes = ['Contact', 'Contatto', 'Cliente', 'Persona', 'TestEvoluzione'];
            console.log(`🔄 [SchemaService] Usando tipi entità default:`, defaultTypes);
            return defaultTypes;

        } catch (error) {
            console.error('❌ [SchemaService] Errore recupero tipi entità:', error);
            throw error;
        }
    }

    /**
     * Valida un valore contro lo schema di un attributo
     * @param {string} entityType - Tipo di entità
     * @param {string} attributeName - Nome dell'attributo
     * @param {*} value - Valore da validare
     * @returns {Promise<Object>} - Risultato validazione {isValid, errors}
     */
    async validateAttributeValue(entityType, attributeName, value) {
        try {
            const attributeInfo = await this.getAttributeInfo(entityType, attributeName);
            const errors = [];

            // Validazione required
            if (attributeInfo.required && (!value || value.toString().trim() === '')) {
                errors.push(`${attributeName} è richiesto`);
            }

            // Validazione tipo
            if (value && value.toString().trim() !== '') {
                switch (attributeInfo.type) {
                    case 'email':
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                            errors.push(`${attributeName} deve essere un email valido`);
                        }
                        break;
                    case 'number':
                        if (isNaN(Number(value))) {
                            errors.push(`${attributeName} deve essere un numero`);
                        }
                        break;
                    case 'date':
                        if (!Date.parse(value)) {
                            errors.push(`${attributeName} deve essere una data valida`);
                        }
                        break;
                }
            }

            const isValid = errors.length === 0;
            return { isValid, errors };

        } catch (error) {
            console.error(`❌ [SchemaService] Errore validazione ${attributeName}:`, error);
            return { isValid: false, errors: ['Errore nella validazione'] };
        }
    }

    /**
     * Cache degli attributi
     * @param {string} cacheKey - Chiave cache
     * @param {Array} attributes - Attributi da cachare
     */
    cacheAttributes(cacheKey, attributes) {
        this.attributeCache.set(cacheKey, {
            data: attributes,
            timestamp: Date.now()
        });
    }

    /**
     * Cache dello schema
     * @param {string} cacheKey - Chiave cache
     * @param {Object} schema - Schema da cachare
     */
    cacheSchema(cacheKey, schema) {
        this.schemaCache.set(cacheKey, {
            data: schema,
            timestamp: Date.now()
        });
    }

    /**
     * Pulisce tutte le cache
     */
    clearCache() {
        this.schemaCache.clear();
        this.attributeCache.clear();
        console.log('🧹 [SchemaService] Cache pulite');
    }

    /**
     * Ottiene statistiche del servizio
     * @returns {Object} - Statistiche del servizio
     */
    getStats() {
        return {
            schemaCacheSize: this.schemaCache.size,
            attributeCacheSize: this.attributeCache.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Esporta istanza singleton
window.schemaService = new SchemaService();

export default window.schemaService; 