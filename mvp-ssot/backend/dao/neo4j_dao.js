const neo4jConnector = require('../neo4j_connector');
const { v4: uuidv4 } = require('uuid');

class Neo4jDAO {
    constructor() {
        this.connector = neo4jConnector;
    }

    /**
     * Crea una nuova entità con tipo e attributi iniziali
     * @param {string} entityType - Il tipo dell'entità (es. "Contact")
     * @param {object} initialAttributes - Attributi iniziali dell'entità
     * @returns {Promise<object>} L'entità creata
     */
    async createEntity(entityType, initialAttributes = {}) {
        const entityId = uuidv4();
        const now = new Date().toISOString();
        
        // Costruisco la query per creare l'entità con proprietà dinamiche
        let setClause = 'SET e.id = $id, e.entityType = $entityType, e.createdAt = $createdAt, e.updatedAt = $updatedAt';
        
        const parameters = {
            id: entityId,
            entityType: entityType,
            createdAt: now,
            updatedAt: now
        };
        
        // Aggiungo gli attributi iniziali alla query
        Object.keys(initialAttributes).forEach((key, index) => {
            const paramName = `attr${index}`;
            setClause += `, e.\`${key}\` = $${paramName}`;
            parameters[paramName] = initialAttributes[key];
        });
        
        const cypher = `
            CREATE (e:Entity:\`${entityType}\`)
            ${setClause}
            RETURN e
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length > 0) {
                const entity = result.records[0].get('e').properties;
                console.log('✅ Entità creata:', entity);
                return entity;
            }
            
            throw new Error('Errore durante la creazione dell\'entità');
        } catch (error) {
            console.error('❌ Errore createEntity:', error.message);
            throw error;
        }
    }

    /**
     * Recupera un'entità per ID
     * @param {string} id - L'ID dell'entità
     * @returns {Promise<object|null>} L'entità trovata o null
     */
    async getEntityById(id) {
        const cypher = `
            MATCH (e:Entity {id: $id})
            RETURN e
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, { id });
            
            if (result.records.length > 0) {
                const entity = result.records[0].get('e').properties;
                console.log('✅ Entità trovata:', entity);
                return entity;
            }
            
