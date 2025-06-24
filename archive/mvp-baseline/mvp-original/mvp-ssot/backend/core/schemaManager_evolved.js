const EntitySchema = require('./entitySchema');
const RelationSchema = require('./relationSchema');
const AttributeDefinition = require('./attributeDefinition');

/**
 * SchemaManager evoluto per il sistema SSOT Dinamico
 * Gestisce persistenza, validazione e evoluzione degli schemi
 */
class SchemaManager {
    constructor(persistence) {
        this.entitySchemas = new Map(); // entityType -> EntitySchema
        this.relationSchemas = new Map(); // relationType -> RelationSchema
        this.schemaVersions = new Map(); // schemaId -> VersionHistory
        this.persistence = persistence;
        this.validators = new Map(); // type -> ValidatorFunction
        this.isInitialized = false;
    }

    /**
     * Inizializza lo SchemaManager caricando tutti gli schemi persistiti
     */
    async initialize() {
        try {
            console.log('🔄 Inizializzazione SchemaManager evoluto...');
            
            // Carica tutti gli schemi entità
            const entitySchemas = await this.persistence.getAllEntitySchemas();
            for (const schemaData of entitySchemas) {
                const schema = EntitySchema.fromDatabase(schemaData);
                this.entitySchemas.set(schema.entityType, schema);
                console.log(`✅ Schema entità caricato: ${schema.entityType}`);
            }
            
            // Carica tutti gli schemi relazione
            const relationSchemas = await this.persistence.getAllRelationSchemas();
            for (const schemaData of relationSchemas) {
                const schema = RelationSchema.fromDatabase(schemaData);
                this.relationSchemas.set(schema.relationType, schema);
                console.log(`✅ Schema relazione caricato: ${schema.relationType}`);
            }
            
            this.isInitialized = true;
            console.log(`✅ SchemaManager inizializzato con ${this.entitySchemas.size} schemi entità e ${this.relationSchemas.size} schemi relazione`);
            
        } catch (error) {
            console.error('❌ Errore inizializzazione SchemaManager:', error);
            throw error;
        }
    }

    /**
     * Definisce un nuovo schema per un tipo di entità
     * @param {string} entityType - Il tipo di entità
     * @param {object} schemaDefinition - La definizione dello schema
     * @returns {Promise<EntitySchema>} Lo schema creato
     */
    async defineEntitySchema(entityType, schemaDefinition) {
        try {
            console.log(`🔧 Definizione schema entità per tipo: ${entityType}`);
            
            // Crea lo schema
            const schema = new EntitySchema(entityType, schemaDefinition);
            
            // Valida la definizione dello schema
            await this.validateSchemaDefinition(schema);
            
            // Verifica compatibilità con dati esistenti (se in modalità strict)
            if (schema.mode === 'strict') {
                await this.checkCompatibilityWithExistingData(entityType, schema);
            }
            
            // Persiste lo schema
            await this.persistence.saveEntitySchema(schema);
            
            // Registra in memoria
            this.entitySchemas.set(entityType, schema);
            
            // Registra versione
            this.recordSchemaChange(entityType, 'entity', 'created', schema);
            
            console.log(`✅ Schema entità definito: ${entityType}`);
            return schema;
            
        } catch (error) {
            console.error(`❌ Errore definizione schema entità ${entityType}:`, error);
            throw error;
        }
    }

    /**
     * Definisce un nuovo schema per un tipo di relazione
     * @param {string} relationType - Il tipo di relazione
     * @param {object} schemaDefinition - La definizione dello schema
     * @returns {Promise<RelationSchema>} Lo schema creato
     */
    async defineRelationSchema(relationType, schemaDefinition) {
        try {
            console.log(`🔧 Definizione schema relazione per tipo: ${relationType}`);
            
            // Crea lo schema
            const schema = new RelationSchema(relationType, schemaDefinition);
            
            // Valida la definizione dello schema
            await this.validateRelationSchema(schema);
            
            // Persiste lo schema
            await this.persistence.saveRelationSchema(schema);
            
            // Registra in memoria
            this.relationSchemas.set(relationType, schema);
            
            // Registra versione
            this.recordSchemaChange(relationType, 'relation', 'created', schema);
            
            console.log(`✅ Schema relazione definito: ${relationType}`);
            return schema;
            
        } catch (error) {
            console.error(`❌ Errore definizione schema relazione ${relationType}:`, error);
            throw error;
        }
    }

