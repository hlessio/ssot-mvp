/**
 * ImplicitRelationManager - Relazioni Organiche via ModuleInstance
 * Sostituisce le relazioni rigide con relazioni implicite tramite contesto condiviso
 */

class ImplicitRelationManager {
    constructor(dao, attributeDiscovery) {
        this.dao = dao;
        this.attributeDiscovery = attributeDiscovery;
        
        // Cache leggero per contesti modulari
        this.moduleContexts = new Map(); // moduleId -> context info
        this.entityModules = new Map();  // entityId -> Set(moduleIds)
        
        console.log('🔗 ImplicitRelationManager inizializzato - Relazioni Organiche');
    }

    /**
     * ✨ CORE: Trova entità correlate tramite contesto condiviso (moduli)
     */
    async getRelatedEntities(entityId, options = {}) {
        try {
            const { relationTypes = [], limit = 50, includeContext = true } = options;
            
            // 1. Trova moduli che contengono questa entità
            const entityModules = await this.getModulesContaining(entityId);
            
            // 2. Trova tutte le entità negli stessi moduli = relazioni implicite
            const relatedEntities = [];
            
            for (const module of entityModules) {
                const moduleEntities = await this.getEntitiesInModule(module.id);
                
                // Filtra l'entità stessa
                const others = moduleEntities.filter(e => e.id !== entityId);
                
                // Aggiunge contesto della relazione
                others.forEach(entity => {
                    const relation = {
                        entity: entity,
                        relationContext: {
                            type: 'shared_module',
                            moduleId: module.id,
                            moduleName: module.instanceName || 'Unnamed Module',
                            moduleType: module.templateModuleId,
                            confidence: this.calculateRelationConfidence(entity, module)
                        }
                    };
                    
                    if (includeContext) {
                        relation.relationContext.semanticContext = this.inferSemanticContext(entity, module);
                    }
                    
                    relatedEntities.push(relation);
                });
            }
            
            // 3. Rimuove duplicati e applica limit
            const uniqueRelated = this.deduplicateRelations(relatedEntities);
            const limitedResults = uniqueRelated.slice(0, limit);
            
            console.log(`🔗 Trovate ${limitedResults.length} relazioni implicite per entità ${entityId}`);
            return limitedResults;
            
        } catch (error) {
            console.error(`❌ Errore getRelatedEntities:`, error.message);
            return []; // Fallback vuoto
        }
    }

