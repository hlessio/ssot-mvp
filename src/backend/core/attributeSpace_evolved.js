/**
 * AttributeSpace Evoluto - Gestione avanzata delle sottoscrizioni con pattern matching
 * Evoluzione dell'AttributeSpace_MVP per supportare:
 * - Pattern matching flessibile per sottoscrizioni
 * - Batching delle notifiche per performance
 * - Gestione eventi relazioni oltre entità
 * - Prevenzione loop infiniti
 */

class AttributeSpace {
    constructor(options = {}) {
        // Configurazione
        this.config = {
            enableBatching: options.enableBatching !== false, // Default true
            batchDelay: options.batchDelay || 50, // ms
            maxLoopDetection: options.maxLoopDetection || 10,
            enableLogging: options.enableLogging !== false,
            ...options
        };

        // Sottoscrizioni con pattern matching
        this.subscriptions = new Map(); // subscriptionId -> SubscriptionInfo
        this.subscriptionCounter = 0;

        // Batching delle notifiche
        this.pendingNotifications = new Map(); // key -> notification
        this.batchTimer = null;

        // Loop detection
        this.notificationDepth = 0;
        this.processingNotifications = false;

        // Statistiche
        this.stats = {
            totalSubscriptions: 0,
            totalNotifications: 0,
            batchedNotifications: 0,
            droppedNotifications: 0
        };

        this.log('AttributeSpace Evoluto inizializzato', this.config);
    }

    /**
     * Sottoscrizione avanzata con pattern matching
     * @param {Object} pattern - Pattern di sottoscrizione
     * @param {Function} callback - Funzione di callback
     * @returns {string} - ID della sottoscrizione per unsubscribe
     */
    subscribe(pattern, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Il callback deve essere una funzione');
        }

        const subscriptionId = `sub_${++this.subscriptionCounter}`;
        
        // Normalizza il pattern
        const normalizedPattern = this.normalizePattern(pattern);
        
        const subscription = {
            id: subscriptionId,
            pattern: normalizedPattern,
            callback: callback,
            created: new Date(),
            matchCount: 0
        };

        this.subscriptions.set(subscriptionId, subscription);
        this.stats.totalSubscriptions++;

        this.log(`Nuova sottoscrizione registrata: ${subscriptionId}`, normalizedPattern);
        
