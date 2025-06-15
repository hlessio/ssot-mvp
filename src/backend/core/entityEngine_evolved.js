const { v4: uuidv4 } = require('uuid');

/**
 * EntityEngine Evoluto - Gestione avanzata delle entità con schema integration
 * Implementa la Fase 3 del piano di evoluzione core engine
 */
class EntityEngine {
    constructor(dao, schemaManager, relationEngine, attributeSpace = null) {
        this.dao = dao;
        this.schemaManager = schemaManager;
        this.relationEngine = relationEngine;
        this.attributeSpace = attributeSpace;
        
        // Cache per performance optimization
        this.entityCache = new Map(); // entityId -> Entity
        this.schemaCache = new Map(); // entityType -> EntitySchema
        this.referenceCache = new Map(); // entityId -> Map<attributeName, referencedEntity>
        
        // Configuration
        this.enableCache = true;
        this.enableLazyLoading = true;
        this.enableValidation = true;
        
        // ROBUSTEZZA: Track delle definizioni schema originali per fallback
        this.originalSchemaDefinitions = new Map();
        
        console.log('🚀 EntityEngine Evoluto inizializzato');
    }

    /**
     * Registra una definizione schema originale per uso fallback
     * @param {string} entityType - Tipo dell'entità
     * @param {object} schemaDefinition - Definizione schema originale
     */
    registerOriginalSchemaDefinition(entityType, schemaDefinition) {
        this.originalSchemaDefinitions.set(entityType, schemaDefinition);
        console.log(`📝 Registrata definizione schema originale per ${entityType}`);
    }

    /**
     * Crea una nuova entità
     * @param {string} entityType - Tipo dell'entità
     * @param {object} data - Dati dell'entità
     * @param {object} options - Opzioni aggiuntive
     * @returns {Promise<object>} L'entità creata
     */
    async createEntity(entityType, data, options = {}) {
        try {
            console.log(`🔧 Creazione entità tipo ${entityType}`, data);
            
            // 1. Ottieni o crea schema
            const schema = await this.getOrCreateSchema(entityType, data);
            
            // 2. Applica valori di default (passa anche l'entityType per recuperare schema originale)
            const dataWithDefaults = this.applySchemaDefaults(schema, data, this.originalSchemaDefinitions.get(entityType));
            
            // 3. Validazione (opzionale basata su schema mode)
            if (schema.mode === 'strict') {
                const validationResult = this.validateEntity(entityType, dataWithDefaults);
                if (!validationResult.isValid) {
                    throw new Error(`Validazione entità fallita: ${validationResult.errors.join(', ')}`);
                }
            } else {
                // Modalità flessibile: solo avvertimenti
                const validationResult = this.validateEntity(entityType, dataWithDefaults);
                if (validationResult.warnings && validationResult.warnings.length > 0) {
                    console.warn('⚠️ Avvertimenti validazione:', validationResult.warnings.join(', '));
                }
            }
            
            // 4. Crea entità nel DAO
            const entity = await this.dao.createEntity(entityType, dataWithDefaults);
            
            // 5. Cache entità
            this.entityCache.set(entity.id, entity);
            
            // 6. Gestisci attributi reference (se presenti)
            const referenceAttributes = this.extractReferenceAttributes(schema, dataWithDefaults);
            if (Object.keys(referenceAttributes).length > 0) {
                await this.createReferenceRelations(entity.id, entityType, referenceAttributes);
                console.log(`🔗 Creata relazione ${Object.keys(referenceAttributes).join(', ')}: ${entity.id} -> ${Object.values(referenceAttributes).join(', ')}`);
            }
            
            // 7. Notifica AttributeSpace
            if (this.attributeSpace) {
                // AttributeSpace_MVP ha solo notifyChange, non notifyEntityCreated
                this.attributeSpace.notifyChange({
                    entityId: entity.id,
                    entityType: entityType,
                    operation: 'create',
                    newValue: entity
                });
            }
            
            console.log(`✅ Entità creata: ${entity.id} (tipo: ${entityType})`);
            return entity;
            
        } catch (error) {
            console.error('❌ Errore createEntity:', error.message);
            throw error;
        }
    }
    
