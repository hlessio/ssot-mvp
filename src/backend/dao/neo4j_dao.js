const neo4jConnector = require('../neo4j_connector');
const { v4: uuidv4 } = require('uuid');

class Neo4jDAO {
    constructor() {
        this.connector = neo4jConnector;
    }

    /**
     * Prepara i dati per Neo4j serializzando oggetti JSON come stringhe
     * @param {object} data - Dati da preparare
     * @returns {object} Dati preparati per Neo4j
     */
    prepareDataForNeo4j(data) {
        const prepared = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                prepared[key] = null;
            } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                // Serializza oggetti JSON come stringhe
                prepared[key] = JSON.stringify(value);
            } else if (value instanceof Date) {
                // Converti Date in ISO string
                prepared[key] = value.toISOString();
            } else {
                // Mantieni valori primitivi e array
                prepared[key] = value;
            }
        }
        return prepared;
    }

    /**
     * Deserializza dati da Neo4j parsando stringhe JSON
     * @param {object} data - Dati da Neo4j
     * @param {object} schema - Schema opzionale per identificare campi JSON
     * @returns {object} Dati deserializzati
     */
    parseDataFromNeo4j(data, schema = null) {
        const parsed = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                parsed[key] = value;
            } else if (schema?.attributes?.[key]?.type === 'json' || 
                      (typeof value === 'string' && (value.startsWith('{') || value.startsWith('[')))) {
                // Tenta di parsare stringhe JSON
                try {
                    parsed[key] = JSON.parse(value);
                } catch (e) {
                    // Se fallisce, mantieni come stringa
                    parsed[key] = value;
                }
            } else {
                parsed[key] = value;
            }
        }
        return parsed;
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
        let setClause = 'SET e.id = $id, e.entityType = $entityType, e.createdAt = $createdAt, e.modifiedAt = $modifiedAt';
        
        const parameters = {
            id: entityId,
            entityType: entityType,
            createdAt: now,
            modifiedAt: now
        };
        
        // Prepara gli attributi per Neo4j (serializza JSON)
        const preparedAttributes = this.prepareDataForNeo4j(initialAttributes);
        
        // Aggiungo gli attributi iniziali alla query
        Object.keys(preparedAttributes).forEach((key, index) => {
            const paramName = `attr${index}`;
            setClause += `, e.\`${key}\` = $${paramName}`;
            parameters[paramName] = preparedAttributes[key];
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
                // Deserializza campi JSON
                return this.parseDataFromNeo4j(entity);
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
                // Deserializza campi JSON
                return this.parseDataFromNeo4j(entity);
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
            SET e.\`${attributeName}\` = $value, e.modifiedAt = $modifiedAt
            RETURN e
        `;
        
        // Prepara il valore per Neo4j (serializza se è un oggetto JSON)
        const preparedData = this.prepareDataForNeo4j({ [attributeName]: attributeValue });
        
        const parameters = {
            entityId: entityId,
            value: preparedData[attributeName],
            modifiedAt: now
        };
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            
            if (result.records.length > 0) {
                const entity = result.records[0].get('e').properties;
                console.log(`✅ Attributo ${attributeName} aggiornato per entità ${entityId}`);
                // Deserializza campi JSON
                return this.parseDataFromNeo4j(entity);
            }
            
            throw new Error(`Entità con ID ${entityId} non trovata`);
        } catch (error) {
            console.error('❌ Errore updateEntityAttribute:', error.message);
            throw error;
        }
    }

    /**
     * Elimina un'entità per ID
     * @param {string} entityId - L'ID dell'entità da eliminare
     * @returns {Promise<boolean>} True se eliminata con successo
     */
    async deleteEntity(entityId) {
        const cypher = `
            MATCH (e:Entity {id: $entityId})
            DETACH DELETE e
            RETURN count(e) as deleted
        `;
        
        try {
            const result = await this.connector.executeQuery(cypher, { entityId });
            const deleted = result.records[0].get('deleted');
            
            if ((deleted.low || deleted) > 0) {
                console.log(`✅ Entità ${entityId} eliminata`);
                return true;
            }
            
            console.log(`⚠️ Entità ${entityId} non trovata per eliminazione`);
            return false;
        } catch (error) {
            console.error('❌ Errore deleteEntity:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutte le entità di un tipo specifico
     * @param {string} entityType - Il tipo delle entità da recuperare
     * @param {Object} options - Opzioni per paginazione e limiti
     * @returns {Promise<Array>} Array delle entità trovate
     */
    async getAllEntities(entityType, options = {}) {
        // ✨ OTTIMIZZAZIONE: Aggiunge limits per controllo memoria
        const { limit = 1000, offset = 0, orderBy = 'createdAt' } = options;
        
        // 🔧 FIX: Converte sempre a integer e usa inline nella query per evitare parametrizzazione problematica
        const limitInt = parseInt(limit, 10);
        const offsetInt = parseInt(offset, 10);
        
        // Fix LIMIT applicato con successo
        
        // Valida che siano numeri validi
        if (isNaN(limitInt) || isNaN(offsetInt) || limitInt < 0 || offsetInt < 0) {
            throw new Error(`Parametri limit/offset non validi: limit=${limit}, offset=${offset}`);
        }
        
        const cypher = `
            MATCH (e:Entity:\`${entityType}\`)
            RETURN e
            ORDER BY e.${orderBy}
            SKIP ${offsetInt}
            LIMIT ${limitInt}
        `;
        
        const parameters = {}; // No parameters needed with inline values
        
        try {
            const result = await this.connector.executeQuery(cypher, parameters);
            
            const entities = result.records.map(record => {
                const entityData = record.get('e').properties;
                // Deserializza campi JSON per ogni entità
                return this.parseDataFromNeo4j(entityData);
            });
            
            const displayLimit = limit === 1000 ? '' : ` (limit: ${limit})`;
            console.log(`✅ Trovate ${entities.length} entità di tipo ${entityType}${displayLimit}`);
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
            // Non serve parseDataFromNeo4j qui perché è uno schema, non dati entità
            
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
            
            // ✨ OTTIMIZZAZIONE: Batch attributes in groups of 3 per transaction
            const BATCH_SIZE = 3;
            for (let i = 0; i < attributesToSave.length; i += BATCH_SIZE) {
                const batch = attributesToSave.slice(i, i + BATCH_SIZE);
                
                try {
                    await this.saveAttributesBatch(schemaId, batch);
                    
                    // Ridotto delay - solo tra batch, non tra attributi singoli
                    if (i + BATCH_SIZE < attributesToSave.length) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                } catch (batchError) {
                    console.warn(`⚠️ Errore salvando batch attributi:`, batchError.message);
                    // Fallback: salva uno per uno se batch fallisce
                    for (const [attrName, attrDef] of batch) {
                        try {
                            await this.saveAttributeDefinitionSeparateTransaction(schemaId, attrName, attrDef);
                        } catch (attrError) {
                            console.warn(`⚠️ Errore salvando attributo ${attrName}:`, attrError.message);
                        }
                    }
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
     * ✨ OTTIMIZZAZIONE: Salva batch di attributi in una singola transazione
     * @param {string} schemaId - ID dello schema
     * @param {Array} attributesBatch - Array di [nome, definizione] degli attributi
     * @returns {Promise<Array>} Gli attributi salvati
     */
    async saveAttributesBatch(schemaId, attributesBatch) {
        if (!attributesBatch || attributesBatch.length === 0) {
            return [];
        }

        // FIX: Create AttributeDefinition first, then link to schema to prevent duplicates
        let cypher = '';
        const parameters = { schemaId };
        
        // First, create all AttributeDefinition nodes
        attributesBatch.forEach(([attrName, attrDef], index) => {
            const paramPrefix = `attr${index}`;
            cypher += `
                MERGE (a${index}:AttributeDefinition {name: $${paramPrefix}_name, schemaId: $schemaId})
                ON CREATE SET 
                    a${index}.type = $${paramPrefix}_type,
                    a${index}.required = $${paramPrefix}_required,
                    a${index}.description = $${paramPrefix}_description`;
            
            parameters[`${paramPrefix}_name`] = attrName;
            parameters[`${paramPrefix}_type`] = attrDef.type || 'string';
            parameters[`${paramPrefix}_required`] = attrDef.required || false;
            parameters[`${paramPrefix}_description`] = attrDef.description || '';
        });
        
        // Then, link all to schema
        cypher += `\nWITH `;
        cypher += attributesBatch.map((_, index) => `a${index}`).join(', ');
        cypher += `\nMATCH (s) WHERE s.schemaId = $schemaId\n`;
        attributesBatch.forEach((_, index) => {
            cypher += `MERGE (s)-[:HAS_ATTRIBUTE]->(a${index})\n`;
        });

        cypher += `\nRETURN ${attributesBatch.map((_, i) => `a${i}`).join(', ')}`;

        try {
            const result = await neo4jConnector.executeQuery(cypher, parameters);
            console.log(`✅ Batch di ${attributesBatch.length} attributi salvato per schema ${schemaId}`);
            return result.records;
        } catch (error) {
            console.error(`❌ Errore saveAttributesBatch:`, error.message);
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
        // FIX: Use MERGE directly on AttributeDefinition to prevent duplicates
        const cypher = `
            MERGE (a:AttributeDefinition {name: $name, schemaId: $schemaId})
            ON CREATE SET 
                a.type = $type,
                a.required = $required,
                a.description = $description
            WITH a
            MATCH (s) WHERE s.schemaId = $schemaId
            MERGE (s)-[:HAS_ATTRIBUTE]->(a)
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
            // Non serve parseDataFromNeo4j qui perché sono metadati di schema
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
            // Se il defaultValue è un oggetto o array, serializzalo come JSON
            if (typeof attributeDefinition.defaultValue === 'object') {
                parameters.defaultValue = JSON.stringify(attributeDefinition.defaultValue);
            } else {
                parameters.defaultValue = attributeDefinition.defaultValue;
            }
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
            
            // Deserializza i defaultValue JSON per attributi di tipo json
            const processedAttributes = attributesData.map(attr => {
                if (attr.type === 'json' && attr.defaultValue && typeof attr.defaultValue === 'string') {
                    try {
                        attr.defaultValue = JSON.parse(attr.defaultValue);
                    } catch (e) {
                        console.warn(`⚠️ Errore parsing defaultValue JSON per attributo ${attr.name}:`, e.message);
                    }
                }
                return attr;
            });
            
            const schema = {
                entityType: schemaNode.entityType,
                version: schemaNode.version,
                mode: schemaNode.mode,
                created: schemaNode.created,
                modified: schemaNode.modified,
                constraints: JSON.parse(schemaNode.constraints || '[]'),
                attributes: processedAttributes
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
            
            // Prepara i parametri serializzando gli oggetti JSON
            let defaultValue = attributeDefinition.defaultValue || null;
            if (defaultValue !== null && typeof defaultValue === 'object') {
                defaultValue = JSON.stringify(defaultValue);
            }
            
            const parameters = {
                entityType: entityType,
                schemaId: schemaId,
                attributeName: attributeName,
                type: attributeDefinition.type || 'string',
                required: attributeDefinition.required || false,
                defaultValue: defaultValue,
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
                // Non serve parseDataFromNeo4j qui perché sono metadati di schema
                
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
        
        // Debug: log schema content
        console.log(`💾 Salvando RelationSchema:`, {
            relationType: schema.relationType,
            sourceTypes: schema.sourceTypes,
            targetTypes: schema.targetTypes,
            cardinality: schema.cardinality
        });
        
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
            // Non serve parseDataFromNeo4j qui perché è uno schema, non dati entità
            
            // Salva gli attributi della relazione
            if (schema.attributes) {
                if (schema.attributes instanceof Map) {
                    for (const [attrName, attrDef] of schema.attributes) {
                        await this.saveAttributeDefinition(schemaId, attrName, attrDef);
                    }
                } else if (typeof schema.attributes === 'object') {
                    for (const [attrName, attrDef] of Object.entries(schema.attributes)) {
                        await this.saveAttributeDefinition(schemaId, attrName, attrDef);
                    }
                }
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
            
            // Deserializza i defaultValue JSON per attributi di tipo json
            const processedAttributes = attributesData.map(attr => {
                if (attr.type === 'json' && attr.defaultValue && typeof attr.defaultValue === 'string') {
                    try {
                        attr.defaultValue = JSON.parse(attr.defaultValue);
                    } catch (e) {
                        console.warn(`⚠️ Errore parsing defaultValue JSON per attributo ${attr.name}:`, e.message);
                    }
                }
                return attr;
            });
            
            const schema = {
                relationType: schemaNode.relationType,
                version: schemaNode.version,
                cardinality: schemaNode.cardinality,
                sourceTypes: JSON.parse(schemaNode.sourceTypes || '[]'),
                targetTypes: JSON.parse(schemaNode.targetTypes || '[]'),
                created: schemaNode.created,
                modified: schemaNode.modified,
                constraints: JSON.parse(schemaNode.constraints || '[]'),
                attributes: processedAttributes
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
                // Non serve parseDataFromNeo4j qui perché sono metadati di schema
                
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

    /**
     * Rinomina un attributo nello schema e in tutte le entità
     * @param {string} entityType - Il tipo di entità
     * @param {string} oldName - Nome attuale dell'attributo
     * @param {string} newName - Nuovo nome dell'attributo
     * @returns {Promise<void>}
     */
    async renameAttributeInSchema(entityType, oldName, newName) {
        try {
            console.log(`🔄 Rinomina attributo nel DB: ${oldName} -> ${newName} per ${entityType}`);
            
            // 1. Rinomina l'attributo nel nodo schema
            const renameSchemaAttr = `
                MATCH (s:SchemaEntityType {entityType: $entityType})-[:HAS_ATTRIBUTE]->(a:AttributeDefinition {name: $oldName})
                SET a.name = $newName
                RETURN a
            `;
            
            await this.connector.executeQuery(renameSchemaAttr, {
                entityType: entityType,
                oldName: oldName,
                newName: newName
            });
            
            // 2. Rinomina l'attributo in tutte le entità esistenti
            const renameEntityAttr = `
                MATCH (e {entityType: $entityType})
                WHERE e[$oldName] IS NOT NULL
                SET e[$newName] = e[$oldName]
                REMOVE e[$oldName]
                RETURN count(e) as updated
            `;
            
            const result = await this.connector.executeQuery(renameEntityAttr, {
                entityType: entityType,
                oldName: oldName,
                newName: newName
            });
            
            const updatedValue = result.records[0]?.get('updated');
            const updatedCount = updatedValue?.toNumber ? updatedValue.toNumber() : (parseInt(updatedValue) || 0);
            console.log(`✅ Attributo rinominato: ${updatedCount} entità aggiornate`);
            
        } catch (error) {
            console.error('❌ Errore renameAttributeInSchema:', error.message);
            throw error;
        }
    }

    /**
     * Rimuove un attributo dallo schema e da tutte le entità
     * @param {string} entityType - Il tipo di entità
     * @param {string} attributeName - Nome dell'attributo da rimuovere
     * @returns {Promise<void>}
     */
    async removeAttributeFromSchema(entityType, attributeName) {
        try {
            console.log(`🗑️ Rimozione attributo dal DB: ${attributeName} da ${entityType}`);
            
            // 1. Rimuovi l'attributo dal nodo schema e la relazione
            const removeSchemaAttr = `
                MATCH (s:SchemaEntityType {entityType: $entityType})-[r:HAS_ATTRIBUTE]->(a:AttributeDefinition {name: $attributeName})
                DELETE r, a
                RETURN count(a) as removed
            `;
            
            await this.connector.executeQuery(removeSchemaAttr, {
                entityType: entityType,
                attributeName: attributeName
            });
            
            // 2. Rimuovi l'attributo da tutte le entità esistenti
            const removeEntityAttr = `
                MATCH (e {entityType: $entityType})
                WHERE e[$attributeName] IS NOT NULL
                REMOVE e[$attributeName]
                RETURN count(e) as updated
            `;
            
            const result = await this.connector.executeQuery(removeEntityAttr, {
                entityType: entityType,
                attributeName: attributeName
            });
            
            const updatedValue = result.records[0]?.get('updated');
            const updatedCount = updatedValue?.toNumber ? updatedValue.toNumber() : (parseInt(updatedValue) || 0);
            console.log(`✅ Attributo rimosso: ${updatedCount} entità aggiornate`);
            
        } catch (error) {
            console.error('❌ Errore removeAttributeFromSchema:', error.message);
            throw error;
        }
    }
}

module.exports = new Neo4jDAO(); 