    /**
     * Trova moduli che contengono un'entità specifica
     */
    async getModulesContaining(entityId) {
        try {
            // Query multi-pattern per trovare connessioni entità-modulo
            const cypher = `
                // Pattern 1: Entità referenziate da ModuleInstance
                MATCH (m:Entity {entityType: 'ModuleInstance'})
                WHERE m.targetEntityId = $entityId
                RETURN m, 'referenced' as connectionType
                
                UNION
                
                // Pattern 2: Entità create nello stesso contesto
                MATCH (e:Entity {id: $entityId})
                MATCH (m:Entity {entityType: 'ModuleInstance'})
                WHERE m.targetEntityType = e.entityType
                RETURN m, 'type_context' as connectionType
                
                UNION
                
                // Pattern 3: Connessioni esplicite tramite relazioni
                MATCH (e:Entity {id: $entityId})-[:HAS_RELATION]->(r:Relation)-[:TO_ENTITY]->(m:Entity {entityType: 'ModuleInstance'})
                RETURN m, 'explicit_relation' as connectionType
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { entityId });
            
            return result.records.map(record => ({
                ...record.get('m').properties,
                connectionType: record.get('connectionType')
            }));
            
        } catch (error) {
            console.warn(`⚠️ Warning getModulesContaining:`, error.message);
            return [];
        }
    }

    /**
     * Trova tutte le entità in un modulo specifico
     */
    async getEntitiesInModule(moduleId) {
        try {
            const cypher = `
                // Trova ModuleInstance
                MATCH (m:Entity {id: $moduleId, entityType: 'ModuleInstance'})
                
                // Pattern 1: Entità del tipo target del modulo
                OPTIONAL MATCH (e1:Entity)
                WHERE e1.entityType = m.targetEntityType AND e1.id <> $moduleId
                
                // Pattern 2: Entità esplicitamente collegate
                OPTIONAL MATCH (m)-[:HAS_RELATION|CONTAINS]->(e2:Entity)
                WHERE e2.id <> $moduleId
                
                // Pattern 3: Entità che referenziano questo modulo
                OPTIONAL MATCH (e3:Entity)
                WHERE e3.targetEntityId = $moduleId AND e3.id <> $moduleId
                
                WITH COLLECT(DISTINCT e1) + COLLECT(DISTINCT e2) + COLLECT(DISTINCT e3) as allEntities
                UNWIND allEntities as entity
                WHERE entity IS NOT NULL
                RETURN DISTINCT entity
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { moduleId });
            
            return result.records.map(record => record.get('entity').properties);
            
        } catch (error) {
            console.warn(`⚠️ Warning getEntitiesInModule:`, error.message);
            return [];
        }
    }

    /**
     * ✨ Trova percorso di connessione tra due entità
     */
    async findConnectionPath(entityA, entityB, maxDepth = 2) {
        try {
            const modulesA = await this.getModulesContaining(entityA);
            const modulesB = await this.getModulesContaining(entityB);
            
            const connections = [];
            
            // Connessione diretta tramite modulo condiviso
            const sharedModules = modulesA.filter(mA => 
                modulesB.some(mB => mB.id === mA.id)
            );
            
            for (const sharedModule of sharedModules) {
                connections.push({
                    type: 'direct_shared_context',
                    path: [entityA, sharedModule.id, entityB],
                    module: sharedModule,
                    strength: 'strong'
                });
            }
            
            // Connessione indiretta tramite catena di moduli
            if (connections.length === 0 && maxDepth > 1) {
                for (const moduleA of modulesA) {
                    const intermediateEntities = await this.getEntitiesInModule(moduleA.id);
                    
                    for (const intermediate of intermediateEntities) {
                        if (intermediate.id !== entityA) {
                            const intermediateModules = await this.getModulesContaining(intermediate.id);
                            const bridgeModules = intermediateModules.filter(mI =>
                                modulesB.some(mB => mB.id === mI.id)
                            );
                            
                            if (bridgeModules.length > 0) {
                                connections.push({
                                    type: 'indirect_shared_context',
                                    path: [entityA, moduleA.id, intermediate.id, bridgeModules[0].id, entityB],
                                    intermediateEntity: intermediate,
                                    bridgeModule: bridgeModules[0],
                                    strength: 'medium'
                                });
                                break; // Una connessione indiretta è sufficiente
                            }
                        }
                    }
                }
            }
            
            return connections;
            
        } catch (error) {
            console.error(`❌ Errore findConnectionPath:`, error.message);
            return [];
        }
    }

    /**
     * ✨ Aggiunge entità a un contesto modulare (semantic container)
     */
    async addEntityToModuleContext(moduleId, entityData, options = {}) {
        try {
            console.log(`🏗️ Aggiungendo entità al contesto modulo ${moduleId}`);
            
            // 1. Recupera contesto del modulo
            const moduleContext = await this.getModuleSemanticContext(moduleId);
            
            // 2. Auto-inferisce entityType dal contesto se non specificato
            if (!entityData.entityType) {
                entityData.entityType = moduleContext.dominantEntityType || 'DynamicEntity';
            }
            
            // 3. Applica attributi comuni del modulo
            const commonAttributes = await this.getCommonModuleAttributes(moduleId);
            const enrichedData = { ...entityData, ...commonAttributes };
            
            // 4. Crea entità con attributi arricchiti
            const entity = await this.dao.createEntity(enrichedData.entityType, enrichedData);
            
            // 5. Registra pattern emergenti
            for (const [attrName, value] of Object.entries(enrichedData)) {
                if (attrName !== 'entityType' && attrName !== 'id') {
                    await this.attributeDiscovery.learnAttributeFromUsage(
                        entity.entityType,
                        attrName,
                        value,
                        { moduleId, context: 'module_addition' }
                    );
                }
            }
            
            // 6. Crea collegamento implicito (se specificato)
            if (options.createExplicitLink) {
                await this.createModuleEntityLink(moduleId, entity.id);
            }
            
            console.log(`✅ Entità ${entity.id} aggiunta al contesto ${moduleId}`);
            return entity;
            
        } catch (error) {
            console.error(`❌ Errore addEntityToModuleContext:`, error.message);
            throw error;
        }
    }

    /**
     * Recupera contesto semantico di un modulo
     */
    async getModuleSemanticContext(moduleId) {
        try {
            // Cache check
            if (this.moduleContexts.has(moduleId)) {
                return this.moduleContexts.get(moduleId);
            }
            
            // Recupera ModuleInstance
            const module = await this.dao.getEntity(moduleId);
            if (!module || module.entityType !== 'ModuleInstance') {
                throw new Error(`Modulo ${moduleId} non trovato`);
            }
            
            // Analizza entità nel modulo per inferire contesto
            const entities = await this.getEntitiesInModule(moduleId);
            const entityTypes = entities.map(e => e.entityType);
            const dominantType = this.findDominantEntityType(entityTypes);
            
            const context = {
                moduleId,
                moduleName: module.instanceName,
                templateId: module.templateModuleId,
                targetEntityType: module.targetEntityType,
                dominantEntityType: dominantType,
                entityCount: entities.length,
                lastAnalyzed: Date.now()
            };
            
            // Cache con TTL
            this.moduleContexts.set(moduleId, context);
            setTimeout(() => this.moduleContexts.delete(moduleId), 300000); // 5min TTL
            
            return context;
            
        } catch (error) {
            console.error(`❌ Errore getModuleSemanticContext:`, error.message);
            return {
                moduleId,
                dominantEntityType: 'DynamicEntity',
                entityCount: 0,
                error: true
            };
        }
    }

    /**
     * Ottiene attributi comuni utilizzati nel modulo
     */
    async getCommonModuleAttributes(moduleId) {
        try {
            const entities = await this.getEntitiesInModule(moduleId);
            if (entities.length === 0) return {};
            
            // Analizza attributi comuni
            const attributeFrequency = new Map();
            const attributeValues = new Map();
            
            entities.forEach(entity => {
                Object.keys(entity).forEach(attrName => {
                    if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(attrName)) {
                        attributeFrequency.set(attrName, (attributeFrequency.get(attrName) || 0) + 1);
                        
                        if (!attributeValues.has(attrName)) {
                            attributeValues.set(attrName, []);
                        }
                        attributeValues.get(attrName).push(entity[attrName]);
                    }
                });
            });
            
            // Identifica attributi comuni (presenti in >50% delle entità)
            const commonAttributes = {};
            const threshold = Math.ceil(entities.length * 0.5);
            
            for (const [attrName, frequency] of attributeFrequency) {
                if (frequency >= threshold) {
                    // Calcola valore più comune per default
                    const values = attributeValues.get(attrName);
                    const mostCommon = this.findMostCommonValue(values);
                    commonAttributes[attrName] = mostCommon;
                }
            }
            
            return commonAttributes;
            
        } catch (error) {
            console.warn(`⚠️ Warning getCommonModuleAttributes:`, error.message);
            return {};
        }
    }

    /**
     * Utility functions
     */
    findDominantEntityType(entityTypes) {
        const frequency = new Map();
        entityTypes.forEach(type => {
            frequency.set(type, (frequency.get(type) || 0) + 1);
        });
        
        let maxCount = 0;
        let dominantType = 'DynamicEntity';
        
        for (const [type, count] of frequency) {
            if (count > maxCount) {
                maxCount = count;
                dominantType = type;
            }
        }
        
        return dominantType;
    }

    findMostCommonValue(values) {
        const frequency = new Map();
        values.forEach(value => {
            frequency.set(value, (frequency.get(value) || 0) + 1);
        });
        
        let maxCount = 0;
        let mostCommon = null;
        
        for (const [value, count] of frequency) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = value;
            }
        }
        
        return mostCommon;
    }

    calculateRelationConfidence(entity, module) {
        // Logica di confidenza basata su fattori multipli
        let confidence = 0.5; // Base
        
        // Boost se entityType corrisponde al target del modulo
        if (entity.entityType === module.targetEntityType) {
            confidence += 0.3;
        }
        
        // Boost se ha attributi comuni del modulo
        if (entity.createdAt && module.createdAt) {
            const timeDiff = Math.abs(Date.parse(entity.createdAt) - Date.parse(module.createdAt));
            if (timeDiff < 3600000) { // 1 ora
                confidence += 0.2;
            }
        }
        
        return Math.min(1.0, confidence);
    }

    inferSemanticContext(entity, module) {
        return {
            contextType: entity.entityType === module.targetEntityType ? 'primary' : 'secondary',
            moduleTemplate: module.templateModuleId,
            likely_relationship: this.inferLikelyRelationship(entity.entityType, module.targetEntityType)
        };
    }

    inferLikelyRelationship(entityTypeA, entityTypeB) {
        // Pattern recognition per relazioni comuni
        const patterns = {
            'Persona,Azienda': 'lavora_per',
            'Progetto,Persona': 'assegnato_a',
            'Task,Persona': 'responsabile',
            'Cliente,Azienda': 'cliente_di'
        };
        
        const key = [entityTypeA, entityTypeB].sort().join(',');
        return patterns[key] || 'correlato_a';
    }

    deduplicateRelations(relations) {
        const seen = new Set();
        return relations.filter(rel => {
            const key = rel.entity.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async createModuleEntityLink(moduleId, entityId) {
        try {
            const cypher = `
                MATCH (m:Entity {id: $moduleId})
                MATCH (e:Entity {id: $entityId})
                MERGE (m)-[:CONTAINS]->(e)
                RETURN m, e
            `;
            
            await this.dao.connector.executeQuery(cypher, { moduleId, entityId });
            console.log(`🔗 Link esplicito creato: ${moduleId} -> ${entityId}`);
            
        } catch (error) {
            console.warn(`⚠️ Warning createModuleEntityLink:`, error.message);
        }
    }

    /**
     * API di compatibilità per gradual migration
     */
    async findRelations(pattern) {
        // Adatta il pattern alle relazioni implicite
        if (pattern.sourceEntityId) {
            const relations = await this.getRelatedEntities(pattern.sourceEntityId);
            
            // Converte in formato compatibile
            return relations.map(rel => ({
                id: `implicit_${rel.entity.id}`,
                relationType: rel.relationContext.type,
                sourceEntityId: pattern.sourceEntityId,
                targetEntityId: rel.entity.id,
                sourceEntity: { id: pattern.sourceEntityId },
                targetEntity: rel.entity,
                // Attributi della relazione implicita
                moduleId: rel.relationContext.moduleId,
                confidence: rel.relationContext.confidence,
                semantic: rel.relationContext.semanticContext
            }));
        }
        
        return []; // Fallback per pattern non supportati
    }

    /**
     * Cleanup e ottimizzazione
     */
    async cleanup() {
        // Pulisce cache con TTL scaduto
        this.moduleContexts.clear();
        this.entityModules.clear();
        
        console.log('🧹 ImplicitRelationManager cleanup completato');
    }
}

module.exports = ImplicitRelationManager;