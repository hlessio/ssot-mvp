/**
 * ModuleRelationService.js - Frontend service for managing entity-module relationships
 * 
 * Provides JavaScript wrapper functions for the ModuleRelationService API endpoints
 * Handles entity-module relationships with contextual attributes (fee, role, etc.)
 * Integrates with WebSocket for real-time updates
 */

class ModuleRelationService {
    constructor() {
        this.baseUrl = '/api';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.websocketSubscriptions = new Map();
        
        console.log('🎯 ModuleRelationService (Frontend) inizializzato');
    }

    /**
     * Adds an entity to a module with contextual attributes
     * @param {string} moduleId - ID of the ModuleInstance
     * @param {string} entityId - ID of the entity to add
     * @param {object} relationAttributes - Contextual attributes (fee, role, etc.)
     * @returns {Promise<object>} The created relationship data
     */
    async addMember(moduleId, entityId, relationAttributes = {}) {
        try {
            console.log(`🎯 Adding entity ${entityId} to module ${moduleId} with attributes:`, relationAttributes);
            
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entityId: entityId,
                    relationAttributes: relationAttributes
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            // Clear cache for this module
            this.clearModuleCache(moduleId);

            console.log('✅ Entity added to module successfully:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ Error adding member to module:', error);
            throw error;
        }
    }

