/**
 * SoftValidationEngine - Validazione Gentile e Suggerimenti Intelligenti
 * Sostituisce validazione rigida con suggerimenti e correzioni automatiche
 */

class SoftValidationEngine {
    constructor(attributeDiscovery) {
        this.attributeDiscovery = attributeDiscovery;
        
        // Pattern di validazione intelligente
        this.validationPatterns = new Map();
        this.suggestionCache = new Map();
        
        // Contatori per learning
        this.validationStats = {
            totalValidations: 0,
            suggestionsAccepted: 0,
            autoCorrectionsApplied: 0
        };
        
        console.log('🤖 SoftValidationEngine inizializzato - Validazione Intelligente');
    }

    /**
     * ✨ CORE: Validazione gentile che non fallisce mai
     */
    async validateGently(entityType, attributeName, value, context = {}) {
        try {
            this.validationStats.totalValidations++;
            
            // 1. Sempre accetta il valore (no more rigid validation!)
            const validation = {
                accepted: true,
                originalValue: value,
                confidence: 1.0,
                suggestions: [],
                autoCorrections: [],
                insights: [],
                timestamp: Date.now()
            };
            
            // 2. Analizza pattern esistenti per insights
            const patterns = await this.analyzeAttributePatterns(entityType, attributeName);
            
            // 3. Genera suggerimenti intelligenti (non obbligatori)
            if (patterns && patterns.confidence > 0.3) {
                validation.suggestions = await this.generateSuggestions(value, patterns, context);
                validation.insights = await this.generateInsights(value, patterns);
            }
            
            // 4. Propone correzioni automatiche gentili
            const corrections = await this.generateAutoCorrections(value, patterns);
            if (corrections.length > 0) {
                validation.autoCorrections = corrections;
                validation.confidence = Math.max(0.7, validation.confidence);
            }
            
            // 5. Apprendi dal valore (sempre!)
            await this.attributeDiscovery.learnAttributeFromUsage(
                entityType, 
                attributeName, 
                value, 
                { ...context, validation: true }
            );
            
            console.log(`🤖 Validazione gentile: ${entityType}.${attributeName} = ✅ (${validation.suggestions.length} suggerimenti)`);
            return validation;
            
        } catch (error) {
            console.warn(`⚠️ Warning durante validazione gentile:`, error.message);
            
            // Fallback ultra-resiliente
            return {
                accepted: true,
                originalValue: value,
                confidence: 0.5,
                suggestions: [],
                autoCorrections: [],
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * Analizza pattern esistenti per un attributo
     */
    async analyzeAttributePatterns(entityType, attributeName) {
        try {
            // Recupera pattern dal AttributeDiscovery
            const entityPatterns = this.attributeDiscovery.attributePatterns.get(entityType);
            if (!entityPatterns) return null;
            
            const pattern = entityPatterns.get(attributeName);
            if (!pattern) return null;
            
            // Arricchisce con analisi aggiuntiva
            return {
                ...pattern,
                analysis: {
                    isEstablished: pattern.confidence > 0.7,
                    isEmerging: pattern.confidence > 0.3 && pattern.confidence <= 0.7,
                    isNew: pattern.confidence <= 0.3,
                    hasStrongPatterns: pattern.types.size === 1,
                    hasMultipleTypes: pattern.types.size > 1
                }
            };
            
        } catch (error) {
            console.warn(`⚠️ Warning analyzeAttributePatterns:`, error.message);
            return null;
        }
    }

    /**
     * ✨ Genera suggerimenti intelligenti basati su pattern
     */
    async generateSuggestions(value, patterns, context = {}) {
        const suggestions = [];
        
        try {
            // Suggerimento 1: Tipo migliorato
            if (patterns.dominantType !== this.attributeDiscovery.inferTypeFromValue(value)) {
                suggestions.push({
                    type: 'type_suggestion',
                    message: `Valore attuale rilevato come '${this.attributeDiscovery.inferTypeFromValue(value)}', ma questo attributo è solitamente '${patterns.dominantType}'`,
                    suggestion: `Considera se il valore dovrebbe essere formattato come ${patterns.dominantType}`,
                    confidence: patterns.confidence,
                    category: 'type_consistency'
                });
            }
            
            // Suggerimento 2: Valori comuni
            if (patterns.commonValues.size > 0 && !patterns.commonValues.has(value)) {
                const commonList = Array.from(patterns.commonValues).slice(0, 3).join(', ');
                suggestions.push({
                    type: 'common_values',
                    message: `Valori comuni per questo attributo: ${commonList}`,
                    alternatives: Array.from(patterns.commonValues),
                    confidence: patterns.confidence * 0.8,
                    category: 'value_consistency'
                });
            }
            
            // Suggerimento 3: Lunghezza inaspettata (per stringhe)
            if (typeof value === 'string' && patterns.dominantType === 'string') {
                const stats = this.attributeDiscovery.usageStats.get(`${patterns.entityType}.${patterns.name}`);
                if (stats && stats.averageLength > 0) {
                    const lengthDiff = Math.abs(value.length - stats.averageLength);
                    if (lengthDiff > stats.averageLength * 0.5) {
                        suggestions.push({
                            type: 'length_anomaly',
                            message: `Lunghezza inaspettata: ${value.length} caratteri (media: ${Math.round(stats.averageLength)})`,
                            expectedRange: `${Math.round(stats.averageLength * 0.5)}-${Math.round(stats.averageLength * 1.5)} caratteri`,
                            confidence: 0.6,
                            category: 'format_suggestion'
                        });
                    }
                }
            }
            
            // Suggerimento 4: Pattern formato (email, telefono, etc.)
            const formatSuggestion = this.generateFormatSuggestion(value, patterns);
            if (formatSuggestion) {
                suggestions.push(formatSuggestion);
            }
            
            // Suggerimento 5: Contesto modulare
            if (context.moduleId) {
                const contextSuggestion = await this.generateContextualSuggestion(value, patterns, context.moduleId);
                if (contextSuggestion) {
                    suggestions.push(contextSuggestion);
                }
            }
            
        } catch (error) {
            console.warn(`⚠️ Warning generateSuggestions:`, error.message);
        }
        
        // Ordina per confidenza e limita
        return suggestions
            .sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5))
            .slice(0, 5);
    }

    /**
     * Genera suggerimenti di formato
     */
    generateFormatSuggestion(value, patterns) {
        if (typeof value !== 'string') return null;
        
        // Email pattern
        if (patterns.dominantType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return {
                type: 'format_email',
                message: 'Questo campo solitamente contiene indirizzi email',
                suggestion: 'Verifica che l\'indirizzo email sia corretto',
                example: 'esempio@dominio.com',
                confidence: 0.8,
                category: 'format_suggestion'
            };
        }
        
        // Telefono pattern
        if (patterns.dominantType === 'phone' && !/^[\+\d\s\-\(\)]{8,}$/.test(value)) {
            return {
                type: 'format_phone',
                message: 'Questo campo solitamente contiene numeri di telefono',
                suggestion: 'Considera di usare un formato telefono standard',
                example: '+39 123 456 7890',
                confidence: 0.7,
                category: 'format_suggestion'
            };
        }
        
        // URL pattern
        if (patterns.dominantType === 'url' && !/^https?:\/\//.test(value)) {
            return {
                type: 'format_url',
                message: 'Questo campo solitamente contiene URL',
                suggestion: 'Aggiungi http:// o https:// all\'inizio',
                example: 'https://esempio.com',
                confidence: 0.8,
                category: 'format_suggestion'
            };
        }
        
        return null;
    }

    /**
     * Genera suggerimento contestuale basato sul modulo
     */
    async generateContextualSuggestion(value, patterns, moduleId) {
        try {
            // Analizza altri valori nello stesso modulo per lo stesso attributo
            const moduleEntities = await this.getEntitiesInModule(moduleId);
            const sameAttributeValues = moduleEntities
                .map(entity => entity[patterns.name])
                .filter(val => val && val !== value);
            
            if (sameAttributeValues.length > 0) {
                const uniqueValues = [...new Set(sameAttributeValues)];
                
                if (uniqueValues.length <= 3) {
                    return {
                        type: 'module_context',
                        message: `Altri valori in questo modulo: ${uniqueValues.join(', ')}`,
                        suggestion: 'Considera se il valore è coerente con gli altri nel modulo',
                        moduleValues: uniqueValues,
                        confidence: 0.6,
                        category: 'context_consistency'
                    };
                }
            }
            
        } catch (error) {
            console.warn(`⚠️ Warning generateContextualSuggestion:`, error.message);
        }
        
        return null;
    }

    /**
     * ✨ Genera correzioni automatiche intelligenti
     */
    async generateAutoCorrections(value, patterns) {
        const corrections = [];
        
        try {
            if (typeof value !== 'string') return corrections;
            
            // Correzione 1: Trim automatico
            const trimmed = value.trim();
            if (trimmed !== value) {
                corrections.push({
                    type: 'trim_whitespace',
                    original: value,
                    corrected: trimmed,
                    reason: 'Rimozione spazi iniziali/finali',
                    confidence: 0.9,
                    autoApply: true
                });
            }
            
            // Correzione 2: Case normalization per email
            if (patterns && patterns.dominantType === 'email') {
                const lowercased = value.toLowerCase();
                if (lowercased !== value) {
                    corrections.push({
                        type: 'email_lowercase',
                        original: value,
                        corrected: lowercased,
                        reason: 'Email in minuscolo (standard)',
                        confidence: 0.8,
                        autoApply: true
                    });
                }
            }
            
            // Correzione 3: URL protocol
            if (patterns && patterns.dominantType === 'url' && !value.startsWith('http')) {
                const withProtocol = value.startsWith('www.') ? `https://${value}` : `https://${value}`;
                corrections.push({
                    type: 'url_protocol',
                    original: value,
                    corrected: withProtocol,
                    reason: 'Aggiunta protocollo HTTPS',
                    confidence: 0.7,
                    autoApply: false // Chiede conferma
                });
            }
            
            // Correzione 4: Capitalizzazione nomi
            if (patterns && patterns.name.toLowerCase().includes('nome')) {
                const capitalized = value.replace(/\b\w/g, l => l.toUpperCase());
                if (capitalized !== value && value.length > 1) {
                    corrections.push({
                        type: 'name_capitalization',
                        original: value,
                        corrected: capitalized,
                        reason: 'Capitalizzazione nome',
                        confidence: 0.6,
                        autoApply: false
                    });
                }
            }
            
        } catch (error) {
            console.warn(`⚠️ Warning generateAutoCorrections:`, error.message);
        }
        
        return corrections;
    }

    /**
     * ✨ Genera insights intelligenti sul valore
     */
    async generateInsights(value, patterns) {
        const insights = [];
        
        try {
            // Insight 1: Novità del valore
            if (patterns.commonValues.size > 0 && !patterns.commonValues.has(value)) {
                insights.push({
                    type: 'new_value',
                    message: 'Questo è un nuovo valore per questo attributo',
                    impact: 'Il sistema apprenderà questo nuovo pattern',
                    category: 'learning'
                });
            }
            
            // Insight 2: Stabilità del pattern
            if (patterns.confidence > 0.8) {
                insights.push({
                    type: 'stable_pattern',
                    message: 'Questo attributo ha un pattern ben consolidato',
                    impact: 'Il valore è coerente con l\'uso passato',
                    category: 'consistency'
                });
            } else if (patterns.confidence < 0.3) {
                insights.push({
                    type: 'emerging_pattern',
                    message: 'Questo attributo sta ancora definendo il suo pattern',
                    impact: 'Il sistema sta ancora imparando come viene usato',
                    category: 'evolution'
                });
            }
            
            // Insight 3: Diversità tipologica
            if (patterns.types.size > 1) {
                insights.push({
                    type: 'type_diversity',
                    message: `Questo attributo ha mostrato ${patterns.types.size} tipi diversi`,
                    types: Array.from(patterns.types),
                    impact: 'Il campo è flessibile e accetta diversi formati',
                    category: 'flexibility'
                });
            }
            
        } catch (error) {
            console.warn(`⚠️ Warning generateInsights:`, error.message);
        }
        
        return insights;
    }

    /**
     * ✨ Applica correzione automatica se accettata
     */
    async applyAutoCorrection(entityId, attributeName, correction) {
        try {
            if (!correction.autoApply) {
                throw new Error('Correzione richiede conferma utente');
            }
            
            // Applica la correzione
            await this.dao.updateEntityAttribute(entityId, attributeName, correction.corrected);
            
            // Aggiorna statistiche
            this.validationStats.autoCorrectionsApplied++;
            
            console.log(`✨ Auto-correzione applicata: ${correction.type} su ${entityId}.${attributeName}`);
            return { success: true, correction };
            
        } catch (error) {
            console.error(`❌ Errore applicazione auto-correzione:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * ✨ Registra feedback utente sui suggerimenti
     */
    async recordSuggestionFeedback(suggestionId, accepted, entityType, attributeName) {
        try {
            if (accepted) {
                this.validationStats.suggestionsAccepted++;
                
                // Migliora pattern di suggerimenti per il futuro
                const key = `${entityType}.${attributeName}`;
                if (!this.suggestionCache.has(key)) {
                    this.suggestionCache.set(key, { accepted: 0, total: 0 });
                }
                
                const cache = this.suggestionCache.get(key);
                cache.accepted++;
                cache.total++;
                
                console.log(`👍 Suggerimento accettato per ${entityType}.${attributeName}`);
            }
            
        } catch (error) {
            console.warn(`⚠️ Warning recordSuggestionFeedback:`, error.message);
        }
    }

    /**
     * Utility per recuperare entità in un modulo
     */
    async getEntitiesInModule(moduleId) {
        try {
            const cypher = `
                MATCH (m:Entity {id: $moduleId})
                MATCH (e:Entity)
                WHERE e.targetEntityId = $moduleId OR e.moduleId = $moduleId
                RETURN e
            `;
            
            const result = await this.dao.connector.executeQuery(cypher, { moduleId });
            return result.records.map(record => record.get('e').properties);
            
        } catch (error) {
            console.warn(`⚠️ Warning getEntitiesInModule:`, error.message);
            return [];
        }
    }

    /**
     * ✨ Genera report di validazione per analytics
     */
    generateValidationReport() {
        const acceptanceRate = this.validationStats.totalValidations > 0 
            ? (this.validationStats.suggestionsAccepted / this.validationStats.totalValidations * 100).toFixed(1)
            : 0;
        
        return {
            statistics: this.validationStats,
            acceptanceRate: `${acceptanceRate}%`,
            topSuggestionTypes: this.getTopSuggestionTypes(),
            systemHealth: {
                validationsPerformed: this.validationStats.totalValidations,
                autoCorrectionsApplied: this.validationStats.autoCorrectionsApplied,
                userEngagement: this.validationStats.suggestionsAccepted > 0 ? 'active' : 'passive'
            },
            generatedAt: new Date().toISOString()
        };
    }

    getTopSuggestionTypes() {
        // Analizza cache dei suggerimenti per identificare pattern
        const typeStats = new Map();
        
        for (const [key, stats] of this.suggestionCache) {
            const acceptanceRate = stats.total > 0 ? stats.accepted / stats.total : 0;
            typeStats.set(key, {
                acceptanceRate,
                totalSuggestions: stats.total,
                acceptedSuggestions: stats.accepted
            });
        }
        
        return Array.from(typeStats.entries())
            .sort((a, b) => b[1].acceptanceRate - a[1].acceptanceRate)
            .slice(0, 5)
            .map(([key, stats]) => ({ attribute: key, ...stats }));
    }

    /**
     * API di compatibilità per gradual migration
     */
    async validateAttribute(entityType, attributeName, value) {
        // Compatibilità: sempre true, ma con suggerimenti
        const validation = await this.validateGently(entityType, attributeName, value);
        return {
            isValid: true, // Sempre valido!
            suggestions: validation.suggestions,
            insights: validation.insights,
            organic: true
        };
    }

    /**
     * Cleanup e ottimizzazione
     */
    async cleanup() {
        // Limita dimensione cache suggerimenti
        if (this.suggestionCache.size > 500) {
            const entries = Array.from(this.suggestionCache.entries());
            this.suggestionCache.clear();
            
            // Mantieni solo i più utilizzati
            entries
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 250)
                .forEach(([key, value]) => this.suggestionCache.set(key, value));
        }
        
        console.log('🧹 SoftValidationEngine cleanup completato');
    }
}

module.exports = SoftValidationEngine;