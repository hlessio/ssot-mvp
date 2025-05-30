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
}

module.exports = new Neo4jDAO(); 