            console.log('ℹ️ Entità non trovata per ID:', id);
            return null;
        } catch (error) {
            console.error('❌ Errore getEntityById:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna un attributo di un'entità
     * @param {string} entityId - L'ID dell'entità
     * @param {string} attributeName - Il nome dell'attributo
     * @param {any} attributeValue - Il valore dell'attributo
     * @returns {Promise<object>} L'entità aggiornata
     */
    async updateEntityAttribute(entityId, attributeName, attributeValue) {
        const now = new Date().toISOString();
        
        const cypher = `
            MATCH (e:Entity {id: $entityId})
            SET e.\`${attributeName}\` = $value, e.updatedAt = $updatedAt
            RETURN e
        `;
        
        const parameters = {
            entityId: entityId,
            value: attributeValue,
            updatedAt: now
        };
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length > 0) {
                const entity = result.records[0].get('e').properties;
                console.log(`✅ Attributo ${attributeName} aggiornato per entità ${entityId}`);
                return entity;
            }
            
            throw new Error(`Entità con ID ${entityId} non trovata`);
        } catch (error) {
            console.error('❌ Errore updateEntityAttribute:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutte le entità di un tipo specifico
     * @param {string} entityType - Il tipo delle entità da recuperare
     * @returns {Promise<Array>} Array delle entità trovate
     */
    async getAllEntities(entityType) {
        const cypher = `
            MATCH (e:Entity:\`${entityType}\`)
            RETURN e
            ORDER BY e.createdAt
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher);
            
            const entities = result.records.map(record => {
                return record.get('e').properties;
            });
            
            console.log(`✅ Trovate ${entities.length} entità di tipo ${entityType}`);
            return entities;
        } catch (error) {
            console.error('❌ Errore getAllEntities:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutti i nomi degli attributi usati dalle entità di un tipo
     * @param {string} entityType - Il tipo delle entità
     * @returns {Promise<Array>} Array dei nomi degli attributi
     */
    async getAllAttributeKeysForEntityType(entityType) {
        const cypher = `
            MATCH (e:Entity:\`${entityType}\`)
            UNWIND keys(e) AS key
            WITH key
            WHERE NOT key IN ['id', 'entityType', 'createdAt', 'updatedAt']
            RETURN DISTINCT key
            ORDER BY key
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher);
            
            const attributes = result.records.map(record => {
                return record.get('key');
            });
            
            console.log(`✅ Trovati ${attributes.length} attributi per tipo ${entityType}:`, attributes);
            return attributes;
        } catch (error) {
            console.error('❌ Errore getAllAttributeKeysForEntityType:', error.message);
            throw error;
        }
    }

    /**
     * Elimina tutte le entità (utile per test e reset)
     * @returns {Promise<number>} Numero di entità eliminate
     */
    async deleteAllEntities() {
        const cypher = `
            MATCH (e:Entity)
            DELETE e
            RETURN count(e) as deletedCount
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher);
            const deletedCount = result.records[0]?.get('deletedCount')?.low || 0;
            console.log(`✅ Eliminate ${deletedCount} entità`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Errore deleteAllEntities:', error.message);
            throw error;
        }
    }

    // =============================================
    // GESTIONE SCHEMI - Nuove funzioni per l'evoluzione
    // =============================================

    /**
     * Salva uno schema di tipo entità su Neo4j
     * @param {object} schema - Lo schema da salvare (EntitySchema)
     * @returns {Promise<object>} Lo schema salvato
     */
    async saveEntitySchema(schema) {
        const now = new Date().toISOString();
        
        // Prima creiamo il nodo dello schema in una transazione separata
        const schemaId = `schema_${schema.entityType}`;
        const cypher = `
            MERGE (s:SchemaEntityType {entityType: $entityType})
            SET s.schemaId = $schemaId,
                s.version = $version,
                s.mode = $mode,
                s.created = $created,
                s.modified = $modified,
                s.constraints = $constraints
            RETURN s
        `;
        
        const parameters = {
            entityType: schema.entityType,
            schemaId: schemaId,
            version: schema.version,
            mode: schema.mode,
            created: schema.created || now,
            modified: now,
            constraints: JSON.stringify(schema.constraints || [])
        };
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error('Errore durante la creazione dello schema');
            }
            
            const savedSchema = result.records[0].get('s').properties;
            
            // Gestisci attributi sia come Object che come Map (correzione bug)
            let attributesToSave = [];
            if (schema.attributes) {
                if (schema.attributes instanceof Map) {
                    attributesToSave = Array.from(schema.attributes.entries());
                } else if (typeof schema.attributes === 'object') {
                    attributesToSave = Object.entries(schema.attributes);
                }
            }
            
            console.log(`💾 Salvataggio ${attributesToSave.length} attributi per schema ${schema.entityType}`);
            
            // SOLUZIONE MEMORIA: Salva attributi in transazioni separate con delay
            for (const [attrName, attrDef] of attributesToSave) {
                try {
                    await this.saveAttributeDefinitionSeparateTransaction(schemaId, attrName, attrDef);
                    
                    // Delay più lungo per liberare completamente la memoria
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                } catch (attrError) {
                    console.warn(`⚠️ Errore salvando attributo ${attrName}:`, attrError.message);
                    // Continua con gli altri attributi invece di fallire completamente
                }
            }
            
            console.log('✅ Schema entità salvato:', savedSchema);
            return savedSchema;
            
        } catch (error) {
            console.error('❌ Errore saveEntitySchema:', error.message);
            throw error;
        }
    }

    /**
     * Salva un singolo attributo in una transazione separata (ottimizzazione memoria)
     * @param {string} schemaId - ID dello schema
     * @param {string} attributeName - Nome dell'attributo  
     * @param {object} attributeDefinition - Definizione dell'attributo
     * @returns {Promise<object>} L'attributo salvato
     */
    async saveAttributeDefinitionSeparateTransaction(schemaId, attributeName, attributeDefinition) {
        // Query semplificata - solo le proprietà base sempre presenti
        const cypher = `
            MATCH (s) WHERE s.schemaId = $schemaId
            MERGE (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition {name: $name, schemaId: $schemaId})
            ON CREATE SET 
                a.type = $type,
                a.required = $required,
                a.description = $description
            RETURN a
        `;
        
        const parameters = {
            schemaId: schemaId,
            name: attributeName,
            type: attributeDefinition.type || 'string',
            required: attributeDefinition.required || false,
            description: attributeDefinition.description || ''
        };
        
        try {
            // Prima transazione: proprietà base
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error('Errore durante il salvataggio attributo base');
            }
            
            // Seconda transazione: proprietà opzionali (se esistono)
            await this.updateAttributeOptionalProperties(schemaId, attributeName, attributeDefinition);
            
            const saved = result.records[0].get('a').properties;
            console.log(`✅ Attributo ${attributeName} salvato per schema ${schemaId}`);
            return saved;
            
        } catch (error) {
            console.error('❌ Errore saveAttributeDefinitionSeparateTransaction:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna le proprietà opzionali di un attributo in transazione separata
     * @param {string} schemaId - ID dello schema
     * @param {string} attributeName - Nome dell'attributo
     * @param {object} attributeDefinition - Definizione dell'attributo
     */
    async updateAttributeOptionalProperties(schemaId, attributeName, attributeDefinition) {
        const setClauses = [];
        const parameters = { schemaId, name: attributeName };
        
        // Aggiungi solo proprietà che hanno valori reali
        if (attributeDefinition.defaultValue !== undefined && attributeDefinition.defaultValue !== null) {
            setClauses.push('a.defaultValue = $defaultValue');
            parameters.defaultValue = attributeDefinition.defaultValue;
        }
        
        if (attributeDefinition.validationRules && attributeDefinition.validationRules.length > 0) {
            setClauses.push('a.validationRules = $validationRules');
            parameters.validationRules = JSON.stringify(attributeDefinition.validationRules);
        }
        
        if (attributeDefinition.referencesEntityType) {
            setClauses.push('a.referencesEntityType = $referencesEntityType');
            parameters.referencesEntityType = attributeDefinition.referencesEntityType;
        }
        
        if (attributeDefinition.relationTypeForReference) {
            setClauses.push('a.relationTypeForReference = $relationTypeForReference'); 
            parameters.relationTypeForReference = attributeDefinition.relationTypeForReference;
        }
        
        if (attributeDefinition.displayAttributeFromReferencedEntity) {
            setClauses.push('a.displayAttributeFromReferencedEntity = $displayAttributeFromReferencedEntity');
            parameters.displayAttributeFromReferencedEntity = attributeDefinition.displayAttributeFromReferencedEntity;
        }
        
        if (attributeDefinition.cardinalityForReference) {
            setClauses.push('a.cardinalityForReference = $cardinalityForReference');
            parameters.cardinalityForReference = attributeDefinition.cardinalityForReference;
        }
        
        // Se non ci sono proprietà opzionali, skip
        if (setClauses.length === 0) {
            return;
        }
        
        const cypher = `
            MATCH (a:AttributeDefinition {name: $name, schemaId: $schemaId})
            SET ${setClauses.join(', ')}
            RETURN a
        `;
        
        try {
            await this.connector.executeQuery(cypher, parameters);
            console.log(`   📝 Proprietà opzionali aggiornate per ${attributeName}`);
        } catch (error) {
            console.warn(`⚠️ Errore aggiornamento proprietà opzionali ${attributeName}:`, error.message);
            // Non fallire per proprietà opzionali
        }
    }

    /**
     * Carica uno schema di tipo entità da Neo4j
     * @param {string} entityType - Il tipo di entità
     * @returns {Promise<object|null>} Lo schema caricato o null
     */
    async loadEntitySchema(entityType) {
        const cypher = `
            MATCH (s:SchemaEntityType {entityType: $entityType})
            OPTIONAL MATCH (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition)
            RETURN s, 
                   COLLECT(CASE WHEN a IS NOT NULL THEN {
                       name: a.name,
                       type: a.type,
                       required: a.required,
                       defaultValue: a.defaultValue,
                       validationRules: a.validationRules,
                       description: a.description,
                       referencesEntityType: a.referencesEntityType,
                       relationTypeForReference: a.relationTypeForReference,
                       displayAttributeFromReferencedEntity: a.displayAttributeFromReferencedEntity,
                       cardinalityForReference: a.cardinalityForReference
                   } END) as attributes
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, { entityType });
            
            if (result.records.length === 0) {
                console.log(`ℹ️ Schema non trovato per il tipo ${entityType}`);
                return null;
            }
            
            const record = result.records[0];
            const schemaNode = record.get('s').properties;
            const attributesData = record.get('attributes').filter(a => a !== null);
            
            const schema = {
                entityType: schemaNode.entityType,
                version: schemaNode.version,
                mode: schemaNode.mode,
                created: schemaNode.created,
                modified: schemaNode.modified,
                constraints: JSON.parse(schemaNode.constraints || '[]'),
                attributes: attributesData
            };
            
            console.log('✅ Schema entità caricato:', schema);
            return schema;
            
        } catch (error) {
            console.error('❌ Errore loadEntitySchema:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna uno schema di tipo entità (sostituito con approccio più sicuro)
     * @param {object} schema - Lo schema aggiornato
     * @returns {Promise<object>} Lo schema aggiornato
     */
    async updateEntitySchema(schema) {
        // Per evitare problemi di cancellazione, usiamo l'approccio incrementale
        const now = new Date().toISOString();
        
        try {
            // Aggiorna solo i metadati del nodo schema principale
            const cypher = `
                MATCH (s:SchemaEntityType {entityType: $entityType})
                SET s.version = $version,
                    s.modified = $modified
                RETURN s
            `;
            
            const result = await this.connector.executeQuery(cypher, {
                entityType: schema.entityType,
                version: schema.version,
                modified: now
            });
            
            console.log('✅ Schema entità aggiornato (metadati):', schema.entityType);
            return schema;
            
        } catch (error) {
            console.error('❌ Errore updateEntitySchema:', error.message);
            throw error;
        }
    }

    /**
     * Aggiunge un singolo attributo a uno schema esistente (approccio puramente additivo)
     * @param {string} entityType - Il tipo di entità
     * @param {string} attributeName - Nome dell'attributo
     * @param {object} attributeDefinition - Definizione dell'attributo
     * @returns {Promise<object>} L'attributo aggiunto
     */
    async addAttributeToSchema(entityType, attributeName, attributeDefinition) {
        try {
            console.log(`🔧 Aggiunta attributo ${attributeName} a schema ${entityType}`);
            
            // Strategia semplice: se esiste già, non fare nulla; altrimenti crea
            const schemaId = `schema_${entityType}`;
            
            // Usa MERGE che è idempotente - se esiste già non fa nulla, altrimenti crea
            const cypher = `
                MATCH (s:SchemaEntityType {entityType: $entityType})
                MERGE (a:AttributeDefinition {name: $attributeName, schemaId: $schemaId})
                ON CREATE SET 
                    a.type = $type,
                    a.required = $required,
                    a.defaultValue = $defaultValue,
                    a.validationRules = $validationRules,
                    a.description = $description,
                    a.referencesEntityType = $referencesEntityType,
                    a.relationTypeForReference = $relationTypeForReference,
                    a.displayAttributeFromReferencedEntity = $displayAttributeFromReferencedEntity,
                    a.cardinalityForReference = $cardinalityForReference
                MERGE (s)-[:HAS_ATTRIBUTE]->(a)
                RETURN a, 
                       CASE WHEN a.type IS NULL THEN 'created' ELSE 'existed' END as status
            `;
            
            const parameters = {
                entityType: entityType,
                schemaId: schemaId,
                attributeName: attributeName,
                type: attributeDefinition.type || 'string',
                required: attributeDefinition.required || false,
                defaultValue: attributeDefinition.defaultValue || null,
                validationRules: JSON.stringify(attributeDefinition.validationRules || []),
                description: attributeDefinition.description || '',
                referencesEntityType: attributeDefinition.referencesEntityType || null,
                relationTypeForReference: attributeDefinition.relationTypeForReference || null,
                displayAttributeFromReferencedEntity: attributeDefinition.displayAttributeFromReferencedEntity || null,
                cardinalityForReference: attributeDefinition.cardinalityForReference || null
            };
            
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length > 0) {
                const record = result.records[0];
                const saved = record.get('a').properties;
                const status = record.get('status');
                
                if (status === 'created') {
                    console.log(`✅ Nuovo attributo ${attributeName} aggiunto a schema ${entityType}`);
                } else {
                    console.log(`ℹ️ Attributo ${attributeName} già esistente in schema ${entityType}`);
                }
                
                return saved;
            }
            
            throw new Error('Errore durante l\'aggiunta dell\'attributo');
            
        } catch (error) {
            console.error('❌ Errore addAttributeToSchema:', error.message);
            throw error;
        }
    }

    /**
     * Elimina uno schema di tipo entità
     * @param {string} entityType - Il tipo di entità
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    async deleteEntitySchema(entityType) {
        const cypher = `
            MATCH (s:SchemaEntityType {entityType: $entityType})
            OPTIONAL MATCH (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition)
            DETACH DELETE s, a
            RETURN count(s) as deletedSchemas
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, { entityType });
            const deletedCount = result.records[0]?.get('deletedSchemas')?.low || 0;
            console.log(`✅ Schema eliminato per ${entityType}`);
            return deletedCount > 0;
        } catch (error) {
            console.error('❌ Errore deleteEntitySchema:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutti gli schemi di entità
     * @returns {Promise<Array>} Array degli schemi
     */
    async getAllEntitySchemas() {
        const cypher = `
            MATCH (s:SchemaEntityType)
            RETURN s.entityType as entityType
            ORDER BY s.entityType
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher);
            const entityTypes = result.records.map(record => record.get('entityType'));
            
            // Carica i dettagli per ogni schema
            const schemas = [];
            for (const entityType of entityTypes) {
                const schema = await this.loadEntitySchema(entityType);
                if (schema) schemas.push(schema);
            }
            
            console.log(`✅ Trovati ${schemas.length} schemi entità`);
            return schemas;
        } catch (error) {
            console.error('❌ Errore getAllEntitySchemas:', error.message);
            throw error;
        }
    }

    /**
     * Salva uno schema di tipo relazione su Neo4j
     * @param {object} schema - Lo schema relazione da salvare
     * @returns {Promise<object>} Lo schema salvato
     */
    async saveRelationSchema(schema) {
        const now = new Date().toISOString();
        const schemaId = `schema_rel_${schema.relationType}`;
        
        const cypher = `
            MERGE (s:SchemaRelationType {relationType: $relationType})
            SET s.schemaId = $schemaId,
                s.version = $version,
                s.cardinality = $cardinality,
                s.sourceTypes = $sourceTypes,
                s.targetTypes = $targetTypes,
                s.created = $created,
                s.modified = $modified,
                s.constraints = $constraints
            RETURN s
        `;
        
        const parameters = {
            relationType: schema.relationType,
            schemaId: schemaId,
            version: schema.version || 1,
            cardinality: schema.cardinality || 'N:M',
            sourceTypes: JSON.stringify(schema.sourceTypes || []),
            targetTypes: JSON.stringify(schema.targetTypes || []),
            created: schema.created || now,
            modified: now,
            constraints: JSON.stringify(schema.constraints || [])
        };
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error('Errore durante la creazione dello schema relazione');
            }
            
            const savedSchema = result.records[0].get('s').properties;
            
            // Salva gli attributi della relazione
            for (const [attrName, attrDef] of schema.attributes || new Map()) {
                await this.saveAttributeDefinition(schemaId, attrName, attrDef);
            }
            
            console.log('✅ Schema relazione salvato:', savedSchema);
            return savedSchema;
            
        } catch (error) {
            console.error('❌ Errore saveRelationSchema:', error.message);
            throw error;
        }
    }

    /**
     * Carica uno schema di tipo relazione da Neo4j
     * @param {string} relationType - Il tipo di relazione
     * @returns {Promise<object|null>} Lo schema caricato o null
     */
    async loadRelationSchema(relationType) {
        const cypher = `
            MATCH (s:SchemaRelationType {relationType: $relationType})
            OPTIONAL MATCH (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition)
            RETURN s,
                   COLLECT(CASE WHEN a IS NOT NULL THEN {
                       name: a.name,
                       type: a.type,
                       required: a.required,
                       defaultValue: a.defaultValue,
                       validationRules: a.validationRules,
                       description: a.description
                   } END) as attributes
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, { relationType });
            
            if (result.records.length === 0) {
                console.log(`ℹ️ Schema relazione non trovato per il tipo ${relationType}`);
                return null;
            }
            
            const record = result.records[0];
            const schemaNode = record.get('s').properties;
            const attributesData = record.get('attributes').filter(a => a !== null);
            
            const schema = {
                relationType: schemaNode.relationType,
                version: schemaNode.version,
                cardinality: schemaNode.cardinality,
                sourceTypes: JSON.parse(schemaNode.sourceTypes || '[]'),
                targetTypes: JSON.parse(schemaNode.targetTypes || '[]'),
                created: schemaNode.created,
                modified: schemaNode.modified,
                constraints: JSON.parse(schemaNode.constraints || '[]'),
                attributes: attributesData
            };
            
            console.log('✅ Schema relazione caricato:', schema);
            return schema;
            
        } catch (error) {
            console.error('❌ Errore loadRelationSchema:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna uno schema di tipo relazione
     * @param {object} schema - Lo schema aggiornato
     * @returns {Promise<object>} Lo schema aggiornato
     */
    async updateRelationSchema(schema) {
        await this.deleteRelationSchema(schema.relationType);
        return await this.saveRelationSchema(schema);
    }

    /**
     * Elimina uno schema di tipo relazione
     * @param {string} relationType - Il tipo di relazione
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    async deleteRelationSchema(relationType) {
        const cypher = `
            MATCH (s:SchemaRelationType {relationType: $relationType})
            OPTIONAL MATCH (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition)
            DETACH DELETE s, a
            RETURN count(s) as deletedSchemas
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, { relationType });
            const deletedCount = result.records[0]?.get('deletedSchemas')?.low || 0;
            console.log(`✅ Schema relazione eliminato per ${relationType}`);
            return deletedCount > 0;
        } catch (error) {
            console.error('❌ Errore deleteRelationSchema:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutti gli schemi di relazione
     * @returns {Promise<Array>} Array degli schemi relazione
     */
    async getAllRelationSchemas() {
        const cypher = `
            MATCH (s:SchemaRelationType)
            RETURN s.relationType as relationType
            ORDER BY s.relationType
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher);
            const relationTypes = result.records.map(record => record.get('relationType'));
            
            const schemas = [];
            for (const relationType of relationTypes) {
                const schema = await this.loadRelationSchema(relationType);
                if (schema) schemas.push(schema);
            }
            
            console.log(`✅ Trovati ${schemas.length} schemi relazione`);
            return schemas;
        } catch (error) {
            console.error('❌ Errore getAllRelationSchemas:', error.message);
            throw error;
        }
    }

    /**
     * Salva una definizione di attributo collegata a uno schema
     * @param {string} schemaId - ID dello schema (entity o relation)
     * @param {string} attributeName - Nome dell'attributo
     * @param {object} attributeDefinition - Definizione dell'attributo
     * @param {boolean} forceCreate - Se true, usa CREATE invece di MERGE
     * @returns {Promise<object>} La definizione salvata
     */
    async saveAttributeDefinition(schemaId, attributeName, attributeDefinition, forceCreate = false) {
        // Usa il nuovo metodo ottimizzato per memoria
        if (!forceCreate) {
            return await this.saveAttributeDefinitionSeparateTransaction(schemaId, attributeName, attributeDefinition);
        }
        
        // Solo per forceCreate=true, usa il metodo diretto (più rischioso per memoria)
        const cypher = `
            MATCH (s) WHERE s.schemaId = $schemaId
            CREATE (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition {
                name: $name, 
                schemaId: $schemaId,
                type: $type,
                required: $required,
                description: $description
            })
            RETURN a
        `;
        
        const parameters = {
            schemaId: schemaId,
            name: attributeName,
            type: attributeDefinition.type || 'string',
            required: attributeDefinition.required || false,
            description: attributeDefinition.description || ''
        };
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            if (result.records.length > 0) {
                const saved = result.records[0].get('a').properties;
                
                // Aggiungi proprietà opzionali in transazione separata
                await this.updateAttributeOptionalProperties(schemaId, attributeName, attributeDefinition);
                
                console.log(`✅ Attributo ${attributeName} salvato (force) per schema ${schemaId}`);
                return saved;
            }
            throw new Error('Errore durante il salvataggio dell\'attributo');
        } catch (error) {
            console.error('❌ Errore saveAttributeDefinition:', error.message);
            throw error;
        }
    }
}

module.exports = new Neo4jDAO(); 