    /**
     * Recupera lo schema di un tipo di entità
     * @param {string} entityType - Il tipo di entità
     * @returns {EntitySchema|null} Lo schema o null se non trovato
     */
    getEntitySchema(entityType) {
        return this.entitySchemas.get(entityType) || null;
    }

    /**
     * Recupera lo schema di un tipo di relazione
     * @param {string} relationType - Il tipo di relazione
     * @returns {RelationSchema|null} Lo schema o null se non trovato
     */
    getRelationSchema(relationType) {
        return this.relationSchemas.get(relationType) || null;
    }

    /**
     * Recupera tutti i tipi di entità definiti
     * @returns {string[]} Array dei tipi di entità
     */
    getAllEntityTypes() {
        return Array.from(this.entitySchemas.keys());
    }

    /**
     * Recupera tutti i tipi di relazione definiti
     * @returns {string[]} Array dei tipi di relazione
     */
    getAllRelationTypes() {
        return Array.from(this.relationSchemas.keys());
    }

    /**
     * Valida un valore di attributo contro lo schema dell'entità
     * @param {string} entityType - Il tipo di entità
     * @param {string} attributeName - Il nome dell'attributo
     * @param {any} value - Il valore da validare
     * @returns {object} Risultato della validazione: { valid: boolean, error?: string, warning?: string }
     */
    validateAttributeValue(entityType, attributeName, value) {
        const schema = this.entitySchemas.get(entityType);
        
        if (!schema) {
            // Se non c'è schema, accettiamo tutto (modalità flessibile globale)
            return { valid: true, warning: `Nessuno schema definito per il tipo ${entityType}` };
        }
        
        return schema.validateAttribute(attributeName, value);
    }

    /**
     * Valida una relazione contro lo schema del tipo di relazione
     * @param {string} relationType - Il tipo di relazione
     * @param {string} sourceEntityType - Tipo entità sorgente
     * @param {string} targetEntityType - Tipo entità target
     * @param {object} attributes - Attributi della relazione
     * @returns {object} Risultato della validazione
     */
    validateRelation(relationType, sourceEntityType, targetEntityType, attributes = {}) {
        const schema = this.relationSchemas.get(relationType);
        
        if (!schema) {
            return { valid: false, error: `Schema non definito per il tipo di relazione ${relationType}` };
        }
        
        return schema.validateRelation(sourceEntityType, targetEntityType, attributes);
    }

    /**
     * Notifica la scoperta di un nuovo attributo (per modalità flessibile)
     * @param {string} entityType - Il tipo di entità
     * @param {string} attributeName - Nome dell'attributo scoperto
     * @param {string} detectedType - Tipo rilevato dall'attributo
     */
    notifyAttributeDiscovery(entityType, attributeName, detectedType) {
        const schema = this.entitySchemas.get(entityType);
        
        if (schema && schema.mode === 'flexible' && !schema.getAttribute(attributeName)) {
            console.log(`📝 Attributo scoperto: ${attributeName} (${detectedType}) per ${entityType}`);
            
            // In futuro: potremmo registrare questa scoperta per eventuali promozioni a schema formale
            // Per ora, semplicemente lo logghiamo
        }
    }

    /**
     * Evolve uno schema entità applicando modifiche
     * @param {string} entityType - Il tipo di entità
     * @param {object} evolution - Le modifiche da applicare
     * @returns {Promise<EntitySchema>} Lo schema evoluto
     */
    async evolveSchema(entityType, evolution) {
        try {
            console.log(`🔄 Evoluzione schema per ${entityType}:`, evolution);
            
            const currentSchema = this.entitySchemas.get(entityType);
            if (!currentSchema) {
                throw new Error(`Schema non trovato per il tipo ${entityType}`);
            }
            
            // Implementa l'aggiunta di attributi in modo sicuro
            if (evolution.addAttributes) {
                for (const [attrName, attrDef] of Object.entries(evolution.addAttributes)) {
                    // Aggiungi attributo allo schema in memoria
                    currentSchema.addAttribute(attrName, attrDef);
                    
                    // Aggiungi l'attributo al database usando il metodo sicuro
                    await this.persistence.addAttributeToSchema(entityType, attrName, attrDef);
                }
            }
            
            // Aggiorna solo la versione in memoria (senza toccare il database principale)
            currentSchema.modified = Date.now();
            
            // Aggiorna in memoria
            this.entitySchemas.set(entityType, currentSchema);
            
            // Registra il cambiamento
            this.recordSchemaChange(entityType, 'entity', 'evolved', currentSchema);
            
            console.log(`✅ Schema evoluto per ${entityType}`);
            return currentSchema;
            
        } catch (error) {
            console.error(`❌ Errore evoluzione schema ${entityType}:`, error);
            throw error;
        }
    }

