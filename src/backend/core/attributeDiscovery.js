/**
 * AttributeDiscoveryManager - Sistema Organico di Schema Evolution
 * Sostituisce il rigido SchemaManager con apprendimento automatico dall'uso
 */

class AttributeDiscoveryManager {
    constructor(dao) {
        this.dao = dao;
        
        // Cache per pattern emergenti - lightweight
        this.attributePatterns = new Map(); // entityType -> Map(attributeName -> pattern)
        this.usageStats = new Map(); // entityType.attributeName -> stats
        this.emergingTypes = new Map(); // track type evolution
        
        console.log('🌱 AttributeDiscoveryManager inizializzato - Schema Organico');
    }

    /**
     * ✨ CORE: Apprende attributi dall'uso reale invece di definizioni rigide
     */
    async learnAttributeFromUsage(entityType, attributeName, value, context = {}) {
        try {
            // 1. Inferisce tipo automaticamente dal valore
            const inferredType = this.inferTypeFromValue(value);
            
            // 2. Registra pattern emergente
            const pattern = await this.updateAttributePattern(entityType, attributeName, inferredType, value);
            
            // 3. Aggiorna statistiche d'uso
            await this.updateUsageStats(entityType, attributeName, value, context);
            
            console.log(`🌱 Appreso attributo: ${entityType}.${attributeName} = ${inferredType}`);
            return pattern;
            
        } catch (error) {
            console.warn(`⚠️ Warning durante apprendimento attributo:`, error.message);
            // Non fallisce mai - sistema resiliente
            return this.createFallbackPattern(entityType, attributeName, value);
        }
    }

    /**
     * Inferisce tipo intelligente dal valore
     */
    inferTypeFromValue(value) {
        if (value === null || value === undefined) return 'any';
        
        // Pattern recognition avanzato
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }
        
        if (typeof value === 'boolean') return 'boolean';
        
        if (typeof value === 'string') {
            // Pattern email
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
            
            // Pattern URL
            if (/^https?:\/\//.test(value)) return 'url';
            
            // Pattern data
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
            
            // Pattern telefono
            if (/^[\+\d\s\-\(\)]{8,}$/.test(value)) return 'phone';
            
            return 'string';
        }
        
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        
        return 'string'; // fallback sicuro
    }

    /**
     * Aggiorna pattern emergente per attributo
     */
    async updateAttributePattern(entityType, attributeName, inferredType, value) {
        const key = `${entityType}.${attributeName}`;
        
        if (!this.attributePatterns.has(entityType)) {
            this.attributePatterns.set(entityType, new Map());
        }
        
        const entityPatterns = this.attributePatterns.get(entityType);
        const existingPattern = entityPatterns.get(attributeName) || {
            name: attributeName,
            types: new Set(),
            commonValues: new Set(),
            frequency: 0,
            firstSeen: Date.now(),
            lastUsed: Date.now(),
            confidence: 0.1
        };
        
        // Aggiorna pattern con nuovo valore
        existingPattern.types.add(inferredType);
        if (existingPattern.commonValues.size < 10) {
            existingPattern.commonValues.add(value);
        }
        existingPattern.frequency++;
        existingPattern.lastUsed = Date.now();
        existingPattern.confidence = Math.min(1.0, existingPattern.frequency / 10);
        
        // Determina tipo dominante
        existingPattern.dominantType = this.calculateDominantType(existingPattern.types);
        
        entityPatterns.set(attributeName, existingPattern);
        
        // Persiste pattern emergente (lightweight)
        await this.persistPattern(entityType, attributeName, existingPattern);
        
        return existingPattern;
    }

    /**
     * Calcola tipo dominante da set di tipi osservati
     */
    calculateDominantType(typesSet) {
        const types = Array.from(typesSet);
        if (types.length === 1) return types[0];
        
        // Priorità: tipi più specifici vincono
        const priority = ['email', 'url', 'date', 'phone', 'number', 'integer', 'boolean', 'string', 'object', 'array'];
        
        for (const type of priority) {
            if (types.includes(type)) return type;
        }
        
        return 'string'; // fallback
    }

