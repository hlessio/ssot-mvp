/**
 * TableAPI - Business Logic Engine for Dynamic Table Module
 * 
 * This class handles all business logic and state management for the table module.
 * It does not interact with the DOM directly, communicating only through events.
 */

class TableAPI {
    constructor(moduleInstance) {
        this.moduleInstance = moduleInstance;
        this.entityManager = window.entityManager || window.EntityService;
        this.attributeSpace = window.attributeSpace;
        this.schemaService = window.SchemaService || window.schemaService;
        
        // Internal event bus for decoupling
        this.eventBus = new EventBus();
        this.saveTimeout = null;
        
        // Initialize state
        this.state = {
            name: 'Nuova Tabella',
            entityType: null,
            columns: [], // Array of { name, type, metadata, targetEntityType? }
            entityIds: new Set(),
            query: {
                filters: [], // { column, operator, value }
                sort: { column: null, direction: 'asc' },
                pagination: { page: 1, pageSize: 50, total: 0 },
                globalSearch: ''
            }
        };
        
        // Track temporary entities (not yet saved to backend)
        this.temporaryEntities = new Map();
        
        // Track subscriptions for cleanup
        this.subscriptions = [];
    }
    
    // State Management
    async loadState() {
        const savedState = this.moduleInstance?.state || {};
        
        // Merge saved state with defaults
        this.state = { 
            ...this.state, 
            ...savedState,
            entityIds: new Set(savedState.entityIds || [])
        };
        
        // Emit state loaded event
        this.eventBus.emit('state:loaded', { state: this.state });
        
        // If entity type is set, load entities
        if (this.state.entityType) {
            await this.loadEntities();
        }
    }
    
    async saveState() {
        // Prepare state for serialization
        const stateToSave = {
            ...this.state,
            entityIds: Array.from(this.state.entityIds)
        };
        
        if (this.moduleInstance?.updateState) {
            await this.moduleInstance.updateState(stateToSave);
        }
        
        console.log(`TableAPI [${this.moduleInstance?.instanceId}]: State saved.`);
    }
    
    scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveState(), 500);
    }
    
    // Public API Methods (synchronous, emit events)
    
    setEntityType(typeName) {
        if (this.state.entityType === typeName) return;
        
        // Clear existing data when changing entity type
        if (this.state.entityType) {
            this.state.entityIds.clear();
            this.state.columns = [];
        }
        
        this.state.entityType = typeName;
        this.eventBus.emit('entity-type:set', { entityType: typeName });
        this.scheduleSave();
        
        // Auto-discover columns from schema
        this._discoverColumnsFromSchema(typeName);
        
        // Fetch initial data
        this.fetchData();
    }
    
    addColumn(name, options = {}) {
        // Check if column already exists
        if (this.state.columns.some(c => c.name === name)) {
            console.warn(`Column "${name}" already exists`);
            return;
        }
        
        const newColumn = {
            name,
            type: options.type || 'string',
            metadata: options.metadata || {},
            isContextual: options.isContextual || false,
            width: options.width || 150
        };
        
        this.state.columns.push(newColumn);
        this.eventBus.emit('column:added', { column: newColumn });
        this.scheduleSave();
    }
    
    removeColumn(name) {
        const index = this.state.columns.findIndex(c => c.name === name);
        if (index === -1) return;
        
        const removed = this.state.columns.splice(index, 1)[0];
        this.eventBus.emit('column:removed', { column: removed });
        this.scheduleSave();
    }
    
    addRow(initialData = {}) {
        if (!this.state.entityType) {
            console.error('Cannot add row: entity type not set');
            return;
        }
        
        // Create a temporary entity that will be saved when user provides data
        const tempEntity = {
            id: `temp_${Date.now()}_${Math.random()}`,
            entityType: this.state.entityType,
            _temporary: true,
            ...initialData
        };
        
        // Store in temporary entities map
        this.temporaryEntities.set(tempEntity.id, tempEntity);
        
        // Add to state
        this.state.entityIds.add(tempEntity.id);
        
        // Emit event immediately for UI update
        this.eventBus.emit('row:added', { entity: tempEntity });
        
        return tempEntity;
    }
    
    removeRow(entityId) {
        if (!this.state.entityIds.has(entityId)) return;
        
        this.state.entityIds.delete(entityId);
        this.eventBus.emit('row:removed', { entityId });
        this.scheduleSave();
    }
    
    setCellValue(entityId, attributeName, value) {
        const entity = this._getEntityById(entityId);
        if (!entity) {
            console.error(`Entity ${entityId} not found`);
            return;
        }
        
        const columnDef = this.state.columns.find(c => c.name === attributeName);
        if (!columnDef) {
            console.error(`Column ${attributeName} not found`);
            return;
        }
        
        // Prepare metadata for contextual attributes
        const metadata = columnDef.isContextual ? {
            source: `table-module:${this.moduleInstance?.instanceId}`,
            context: 'table-specific'
        } : {};
        
        // Update entity attribute
        if (entity.setAttribute) {
            entity.setAttribute(attributeName, value, columnDef.type, metadata);
        } else if (this.entityManager.updateEntity) {
            // Use entity service for updates
            this.entityManager.updateEntity(entityId, { [attributeName]: value });
        }
        
        // Emit change event
        this.eventBus.emit('cell:changed', {
            entityId,
            attributeName,
            value,
            oldValue: entity[attributeName]
        });
    }
    
    // Getters
    getColumns() { 
        return [...this.state.columns]; 
    }
    
    getRows() { 
        return Array.from(this.state.entityIds)
            .map(id => {
                if (id.startsWith('temp_')) {
                    return this.temporaryEntities.get(id);
                }
                return this._getEntityById(id);
            })
            .filter(Boolean); 
    }
    
    getEntityType() { 
        return this.state.entityType; 
    }
    
    getTableName() {
        return this.state.name;
    }
    
    setTableName(name) {
        this.state.name = name;
        this.eventBus.emit('name:changed', { name });
        this.scheduleSave();
    }
    
    // Query Management
    setGlobalSearch(searchText) {
        this.state.query.globalSearch = searchText;
        this.state.query.pagination.page = 1; // Reset to first page
        this.eventBus.emit('query:changed', { query: this.state.query });
        this.fetchData();
    }
    
    setFilter(column, operator, value) {
        // Remove existing filter for this column
        this.state.query.filters = this.state.query.filters.filter(f => f.column !== column);
        
        // Add new filter if value is not empty
        if (value && value.trim()) {
            this.state.query.filters.push({ column, operator, value });
        }
        
        this.state.query.pagination.page = 1; // Reset to first page
        this.eventBus.emit('query:changed', { query: this.state.query });
        this.fetchData();
    }
    
    setSort(column) {
        const currentSort = this.state.query.sort;
        
        if (currentSort.column === column) {
            // Toggle direction
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        
        this.eventBus.emit('query:changed', { query: this.state.query });
        this.fetchData();
    }
    
    setPage(pageNumber) {
        this.state.query.pagination.page = pageNumber;
        this.eventBus.emit('query:changed', { query: this.state.query });
        this.fetchData();
    }
    
    async fetchData() {
        if (!this.state.entityType) return;
        
        try {
            this.eventBus.emit('data:loading', { loading: true });
            
            // Build query object for backend
            const queryParams = {
                entityType: this.state.entityType,
                filters: this.state.query.filters,
                sort: this.state.query.sort,
                pagination: this.state.query.pagination,
                globalSearch: this.state.query.globalSearch
            };
            
            let result;
            
            // Try enhanced search if available
            if (this.entityManager.searchEntitiesAdvanced) {
                result = await this.entityManager.searchEntitiesAdvanced(queryParams);
            } else if (this.entityManager.searchEntities) {
                // Fallback to basic search with global search only
                result = await this.entityManager.searchEntities({
                    entityType: this.state.entityType,
                    query: this.state.query.globalSearch,
                    limit: this.state.query.pagination.pageSize,
                    offset: (this.state.query.pagination.page - 1) * this.state.query.pagination.pageSize
                });
            } else {
                console.warn('No suitable search method available in EntityManager');
                return;
            }
            
            const entities = result?.data || [];
            const total = result?.total || entities.length;
            
            // Update state
            this.state.entityIds.clear();
            entities.forEach(entity => {
                if (entity && entity.id) {
                    this.state.entityIds.add(entity.id);
                    // Store entity in manager if not already there
                    if (this.entityManager.entities && !this.entityManager.entities.has(entity.id)) {
                        this.entityManager.entities.set(entity.id, entity);
                    }
                }
            });
            
            this.state.query.pagination.total = total;
            
            this.eventBus.emit('data:loaded', { 
                entities, 
                total, 
                query: this.state.query 
            });
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.eventBus.emit('error', { 
                message: 'Failed to fetch data', 
                error 
            });
        } finally {
            this.eventBus.emit('data:loading', { loading: false });
        }
    }
    
    // Query getters
    getQuery() {
        return { ...this.state.query };
    }
    
    // Event subscription
    on(eventName, callback) { 
        return this.eventBus.on(eventName, callback); 
    }
    
    off(eventName, callback) {
        return this.eventBus.off(eventName, callback);
    }
    
    // Private helper methods
    
    async _createAndAddEntity(initialData) {
        try {
            let entity;
            
            if (this.entityManager.createEntity) {
                const result = await this.entityManager.createEntity(
                    this.state.entityType, 
                    initialData
                );
                entity = result?.data || result;
            } else {
                // Fallback for different entity manager implementations
                entity = await this.entityManager.create(
                    this.state.entityType,
                    initialData
                );
            }
            
            if (entity && entity.id) {
                this.state.entityIds.add(entity.id);
                this.eventBus.emit('row:added', { entity });
                await this.saveState();
            }
        } catch (error) {
            console.error('Error creating entity:', error);
            this.eventBus.emit('error', { 
                message: 'Failed to create entity', 
                error 
            });
        }
    }
    
    _getEntityById(entityId) {
        // Check if it's a temporary entity first
        if (entityId && entityId.startsWith('temp_')) {
            // Find in temporary entities stored in state
            return this.temporaryEntities?.get(entityId) || null;
        }
        
        if (this.entityManager.getEntity) {
            return this.entityManager.getEntity(entityId);
        } else if (this.entityManager.entities) {
            // For mock implementations
            return this.entityManager.entities.get(entityId);
        }
        return null;
    }
    
    async _discoverColumnsFromSchema(entityType) {
        try {
            if (!this.schemaService) return;
            
            const result = await this.schemaService.getEntitySchema(entityType);
            const schema = result?.data || result;
            
            if (schema && schema.attributes) {
                Object.entries(schema.attributes).forEach(([name, def]) => {
                    this.addColumn(name, {
                        type: def.type || 'string',
                        metadata: { required: def.required },
                        isContextual: false
                    });
                });
            }
        } catch (error) {
            console.log('Could not load schema, proceeding without it');
        }
    }
    
    async loadEntities() {
        if (!this.state.entityType) return;
        
        try {
            let entities = [];
            
            if (this.entityManager.searchEntities) {
                const result = await this.entityManager.searchEntities({
                    entityType: this.state.entityType,
                    limit: 100
                });
                entities = result?.data || [];
            } else if (this.entityManager.getEntitiesByType) {
                entities = await this.entityManager.getEntitiesByType(
                    this.state.entityType
                );
            }
            
            // Clear and repopulate entity IDs
            this.state.entityIds.clear();
            entities.forEach(entity => {
                if (entity && entity.id) {
                    this.state.entityIds.add(entity.id);
                }
            });
            
            this.eventBus.emit('entities:loaded', { entities });
        } catch (error) {
            console.error('Error loading entities:', error);
        }
    }
    
    // Cleanup
    destroy() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.subscriptions.forEach(sub => {
            if (sub && sub.unsubscribe) {
                sub.unsubscribe();
            }
        });
        
        this.eventBus.removeAllListeners();
    }
}

// Simple Event Bus implementation
class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        
        const index = this.events[event].indexOf(callback);
        if (index > -1) {
            this.events[event].splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    
    removeAllListeners() {
        this.events = {};
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableAPI;
} else {
    window.TableAPI = TableAPI;
}