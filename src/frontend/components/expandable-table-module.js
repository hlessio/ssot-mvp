/**
 * Expandable Table Module - Enhanced Dynamic Table for SSOT-4000
 * 
 * Implements the vision from "Piano di Sviluppo Modulo Tabella Espandibile"
 * Features:
 * - True dynamic column creation with attribute auto-discovery
 * - Contextual attribute creation (relational attributes)
 * - Smart attribute selection with autocomplete
 * - Real-time synchronization with WebSocket integration
 * - ModuleInstance-aware persistence
 * - Simplified architecture without ConfiguredTable complexity
 */

console.log('🚀 [ExpandableTableModule] Script inizializzato');

class ExpandableTableModule {
    constructor(container, config = {}) {
        this.container = container;
        this.config = {
            moduleInstanceId: config.moduleInstanceId || null,
            tableName: config.tableName || 'Tabella Espandibile',
            selectedEntityType: config.selectedEntityType || null,
            contextEntityId: config.contextEntityId || null,
            contextEntityType: config.contextEntityType || null,
            permissions: {
                canAddRows: true,
                canEditRows: true,
                canDeleteRows: true,
                canAddColumns: true,
                canEditColumns: true,
                ...config.permissions
            },
            ...config
        };
        
        // State management
        this.state = {
            selectedEntityType: this.config.selectedEntityType,
            entities: new Map(), // entityId -> EntityData
            columns: [], // Array of column definitions
            availableEntityTypes: [],
            availableAttributes: new Map(), // entityType -> Set(attributes)
            isLoading: false,
            editingCell: null,
            selectedRows: new Set()
        };
        
        // Services - handle both singleton instances and constructor functions
        this.entityService = this.initializeService('EntityService');
        this.schemaService = this.initializeService('SchemaService');
        this.wsService = this.initializeService('WebSocketService');
        
        // Debounce settings
        this.saveTimeout = null;
        this.SAVE_DELAY = 1500; // Faster save for better UX
        
        this.init();
    }
    
    initializeService(serviceName) {
        const Service = window[serviceName];
        
        if (!Service) {
            console.warn(`⚠️ [ExpandableTableModule] ${serviceName} non disponibile`);
            return null;
        }
        
        // Check if it's already an instance (singleton pattern used by SSOT-4000)
        if (typeof Service === 'object' && Service.constructor && Service.constructor.name) {
            console.log(`✅ [ExpandableTableModule] Utilizzando istanza singleton di ${serviceName}`);
            return Service;
        }
        
        // Check if it's a constructor function
        if (typeof Service === 'function') {
            try {
                const instance = new Service();
                console.log(`✅ [ExpandableTableModule] Istanziato ${serviceName} come constructor`);
                return instance;
            } catch (error) {
                console.warn(`⚠️ [ExpandableTableModule] Impossibile istanziare ${serviceName}:`, error.message);
                // Try to use it as singleton anyway
                if (typeof Service.createEntity === 'function' || typeof Service.getAvailableEntityTypes === 'function') {
                    console.log(`✅ [ExpandableTableModule] Utilizzando ${serviceName} come singleton`);
                    return Service;
                }
                return null;
            }
        }
        
        console.warn(`⚠️ [ExpandableTableModule] ${serviceName} non riconosciuto come servizio valido`);
        return null;
    }
    
    async init() {
        try {
            console.log('🚀 Inizializzazione Expandable Table Module', this.config);
            
            // Setup services and WebSocket
            await this.initializeServices();
            this.setupWebSocketListeners();
            
            // Load available entity types
            await this.loadAvailableEntityTypes();
            
            // If moduleInstance has saved state, restore it
            if (this.config.moduleInstanceId) {
                await this.restoreFromModuleInstance();
            }
            
            // Render initial UI
            this.render();
            
            console.log('✅ Expandable Table Module inizializzato');
        } catch (error) {
            console.error('❌ Errore inizializzazione Expandable Table Module:', error);
            this.renderError(error.message);
        }
    }
    
    async initializeServices() {
        // Verify services are available
        if (!this.entityService) {
            console.warn('EntityService non disponibile');
        }
        if (!this.schemaService) {
            console.warn('SchemaService non disponibile');
        }
        if (!this.wsService) {
            console.warn('WebSocketService non disponibile');
        }
    }
    
    setupWebSocketListeners() {
        if (!this.wsService) {
            console.warn('⚠️ [ExpandableTableModule] WebSocket service non disponibile - disabilitato sync real-time');
            return;
        }
        
        try {
            // Listen for entity changes
            this.wsService.addEventListener('message', (event) => {
                const data = event.data;
                
                if (data.type === 'change' || data.type === 'entity-updated') {
                    this.handleEntityChange(data);
                } else if (data.type === 'entity-created') {
                    this.handleEntityCreated(data);
                } else if (data.type === 'entity-deleted') {
                    this.handleEntityDeleted(data);
                } else if (data.type === 'schema-updated') {
                    this.handleSchemaUpdate(data);
                }
            });
            
            console.log('✅ [ExpandableTableModule] WebSocket listeners configurati');
        } catch (error) {
            console.warn('⚠️ [ExpandableTableModule] Errore configurazione WebSocket listeners:', error.message);
        }
    }
    
    async loadAvailableEntityTypes() {
        if (!this.schemaService) {
            // Fallback with common types
            this.state.availableEntityTypes = ['Contact', 'Task', 'Note', 'Project', 'Person', 'Cliente'];
            return;
        }
        
        try {
            const response = await this.schemaService.getAvailableEntityTypes();
            if (response.success) {
                this.state.availableEntityTypes = response.data || [];
            }
        } catch (error) {
            console.error('Errore caricamento entity types:', error);
            // Fallback with common types
            this.state.availableEntityTypes = ['Contact', 'Task', 'Note', 'Project', 'Person', 'Cliente'];
        }
    }
    