    /**
     * Aggiorna statistiche d'uso per machine learning
     */
    async updateUsageStats(entityType, attributeName, value, context) {
        const key = `${entityType}.${attributeName}`;
        const stats = this.usageStats.get(key) || {
            totalUsage: 0,
            uniqueValues: new Set(),
            contexts: new Set(),
            averageLength: 0,
            trends: []
        };
        
        stats.totalUsage++;
        stats.uniqueValues.add(value);
        if (context.moduleId) stats.contexts.add(context.moduleId);
        
        // Calcola lunghezza media per stringhe
        if (typeof value === 'string') {
            stats.averageLength = (stats.averageLength + value.length) / 2;
        }
        
        // Track trends temporali
        stats.trends.push({
            timestamp: Date.now(),
            value: value,
            context: context
        });
        
        // Mantieni solo ultimi 100 trend per performance
        if (stats.trends.length > 100) {
            stats.trends = stats.trends.slice(-50);
        }
        
        this.usageStats.set(key, stats);
    }

    /**
     * Persiste pattern emergente nel database (ultra-lightweight)
     */
    async persistPattern(entityType, attributeName, pattern) {
        try {
            // Struttura semplificata per Neo4j
            const simplePattern = {
                entityType,
                attributeName,
                dominantType: pattern.dominantType,
                frequency: pattern.frequency,
                confidence: pattern.confidence,
                lastUsed: pattern.lastUsed,
                sampleValues: Array.from(pattern.commonValues).slice(0, 3)
            };
            
            const cypher = `
                MERGE (p:AttributePattern {entityType: $entityType, attributeName: $attributeName})
                SET p += $pattern, p.updated = timestamp()
                RETURN p
            `;
            
            await this.dao.connector.executeQuery(cypher, {
                entityType,
                attributeName,
                pattern: simplePattern
            });
            
        } catch (error) {
            // Non critico - pattern rimane in memoria
            console.warn(`⚠️ Pattern persistence warning:`, error.message);
        }
    }

    /**
     * ✨ Suggerisce attributi per nuovo modulo basato su pattern emergenti
     */
    async suggestAttributesForModule(moduleContext, existingEntityTypes = []) {
        const suggestions = [];
        
        // Analizza entità simili
        for (const entityType of existingEntityTypes) {
            const patterns = this.attributePatterns.get(entityType);
            if (!patterns) continue;
            
            for (const [attrName, pattern] of patterns) {
                if (pattern.confidence > 0.5) {
                    suggestions.push({
                        name: attrName,
                        type: pattern.dominantType,
                        confidence: pattern.confidence,
                        frequency: pattern.frequency,
                        examples: Array.from(pattern.commonValues).slice(0, 2),
                        reason: `Comune in ${entityType} (${pattern.frequency} usi)`
                    });
                }
            }
        }
        
        // Ordina per confidenza
        return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
    }