    /**
     * Recupera un'entità per ID con lazy loading opzionale
     * @param {string} entityId - ID dell'entità
     * @param {object} options - Opzioni di recupero
     * @param {boolean} options.includeReferences - Include attributi reference risolti
     * @param {string[]} options.referenceAttributes - Specifici attributi reference da caricare
     * @returns {Promise<object|null>} L'entità o null se non trovata
     */
    async getEntity(entityId, options = {}) {
        try {
            // 1. Controlla cache prima
            if (this.enableCache && this.entityCache.has(entityId)) {
                const cachedEntity = this.entityCache.get(entityId);
                return await this.enrichEntityWithReferences(cachedEntity, options);
            }
            
            // 2. Carica dal database
            const entity = await this.dao.getEntityById(entityId);
            if (!entity) {
                return null;
            }
            
            // 3. Aggiorna cache
            if (this.enableCache) {
                this.entityCache.set(entityId, entity);
            }
            
            // 4. Arricchisci con reference se richiesto
            return await this.enrichEntityWithReferences(entity, options);
            
        } catch (error) {
            console.error(`❌ Errore recupero entità ${entityId}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Aggiorna un attributo di un'entità con validazione schema
     * @param {string} entityId - ID dell'entità
     * @param {string} attributeName - Nome dell'attributo
     * @param {any} value - Nuovo valore
     * @param {object} options - Opzioni di aggiornamento
     * @returns {Promise<void>}
     */
    async setEntityAttribute(entityId, attributeName, value, options = {}) {
        try {
            console.log(`🔧 Aggiornamento attributo ${attributeName} per entità ${entityId}`);
            
            // 1. Carica l'entità per ottenere il tipo
            const entity = await this.getEntity(entityId);
            if (!entity) {
                throw new Error(`Entità non trovata: ${entityId}`);
            }
            
            // 2. Ottieni schema e valida
            const schema = await this.getOrCreateSchema(entity.entityType);
            if (this.enableValidation && schema) {
                const validation = schema.validateAttribute(attributeName, value);
                if (!validation.valid && schema.mode === 'strict') {
                    throw new Error(`Validazione attributo fallita: ${validation.error}`);
                }
            }
            
            // 3. Determina se è un attributo reference
            const isReference = await this.isReferenceAttribute(entity.entityType, attributeName);
            
            if (isReference) {
                // 4a. Gestisci come relazione
                await this.updateReferenceAttribute(entityId, attributeName, value);
            } else {
                // 4b. Aggiorna attributo normale
                await this.dao.updateEntityAttribute(entityId, attributeName, value);
                
                // Invalida cache
                if (this.enableCache) {
                    this.entityCache.delete(entityId);
                }
            }
            
            // 5. Notifica AttributeSpace
            if (this.attributeSpace) {
                console.log('🔔🔔🔔 NOTIFYING ATTRIBUTESPACE:', {
                    entityId,
                    attributeName,
                    newValue: value,
                    oldValue: entity[attributeName],
                    entityType: entity.entityType
                });
                this.attributeSpace.notifyChange({
                    entityId,
                    entityType: entity.entityType,
                    attributeName,
                    newValue: value,
                    oldValue: entity[attributeName]
                });
            } else {
                console.log('❌ NO ATTRIBUTESPACE available for notification!');
            }
            
            console.log(`✅ Attributo ${attributeName} aggiornato per entità ${entityId}`);
            
        } catch (error) {
            console.error(`❌ Errore aggiornamento attributo:`, error.message);
            throw error;
        }
    }
    
    /**
     * Elimina un'entità dal sistema
     * @param {string} entityId - ID dell'entità da eliminare
     * @returns {Promise<boolean>} True se l'entità è stata eliminata
     */
    async deleteEntity(entityId) {
        try {
            console.log(`🗑️ Eliminazione entità: ${entityId}`);
            
            // 1. Verifica che l'entità esista
            const entity = await this.dao.getEntityById(entityId);
            if (!entity) {
                console.log(`ℹ️ Entità ${entityId} non trovata`);
                return false;
            }
            
            // 2. Elimina dal database
            const result = await this.dao.deleteEntity(entityId);
            
            // 3. Rimuovi dalla cache
            this.entityCache.delete(entityId);
            
            // 4. Rimuovi dalle cache reference
            for (const [key, value] of this.referenceCache.entries()) {
                if (key.startsWith(`${entityId}:`)) {
                    this.referenceCache.delete(key);
                }
            }
            
            // 5. Notifica AttributeSpace
            if (this.attributeSpace) {
                this.attributeSpace.notifyChange({
                    entityId,
                    entityType: entity.entityType,
                    operation: 'delete',
                    oldValue: entity
                });
            }
            
            console.log(`✅ Entità ${entityId} eliminata`);
            return result;
            
        } catch (error) {
            console.error(`❌ Errore eliminazione entità:`, error.message);
            throw error;
        }
    }
    
    /**
     * Recupera tutte le entità di un tipo con schema discovery
     * @param {string} entityType - Tipo dell'entità
     * @param {object} options - Opzioni di recupero
     * @returns {Promise<object[]>} Array di entità
     */
    async getAllEntities(entityType, options = {}) {
        try {
            console.log(`🔍 Recupero tutte le entità di tipo: ${entityType}`);
            
            // 1. Carica entità dal database (passa opzioni per fix LIMIT)
            const entities = await this.dao.getAllEntities(entityType, options);
            
            // 2. Aggiorna schema con discovery se in modalità flessibile
            const schema = this.schemaManager.getEntitySchema(entityType);
            if (!schema || schema.mode === 'flexible') {
                await this.updateSchemaFromEntities(entityType, entities);
            }
            
            // 3. Aggiorna cache se abilitata
            if (this.enableCache) {
                entities.forEach(entity => {
                    this.entityCache.set(entity.id, entity);
                });
            }
            
            // 4. Arricchisci con reference se richiesto
            if (options.includeReferences) {
                const enrichedEntities = await Promise.all(
                    entities.map(entity => this.enrichEntityWithReferences(entity, options))
                );
                return enrichedEntities;
            }
            
            console.log(`✅ Recuperate ${entities.length} entità di tipo ${entityType}`);
            return entities;
            
        } catch (error) {
            console.error(`❌ Errore recupero entità tipo ${entityType}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Risolve gli attributi reference di un'entità caricando le entità correlate
     * @param {string} entityId - ID dell'entità
     * @param {string[]} attributeNames - Nomi degli attributi reference da risolvere
     * @returns {Promise<object>} Mappa attributeName -> entità referenziata
     */
    async resolveEntityReferences(entityId, attributeNames = []) {
        try {
            console.log(`🔗 Risoluzione reference per entità ${entityId}:`, attributeNames);
            
            const resolvedReferences = {};
            
            // Ottieni il tipo di entità per recuperare lo schema
            const entity = await this.getEntity(entityId);
            const schema = this.schemaManager.getEntitySchema(entity.entityType);
            
            for (const attributeName of attributeNames) {
                // 1. Controlla cache reference
                const cacheKey = `${entityId}:${attributeName}`;
                if (this.referenceCache.has(cacheKey)) {
                    resolvedReferences[attributeName] = this.referenceCache.get(cacheKey);
                    continue;
                }
                
                // 2. Ottieni il tipo di relazione dallo schema
                const attributeDef = schema?.attributes?.get(attributeName);
                const relationType = attributeDef?.relationTypeForReference || `reference_${attributeName}`;
                
                // 3. Trova relazioni per questo attributo reference
                const relations = await this.relationEngine.findRelations({
                    sourceEntityId: entityId,
                    relationType: relationType
                });
                
                if (relations.length > 0) {
                    // Assumiamo una relazione 1:1 per attributi reference semplici
                    const relation = relations[0];
                    const referencedEntity = relation.targetEntity;
                    
                    resolvedReferences[attributeName] = referencedEntity;
                    
                    // 4. Aggiorna cache reference
                    this.referenceCache.set(cacheKey, referencedEntity);
                }
            }
            
            console.log(`✅ Reference risolte: ${Object.keys(resolvedReferences).length}`);
            return resolvedReferences;
            
        } catch (error) {
            console.error(`❌ Errore risoluzione reference:`, error.message);
            throw error;
        }
    }
    
    /**
     * Ottiene o crea uno schema per un tipo di entità
     * @param {string} entityType - Tipo dell'entità
     * @param {object} sampleData - Dati di esempio per schema discovery
     * @returns {Promise<object|null>} Lo schema dell'entità
     */
    async getOrCreateSchema(entityType, sampleData = {}) {
        try {
            // 1. Prova a caricare schema esistente (sempre dal database, non dalla cache)
            let schema = this.schemaManager.getEntitySchema(entityType);
            
            // Invalida cache schema per assicurarsi di usare l'ultima versione
            this.schemaCache.delete(entityType);
            
            // 3. Se non esiste, crea uno schema di base in modalità flessibile
            if (!schema && Object.keys(sampleData).length > 0) {
                console.log(`🔧 Creazione schema automatico per tipo ${entityType}`);
                
                const schemaDefinition = {
                    mode: 'flexible', // Default a flessibile per nuovi tipi
                    attributes: {}
                };
                
                // Inferisci attributi dai dati di esempio
                Object.entries(sampleData).forEach(([key, value]) => {
                    if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(key)) {
                        schemaDefinition.attributes[key] = {
                            type: this.inferAttributeType(value),
                            required: false,
                            description: `Auto-discovered attribute: ${key}`
                        };
                    }
                });
                
                schema = await this.schemaManager.defineEntitySchema(entityType, schemaDefinition);
            }
            
            // 4. Aggiorna cache con schema fresco
            if (schema) {
                this.schemaCache.set(entityType, schema);
                console.log(`🔄 Schema aggiornato in cache per ${entityType}`);
            }
            
            return schema;
            
        } catch (error) {
            console.error(`❌ Errore gestione schema per ${entityType}:`, error.message);
            // In caso di errore, ritorna null per continuare senza schema
            return null;
        }
    }
    
    // === METODI DI SUPPORTO ===
    
    /**
     * Valida i dati di un'entità contro il suo schema
     */
    validateEntityData(schema, data) {
        const errors = [];
        const warnings = [];
        
        // Valida ogni attributo presente nei dati
        Object.entries(data).forEach(([attributeName, value]) => {
            const validation = schema.validateAttribute(attributeName, value);
            if (!validation.valid) {
                errors.push(`${attributeName}: ${validation.error}`);
            }
            if (validation.warning) {
                warnings.push(`${attributeName}: ${validation.warning}`);
            }
        });
        
        // Controlla attributi required mancanti
        if (schema.attributes) {
            for (const [attributeName, attributeDef] of schema.attributes) {
                if (attributeDef.required && !(attributeName in data)) {
                    errors.push(`Attributo required mancante: ${attributeName}`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            error: errors.join(', '),
            warnings: warnings.length > 0 ? warnings.join(', ') : null
        };
    }
    
    /**
     * Applica valori di default dallo schema
     */
    applySchemaDefaults(schema, data, originalSchemaDefinition = null) {
        if (!schema || !schema.attributes) {
            console.log('🔍 applySchemaDefaults: schema o attributi mancanti');
            return data;
        }
        
        const enrichedData = { ...data };
        let defaultsApplied = 0;
        
        // Prima applica defaults degli attributi nello schema persistito
        for (const [attributeName, attributeDef] of schema.attributes) {
            // Applica default se l'attributo non è presente nei dati E ha un valore di default definito
            if (!(attributeName in enrichedData) && attributeDef.defaultValue !== undefined && attributeDef.defaultValue !== null) {
                enrichedData[attributeName] = attributeDef.defaultValue;
                defaultsApplied++;
                console.log(`🔧 Applicato default: ${attributeName} = ${attributeDef.defaultValue}`);
            }
        }
        
        // ROBUSTEZZA: Se abbiamo schema definition originale, applica anche quei defaults
        // (per gestire casi dove salvataggio parziale ha fallito)
        if (originalSchemaDefinition && originalSchemaDefinition.attributes) {
            const originalAttrs = originalSchemaDefinition.attributes;
            for (const [attrName, attrDef] of Object.entries(originalAttrs)) {
                if (!(attrName in enrichedData) && 
                    attrDef.defaultValue !== undefined && 
                    attrDef.defaultValue !== null) {
                    
                    enrichedData[attrName] = attrDef.defaultValue;
                    defaultsApplied++;
                    console.log(`🔧 Applicato default (fallback): ${attrName} = ${attrDef.defaultValue}`);
                }
            }
        }
        
        console.log(`✅ Applicati ${defaultsApplied} valori di default`);
        return enrichedData;
    }
    
    /**
     * Separa attributi normali da attributi reference
     */
    async separateAttributeTypes(entityType, data) {
        const normalAttributes = {};
        const referenceAttributes = {};
        
        for (const [key, value] of Object.entries(data)) {
            const isReference = await this.isReferenceAttribute(entityType, key);
            if (isReference) {
                referenceAttributes[key] = value;
            } else {
                normalAttributes[key] = value;
            }
        }
        
        return { normalAttributes, referenceAttributes };
    }
    
    /**
     * Determina se un attributo è di tipo reference
     */
    async isReferenceAttribute(entityType, attributeName) {
        const schema = this.schemaManager.getEntitySchema(entityType);
        if (!schema || !schema.attributes) return false;
        
        const attributeDef = schema.attributes.get(attributeName);
        return attributeDef && attributeDef.type === 'reference';
    }
    
    /**
     * Estrae attributi reference dai dati di un'entità
     * @param {object} schema - Schema dell'entità
     * @param {object} data - Dati dell'entità
     * @returns {object} Attributi reference estratti
     */
    extractReferenceAttributes(schema, data) {
        const referenceAttributes = {};
        
        if (!schema || !schema.attributes) {
            return referenceAttributes;
        }
        
        for (const [attrName, attrDef] of schema.attributes) {
            if (attrDef.type === 'reference' && data[attrName]) {
                referenceAttributes[attrName] = data[attrName];
            }
        }
        
        return referenceAttributes;
    }
    
    /**
     * Crea relazioni per attributi reference
     */
    async createReferenceRelations(entityId, entityType, referenceAttributes) {
        for (const [attributeName, referencedEntityId] of Object.entries(referenceAttributes)) {
            if (referencedEntityId) {
                // Ottieni il tipo di relazione dallo schema
                const schema = this.schemaManager.getEntitySchema(entityType);
                const attributeDef = schema?.attributes?.get(attributeName);
                const relationType = attributeDef?.relationTypeForReference || `reference_${attributeName}`;
                
                await this.relationEngine.createRelation(
                    relationType,
                    entityId,
                    referencedEntityId,
                    {} // Attributi relazione vuoti per ora
                );
                
                console.log(`🔗 Creata relazione ${relationType}: ${entityId} -> ${referencedEntityId}`);
            }
        }
    }
    
    /**
     * Aggiorna un attributo reference tramite relazioni
     */
    async updateReferenceAttribute(entityId, attributeName, newReferencedEntityId) {
        // Ottieni il tipo di relazione dallo schema
        const entity = await this.getEntity(entityId);
        const schema = this.schemaManager.getEntitySchema(entity.entityType);
        const attributeDef = schema?.attributes?.get(attributeName);
        const relationType = attributeDef?.relationTypeForReference || `reference_${attributeName}`;
        
        // 1. Elimina relazione esistente se presente
        const existingRelations = await this.relationEngine.findRelations({
            sourceEntityId: entityId,
            relationType: relationType
        });
        
        for (const relation of existingRelations) {
            await this.relationEngine.deleteRelation(relation.id);
        }
        
        // 2. Crea nuova relazione se il valore non è null
        if (newReferencedEntityId) {
            await this.relationEngine.createRelation(
                relationType,
                entityId,
                newReferencedEntityId,
                { attributeName, createdVia: 'reference_attribute' }
            );
        }
        
        // 3. Invalida cache reference
        const cacheKey = `${entityId}:${attributeName}`;
        this.referenceCache.delete(cacheKey);
    }
    
    /**
     * Arricchisce un'entità con attributi reference risolti
     */
    async enrichEntityWithReferences(entity, options = {}) {
        if (!options.includeReferences) {
            return entity;
        }
        
        const enrichedEntity = { ...entity };
        
        // Determina quali attributi reference caricare
        let referenceAttributes = options.referenceAttributes || [];
        if (referenceAttributes.length === 0) {
            // Carica tutti gli attributi reference definiti nello schema
            const schema = this.schemaManager.getEntitySchema(entity.entityType);
            if (schema && schema.attributes) {
                referenceAttributes = Array.from(schema.attributes.entries())
                    .filter(([_, attributeDef]) => attributeDef.type === 'reference')
                    .map(([attributeName, _]) => attributeName);
            }
        }
        
        if (referenceAttributes.length > 0) {
            const resolvedReferences = await this.resolveEntityReferences(entity.id, referenceAttributes);
            Object.assign(enrichedEntity, resolvedReferences);
        }
        
        return enrichedEntity;
    }
    
    /**
     * Aggiorna lo schema da entità esistenti (schema discovery)
     */
    async updateSchemaFromEntities(entityType, entities) {
        const schema = this.schemaManager.getEntitySchema(entityType);
        
        entities.forEach(entity => {
            Object.keys(entity).forEach(attributeName => {
                if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(attributeName)) {
                    if (schema) {
                        // Notifica discovery al schema esistente
                        this.schemaManager.notifyAttributeDiscovery(
                            entityType, 
                            attributeName, 
                            this.inferAttributeType(entity[attributeName])
                        );
                    } else {
                        // Per compatibilità con MVP, aggiungi al schema manager MVP
                        this.schemaManager.addAttributeToType(entityType, attributeName);
                    }
                }
            });
        });
    }
    
    /**
     * Inferisce il tipo di un attributo dal suo valore
     */
    inferAttributeType(value) {
        if (value === null || value === undefined) return 'string';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }
        if (typeof value === 'string') {
            // Controlli specifici per tipi particolari
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
            if (/^https?:\/\//.test(value)) return 'url';
            return 'string';
        }
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        return 'string';
    }
    
    /**
     * Imposta l'AttributeSpace per le notifiche
     */
    setAttributeSpace(attributeSpace) {
        this.attributeSpace = attributeSpace;
        console.log('✅ AttributeSpace collegato a EntityEngine evoluto');
    }
    
    /**
     * Invalida cache per performance e consistenza
     */
    invalidateCache(entityId = null) {
        if (entityId) {
            this.entityCache.delete(entityId);
            // Invalida anche cache reference correlate
            for (const [key, _] of this.referenceCache.entries()) {
                if (key.startsWith(`${entityId}:`)) {
                    this.referenceCache.delete(key);
                }
            }
        } else {
            this.entityCache.clear();
            this.referenceCache.clear();
            this.schemaCache.clear();
        }
    }
    
    /**
     * Statistiche e monitoring
     */
    getStats() {
        return {
            entityCache: this.entityCache.size,
            schemaCache: this.schemaCache.size,
            referenceCache: this.referenceCache.size,
            configuration: {
                enableCache: this.enableCache,
                enableLazyLoading: this.enableLazyLoading,
                enableValidation: this.enableValidation
            }
        };
    }

    /**
     * Valida un'entità contro lo schema
     * @param {string} entityType - Tipo dell'entità
     * @param {object} data - Dati dell'entità
     * @returns {object} Risultato validazione
     */
    validateEntity(entityType, data) {
        const schema = this.schemaManager.getEntitySchema(entityType);
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        if (!schema) {
            result.warnings.push(`Schema non trovato per tipo ${entityType}`);
            return result;
        }
        
        // Verifica attributi required
        if (schema.attributes) {
            for (const [attrName, attrDef] of schema.attributes) {
                if (attrDef.required && !(attrName in data)) {
                    result.isValid = false;
                    result.errors.push(`Attributo required mancante: ${attrName}`);
                }
            }
        }
        
        // Verifica attributi extra in modalità strict
        if (schema.mode === 'strict') {
            for (const attrName in data) {
                if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(attrName)) {
                    if (!schema.attributes || !schema.attributes.has(attrName)) {
                        result.isValid = false;
                        result.errors.push(`Attributo ${attrName} non definito nello schema strict`);
                    }
                }
            }
        } else {
            // Modalità flessibile: solo avvertimenti
            for (const attrName in data) {
                if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(attrName)) {
                    if (!schema.attributes || !schema.attributes.has(attrName)) {
                        result.warnings.push(`${attrName}: Attributo ${attrName} non definito nello schema (modalità flessibile)`);
                    }
                }
            }
        }
        
        return result;
    }
}

module.exports = EntityEngine; 