    // ============================================
    // METODI PRIVATI DI SUPPORTO
    // ============================================

    /**
     * Valida una definizione di schema entità
     * @param {EntitySchema} schema - Lo schema da validare
     */
    async validateSchemaDefinition(schema) {
        // Validazioni base dello schema
        if (!schema.entityType || schema.entityType.trim() === '') {
            throw new Error('entityType è richiesto');
        }
        
        if (!['strict', 'flexible'].includes(schema.mode)) {
            throw new Error('mode deve essere "strict" o "flexible"');
        }
        
        // Valida ogni attributo
        for (const [attrName, attrDef] of schema.attributes) {
            if (!attrName || attrName.trim() === '') {
                throw new Error('Nome attributo non può essere vuoto');
            }
            
            // Per attributi di tipo reference, verifica che i metadati siano presenti
            if (attrDef.type === 'reference') {
                if (!attrDef.referencesEntityType) {
                    throw new Error(`Attributo reference ${attrName} deve specificare referencesEntityType`);
                }
                if (!attrDef.relationTypeForReference) {
                    throw new Error(`Attributo reference ${attrName} deve specificare relationTypeForReference`);
                }
                if (!attrDef.displayAttributeFromReferencedEntity) {
                    throw new Error(`Attributo reference ${attrName} deve specificare displayAttributeFromReferencedEntity`);
                }
            }
        }
    }

    /**
     * Valida una definizione di schema relazione
     * @param {RelationSchema} schema - Lo schema da validare
     */
    async validateRelationSchema(schema) {
        if (!schema.relationType || schema.relationType.trim() === '') {
            throw new Error('relationType è richiesto');
        }
        
        if (!['1:1', '1:N', 'N:1', 'N:M'].includes(schema.cardinality)) {
            throw new Error('cardinality deve essere uno tra: 1:1, 1:N, N:1, N:M');
        }
    }

    /**
     * Verifica compatibilità con dati esistenti
     * @param {string} entityType - Il tipo di entità
     * @param {EntitySchema} schema - Il nuovo schema
     */
    async checkCompatibilityWithExistingData(entityType, schema) {
        // Per ora, implementazione semplificata
        // In futuro, potremmo verificare che i dati esistenti rispettino il nuovo schema
        console.log(`ℹ️ Verifica compatibilità per ${entityType} (placeholder)`);
    }

    /**
     * Registra un cambiamento allo schema per versioning
     * @param {string} schemaId - ID dello schema
     * @param {string} schemaType - Tipo di schema ('entity' o 'relation')
     * @param {string} action - Azione eseguita ('created', 'evolved', etc.)
     * @param {object} schema - Lo schema modificato
     */
    recordSchemaChange(schemaId, schemaType, action, schema) {
        const change = {
            schemaId,
            schemaType,
            action,
            version: schema.version,
            timestamp: Date.now(),
            details: `${action} schema ${schemaType} ${schemaId}`
        };
        
        if (!this.schemaVersions.has(schemaId)) {
            this.schemaVersions.set(schemaId, []);
        }
        
        this.schemaVersions.get(schemaId).push(change);
        console.log(`📝 Registrato cambiamento schema: ${change.details}`);
    }

    /**
     * Determina il tipo di un attributo basandosi sul valore
     * @param {any} value - Il valore dell'attributo
     * @returns {string} Il tipo determinato
     */
    determineAttributeType(value) {
        if (typeof value === 'string') {
            // Controlla se sembra un email
            if (value.includes('@') && value.includes('.')) {
                return 'email';
            }
            // Controlla se sembra una data
            if (!isNaN(Date.parse(value))) {
                return 'date';
            }
            return 'string';
        }
        
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        
        return 'string'; // default
    }