    /**
     * Updates contextual attributes of an entity-module relationship
     * @param {string} moduleId - ID of the ModuleInstance
     * @param {string} entityId - ID of the entity
     * @param {object} attributes - New attributes to update
     * @returns {Promise<object>} The updated relationship data
     */
    async updateMemberAttributes(moduleId, entityId, attributes) {
        try {
            console.log(`🎯 Updating attributes for entity ${entityId} in module ${moduleId}:`, attributes);
            
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}/members/${entityId}/attributes`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attributes: attributes
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            // Clear cache for this module
            this.clearModuleCache(moduleId);

            console.log('✅ Member attributes updated successfully:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ Error updating member attributes:', error);
            throw error;
        }
    }

    /**
     * Gets all members of a module with their contextual attributes
     * @param {string} moduleId - ID of the ModuleInstance
     * @param {object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>} Array of module members with attributes
     */
    async getMembers(moduleId, options = {}) {
        try {
            const cacheKey = `members_${moduleId}_${JSON.stringify(options)}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log('📋 Returning cached members for module:', moduleId);
                    return cached.data;
                }
            }

            console.log(`🎯 Getting members for module ${moduleId}`, options);
            
            const queryParams = new URLSearchParams();
            if (options.limit) queryParams.append('limit', options.limit);
            if (options.offset) queryParams.append('offset', options.offset);
            if (options.orderBy) queryParams.append('orderBy', options.orderBy);

            const url = `${this.baseUrl}/modules/${moduleId}/members${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await fetch(url);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            // Cache the result
            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now()
            });

            console.log(`✅ Found ${result.data.length} members for module ${moduleId}`);
            return result.data;

        } catch (error) {
            console.error('❌ Error getting module members:', error);
            throw error;
        }
    }

    /**
     * Removes an entity from a module
     * @param {string} moduleId - ID of the ModuleInstance
     * @param {string} entityId - ID of the entity to remove
     * @returns {Promise<boolean>} True if removed successfully
     */
    async removeMember(moduleId, entityId) {
        try {
            console.log(`🎯 Removing entity ${entityId} from module ${moduleId}`);
            
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}/members/${entityId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            // Clear cache for this module
            this.clearModuleCache(moduleId);

            console.log('✅ Member removed successfully');
            return true;

        } catch (error) {
            console.error('❌ Error removing member from module:', error);
            throw error;
        }
    }

    /**
     * Gets all projects/modules that an entity belongs to
     * @param {string} entityId - ID of the entity
     * @param {object} options - Query options
     * @returns {Promise<Array>} Array of projects with module details
     */
    async getEntityProjects(entityId, options = {}) {
        try {
            console.log(`🎯 Getting projects for entity ${entityId}`, options);
            
            const queryParams = new URLSearchParams();
            if (options.includeModuleDetails !== undefined) {
                queryParams.append('includeModuleDetails', options.includeModuleDetails);
            }

            const url = `${this.baseUrl}/entities/${entityId}/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await fetch(url);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            console.log(`✅ Found ${result.data.length} projects for entity ${entityId}`);
            return result.data;

        } catch (error) {
            console.error('❌ Error getting entity projects:', error);
            throw error;
        }
    }

    /**
     * Gets aggregate calculations for a module
     * @param {string} moduleId - ID of the ModuleInstance
     * @param {string} field - Field to aggregate (default: 'fee')
     * @returns {Promise<object>} Aggregate statistics
     */
    async getAggregates(moduleId, field = 'fee') {
        try {
            console.log(`🎯 Getting aggregates for module ${moduleId}, field: ${field}`);
            
            const response = await fetch(`${this.baseUrl}/modules/${moduleId}/aggregates?field=${field}`);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            console.log('✅ Aggregates calculated:', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ Error getting module aggregates:', error);
            throw error;
        }
    }

    /**
     * Subscribes to real-time updates for a specific module
     * @param {string} moduleId - ID of the ModuleInstance to monitor
     * @param {Function} callback - Callback function for updates
     * @returns {string} Subscription ID for unsubscribing
     */
    subscribeToModuleUpdates(moduleId, callback) {
        if (!window.WebSocketService) {
            console.warn('⚠️ WebSocketService not available for real-time updates');
            return null;
        }

        const wsService = window.WebSocketService;
        
        // Subscribe to relation changes for this module
        const subscriptionId = wsService.subscribe('relation-change', (message) => {
            // Filter for MEMBER_OF relations involving this module
            if (message.data && 
                message.data.relationType === 'MEMBER_OF' && 
                message.data.targetEntityId === moduleId) {
                
                console.log(`🔗 Module ${moduleId} membership changed:`, message.data);
                
                // Clear cache for this module
                this.clearModuleCache(moduleId);
                
                // Call user callback with processed data
                callback({
                    moduleId: moduleId,
                    entityId: message.data.sourceEntityId,
                    changeType: message.data.changeType,
                    relationAttributes: message.data.attributes,
                    timestamp: message.timestamp
                });
            }
        });

        this.websocketSubscriptions.set(moduleId, subscriptionId);
        console.log(`✅ Subscribed to updates for module ${moduleId}`);
        
        return subscriptionId;
    }

    /**
     * Unsubscribes from real-time updates for a module
     * @param {string} moduleId - ID of the ModuleInstance
     */
    unsubscribeFromModuleUpdates(moduleId) {
        if (!window.WebSocketService) return;

        const subscriptionId = this.websocketSubscriptions.get(moduleId);
        if (subscriptionId) {
            window.WebSocketService.unsubscribe(subscriptionId);
            this.websocketSubscriptions.delete(moduleId);
            console.log(`✅ Unsubscribed from updates for module ${moduleId}`);
        }
    }

    /**
     * Subscribes to entity attribute changes for real-time contact card updates
     * @param {string} entityId - ID of the entity to monitor
     * @param {Function} callback - Callback function for attribute updates
     * @returns {string} Subscription ID for unsubscribing
     */
    subscribeToEntityUpdates(entityId, callback) {
        if (!window.WebSocketService) {
            console.warn('⚠️ WebSocketService not available for real-time updates');
            return null;
        }

        const wsService = window.WebSocketService;
        
        // Subscribe to entity attribute changes
        const subscriptionId = wsService.subscribe('change', (message) => {
            // Filter for changes to this specific entity
            if (message.data && message.data.entityId === entityId) {
                console.log(`🔄 Entity ${entityId} attribute changed:`, message.data);
                
                // Call user callback with processed data
                callback({
                    entityId: entityId,
                    attributeName: message.data.attributeName,
                    newValue: message.data.newValue,
                    oldValue: message.data.oldValue,
                    changeType: message.data.changeType,
                    timestamp: message.timestamp
                });
            }
        });

        console.log(`✅ Subscribed to attribute updates for entity ${entityId}`);
        return subscriptionId;
    }

    /**
     * Clears cache entries for a specific module
     * @param {string} moduleId - ID of the module to clear cache for
     */
    clearModuleCache(moduleId) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(`_${moduleId}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for module ${moduleId}`);
        }
    }

    /**
     * Clears all cache entries
     */
    clearAllCache() {
        this.cache.clear();
        console.log('🗑️ All cache cleared');
    }

    /**
     * Gets service statistics
     * @returns {object} Service statistics
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            activeSubscriptions: this.websocketSubscriptions.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Export as singleton
window.ModuleRelationService = new ModuleRelationService();

console.log('✅ ModuleRelationService (Frontend) registered globally as window.ModuleRelationService');