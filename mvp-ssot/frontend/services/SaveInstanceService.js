/**
 * SaveInstanceService.js - Servizio per gestione ModuleInstance salvabili
 * 
 * Responsabilità:
 * - CRUD operations per ModuleInstance
 * - Validazione struttura instance data
 * - Cache intelligente e invalidazione
 * - Integrazione con backend evoluto
 * - Gestione configurazioni override
 */

class SaveInstanceService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 secondi
        this.pendingRequests = new Map();
        
        console.log('🔧 [SaveInstanceService] Inizializzato');
    }

    /**
     * Crea una nuova istanza di modulo
     */
    async createInstance(instanceData) {
        try {
            console.log('📝 [SaveInstanceService] Creando istanza:', instanceData);

            // Validazione dati istanza
            this.validateInstanceData(instanceData, true);

            const response = await fetch('/api/module-instances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(instanceData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const createdInstance = await response.json();
            
            // Aggiungi alla cache
            this.cacheInstance(createdInstance);
            
            console.log('✅ [SaveInstanceService] Istanza creata:', createdInstance.id);
            return createdInstance;

        } catch (error) {
            console.error('❌ [SaveInstanceService] Errore creazione istanza:', error);
            throw error;
        }
    }

    /**
     * Recupera un'istanza per ID
     */
    async getInstance(instanceId) {
        try {
            // Controlla cache prima
            const cached = this.getCachedInstance(instanceId);
            if (cached) {
                console.log(`💾 [SaveInstanceService] Istanza ${instanceId} da cache`);
                return cached;
            }

            // Controlla richieste pendenti per evitare duplicati
            if (this.pendingRequests.has(instanceId)) {
                console.log(`⏳ [SaveInstanceService] Richiesta ${instanceId} in corso, aspettando...`);
                return await this.pendingRequests.get(instanceId);
            }

            console.log(`🔍 [SaveInstanceService] Caricando istanza ${instanceId}`);

            // Crea promise per richiesta
            const requestPromise = this.fetchInstanceFromServer(instanceId);
            this.pendingRequests.set(instanceId, requestPromise);

            try {
                const instance = await requestPromise;
                this.cacheInstance(instance);
                return instance;
            } finally {
                this.pendingRequests.delete(instanceId);
            }

        } catch (error) {
            console.error('❌ [SaveInstanceService] Errore recupero istanza:', error);
            throw error;
        }
    }

    /**
     * Aggiorna un'istanza esistente
     */
    async updateInstance(instanceId, updateData) {
        try {
            console.log(`📝 [SaveInstanceService] Aggiornando istanza ${instanceId}:`, updateData);

            // Validazione dati aggiornamento (parziale)
            this.validateInstanceData(updateData, false);

            const response = await fetch(`/api/module-instances/${instanceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const updatedInstance = await response.json();
            
            // Aggiorna cache
            this.cacheInstance(updatedInstance);
            
            console.log(`✅ [SaveInstanceService] Istanza ${instanceId} aggiornata`);
            return updatedInstance;

        } catch (error) {
            console.error('❌ [SaveInstanceService] Errore aggiornamento istanza:', error);
            throw error;
        }
    }

    /**
     * Elimina un'istanza
     */
    async deleteInstance(instanceId) {
        try {
            console.log(`🗑️ [SaveInstanceService] Eliminando istanza ${instanceId}`);

            const response = await fetch(`/api/module-instances/${instanceId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Rimuovi dalla cache
            this.cache.delete(instanceId);
            
            console.log(`✅ [SaveInstanceService] Istanza ${instanceId} eliminata`);
            return { success: true };

        } catch (error) {
            console.error('❌ [SaveInstanceService] Errore eliminazione istanza:', error);
            throw error;
        }
    }

    /**
     * Lista istanze con filtri opzionali
     */
    async listInstances(filters = {}) {
        try {
            console.log('📋 [SaveInstanceService] Listando istanze con filtri:', filters);

            const queryParams = new URLSearchParams();
            
            if (filters.templateModuleId) {
                queryParams.append('templateModuleId', filters.templateModuleId);
            }
            if (filters.targetEntityType) {
                queryParams.append('targetEntityType', filters.targetEntityType);
            }
            if (filters.ownerUserId) {
                queryParams.append('ownerUserId', filters.ownerUserId);
            }
            if (filters.limit) {
                queryParams.append('limit', filters.limit);
            }
            if (filters.offset) {
                queryParams.append('offset', filters.offset);
            }

            const url = `/api/module-instances${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Cache le istanze recuperate
            if (result.instances) {
                result.instances.forEach(instance => this.cacheInstance(instance));
            }
            
            console.log(`✅ [SaveInstanceService] Recuperate ${result.instances?.length || 0} istanze`);
            return result;

        } catch (error) {
            console.error('❌ [SaveInstanceService] Errore lista istanze:', error);
            throw error;
        }
    }

    /**
     * Duplica un'istanza esistente
     */
    async duplicateInstance(instanceId, newName) {
        try {
            console.log(`📋 [SaveInstanceService] Duplicando istanza ${instanceId} come "${newName}"`);

            // Recupera istanza originale
            const originalInstance = await this.getInstance(instanceId);

            // Crea nuovi dati basati sull'originale
            const duplicateData = {
                instanceName: newName,
                templateModuleId: originalInstance.templateModuleId,
                targetEntityId: originalInstance.targetEntityId,
                targetEntityType: originalInstance.targetEntityType,
                instanceConfigOverrides: { ...originalInstance.instanceConfigOverrides },
                ownerUserId: originalInstance.ownerUserId,
                description: `Copia di: ${originalInstance.description || originalInstance.instanceName}`
            };

            return await this.createInstance(duplicateData);

        } catch (error) {
            console.error('❌ [SaveInstanceService] Errore duplicazione istanza:', error);
            throw error;
        }
    }

    /**
     * Funzioni di utilità e cache
     */

    async fetchInstanceFromServer(instanceId) {
        const response = await fetch(`/api/module-instances/${instanceId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    getCachedInstance(instanceId) {
        const cached = this.cache.get(instanceId);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(instanceId);
            return null;
        }

        return cached.data;
    }

    cacheInstance(instance) {
        this.cache.set(instance.id, {
            data: instance,
            timestamp: Date.now()
        });
    }

    invalidateCache(instanceId = null) {
        if (instanceId) {
            this.cache.delete(instanceId);
            console.log(`🔄 [SaveInstanceService] Cache invalidata per istanza ${instanceId}`);
        } else {
            this.cache.clear();
            console.log('🔄 [SaveInstanceService] Cache completamente invalidata');
        }
    }

    /**
     * Validazione struttura dati istanza
     */
    validateInstanceData(data, isCreate = false) {
        const errors = [];

        // Campi richiesti per creazione
        if (isCreate) {
            if (!data.instanceName || typeof data.instanceName !== 'string') {
                errors.push('instanceName è richiesto e deve essere una stringa');
            }
            if (!data.templateModuleId || typeof data.templateModuleId !== 'string') {
                errors.push('templateModuleId è richiesto e deve essere una stringa');
            }
            if (!data.targetEntityType || typeof data.targetEntityType !== 'string') {
                errors.push('targetEntityType è richiesto e deve essere una stringa');
            }
        }

        // Validazione tipologia campi
        if (data.instanceName !== undefined && typeof data.instanceName !== 'string') {
            errors.push('instanceName deve essere una stringa');
        }
        if (data.templateModuleId !== undefined && typeof data.templateModuleId !== 'string') {
            errors.push('templateModuleId deve essere una stringa');
        }
        if (data.targetEntityId !== undefined && typeof data.targetEntityId !== 'string') {
            errors.push('targetEntityId deve essere una stringa');
        }
        if (data.targetEntityType !== undefined && typeof data.targetEntityType !== 'string') {
            errors.push('targetEntityType deve essere una stringa');
        }
        if (data.ownerUserId !== undefined && typeof data.ownerUserId !== 'string') {
            errors.push('ownerUserId deve essere una stringa');
        }
        if (data.description !== undefined && typeof data.description !== 'string') {
            errors.push('description deve essere una stringa');
        }
        if (data.instanceConfigOverrides !== undefined && typeof data.instanceConfigOverrides !== 'object') {
            errors.push('instanceConfigOverrides deve essere un oggetto');
        }

        if (errors.length > 0) {
            throw new Error('Errori validazione dati istanza: ' + errors.join(', '));
        }
    }

    /**
     * Utilità per configurazioni override
     */
    mergeConfigOverrides(templateConfig, instanceOverrides) {
        if (!instanceOverrides || typeof instanceOverrides !== 'object') {
            return templateConfig;
        }

        // Deep merge mantenendo struttura template come base
        const merged = JSON.parse(JSON.stringify(templateConfig));
        
        Object.keys(instanceOverrides).forEach(key => {
            if (instanceOverrides[key] !== undefined) {
                merged[key] = instanceOverrides[key];
            }
        });

        return merged;
    }

    /**
     * Estrae configurazione salvabile da un modulo attivo
     */
    extractSavableConfig(moduleDefinition, currentConfig) {
        const savableFields = moduleDefinition.instanceConfigurableFields || [];
        const savableConfig = {};

        savableFields.forEach(field => {
            if (currentConfig[field] !== undefined) {
                savableConfig[field] = currentConfig[field];
            }
        });

        return savableConfig;
    }

    /**
     * Statistiche cache
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        this.cache.forEach((entry) => {
            if (now - entry.timestamp > this.cacheTimeout) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        });

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            pendingRequests: this.pendingRequests.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Istanza singleton globale
window.SaveInstanceService = new SaveInstanceService();

console.log('✅ [SaveInstanceService] Servizio inizializzato e disponibile globalmente'); 