const { v4: uuidv4 } = require('uuid');

/**
 * ModuleRelationService - Gestisce relazioni gerarchiche modulo-entità con attributi contestuali
 * 
 * Implementa il modello gerarchico:
 * Progetto → ModuleInstance → Entità (con attributi relazionali)
 * 
 * Gli attributi (fee, ruolo, date) sono memorizzati sulla relazione MEMBER_OF
 * non sull'entità stessa, permettendo valori diversi per contesti diversi
 */
class ModuleRelationService {
    constructor(dao, attributeSpace) {
        this.dao = dao;
        this.attributeSpace = attributeSpace;
        console.log('🎯 ModuleRelationService inizializzato');
    }

    /**
     * Aggiunge un'entità a un modulo con attributi relazionali
     * @param {string} entityId - ID dell'entità da aggiungere
     * @param {string} moduleId - ID del ModuleInstance
     * @param {object} relationAttributes - Attributi della relazione (fee, ruolo, etc.)
     * @returns {Promise<object>} La relazione creata
     */
    async addEntityToModule(entityId, moduleId, relationAttributes = {}) {
        try {
            // Verifica esistenza entità e modulo
            const checkCypher = `
                MATCH (e:Entity {id: $entityId})
                MATCH (m:ModuleInstance {id: $moduleId})
                RETURN e, m
            `;
            
            const checkResult = await this.dao.connector.executeQuery(checkCypher, {
                entityId,
                moduleId
            });
            
            if (checkResult.records.length === 0) {
                throw new Error(`Entità ${entityId} o ModuleInstance ${moduleId} non trovati`);
            }
            
            // Crea relazione MEMBER_OF con attributi
            const relationId = uuidv4();
            const now = new Date().toISOString();
            
            const cypher = `
                MATCH (e:Entity {id: $entityId})
                MATCH (m:ModuleInstance {id: $moduleId})
                CREATE (e)-[r:MEMBER_OF {
                    id: $relationId,
                    addedAt: $addedAt,
                    lastModified: $lastModified
                }]->(m)
                SET r += $relationAttributes
                RETURN e, r, m
            `;
            
            const parameters = {
                entityId,
                moduleId,
                relationId,
                addedAt: now,
                lastModified: now,
                relationAttributes: this.sanitizeAttributes(relationAttributes)
            };
            
            const result = await this.dao.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error('Errore durante la creazione della relazione');
            }
            
            const record = result.records[0];
            const entity = record.get('e').properties;
            const relation = record.get('r').properties;
            const module = record.get('m').properties;
            
            // Notifica AttributeSpace
            this.attributeSpace.notifyChange({
                type: 'relation',
                changeType: 'created',
                relationType: 'MEMBER_OF',
                sourceEntityId: entityId,
                targetEntityId: moduleId,
                relationId: relation.id,
                attributes: relation,
                metadata: {
                    entityType: entity.entityType,
                    moduleType: module.moduleType
                }
            });
            
            console.log(`✅ Entità ${entityId} aggiunta al modulo ${moduleId} con attributi:`, relationAttributes);
            
            return {
                entity,
                relation,
                module
            };
            
        } catch (error) {
            console.error('❌ Errore addEntityToModule:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna gli attributi della relazione entità-modulo
     * @param {string} entityId - ID dell'entità
     * @param {string} moduleId - ID del ModuleInstance
     * @param {object} attributes - Nuovi attributi da aggiornare
     * @returns {Promise<object>} La relazione aggiornata
     */
    async updateMembershipAttributes(entityId, moduleId, attributes) {
        try {
            const now = new Date().toISOString();
            
            const cypher = `
                MATCH (e:Entity {id: $entityId})-[r:MEMBER_OF]->(m:ModuleInstance {id: $moduleId})
                SET r += $attributes, r.lastModified = $lastModified
                RETURN e, r, m
            `;
            
            const parameters = {
                entityId,
                moduleId,
                attributes: this.sanitizeAttributes(attributes),
                lastModified: now
            };
            
            const result = await this.dao.connector.executeQuery(cypher, parameters);
            
            if (result.records.length === 0) {
                throw new Error(`Relazione non trovata tra entità ${entityId} e modulo ${moduleId}`);
            }
            
            const record = result.records[0];
            const relation = record.get('r').properties;
            
            // Notifica AttributeSpace
            this.attributeSpace.notifyChange({
                type: 'relation',
                changeType: 'updated',
                relationType: 'MEMBER_OF',
                sourceEntityId: entityId,
                targetEntityId: moduleId,
                relationId: relation.id,
                attributes: relation,
                updatedAttributes: attributes
            });
            
            console.log(`✅ Attributi relazione aggiornati per ${entityId} in modulo ${moduleId}`);
            
            return {
                entity: record.get('e').properties,
                relation,
                module: record.get('m').properties
            };
            
        } catch (error) {
            console.error('❌ Errore updateMembershipAttributes:', error.message);
            throw error;
        }
    }

    /**
     * Recupera tutti i membri di un modulo con attributi relazionali
     * @param {string} moduleId - ID del ModuleInstance
     * @param {object} options - Opzioni di query (limit, offset, orderBy)
     * @returns {Promise<Array>} Array di membri con attributi
     */
    async getModuleMembers(moduleId, options = {}) {
        try {
            const { limit = 100, offset = 0, orderBy = 'addedAt' } = options;
            
            const cypher = `
                MATCH (m:ModuleInstance {id: $moduleId})<-[r:MEMBER_OF]-(e:Entity)
                RETURN e, r, 
                       properties(r) as relationAttributes
                ORDER BY r.${orderBy} DESC
                SKIP ${parseInt(offset)}
                LIMIT ${parseInt(limit)}
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { moduleId });
            
            const members = result.records.map(record => ({
                entity: record.get('e').properties,
                relationAttributes: record.get('relationAttributes'),
                memberSince: record.get('relationAttributes').addedAt
            }));
            
            console.log(`✅ Trovati ${members.length} membri per modulo ${moduleId}`);
            return members;
            
        } catch (error) {
            console.error('❌ Errore getModuleMembers:', error.message);
            throw error;
        }
    }

    /**
     * Query bidirezionale: trova tutti i progetti/moduli di un'entità
     * @param {string} entityId - ID dell'entità
     * @param {object} options - Opzioni di query
     * @returns {Promise<Array>} Array di progetti con moduli e attributi
     */
    async getEntityProjects(entityId, options = {}) {
        try {
            const { includeModuleDetails = true } = options;
            
            const cypher = `
                MATCH (e:Entity {id: $entityId})-[r:MEMBER_OF]->(m:ModuleInstance)
                OPTIONAL MATCH (m)-[:BELONGS_TO]->(p:Progetto)
                RETURN p, m, r,
                       properties(r) as relationAttributes
                ORDER BY r.addedAt DESC
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { entityId });
            
            const projects = result.records.map(record => {
                const project = record.get('p');
                const module = record.get('m').properties;
                const relationAttributes = record.get('relationAttributes');
                
                return {
                    project: project ? project.properties : null,
                    module: module,
                    relationAttributes: relationAttributes,
                    role: relationAttributes.ruolo || relationAttributes.role,
                    fee: relationAttributes.fee,
                    startDate: relationAttributes.startDate,
                    endDate: relationAttributes.endDate
                };
            });
            
            console.log(`✅ Trovati ${projects.length} progetti per entità ${entityId}`);
            return projects;
            
        } catch (error) {
            console.error('❌ Errore getEntityProjects:', error.message);
            throw error;
        }
    }

    /**
     * Rimuove un'entità da un modulo
     * @param {string} entityId - ID dell'entità
     * @param {string} moduleId - ID del ModuleInstance
     * @returns {Promise<boolean>} True se rimossa con successo
     */
    async removeEntityFromModule(entityId, moduleId) {
        try {
            const cypher = `
                MATCH (e:Entity {id: $entityId})-[r:MEMBER_OF]->(m:ModuleInstance {id: $moduleId})
                WITH r, r.id as relationId
                DELETE r
                RETURN relationId
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, {
                entityId,
                moduleId
            });
            
            if (result.records.length === 0) {
                throw new Error(`Relazione non trovata tra entità ${entityId} e modulo ${moduleId}`);
            }
            
            const relationId = result.records[0].get('relationId');
            
            // Notifica AttributeSpace
            this.attributeSpace.notifyChange({
                type: 'relation',
                changeType: 'deleted',
                relationType: 'MEMBER_OF',
                sourceEntityId: entityId,
                targetEntityId: moduleId,
                relationId: relationId
            });
            
            console.log(`✅ Entità ${entityId} rimossa dal modulo ${moduleId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Errore removeEntityFromModule:', error.message);
            throw error;
        }
    }

    /**
     * Calcola aggregati per un modulo (es. totale fee)
     * @param {string} moduleId - ID del ModuleInstance
     * @param {string} aggregateField - Campo da aggregare (es. 'fee')
     * @returns {Promise<object>} Risultati aggregati
     */
    async getModuleAggregates(moduleId, aggregateField = 'fee') {
        try {
            const cypher = `
                MATCH (m:ModuleInstance {id: $moduleId})<-[r:MEMBER_OF]-(e:Entity)
                RETURN 
                    COUNT(DISTINCT e) as totalMembers,
                    SUM(CASE 
                        WHEN r.${aggregateField} STARTS WITH '$' 
                        THEN toFloat(substring(r.${aggregateField}, 1))
                        ELSE toFloat(r.${aggregateField})
                    END) as totalAmount,
                    AVG(CASE 
                        WHEN r.${aggregateField} STARTS WITH '$' 
                        THEN toFloat(substring(r.${aggregateField}, 1))
                        ELSE toFloat(r.${aggregateField})
                    END) as averageAmount,
                    MIN(CASE 
                        WHEN r.${aggregateField} STARTS WITH '$' 
                        THEN toFloat(substring(r.${aggregateField}, 1))
                        ELSE toFloat(r.${aggregateField})
                    END) as minAmount,
                    MAX(CASE 
                        WHEN r.${aggregateField} STARTS WITH '$' 
                        THEN toFloat(substring(r.${aggregateField}, 1))
                        ELSE toFloat(r.${aggregateField})
                    END) as maxAmount,
                    COLLECT(DISTINCT r.ruolo) as roles
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { moduleId });
            
            if (result.records.length === 0) {
                return {
                    totalMembers: 0,
                    totalAmount: 0,
                    averageAmount: 0,
                    minAmount: 0,
                    maxAmount: 0,
                    roles: []
                };
            }
            
            const record = result.records[0];
            const totalMembersRaw = record.get('totalMembers');
            
            const aggregates = {
                totalMembers: (typeof totalMembersRaw === 'number') ? totalMembersRaw : (totalMembersRaw?.low || totalMembersRaw?.toNumber?.() || 0),
                totalAmount: record.get('totalAmount') || 0,
                averageAmount: record.get('averageAmount') || 0,
                minAmount: record.get('minAmount') || 0,
                maxAmount: record.get('maxAmount') || 0,
                roles: record.get('roles').filter(r => r !== null)
            };
            
            console.log(`✅ Aggregati calcolati per modulo ${moduleId}:`, aggregates);
            return aggregates;
            
        } catch (error) {
            console.error('❌ Errore getModuleAggregates:', error.message);
            throw error;
        }
    }

    /**
     * Crea relazione gerarchica Progetto -> ModuleInstance
     * @param {string} projectId - ID del progetto
     * @param {string} moduleId - ID del ModuleInstance
     * @returns {Promise<object>} La relazione creata
     */
    async linkModuleToProject(projectId, moduleId) {
        try {
            const cypher = `
                MATCH (p:Progetto {id: $projectId})
                MATCH (m:ModuleInstance {id: $moduleId})
                MERGE (m)-[r:BELONGS_TO]->(p)
                ON CREATE SET r.createdAt = timestamp()
                RETURN p, r, m
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, {
                projectId,
                moduleId
            });
            
            if (result.records.length === 0) {
                throw new Error(`Progetto ${projectId} o ModuleInstance ${moduleId} non trovati`);
            }
            
            console.log(`✅ ModuleInstance ${moduleId} collegato al progetto ${projectId}`);
            
            return {
                project: result.records[0].get('p').properties,
                relation: result.records[0].get('r').properties,
                module: result.records[0].get('m').properties
            };
            
        } catch (error) {
            console.error('❌ Errore linkModuleToProject:', error.message);
            throw error;
        }
    }

    /**
     * Sanitizza gli attributi rimuovendo valori null/undefined
     * @param {object} attributes - Attributi da sanitizzare
     * @returns {object} Attributi sanitizzati
     */
    sanitizeAttributes(attributes) {
        const sanitized = {};
        for (const [key, value] of Object.entries(attributes)) {
            if (value !== null && value !== undefined && value !== '') {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}

module.exports = ModuleRelationService;