    /**
     * Recupera statistiche sugli schemi
     * @returns {object} Statistiche degli schemi
     */
    getSchemaStats() {
        return {
            entityTypes: this.entitySchemas.size,
            relationTypes: this.relationSchemas.size,
            totalSchemas: this.entitySchemas.size + this.relationSchemas.size,
            changeHistory: this.changeHistory.length
        };
    }
    
    // ============================================
    // 🔄 METODI DI COMPATIBILITÀ CON ENTITYENGINE_MVP
    // ============================================
    
    /**
     * 🔄 METODO DI COMPATIBILITÀ: Aggiunge un attributo a un tipo entità (stile MVP)
     * Questo metodo mantiene compatibilità con EntityEngine_MVP mentre sviluppiamo EntityEngine evoluto
     * @param {string} entityType - Tipo dell'entità
     * @param {string} attributeName - Nome dell'attributo da aggiungere
     * @deprecated Usare evolveSchema() per nuove implementazioni
     */
    addAttributeToType(entityType, attributeName) {
        console.log(`🔄 [COMPATIBILITÀ MVP] Aggiunta attributo ${attributeName} a ${entityType}`);
        
        // Se lo schema esiste, aggiungi l'attributo
        const existingSchema = this.entitySchemas.get(entityType);
        if (existingSchema) {
            // Verifica se l'attributo esiste già
            if (!existingSchema.attributes.has(attributeName)) {
                // Aggiungi attributo con definizione di base
                const attributeDefinition = {
                    type: 'string', // Tipo di default
                    required: false,
                    description: `Attributo ${attributeName} scoperto automaticamente`,
                    defaultValue: null
                };
                
                existingSchema.addAttribute(attributeName, attributeDefinition);
                
                // Persisti la modifica
                this.persistence.addAttributeToSchema(entityType, attributeName, attributeDefinition)
                    .catch(error => {
                        console.error(`Errore persistenza attributo ${attributeName}:`, error);
                    });
                
                console.log(`✅ [COMPATIBILITÀ] Attributo ${attributeName} aggiunto a schema ${entityType}`);
            }
        } else {
            // Lo schema non esiste, crealo con questo attributo
            console.log(`ℹ️ [COMPATIBILITÀ] Schema ${entityType} non esiste, sarà creato al prossimo accesso`);
            // Non creiamo lo schema automaticamente per evitare schemi inconsistenti
        }
    }
    
    /**
     * 🔄 METODO DI COMPATIBILITÀ: Recupera attributi per tipo (stile MVP)
     * @param {string} entityType - Tipo dell'entità
     * @returns {string[]} Array dei nomi degli attributi
     * @deprecated Usare getEntitySchema() per nuove implementazioni
     */
    getAttributesForType(entityType) {
        console.log(`🔄 [COMPATIBILITÀ MVP] Richiesta attributi per ${entityType}`);
        
        const schema = this.entitySchemas.get(entityType);
        if (schema) {
            const attributes = schema.getAttributeNames();
            console.log(`✅ [COMPATIBILITÀ] Trovati ${attributes.length} attributi per ${entityType}`);
            return attributes;
        }
        
        console.log(`ℹ️ [COMPATIBILITÀ] Schema ${entityType} non trovato, ritorno array vuoto`);
        return [];
    }
    
    /**
     * 🔄 METODO DI COMPATIBILITÀ: Verifica se un tipo entità è registrato
     * @param {string} entityType - Tipo dell'entità
     * @returns {boolean} True se il tipo è registrato
     * @deprecated Usare hasEntitySchema() per nuove implementazioni  
     */
    hasType(entityType) {
        return this.entitySchemas.has(entityType);
    }
    
    /**
     * 🔄 METODO DI COMPATIBILITÀ: Recupera tutti i tipi entità registrati (stile MVP)
     * @returns {string[]} Array dei tipi entità
     * @deprecated Usare getAllEntityTypes() per nuove implementazioni
     */
    getRegisteredTypes() {
        return this.getAllEntityTypes();
    }
}

module.exports = SchemaManager; 