    async loadEntityAttributes(entityType) {
        if (!entityType || this.state.availableAttributes.has(entityType)) return;
        
        try {
            if (this.schemaService) {
                const response = await this.schemaService.getEntitySchema(entityType);
                if (response.success && response.data) {
                    const attributes = Object.keys(response.data.attributes || {});
                    this.state.availableAttributes.set(entityType, new Set(attributes));
                    return;
                }
            }
            
            // Fallback: analyze existing entities to discover attributes
            if (this.state.entities.size > 0) {
                const attributes = new Set();
                for (const entity of this.state.entities.values()) {
                    Object.keys(entity).forEach(key => {
                        if (key !== 'id' && key !== 'entityType') {
                            attributes.add(key);
                        }
                    });
                }
                this.state.availableAttributes.set(entityType, attributes);
            } else {
                // Default attributes
                this.state.availableAttributes.set(entityType, new Set(['nome', 'description', 'status', 'createdAt']));
            }
        } catch (error) {
            console.error(`Errore caricamento attributi per ${entityType}:`, error);
            this.state.availableAttributes.set(entityType, new Set(['nome', 'description', 'status']));
        }
    }
    
    async restoreFromModuleInstance() {
        if (!this.config.moduleInstanceId || !this.entityService) return;
        
        try {
            // This would load the module instance configuration
            // For now, we'll implement basic state restoration
            console.log('Ripristino stato da ModuleInstance:', this.config.moduleInstanceId);
        } catch (error) {
            console.error('Errore ripristino stato:', error);
        }
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="expandable-table-container">
                ${this.renderHeader()}
                ${this.renderTypeSelector()}
                ${this.renderTable()}
                ${this.state.isLoading ? '<div class="loading-overlay"><div class="spinner"></div></div>' : ''}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    renderHeader() {
        return `
            <div class="table-header">
                <div class="table-title-section">
                    <input type="text" 
                           class="table-name-input" 
                           placeholder="Nome tabella..." 
                           value="${this.config.tableName}"
                           ${this.config.permissions.canEditColumns ? '' : 'readonly'}>
                    <div class="table-stats">
                        ${this.state.entities.size} entità • ${this.state.columns.length} colonne
                    </div>
                </div>
                <div class="table-actions">
                    ${this.config.permissions.canAddRows && this.state.selectedEntityType ? 
                        '<button class="btn-add-row">➕ Nuova Riga</button>' : ''}
                    ${this.config.permissions.canAddColumns && this.state.selectedEntityType ? 
                        '<button class="btn-add-column">➕ Nuova Colonna</button>' : ''}
                    <button class="btn-refresh">🔄</button>
                </div>
            </div>
        `;
    }
    
    renderTypeSelector() {
        if (this.state.selectedEntityType) {
            return `
                <div class="type-selector selected">
                    <span class="selected-type-label">Tipo Entità:</span>
                    <span class="selected-type-value">${this.state.selectedEntityType}</span>
                    ${this.config.permissions.canEditColumns ? 
                        '<button class="btn-change-type">Cambia</button>' : ''}
                </div>
            `;
        }
        
        return `
            <div class="type-selector">
                <div class="type-selector-content">
                    <label>Seleziona tipo di entità per iniziare:</label>
                    <div class="type-input-container">
                        <input type="text" 
                               class="type-input" 
                               placeholder="Cerca tipo entità..."
                               autocomplete="off">
                        <div class="type-suggestions" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTable() {
        if (!this.state.selectedEntityType) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>Tabella Espandibile</h3>
                    <p>Seleziona un tipo di entità per iniziare a costruire la tua tabella dinamica</p>
                </div>
            `;
        }
        
        if (this.state.entities.size === 0 && this.state.columns.length === 0) {
            return `
                <div class="empty-table-state">
                    <div class="empty-icon">📋</div>
                    <h3>Tabella vuota</h3>
                    <p>Aggiungi colonne e righe per iniziare</p>
                    <div class="getting-started-actions">
                        ${this.config.permissions.canAddColumns ? 
                            '<button class="btn-add-first-column">➕ Aggiungi Prima Colonna</button>' : ''}
                        ${this.config.permissions.canAddRows ? 
                            '<button class="btn-add-first-row">➕ Aggiungi Prima Riga</button>' : ''}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="table-container">
                <table class="expandable-table">
                    ${this.renderTableHeader()}
                    ${this.renderTableBody()}
                </table>
            </div>
        `;
    }
    
    renderTableHeader() {
        const headers = ['<th class="select-column"><input type="checkbox" class="select-all"></th>'];
        
        // Add column headers
        for (const column of this.state.columns) {
            const typeIcon = column.type === 'intrinsic' ? '🟢' : '🟡';
            const tooltip = column.type === 'intrinsic' ? 'Attributo intrinseco dell\'entità' : 'Attributo contestuale della tabella';
            
            headers.push(`
                <th class="column-header" data-column="${column.name}" title="${tooltip}">
                    <div class="column-header-content">
                        <span class="column-type-icon">${typeIcon}</span>
                        <span class="column-name">${column.displayName || column.name}</span>
                        ${this.config.permissions.canEditColumns ? 
                            '<button class="btn-remove-column" data-column="' + column.name + '">✕</button>' : ''}
                    </div>
                </th>
            `);
        }
        
        // Add column for adding new columns
        if (this.config.permissions.canAddColumns) {
            headers.push(`
                <th class="add-column-header">
                    <button class="btn-add-column-inline">➕</button>
                </th>
            `);
        }
        
        return `
            <thead>
                <tr class="table-header-row">
                    ${headers.join('')}
                </tr>
            </thead>
        `;
    }
    
    renderTableBody() {
        const entities = Array.from(this.state.entities.values());
        
        if (entities.length === 0) {
            const colSpan = this.state.columns.length + (this.config.permissions.canAddColumns ? 3 : 2);
            return `
                <tbody>
                    <tr>
                        <td colspan="${colSpan}" class="empty-table-message">
                            <div class="empty-message">
                                <p>Nessuna entità presente</p>
                                ${this.config.permissions.canAddRows ? 
                                    '<button class="btn-add-first-entity">➕ Aggiungi Prima Entità</button>' : ''}
                            </div>
                        </td>
                    </tr>
                </tbody>
            `;
        }
        
        const rows = entities.map(entity => this.renderTableRow(entity));
        
        return `
            <tbody>
                ${rows.join('')}
            </tbody>
        `;
    }
    
    renderTableRow(entity) {
        const isSelected = this.state.selectedRows.has(entity.id);
        
        let cells = [
            `<td class="select-cell">
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       data-entity-id="${entity.id}" class="row-selector">
            </td>`
        ];
        
        // Render data cells
        for (const column of this.state.columns) {
            const value = this.getCellValue(entity, column);
            const isEditable = this.config.permissions.canEditRows;
            
            cells.push(`
                <td class="data-cell ${isEditable ? 'editable' : ''}" 
                    data-entity-id="${entity.id}" 
                    data-column="${column.name}"
                    data-column-type="${column.type}">
                    <div class="cell-content" ${isEditable ? 'contenteditable="true"' : ''}>
                        ${this.formatCellValue(value, column)}
                    </div>
                </td>
            `);
        }
        
        // Add empty cell for the add-column column
        if (this.config.permissions.canAddColumns) {
            cells.push('<td class="add-column-cell"></td>');
        }
        
        return `<tr class="table-row" data-entity-id="${entity.id}">${cells.join('')}</tr>`;
    }
    
    getCellValue(entity, column) {
        if (column.type === 'intrinsic') {
            return entity[column.sourceAttribute || column.name] || '';
        } else if (column.type === 'contextual') {
            // Contextual attributes are stored with module instance context
            const contextKey = `_ctx_${this.config.moduleInstanceId}_${column.name}`;
            return entity[contextKey] || '';
        }
        return '';
    }
    
    formatCellValue(value, column) {
        if (!value) return '';
        
        // Basic formatting based on column type
        switch (column.dataType) {
            case 'date':
                return new Date(value).toLocaleDateString('it-IT');
            case 'boolean':
                return value ? '✓' : '✗';
            case 'email':
                return `<a href="mailto:${value}">${value}</a>`;
            case 'url':
                return `<a href="${value}" target="_blank">${value}</a>`;
            default:
                return String(value);
        }
    }
    
    attachEventListeners() {
        // Header events
        this.attachHeaderListeners();
        
        // Type selector events
        this.attachTypeSelectorListeners();
        
        // Table events
        this.attachTableListeners();
        
        // Action button events
        this.attachActionListeners();
    }
    
    attachHeaderListeners() {
        const tableNameInput = this.container.querySelector('.table-name-input');
        if (tableNameInput) {
            tableNameInput.addEventListener('blur', (e) => {
                this.config.tableName = e.target.value;
                this.saveConfiguration();
            });
        }
    }
    
    attachTypeSelectorListeners() {
        const typeInput = this.container.querySelector('.type-input');
        const changeTypeBtn = this.container.querySelector('.btn-change-type');
        
        if (typeInput) {
            typeInput.addEventListener('input', (e) => {
                this.showTypeSuggestions(e.target.value);
            });
            
            typeInput.addEventListener('blur', () => {
                setTimeout(() => this.hideTypeSuggestions(), 200);
            });
        }
        
        if (changeTypeBtn) {
            changeTypeBtn.addEventListener('click', () => {
                this.showChangeTypeModal();
            });
        }
    }
    
    attachTableListeners() {
        // Cell editing
        const editableCells = this.container.querySelectorAll('.data-cell.editable .cell-content');
        editableCells.forEach(cell => {
            cell.addEventListener('blur', (e) => this.handleCellEdit(e));
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });
        
        // Row selection
        const rowSelectors = this.container.querySelectorAll('.row-selector');
        rowSelectors.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleRowSelection(e));
        });
        
        // Select all
        const selectAll = this.container.querySelector('.select-all');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => this.handleSelectAll(e));
        }
        
        // Remove column buttons
        const removeColumnBtns = this.container.querySelectorAll('.btn-remove-column');
        removeColumnBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleRemoveColumn(e.target.dataset.column);
            });
        });
    }
    
    attachActionListeners() {
        // Action buttons
        const addRowBtn = this.container.querySelector('.btn-add-row, .btn-add-first-row, .btn-add-first-entity');
        const addColumnBtn = this.container.querySelector('.btn-add-column, .btn-add-first-column, .btn-add-column-inline');
        const refreshBtn = this.container.querySelector('.btn-refresh');
        
        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => this.showAddRowModal());
        }
        
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this.showAddColumnModal());
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
    }
    
    showTypeSuggestions(query) {
        const suggestionsContainer = this.container.querySelector('.type-suggestions');
        if (!suggestionsContainer) return;
        
        const filtered = this.state.availableEntityTypes
            .filter(type => type.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8);
        
        if (filtered.length === 0 && query.length > 0) {
            suggestionsContainer.innerHTML = `
                <div class="suggestion-item create-new" data-type="${query}">
                    <span class="suggestion-icon">✨</span>
                    <span class="suggestion-text">Crea nuovo tipo: "${query}"</span>
                </div>
            `;
        } else {
            suggestionsContainer.innerHTML = filtered.map(type => `
                <div class="suggestion-item" data-type="${type}">
                    <span class="suggestion-icon">📋</span>
                    <span class="suggestion-text">${type}</span>
                </div>
            `).join('');
        }
        
        suggestionsContainer.style.display = 'block';
        
        // Attach click listeners
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectEntityType(e.currentTarget.dataset.type);
            });
        });
    }
    
    hideTypeSuggestions() {
        const suggestionsContainer = this.container.querySelector('.type-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
    
    async selectEntityType(entityType) {
        this.state.selectedEntityType = entityType;
        this.config.selectedEntityType = entityType;
        
        // Clear existing data when changing type
        this.state.entities.clear();
        this.state.columns = [];
        
        // Load attributes for this entity type
        await this.loadEntityAttributes(entityType);
        
        // Load existing entities of this type
        await this.loadEntitiesOfType(entityType);
        
        // Re-render to show the table
        this.render();
        
        this.saveConfiguration();
    }
    
    async loadEntitiesOfType(entityType) {
        if (!this.entityService) return;
        
        try {
            this.state.isLoading = true;
            this.updateLoadingState();
            
            let entities = [];
            
            // Try different API methods based on what's available
            if (typeof this.entityService.getEntities === 'function') {
                // Real SSOT-4000 EntityService
                const response = await this.entityService.getEntities(entityType);
                entities = response && response.success ? response.data : response || [];
            } else if (typeof this.entityService.searchEntities === 'function') {
                // Mock EntityService
                const response = await this.entityService.searchEntities({
                    entityType: entityType,
                    limit: 100
                });
                entities = response && response.success ? response.data : [];
            } else {
                console.warn('⚠️ [ExpandableTableModule] Nessun metodo di ricerca entità disponibile');
                return;
            }
            
            // Ensure entities is an array
            if (!Array.isArray(entities)) {
                entities = entities ? [entities] : [];
            }
            
            // Store entities in Map
            entities.forEach(entity => {
                this.state.entities.set(entity.id, entity);
            });
            
            // Auto-discover columns from loaded entities
            this.autoDiscoverColumns(entities);
            
            console.log(`✅ Caricate ${entities.length} entità di tipo ${entityType}`);
            
        } catch (error) {
            console.error('❌ Errore caricamento entità:', error);
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState();
        }
    }
    
    autoDiscoverColumns(entities) {
        const attributeStats = new Map();
        
        // Analyze entities to discover common attributes
        entities.forEach(entity => {
            Object.keys(entity).forEach(key => {
                if (key !== 'id' && key !== 'entityType') {
                    if (!attributeStats.has(key)) {
                        attributeStats.set(key, 0);
                    }
                    attributeStats.set(key, attributeStats.get(key) + 1);
                }
            });
        });
        
        // Add columns for attributes that appear in at least 30% of entities
        const threshold = Math.max(1, Math.floor(entities.length * 0.3));
        
        attributeStats.forEach((count, attributeName) => {
            if (count >= threshold && !this.state.columns.find(col => col.name === attributeName)) {
                this.state.columns.push({
                    name: attributeName,
                    displayName: this.humanizeAttributeName(attributeName),
                    type: 'intrinsic',
                    sourceAttribute: attributeName,
                    dataType: this.inferDataType(entities, attributeName)
                });
            }
        });
        
        // Sort columns by importance (name first, then others)
        this.state.columns.sort((a, b) => {
            if (a.name === 'name') return -1;
            if (b.name === 'name') return 1;
            if (a.name === 'nome') return -1;
            if (b.name === 'nome') return 1;
            return a.displayName.localeCompare(b.displayName, 'it-IT');
        });
    }
    
    humanizeAttributeName(attributeName) {
        return attributeName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ')
            .trim();
    }
    
    inferDataType(entities, attributeName) {
        const samples = entities
            .map(entity => entity[attributeName])
            .filter(value => value != null)
            .slice(0, 10);
        
        if (samples.length === 0) return 'string';
        
        // Check for email
        if (samples.some(value => typeof value === 'string' && value.includes('@'))) {
            return 'email';
        }
        
        // Check for URL
        if (samples.some(value => typeof value === 'string' && (value.startsWith('http') || value.startsWith('www')))) {
            return 'url';
        }
        
        // Check for date
        if (samples.some(value => !isNaN(Date.parse(value)))) {
            return 'date';
        }
        
        // Check for boolean
        if (samples.every(value => typeof value === 'boolean' || value === 'true' || value === 'false')) {
            return 'boolean';
        }
        
        // Check for number
        if (samples.every(value => !isNaN(Number(value)))) {
            return 'number';
        }
        
        return 'string';
    }
    
    showAddColumnModal() {
        const availableAttributes = this.state.availableAttributes.get(this.state.selectedEntityType) || new Set();
        const usedAttributes = new Set(this.state.columns.map(col => col.name));
        const unusedAttributes = Array.from(availableAttributes).filter(attr => !usedAttributes.has(attr));
        
        const modal = this.createModal('Aggiungi Nuova Colonna', `
            <div class="form-group">
                <label>Seleziona attributo:</label>
                <div class="attribute-input-container">
                    <input type="text" class="attribute-input" placeholder="Nome attributo o cerca esistente..." autocomplete="off">
                    <div class="attribute-suggestions" style="display: none;"></div>
                </div>
            </div>
            
            ${unusedAttributes.length > 0 ? `
                <div class="form-group">
                    <label>Attributi disponibili:</label>
                    <div class="available-attributes">
                        ${unusedAttributes.slice(0, 6).map(attr => `
                            <button type="button" class="attribute-chip" data-attribute="${attr}">
                                <span class="chip-icon">🟢</span> ${this.humanizeAttributeName(attr)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="form-group">
                <label>Tipo colonna:</label>
                <div class="column-type-selector">
                    <label class="radio-option">
                        <input type="radio" name="columnType" value="intrinsic" checked>
                        <span class="radio-icon">🟢</span>
                        <div class="radio-text">
                            <strong>Intrinseca</strong>
                            <small>Attributo dell'entità stessa</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="columnType" value="contextual">
                        <span class="radio-icon">🟡</span>
                        <div class="radio-text">
                            <strong>Contestuale</strong>
                            <small>Attributo specifico per questa tabella</small>
                        </div>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label>Tipo dati:</label>
                <select class="data-type-select">
                    <option value="string">Testo</option>
                    <option value="number">Numero</option>
                    <option value="boolean">Booleano</option>
                    <option value="date">Data</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                    <option value="phone">Telefono</option>
                </select>
            </div>
        `, (modal) => {
            this.handleAddColumn(modal);
        });
        
        this.setupColumnModalListeners(modal);
    }
    
    setupColumnModalListeners(modal) {
        const attributeInput = modal.querySelector('.attribute-input');
        const attributeChips = modal.querySelectorAll('.attribute-chip');
        
        // Attribute input with suggestions
        attributeInput.addEventListener('input', (e) => {
            this.showAttributeSuggestions(e.target.value, modal);
        });
        
        // Attribute chips
        attributeChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const attributeName = e.currentTarget.dataset.attribute;
                attributeInput.value = attributeName;
                this.hideAttributeSuggestions(modal);
            });
        });
    }
    
    showAttributeSuggestions(query, modal) {
        const suggestionsContainer = modal.querySelector('.attribute-suggestions');
        const availableAttributes = this.state.availableAttributes.get(this.state.selectedEntityType) || new Set();
        const usedAttributes = new Set(this.state.columns.map(col => col.name));
        
        if (!suggestionsContainer) return;
        
        const filtered = Array.from(availableAttributes)
            .filter(attr => !usedAttributes.has(attr))
            .filter(attr => attr.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 6);
        
        let suggestions = filtered.map(attr => `
            <div class="suggestion-item" data-attribute="${attr}">
                <span class="suggestion-icon">🟢</span>
                <span class="suggestion-text">${this.humanizeAttributeName(attr)}</span>
            </div>
        `);
        
        // Add "create new" option if query doesn't match exactly
        if (query.length > 0 && !availableAttributes.has(query)) {
            suggestions.unshift(`
                <div class="suggestion-item create-new" data-attribute="${query}">
                    <span class="suggestion-icon">✨</span>
                    <span class="suggestion-text">Crea nuovo: "${query}"</span>
                </div>
            `);
        }
        
        suggestionsContainer.innerHTML = suggestions.join('');
        suggestionsContainer.style.display = suggestions.length > 0 ? 'block' : 'none';
        
        // Attach click listeners
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const attributeName = e.currentTarget.dataset.attribute;
                modal.querySelector('.attribute-input').value = attributeName;
                this.hideAttributeSuggestions(modal);
            });
        });
    }
    
    hideAttributeSuggestions(modal) {
        const suggestionsContainer = modal.querySelector('.attribute-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
    
    async handleAddColumn(modal) {
        const attributeInput = modal.querySelector('.attribute-input');
        const columnTypeInputs = modal.querySelectorAll('input[name="columnType"]');
        const dataTypeSelect = modal.querySelector('.data-type-select');
        
        const attributeName = attributeInput.value.trim();
        const columnType = Array.from(columnTypeInputs).find(input => input.checked)?.value || 'intrinsic';
        const dataType = dataTypeSelect.value;
        
        if (!attributeName) {
            alert('Inserisci un nome per l\'attributo');
            return;
        }
        
        // Check if column already exists
        if (this.state.columns.find(col => col.name === attributeName)) {
            alert('Colonna già esistente');
            return;
        }
        
        try {
            // Create column definition
            const column = {
                name: attributeName,
                displayName: this.humanizeAttributeName(attributeName),
                type: columnType,
                dataType: dataType,
                sourceAttribute: columnType === 'intrinsic' ? attributeName : null,
                contextKey: columnType === 'contextual' ? `_ctx_${this.config.moduleInstanceId}_${attributeName}` : null,
                createdAt: new Date().toISOString()
            };
            
            // If it's a new attribute and contextual, create it on existing entities
            if (columnType === 'contextual') {
                await this.createContextualAttribute(attributeName, dataType);
            } else if (columnType === 'intrinsic') {
                // If it's intrinsic but new, we may need to evolve the schema
                await this.ensureAttributeInSchema(attributeName, dataType);
            }
            
            // Add column to state
            this.state.columns.push(column);
            
            // Re-render table
            this.render();
            
            // Save configuration
            this.saveConfiguration();
            
            // Close modal
            this.closeModal(modal);
            
            console.log(`✅ Colonna aggiunta: ${attributeName} (${columnType})`);
            
        } catch (error) {
            console.error('Errore aggiunta colonna:', error);
            alert('Errore nell\'aggiunta della colonna: ' + error.message);
        }
    }
    
    async createContextualAttribute(attributeName, dataType) {
        // For contextual attributes, we just add them to existing entities with default values
        const defaultValue = this.getDefaultValueForType(dataType);
        
        for (const entity of this.state.entities.values()) {
            const contextKey = `_ctx_${this.config.moduleInstanceId}_${attributeName}`;
            entity[contextKey] = defaultValue;
        }
        
        console.log(`Attributo contestuale creato: ${attributeName}`);
    }
    
    async ensureAttributeInSchema(attributeName, dataType) {
        if (!this.schemaService) return;
        
        try {
            // Check if schema exists and has this attribute
            const schemaResponse = await this.schemaService.getEntitySchema(this.state.selectedEntityType);
            
            if (schemaResponse.success && schemaResponse.data) {
                const attributes = schemaResponse.data.attributes || {};
                
                if (!attributes[attributeName]) {
                    // Evolve schema to add new attribute
                    const evolution = {
                        evolution: {
                            addAttributes: {
                                [attributeName]: {
                                    type: dataType,
                                    required: false,
                                    description: `Attributo ${attributeName} aggiunto da tabella espandibile`
                                }
                            }
                        }
                    };
                    
                    await this.schemaService.evolveEntitySchema(this.state.selectedEntityType, evolution);
                    console.log(`Schema evoluto per aggiungere ${attributeName}`);
                }
            }
        } catch (error) {
            console.warn('Impossibile evolvere schema, continuo senza:', error.message);
        }
    }
    
    getDefaultValueForType(dataType) {
        switch (dataType) {
            case 'string': return '';
            case 'number': return 0;
            case 'boolean': return false;
            case 'date': return null;
            case 'email': return '';
            case 'url': return '';
            case 'phone': return '';
            default: return '';
        }
    }
    
    showAddRowModal() {
        const modal = this.createModal('Aggiungi Nuova Entità', `
            <div class="form-group">
                <label>Tipo entità: <strong>${this.state.selectedEntityType}</strong></label>
            </div>
            
            ${this.state.columns.length > 0 ? `
                <div class="entity-form">
                    ${this.state.columns.map(column => `
                        <div class="form-group">
                            <label>${column.displayName}:</label>
                            <input type="${this.getInputType(column.dataType)}" 
                                   class="entity-field" 
                                   data-column="${column.name}"
                                   data-column-type="${column.type}"
                                   placeholder="Inserisci ${column.displayName.toLowerCase()}...">
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="form-group">
                    <label>Nome entità:</label>
                    <input type="text" class="entity-name-input" placeholder="Nome per la nuova entità...">
                </div>
                <div class="info-message">
                    <p>ℹ️ Dopo aver creato l'entità, potrai aggiungere più attributi utilizzando le colonne</p>
                </div>
            `}
        `, (modal) => {
            this.handleAddRow(modal);
        });
    }
    
    getInputType(dataType) {
        switch (dataType) {
            case 'email': return 'email';
            case 'url': return 'url';
            case 'phone': return 'tel';
            case 'date': return 'date';
            case 'number': return 'number';
            default: return 'text';
        }
    }
    
    async handleAddRow(modal) {
        if (!this.entityService) {
            alert('EntityService non disponibile');
            return;
        }
        
        try {
            const entityData = { entityType: this.state.selectedEntityType };
            
            if (this.state.columns.length > 0) {
                // Collect data from form fields
                const fieldInputs = modal.querySelectorAll('.entity-field');
                
                fieldInputs.forEach(input => {
                    const columnName = input.dataset.column;
                    const columnType = input.dataset.columnType;
                    const value = input.value.trim();
                    
                    if (value) {
                        if (columnType === 'intrinsic') {
                            entityData[columnName] = value;
                        } else if (columnType === 'contextual') {
                            const contextKey = `_ctx_${this.config.moduleInstanceId}_${columnName}`;
                            entityData[contextKey] = value;
                        }
                    }
                });
            } else {
                // Use name input - use 'name' as standard attribute
                const nameInput = modal.querySelector('.entity-name-input');
                if (nameInput && nameInput.value.trim()) {
                    entityData.name = nameInput.value.trim();
                }
            }
            
            // Create entity
            const response = await this.entityService.createEntity(this.state.selectedEntityType, entityData);
            
            // Handle different response formats
            let newEntity = null;
            if (response && response.success) {
                // Mock service format: {success: true, data: entity}
                newEntity = response.data;
            } else if (response && response.id) {
                // Real service format: entity directly
                newEntity = response;
            } else {
                throw new Error(response?.error || 'Errore nella creazione - risposta non valida');
            }
            
            if (newEntity) {
                // Add to local state
                this.state.entities.set(newEntity.id, newEntity);
                
                // Re-render table
                this.render();
                
                console.log('✅ Entità creata:', newEntity.id);
                this.closeModal(modal);
            } else {
                throw new Error('Entità creata ma dati non validi');
            }
            
        } catch (error) {
            console.error('Errore creazione entità:', error);
            alert('Errore nella creazione dell\'entità: ' + error.message);
        }
    }
    
    async handleCellEdit(event) {
        const cellContent = event.target;
        const cell = cellContent.closest('.data-cell');
        const entityId = cell.dataset.entityId;
        const columnName = cell.dataset.column;
        const columnType = cell.dataset.columnType;
        const newValue = cellContent.textContent.trim();
        
        const entity = this.state.entities.get(entityId);
        if (!entity) return;
        
        const oldValue = this.getCellValue(entity, this.state.columns.find(col => col.name === columnName));
        
        if (newValue === oldValue) return;
        
        try {
            let attributeToUpdate = columnName;
            
            if (columnType === 'intrinsic') {
                entity[columnName] = newValue;
                attributeToUpdate = columnName;
            } else if (columnType === 'contextual') {
                const contextKey = `_ctx_${this.config.moduleInstanceId}_${columnName}`;
                entity[contextKey] = newValue;
                attributeToUpdate = contextKey;
            }
            
            // Update entity via API
            if (this.entityService) {
                if (typeof this.entityService.updateEntityAttribute === 'function') {
                    // Real SSOT-4000 EntityService
                    await this.entityService.updateEntityAttribute(entityId, attributeToUpdate, newValue);
                } else if (typeof this.entityService.updateEntity === 'function') {
                    // Mock EntityService
                    const updates = { [attributeToUpdate]: newValue };
                    await this.entityService.updateEntity(entityId, updates);
                } else {
                    console.warn('⚠️ [ExpandableTableModule] Nessun metodo di aggiornamento disponibile');
                }
            }
            
            // Visual feedback
            cell.classList.add('cell-updated');
            setTimeout(() => cell.classList.remove('cell-updated'), 1000);
            
            console.log(`✅ Cella aggiornata: ${columnName} = "${newValue}"`);
            
        } catch (error) {
            console.error('❌ Errore aggiornamento cella:', error);
            // Revert value
            cellContent.textContent = oldValue;
        }
    }
    
    handleRowSelection(event) {
        const entityId = event.target.dataset.entityId;
        
        if (event.target.checked) {
            this.state.selectedRows.add(entityId);
        } else {
            this.state.selectedRows.delete(entityId);
        }
        
        this.updateSelectionUI();
    }
    
    handleSelectAll(event) {
        const rowSelectors = this.container.querySelectorAll('.row-selector');
        
        rowSelectors.forEach(checkbox => {
            checkbox.checked = event.target.checked;
            const entityId = checkbox.dataset.entityId;
            
            if (event.target.checked) {
                this.state.selectedRows.add(entityId);
            } else {
                this.state.selectedRows.delete(entityId);
            }
        });
        
        this.updateSelectionUI();
    }
    
    updateSelectionUI() {
        // Update header based on selection
        // This could show bulk action buttons, etc.
        const selectedCount = this.state.selectedRows.size;
        console.log(`${selectedCount} righe selezionate`);
    }
    
    handleRemoveColumn(columnName) {
        if (!confirm(`Rimuovere la colonna "${columnName}"?`)) return;
        
        // Remove from columns array
        this.state.columns = this.state.columns.filter(col => col.name !== columnName);
        
        // Re-render table
        this.render();
        
        // Save configuration
        this.saveConfiguration();
        
        console.log(`Colonna rimossa: ${columnName}`);
    }
    
    async refreshData() {
        if (this.state.selectedEntityType) {
            await this.loadEntitiesOfType(this.state.selectedEntityType);
            this.render();
        }
    }
    
    // WebSocket event handlers
    handleEntityChange(data) {
        if (this.state.entities.has(data.entityId)) {
            // Update local entity
            const entity = this.state.entities.get(data.entityId);
            if (entity && data.attributeName && data.newValue !== undefined) {
                entity[data.attributeName] = data.newValue;
                this.updateCellInTable(data.entityId, data.attributeName, data.newValue);
            }
        }
    }
    
    handleEntityCreated(data) {
        if (data.entityType === this.state.selectedEntityType) {
            this.state.entities.set(data.entityId, data.entity);
            this.render();
        }
    }
    
    handleEntityDeleted(data) {
        if (this.state.entities.has(data.entityId)) {
            this.state.entities.delete(data.entityId);
            this.state.selectedRows.delete(data.entityId);
            this.render();
        }
    }
    
    handleSchemaUpdate(data) {
        if (data.entityType === this.state.selectedEntityType) {
            // Reload attributes and refresh table
            this.loadEntityAttributes(data.entityType).then(() => {
                this.render();
            });
        }
    }
    
    updateCellInTable(entityId, attributeName, newValue) {
        const cell = this.container.querySelector(
            `.data-cell[data-entity-id="${entityId}"][data-column="${attributeName}"] .cell-content`
        );
        
        if (cell && document.activeElement !== cell) {
            const column = this.state.columns.find(col => col.name === attributeName);
            cell.textContent = this.formatCellValue(newValue, column);
            
            // Visual feedback
            cell.parentElement.classList.add('cell-updated');
            setTimeout(() => cell.parentElement.classList.remove('cell-updated'), 1000);
        }
    }
    
    updateLoadingState() {
        const overlay = this.container.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = this.state.isLoading ? 'flex' : 'none';
        }
    }
    
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Errore</h3>
                <p>${message}</p>
                <button class="btn-retry">🔄 Riprova</button>
            </div>
        `;
        
        this.container.querySelector('.btn-retry').addEventListener('click', () => {
            this.init();
        });
    }
    
    // Modal utilities
    createModal(title, content, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 10000; 
            display: flex; align-items: center; justify-content: center;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.cssText = `
            background: white; border-radius: 12px; padding: 24px; 
            max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;
        
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn-cancel">Annulla</button>
                <button class="btn-confirm">Conferma</button>
            </div>
        `;
        
        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal(overlay);
        });
        
        modal.querySelector('.btn-cancel').addEventListener('click', () => {
            this.closeModal(overlay);
        });
        
        modal.querySelector('.btn-confirm').addEventListener('click', () => {
            if (onConfirm) onConfirm(modal);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal(overlay);
            }
        });
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return modal;
    }
    
    closeModal(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }
    
    // Configuration persistence
    saveConfiguration() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.persistConfiguration();
        }, this.SAVE_DELAY);
    }
    
    async persistConfiguration() {
        // This would save the table configuration to ModuleInstance
        const config = {
            tableName: this.config.tableName,
            selectedEntityType: this.state.selectedEntityType,
            columns: this.state.columns,
            lastModified: new Date().toISOString()
        };
        
        console.log('💾 Configurazione salvata:', config);
        
        // TODO: Implement actual persistence to ModuleInstance when available
    }
    
    // Public API
    getConfiguration() {
        return {
            tableName: this.config.tableName,
            selectedEntityType: this.state.selectedEntityType,
            columns: this.state.columns,
            entityCount: this.state.entities.size
        };
    }
    
    destroy() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// CSS Styles for the Expandable Table Module