    /**
     * ✨ Propaga attributo comune a tutte le entità in un modulo
     */
    async propagateAttributeToModule(moduleId, attributeName, defaultValue, options = {}) {
        try {
            console.log(`🌊 Propagando attributo ${attributeName} al modulo ${moduleId}`);
            
            // 1. Trova tutte le entità nel modulo
            const entities = await this.getEntitiesInModule(moduleId);
            
            // 2. Inferisce tipo dal defaultValue
            const inferredType = this.inferTypeFromValue(defaultValue);
            
            // 3. Aggiunge attributo a tutte le entità
            for (const entity of entities) {
                // Apprende pattern per ogni entità
                await this.learnAttributeFromUsage(
                    entity.entityType, 
                    attributeName, 
                    defaultValue,
                    { moduleId, propagated: true }
                );
                
                // Aggiorna entità nel database
                await this.dao.updateEntityAttribute(entity.id, attributeName, defaultValue);
                
                // Delay minimo per evitare overload
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            console.log(`✅ Attributo ${attributeName} propagato a ${entities.length} entità`);
            return { success: true, entitiesUpdated: entities.length, inferredType };
            
        } catch (error) {
            console.error(`❌ Errore propagazione attributo:`, error.message);
            throw error;
        }
    }

    /**
     * Ottieni entità associate a un modulo
     */
    async getEntitiesInModule(moduleId) {
        try {
            // Query semplificata per trovare entità collegate al modulo
            const cypher = `
                MATCH (m:Entity {id: $moduleId})-[:CONTAINS|REFERENCES]-(e:Entity)
                WHERE e.id <> $moduleId
                RETURN DISTINCT e
                
                UNION
                
                MATCH (e:Entity)
                WHERE e.targetEntityId = $moduleId OR e.moduleId = $moduleId
                RETURN DISTINCT e
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { moduleId });
            
            return result.records.map(record => record.get('e').properties);
            
        } catch (error) {
            console.warn(`⚠️ Warning recupero entità modulo:`, error.message);
            return []; // Fallback vuoto
        }
    }

    /**
     * Fallback pattern per resilienza
     */
    createFallbackPattern(entityType, attributeName, value) {
        return {
            name: attributeName,
            dominantType: this.inferTypeFromValue(value),
            frequency: 1,
            confidence: 0.1,
            sampleValues: [value],
            fallback: true
        };
    }

    /**
     * ✨ Genera documentazione vivente degli schemi emergenti
     */
    async generateLivingDocumentation(entityType) {
        const patterns = this.attributePatterns.get(entityType);
        if (!patterns) return { entityType, attributes: [], status: 'No patterns yet' };
        
        const documentation = {
            entityType,
            attributes: [],
            emergence: {
                totalAttributes: patterns.size,
                highConfidence: 0,
                emergingPatterns: 0
            },
            generatedAt: new Date().toISOString()
        };
        
        for (const [attrName, pattern] of patterns) {
            const attrDoc = {
                name: attrName,
                type: pattern.dominantType,
                confidence: pattern.confidence,
                usage: pattern.frequency,
                examples: Array.from(pattern.commonValues).slice(0, 3),
                status: pattern.confidence > 0.7 ? 'established' : 'emerging'
            };
            
            documentation.attributes.push(attrDoc);
            
            if (pattern.confidence > 0.7) documentation.emergence.highConfidence++;
            else documentation.emergence.emergingPatterns++;
        }
        
        return documentation;
    }

    /**
     * API di compatibilità con il vecchio SchemaManager (gradual migration)
     */
    async getEntitySchema(entityType) {
        const patterns = this.attributePatterns.get(entityType);
        if (!patterns) {
            // Schema vuoto ma valido per compatibilità
            return {
                entityType,
                mode: 'organic',
                attributes: [],
                version: 1,
                organic: true,
                status: 'emerging'
            };
        }
        
        // Converte pattern in formato schema per compatibilità
        const attributes = Array.from(patterns.values()).map(pattern => ({
            name: pattern.name,
            type: pattern.dominantType,
            required: false, // Schema organico = tutto opzionale
            confidence: pattern.confidence,
            organic: true
        }));
        
        return {
            entityType,
            mode: 'organic',
            attributes,
            version: 1,
            organic: true,
            status: 'learned_from_usage'
        };
    }

    /**
     * Cleanup e ottimizzazione memoria
     */
    async cleanup() {
        // Rimuovi pattern con confidenza troppo bassa
        for (const [entityType, patterns] of this.attributePatterns) {
            for (const [attrName, pattern] of patterns) {
                if (pattern.confidence < 0.1 && pattern.frequency < 2) {
                    patterns.delete(attrName);
                }
            }
        }
        
        // Limita usage stats
        if (this.usageStats.size > 1000) {
            const entries = Array.from(this.usageStats.entries());
            this.usageStats.clear();
            
            // Mantieni solo i più usati
            entries
                .sort((a, b) => b[1].totalUsage - a[1].totalUsage)
                .slice(0, 500)
                .forEach(([key, value]) => this.usageStats.set(key, value));
        }
        
        console.log('🧹 AttributeDiscovery cleanup completato');
    }
}

module.exports = AttributeDiscoveryManager;