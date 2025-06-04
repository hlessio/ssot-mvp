const { v4: uuidv4 } = require('uuid');

/**
 * RelationEngine - Gestisce le relazioni come entità di prima classe
 * Implementa la Fase 2 del piano di evoluzione core engine
 */
class RelationEngine {
    constructor(entityEngine, schemaManager, dao) {
        this.entityEngine = entityEngine;
        this.schemaManager = schemaManager;
        this.dao = dao;
        this.relations = new Map(); // relationId -> Relation
        this.entityRelations = new Map(); // entityId -> Set<relationId>
        
        console.log('🔗 RelationEngine inizializzato');
    }

    /**
     * Crea una nuova relazione tipizzata tra due entità
     * @param {string} relationType - Tipo della relazione (es. 'Conosce', 'HaCliente')
     * @param {string} sourceEntityId - ID dell'entità sorgente
     * @param {string} targetEntityId - ID dell'entità target
     * @param {object} attributes - Attributi della relazione
     * @returns {Promise<object>} La relazione creata
     */
    async createRelation(relationType, sourceEntityId, targetEntityId, attributes = {}) {
        try {
            // 1. Valida che le entità esistano
            const sourceEntity = await this.entityEngine.getEntity(sourceEntityId);
            const targetEntity = await this.entityEngine.getEntity(targetEntityId);
            
            if (!sourceEntity) {
                throw new Error(`Entità sorgente non trovata: ${sourceEntityId}`);
            }
            if (!targetEntity) {
                throw new Error(`Entità target non trovata: ${targetEntityId}`);
            }

            // 2. Valida la relazione contro lo schema se esiste
            const schema = this.schemaManager.getRelationSchema(relationType);
            if (schema) {
                const validation = schema.validateRelation(
                    sourceEntity.entityType, 
                    targetEntity.entityType, 
                    attributes
                );
                if (!validation.valid) {
                    throw new Error(`Validazione relazione fallita: ${validation.error}`);
                }
            }

            // 3. Crea la relazione con ID univoco
            const relationId = uuidv4();
            const now = new Date().toISOString();
            
            const relation = {
                id: relationId,
                relationType: relationType,
                sourceEntityId: sourceEntityId,
                targetEntityId: targetEntityId,
                sourceEntityType: sourceEntity.entityType,
                targetEntityType: targetEntity.entityType,
                attributes: { ...attributes },
                created: now,
                modified: now
            };

            // 4. Applica valori di default se definiti nello schema
            if (schema) {
                schema.applyDefaults(relation);
            }

            // 5. Persiste la relazione su Neo4j
            const savedRelation = await this.persistRelation(relation);

            // 6. Aggiorna i mapping in memoria
            this.relations.set(relationId, savedRelation);
            this.addEntityRelationMapping(sourceEntityId, relationId);
            this.addEntityRelationMapping(targetEntityId, relationId);

            console.log(`✅ Relazione ${relationType} creata: ${sourceEntityId} -> ${targetEntityId}`);
            return savedRelation;

        } catch (error) {
            console.error('❌ Errore createRelation:', error.message);
            throw error;
        }
    }