        return subscriptionId;
    }

    /**
     * Rimuove una sottoscrizione
     * @param {string} subscriptionId - ID della sottoscrizione da rimuovere
     */
    unsubscribe(subscriptionId) {
        if (this.subscriptions.delete(subscriptionId)) {
            this.log(`Sottoscrizione rimossa: ${subscriptionId}`);
            return true;
        }
        return false;
    }

    /**
     * Normalizza il pattern di sottoscrizione
     * @param {Object|Function} pattern - Pattern o callback legacy
     * @returns {Object} - Pattern normalizzato
     */
    normalizePattern(pattern) {
        // Compatibilità backward con AttributeSpace_MVP
        if (typeof pattern === 'function') {
            return {
                type: 'all', // Riceve tutto come prima
                entityType: '*',
                entityId: '*',
                attributeName: '*',
                changeType: '*'
            };
        }

        // Pattern object
        return {
            type: pattern.type || 'entity', // 'entity', 'relation', 'schema', 'all'
            entityType: pattern.entityType || '*',
            entityId: pattern.entityId || '*',
            attributeName: pattern.attributeName || '*',
            attributeNamePattern: pattern.attributeNamePattern,
            attributeType: pattern.attributeType,
            changeType: pattern.changeType || '*', // 'create', 'update', 'delete'
            relationType: pattern.relationType || '*',
            sourceEntityType: pattern.sourceEntityType,
            targetEntityType: pattern.targetEntityType,
            custom: pattern.custom // Custom matching function
        };
    }

    /**
     * Notifica principale - supporta entità, relazioni e schemi
     * @param {Object} changeDetails - Dettagli del cambiamento
     */
    notifyChange(changeDetails) {
        if (this.processingNotifications && this.notificationDepth > this.config.maxLoopDetection) {
            this.stats.droppedNotifications++;
            this.log('Loop infinito rilevato, notifica scartata', changeDetails);
            return;
        }

        this.stats.totalNotifications++;
        
        // Determina il tipo di cambiamento se non specificato
        const enrichedDetails = this.enrichChangeDetails(changeDetails);

        if (this.config.enableBatching) {
            this.addToBatch(enrichedDetails);
        } else {
            this.processNotification(enrichedDetails);
        }
    }

    /**
     * Arricchisce i dettagli del cambiamento
     */
    enrichChangeDetails(details) {
        return {
            // Dettagli originali
            ...details,
            
            // Arricchimenti
            timestamp: details.timestamp || Date.now(),
            changeType: details.changeType || this.inferChangeType(details),
            type: details.type || (details.relationType ? 'relation' : 'entity'),
            
            // Per compatibilità MVP
            entityId: details.entityId,
            attributeName: details.attributeName,
            newValue: details.newValue,
            oldValue: details.oldValue
        };
    }

    /**
     * Inferisce il tipo di cambiamento
     */
    inferChangeType(details) {
        if (details.newValue !== undefined && details.oldValue === undefined) {
            return 'create';
        } else if (details.newValue !== undefined && details.oldValue !== undefined) {
            return 'update';
        } else if (details.newValue === undefined && details.oldValue !== undefined) {
            return 'delete';
        }
        return 'update'; // Default
    }

    /**
     * Aggiunge notifica al batch
     */
    addToBatch(details) {
        const batchKey = this.generateBatchKey(details);
        
        // Aggiorna o crea entry nel batch
        if (this.pendingNotifications.has(batchKey)) {
            const existing = this.pendingNotifications.get(batchKey);
            // Mantieni la notifica più recente o unisci se necessario
            this.pendingNotifications.set(batchKey, {
                ...existing,
                ...details,
                batchCount: (existing.batchCount || 1) + 1
            });
        } else {
            this.pendingNotifications.set(batchKey, { ...details, batchCount: 1 });
        }

        // Imposta timer se non già attivo
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.processBatch();
            }, this.config.batchDelay);
        }
    }

    /**
     * Genera chiave per il batching
     */
    generateBatchKey(details) {
        return `${details.type || 'entity'}_${details.entityId || 'unknown'}_${details.attributeName || 'all'}`;
    }

    /**
     * Processa il batch di notifiche
     */
    processBatch() {
        if (this.pendingNotifications.size === 0) {
            this.batchTimer = null;
            return;
        }

        const notifications = Array.from(this.pendingNotifications.values());
        this.pendingNotifications.clear();
        this.batchTimer = null;

        this.stats.batchedNotifications += notifications.length;

        this.log(`Processando batch di ${notifications.length} notifiche`);

        notifications.forEach(notification => {
            this.processNotification(notification);
        });
    }

    /**
     * Processa una singola notifica
     */
    processNotification(details) {
        this.processingNotifications = true;
        this.notificationDepth++;

        try {
            const matchingSubscriptions = this.findMatchingSubscriptions(details);
            
            this.log(`Trovate ${matchingSubscriptions.length} sottoscrizioni corrispondenti per:`, {
                type: details.type,
                entityId: details.entityId,
                attributeName: details.attributeName
            });

            matchingSubscriptions.forEach(subscription => {
                try {
                    subscription.matchCount++;
                    subscription.callback(details);
                } catch (error) {
                    this.log(`Errore nel callback della sottoscrizione ${subscription.id}:`, error);
                }
            });

        } finally {
            this.notificationDepth--;
            if (this.notificationDepth === 0) {
                this.processingNotifications = false;
            }
        }
    }

    /**
     * Trova sottoscrizioni che matchano il cambiamento
     */
    findMatchingSubscriptions(details) {
        const matching = [];

        for (const subscription of this.subscriptions.values()) {
            if (this.matchesPattern(details, subscription.pattern)) {
                matching.push(subscription);
            }
        }

        return matching;
    }

    /**
     * Verifica se i dettagli matchano il pattern
     */
    matchesPattern(details, pattern) {
        // Custom matching function
        if (pattern.custom && typeof pattern.custom === 'function') {
            try {
                return pattern.custom(details);
            } catch (error) {
                this.log('Errore in custom pattern matching:', error);
                return false;
            }
        }

        // Type matching
        if (pattern.type !== 'all' && pattern.type !== details.type) {
            return false;
        }

        // Entity matching
        if (pattern.entityType !== '*' && pattern.entityType !== details.entityType) {
            return false;
        }

        if (pattern.entityId !== '*' && pattern.entityId !== details.entityId) {
            return false;
        }

        // Attribute matching
        if (pattern.attributeName !== '*' && pattern.attributeName !== details.attributeName) {
            return false;
        }

        // Pattern matching per nome attributo
        if (pattern.attributeNamePattern && !this.matchWildcard(details.attributeName, pattern.attributeNamePattern)) {
            return false;
        }

        // Change type matching
        if (pattern.changeType !== '*' && pattern.changeType !== details.changeType) {
            return false;
        }

        // Relation-specific matching
        if (details.type === 'relation') {
            if (pattern.relationType !== '*' && pattern.relationType !== details.relationType) {
                return false;
            }

            if (pattern.sourceEntityType && pattern.sourceEntityType !== details.sourceEntityType) {
                return false;
            }

            if (pattern.targetEntityType && pattern.targetEntityType !== details.targetEntityType) {
                return false;
            }
        }

        return true;
    }

    /**
     * Pattern matching con wildcard
     */
    matchWildcard(text, pattern) {
        if (!text || !pattern) return false;
        
        // Converte pattern wildcard in regex
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
            
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(text);
    }

    /**
     * API per compatibilità backward con AttributeSpace_MVP
     */
    subscribeLegacy(callback) {
        return this.subscribe('all', callback);
    }

    /**
     * Notifica eventi relazioni
     */
    notifyRelationChange(relationDetails) {
        this.notifyChange({
            ...relationDetails,
            type: 'relation'
        });
    }

    /**
     * Notifica eventi schema
     */
    notifySchemaChange(schemaDetails) {
        this.notifyChange({
            ...schemaDetails,
            type: 'schema'
        });
    }

    /**
     * Forza il flush del batch corrente
     */
    flushBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.processBatch();
        }
    }

    /**
     * Statistiche dettagliate
     */
    getStats() {
        return {
            ...this.stats,
            activeSubscriptions: this.subscriptions.size,
            pendingNotifications: this.pendingNotifications.size,
            isProcessing: this.processingNotifications,
            config: this.config
        };
    }

    /**
     * Lista sottoscrizioni attive (per debugging)
     */
    getActiveSubscriptions() {
        return Array.from(this.subscriptions.values()).map(sub => ({
            id: sub.id,
            pattern: sub.pattern,
            created: sub.created,
            matchCount: sub.matchCount
        }));
    }

    /**
     * Pulizia e reset
     */
    clearAllSubscriptions() {
        const count = this.subscriptions.size;
        this.subscriptions.clear();
        this.flushBatch();
        this.log(`Tutte le sottoscrizioni rimosse (${count})`);
        return count;
    }

    /**
     * Logging interno
     */
    log(message, data = null) {
        if (this.config.enableLogging) {
            if (data) {
                console.log(`[AttributeSpace] ${message}`, data);
            } else {
                console.log(`[AttributeSpace] ${message}`);
            }
        }
    }

    /**
     * Shutdown graceful
     */
    shutdown() {
        this.flushBatch();
        this.clearAllSubscriptions();
        this.log('AttributeSpace shutting down', this.getStats());
    }
}

module.exports = AttributeSpace; 