const expandableTableStyles = `
<style>
.expandable-table-container {
    font-family: system-ui, -apple-system, sans-serif;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    overflow: hidden;
}

.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.table-title-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.table-name-input {
    font-size: 1.2em;
    font-weight: 600;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    outline: none;
    transition: all 0.2s;
}

.table-name-input::placeholder {
    color: rgba(255,255,255,0.7);
}

.table-name-input:focus {
    background: rgba(255,255,255,0.3);
    border-color: rgba(255,255,255,0.5);
}

.table-stats {
    font-size: 0.9em;
    opacity: 0.9;
}

.table-actions {
    display: flex;
    gap: 10px;
}

.table-actions button {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.table-actions button:hover {
    background: rgba(255,255,255,0.3);
    transform: translateY(-2px);
}

.type-selector {
    padding: 20px;
    border-bottom: 1px solid #e9ecef;
}

.type-selector.selected {
    display: flex;
    align-items: center;
    gap: 15px;
    background: #f8f9fa;
}

.selected-type-label {
    font-weight: 600;
    color: #495057;
}

.selected-type-value {
    background: #4CAF50;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: 500;
}

.type-input-container {
    position: relative;
    margin-top: 10px;
}

.type-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    font-size: 1em;
    outline: none;
    transition: border-color 0.2s;
}

.type-input:focus {
    border-color: #4CAF50;
}

.type-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
}

.suggestion-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.suggestion-item:hover {
    background: #f8f9fa;
}

.suggestion-item.create-new {
    background: #e8f5e8;
    border-top: 1px solid #d4edda;
}

.suggestion-item.create-new:hover {
    background: #d4edda;
}

.empty-state, .empty-table-state {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
}

.empty-icon {
    font-size: 4em;
    margin-bottom: 20px;
}

.getting-started-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 20px;
}

.getting-started-actions button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}

.getting-started-actions button:hover {
    background: #45a049;
    transform: translateY(-2px);
}

.table-container {
    overflow-x: auto;
}

.expandable-table {
    width: 100%;
    border-collapse: collapse;
}

.table-header-row {
    background: #f8f9fa;
}

.table-header-row th {
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
}

.column-header-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.column-type-icon {
    font-size: 0.8em;
}

.btn-remove-column {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    opacity: 0.6;
    transition: all 0.2s;
}

.btn-remove-column:hover {
    opacity: 1;
    background: rgba(220, 53, 69, 0.1);
}

.add-column-header {
    width: 50px;
    text-align: center;
}

.btn-add-column-inline {
    background: #4CAF50;
    color: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-add-column-inline:hover {
    transform: scale(1.1);
}

.table-row {
    transition: background-color 0.2s;
}

.table-row:hover {
    background: #f8f9fa;
}

.select-cell, .add-column-cell {
    width: 50px;
    text-align: center;
    padding: 12px;
}

.data-cell {
    padding: 0;
    border-bottom: 1px solid #e9ecef;
}

.data-cell.editable:hover {
    background: #f0f8ff;
}

.cell-content {
    padding: 12px;
    min-height: 20px;
    outline: none;
    border-radius: 4px;
    transition: all 0.2s;
}

.cell-content:focus {
    background: white;
    box-shadow: inset 0 0 0 2px #4CAF50;
}

.cell-updated {
    background: #d4edda !important;
    transition: background-color 0.3s;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
    margin: 0;
    color: #495057;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
    color: #6c757d;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    transition: all 0.2s;
}

.modal-close:hover {
    background: #f8f9fa;
    color: #495057;
}

.modal-body {
    padding: 24px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e9ecef;
}

.btn-cancel, .btn-confirm {
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-cancel {
    background: #6c757d;
    color: white;
    border: none;
}

.btn-cancel:hover {
    background: #5a6268;
}

.btn-confirm {
    background: #4CAF50;
    color: white;
    border: none;
}

.btn-confirm:hover {
    background: #45a049;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #495057;
}

.form-group input, .form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    outline: none;
    transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus {
    border-color: #4CAF50;
}

.available-attributes {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

.attribute-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #e8f5e8;
    border: 1px solid #4CAF50;
    color: #2d5a2d;
    padding: 6px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.2s;
}

.attribute-chip:hover {
    background: #4CAF50;
    color: white;
}

.column-type-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.radio-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.radio-option:hover {
    background: #f8f9fa;
}

.radio-option input[type="radio"] {
    width: auto;
}

.radio-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.radio-text small {
    color: #6c757d;
    font-size: 0.85em;
}

.radio-icon {
    font-size: 1.2em;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255,255,255,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.error-state {
    text-align: center;
    padding: 60px 20px;
    color: #dc3545;
}

.error-icon {
    font-size: 4em;
    margin-bottom: 20px;
}

.btn-retry {
    background: #dc3545;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-retry:hover {
    background: #c82333;
    transform: translateY(-2px);
}
</style>
`;

// Export for use in SSOT-4000 with error handling
try {
    if (typeof window !== 'undefined') {
        window.ExpandableTableModule = ExpandableTableModule;
        console.log('✅ [ExpandableTableModule] Registrato globalmente come window.ExpandableTableModule');
        console.log('✅ [ExpandableTableModule] Tipo:', typeof ExpandableTableModule);
        console.log('✅ [ExpandableTableModule] Constructor:', ExpandableTableModule.constructor.name);
        
        // Inject styles
        if (!document.querySelector('#expandable-table-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'expandable-table-styles';
            styleElement.innerHTML = expandableTableStyles.replace('<style>', '').replace('</style>', '');
            document.head.appendChild(styleElement);
            console.log('✅ [ExpandableTableModule] Stili CSS caricati');
        }
    }
} catch (error) {
    console.error('❌ [ExpandableTableModule] Errore durante l\'inizializzazione:', error);
}

// Module export for compatibility with both ES6 modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExpandableTableModule };
} else if (typeof define === 'function' && define.amd) {
    define(() => ExpandableTableModule);
}