    /**
     * Persiste una relazione su Neo4j
     * @param {object} relation - La relazione da persistere
     * @returns {Promise<object>} La relazione persistita
     */
    async persistRelation(relation) {
        // Strategia: utilizziamo nodi Relation collegati alle entità
        // Questo permette attributi ricchi e query flessibili
        const cypher = `
            MATCH (source:Entity {id: $sourceEntityId})
            MATCH (target:Entity {id: $targetEntityId})
            CREATE (r:Relation {
                id: $id,
                relationType: $relationType,
                sourceEntityType: $sourceEntityType,
                targetEntityType: $targetEntityType,
                created: $created,
                modified: $modified
            })
            CREATE (source)-[:HAS_RELATION]->(r)-[:TO_ENTITY]->(target)
            SET r += $attributes
            RETURN r
        `;

        const parameters = {
            sourceEntityId: relation.sourceEntityId,
            targetEntityId: relation.targetEntityId,
            id: relation.id,
            relationType: relation.relationType,
            sourceEntityType: relation.sourceEntityType,
            targetEntityType: relation.targetEntityType,
            created: relation.created,
            modified: relation.modified,
            attributes: relation.attributes
        };

        try {
            const result = await this.dao.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error('Errore durante la persistenza della relazione');
            }

            const savedRelation = result.records[0].get('r').properties;
            console.log('✅ Relazione persistita su Neo4j:', savedRelation.id);
            return savedRelation;

        } catch (error) {
            console.error('❌ Errore persistRelation:', error.message);
            throw error;
        }
    }

    /**
     * Trova relazioni basate su pattern di ricerca
     * @param {object} pattern - Pattern di ricerca
     * @param {string} pattern.sourceEntityId - ID entità sorgente (opzionale)
     * @param {string} pattern.targetEntityId - ID entità target (opzionale)
     * @param {string} pattern.relationType - Tipo relazione (opzionale)
     * @param {string} pattern.sourceEntityType - Tipo entità sorgente (opzionale)
     * @param {string} pattern.targetEntityType - Tipo entità target (opzionale)
     * @returns {Promise<Array>} Array delle relazioni trovate
     */
    async findRelations(pattern = {}) {
        try {
            let cypher = 'MATCH (source:Entity)-[:HAS_RELATION]->(r:Relation)-[:TO_ENTITY]->(target:Entity) WHERE 1=1';
            const parameters = {};

            // Costruisci WHERE clause dinamica basata sul pattern
            if (pattern.sourceEntityId) {
                cypher += ' AND source.id = $sourceEntityId';
                parameters.sourceEntityId = pattern.sourceEntityId;
            }
            if (pattern.targetEntityId) {
                cypher += ' AND target.id = $targetEntityId';
                parameters.targetEntityId = pattern.targetEntityId;
            }
            if (pattern.relationType) {
                cypher += ' AND r.relationType = $relationType';
                parameters.relationType = pattern.relationType;
            }
            if (pattern.sourceEntityType) {
                cypher += ' AND r.sourceEntityType = $sourceEntityType';
                parameters.sourceEntityType = pattern.sourceEntityType;
            }
            if (pattern.targetEntityType) {
                cypher += ' AND r.targetEntityType = $targetEntityType';
                parameters.targetEntityType = pattern.targetEntityType;
            }

            cypher += ' RETURN r, source, target ORDER BY r.created DESC';

            const result = await this.dao.connector.executeQuery(cypher, parameters);
            
            const relations = result.records.map(record => {
                const relationNode = record.get('r').properties;
                const sourceNode = record.get('source').properties;
                const targetNode = record.get('target').properties;

                return {
                    ...relationNode,
                    sourceEntity: sourceNode,
                    targetEntity: targetNode
                };
            });

            console.log(`✅ Trovate ${relations.length} relazioni per pattern:`, pattern);
            return relations;

        } catch (error) {
            console.error('❌ Errore findRelations:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutte le entità correlate a una specifica entità
     * @param {string} entityId - ID dell'entità
     * @param {string} relationType - Tipo di relazione (opzionale)
     * @param {string} direction - Direzione ('out', 'in', 'both')
     * @returns {Promise<Array>} Array delle entità correlate con info relazione
     */
    async getRelatedEntities(entityId, relationType = null, direction = 'both') {
        try {
            let cypher;
            const parameters = { entityId };

            if (direction === 'out') {
                cypher = `
                    MATCH (e:Entity {id: $entityId})-[:HAS_RELATION]->(r:Relation)-[:TO_ENTITY]->(target:Entity)
                `;
            } else if (direction === 'in') {
                cypher = `
                    MATCH (source:Entity)-[:HAS_RELATION]->(r:Relation)-[:TO_ENTITY]->(e:Entity {id: $entityId})
                `;
            } else { // both
                cypher = `
                    MATCH (e:Entity {id: $entityId})
                    MATCH (other:Entity)
                    MATCH (r:Relation)
                    WHERE ((e)-[:HAS_RELATION]->(r)-[:TO_ENTITY]->(other)) OR 
                          ((other)-[:HAS_RELATION]->(r)-[:TO_ENTITY]->(e))
                `;
            }

            if (relationType) {
                cypher += ' AND r.relationType = $relationType';
                parameters.relationType = relationType;
            }

            if (direction === 'out') {
                cypher += ' RETURN r, target as relatedEntity';
            } else if (direction === 'in') {
                cypher += ' RETURN r, source as relatedEntity';
            } else {
                cypher += ' RETURN r, other as relatedEntity';
            }

            cypher += ' ORDER BY r.created DESC';

            const result = await this.dao.connector.executeQuery(cypher, parameters);
            
            const relatedEntities = result.records.map(record => {
                const relationNode = record.get('r').properties;
                const entityNode = record.get('relatedEntity').properties;

                return {
                    entity: entityNode,
                    relation: relationNode,
                    relationType: relationNode.relationType
                };
            });

            console.log(`✅ Trovate ${relatedEntities.length} entità correlate per ${entityId}`);
            return relatedEntities;

        } catch (error) {
            console.error('❌ Errore getRelatedEntities:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna gli attributi di una relazione esistente
     * @param {string} relationId - ID della relazione
     * @param {object} newAttributes - Nuovi attributi
     * @returns {Promise<object>} La relazione aggiornata
     */
    async updateRelationAttributes(relationId, newAttributes) {
        try {
            const now = new Date().toISOString();
            
            const cypher = `
                MATCH (r:Relation {id: $relationId})
                SET r += $newAttributes, r.modified = $modified
                RETURN r
            `;

            const parameters = {
                relationId,
                newAttributes,
                modified: now
            };

            const result = await this.dao.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error(`Relazione non trovata: ${relationId}`);
            }

            const updatedRelation = result.records[0].get('r').properties;
            
            // Aggiorna cache in memoria
            this.relations.set(relationId, updatedRelation);

            console.log(`✅ Relazione ${relationId} aggiornata`);
            return updatedRelation;

        } catch (error) {
            console.error('❌ Errore updateRelationAttributes:', error.message);
            throw error;
        }
    }

    /**
     * Elimina una relazione
     * @param {string} relationId - ID della relazione da eliminare
     * @returns {Promise<boolean>} True se eliminata con successo
     */
    async deleteRelation(relationId) {
        try {
            const cypher = `
                MATCH (source:Entity)-[:HAS_RELATION]->(r:Relation {id: $relationId})-[:TO_ENTITY]->(target:Entity)
                DETACH DELETE r
                RETURN count(r) as deletedCount
            `;

            const result = await this.dao.connector.executeQuery(cypher, { relationId });
            const deletedCount = result.records[0]?.get('deletedCount')?.low || 0;

            if (deletedCount === 0) {
                throw new Error(`Relazione non trovata: ${relationId}`);
            }

            // Rimuovi da cache in memoria
            const relation = this.relations.get(relationId);
            if (relation) {
                this.removeEntityRelationMapping(relation.sourceEntityId, relationId);
                this.removeEntityRelationMapping(relation.targetEntityId, relationId);
                this.relations.delete(relationId);
            }

            console.log(`✅ Relazione ${relationId} eliminata`);
            return true;

        } catch (error) {
            console.error('❌ Errore deleteRelation:', error.message);
            throw error;
        }
    }

    /**
     * Carica tutte le relazioni dal database (per inizializzazione)
     * @returns {Promise<void>}
     */
    async loadAllRelations() {
        try {
            const cypher = `
                MATCH (source:Entity)-[:HAS_RELATION]->(r:Relation)-[:TO_ENTITY]->(target:Entity)
                RETURN r, source, target
                ORDER BY r.created
            `;

            const result = await this.dao.connector.executeQuery(cypher);
            
            for (const record of result.records) {
                const relationNode = record.get('r').properties;
                const sourceNode = record.get('source').properties;
                const targetNode = record.get('target').properties;

                const relation = {
                    ...relationNode,
                    sourceEntity: sourceNode,
                    targetEntity: targetNode
                };

                this.relations.set(relation.id, relation);
                this.addEntityRelationMapping(relation.sourceEntityId, relation.id);
                this.addEntityRelationMapping(relation.targetEntityId, relation.id);
            }

            console.log(`✅ Caricate ${this.relations.size} relazioni dal database`);

        } catch (error) {
            console.error('❌ Errore loadAllRelations:', error.message);
            throw error;
        }
    }

    /**
     * Aggiunge mapping entità-relazione
     * @param {string} entityId - ID dell'entità
     * @param {string} relationId - ID della relazione
     */
    addEntityRelationMapping(entityId, relationId) {
        if (!this.entityRelations.has(entityId)) {
            this.entityRelations.set(entityId, new Set());
        }
        this.entityRelations.get(entityId).add(relationId);
    }

    /**
     * Rimuove mapping entità-relazione
     * @param {string} entityId - ID dell'entità
     * @param {string} relationId - ID della relazione
     */
    removeEntityRelationMapping(entityId, relationId) {
        const relationIds = this.entityRelations.get(entityId);
        if (relationIds) {
            relationIds.delete(relationId);
            if (relationIds.size === 0) {
                this.entityRelations.delete(entityId);
            }
        }
    }

    /**
     * Recupera statistiche sulle relazioni
     * @returns {object} Statistiche delle relazioni
     */
    getRelationStats() {
        const typeCount = {};
        for (const relation of this.relations.values()) {
            typeCount[relation.relationType] = (typeCount[relation.relationType] || 0) + 1;
        }

        return {
            totalRelations: this.relations.size,
            entitiesWithRelations: this.entityRelations.size,
            relationsByType: typeCount
        };
    }
}

module.exports = RelationEngine; 