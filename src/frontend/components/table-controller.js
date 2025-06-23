/**
 * TableController - UI Handler for Dynamic Table Module
 * 
 * This class manages DOM rendering and user interaction for the table module.
 * It listens to TableAPI events and updates the UI granularly for performance.
 */

class TableController {
    constructor(container, moduleInstance) {
        this.container = container;
        this.moduleInstance = moduleInstance;
        
        // Initialize the API
        this.api = new TableAPI(moduleInstance);
        
        // DOM references (populated during render)
        this.table = null;
        this.thead = null;
        this.tbody = null;
        this.activeAutocomplete = null;
        
        // Track DOM elements for efficient updates
        this.rowElements = new Map(); // entityId -> tr element
        this.cellElements = new Map(); // entityId:attributeName -> td element
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Bind to API events
        this.bindAPIEvents();
        
        // Load initial state
        await this.api.loadState();
        
        // Setup global change listeners
        this.setupGlobalListeners();
    }
    
    bindAPIEvents() {
        // State events
        this.api.on('state:loaded', () => this.render());
        this.api.on('entity-type:set', (data) => this.handleEntityTypeSet(data));
        this.api.on('entities:loaded', (data) => this.handleEntitiesLoaded(data));
        
        // Query events
        this.api.on('query:changed', (data) => this.handleQueryChanged(data));
        this.api.on('data:loading', (data) => this.handleDataLoading(data));
        this.api.on('data:loaded', (data) => this.handleDataLoaded(data));
        
        // Column events
        this.api.on('column:added', (data) => this.handleColumnAdded(data));
        this.api.on('column:removed', (data) => this.handleColumnRemoved(data));
        
        // Row events
        this.api.on('row:added', (data) => this.handleRowAdded(data));
        this.api.on('row:removed', (data) => this.handleRowRemoved(data));
        
        // Cell events
        this.api.on('cell:changed', (data) => this.handleCellChanged(data));
        
        // Other events
        this.api.on('name:changed', (data) => this.handleNameChanged(data));
        this.api.on('error', (data) => this.handleError(data));
    }
    
    setupGlobalListeners() {
        // Listen to AttributeSpace for external changes
        if (window.attributeSpace) {
            window.attributeSpace.subscribeGlobal((event) => {
                this.handleExternalChange(event);
            });
        }
        
        // Listen to WebSocket for real-time updates
        if (window.WebSocketService) {
            window.WebSocketService.addEventListener('message', (event) => {
                this.handleWebSocketMessage(event);
            });
        }
    }
    
    render() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'evolved-table-wrapper';
        
        // Create simple header section
        const header = this.createSimpleHeader();
        wrapper.appendChild(header);
        
        // Create table
        this.table = document.createElement('table');
        this.table.className = 'evolved-table';
        
        this.thead = document.createElement('thead');
        this.tbody = document.createElement('tbody');
        
        this.table.appendChild(this.thead);
        this.table.appendChild(this.tbody);
        
        wrapper.appendChild(this.table);
        this.container.appendChild(wrapper);
        
        // Render content
        this.renderTableHeader();
        this.renderAllRows();
        
        // Apply styles
        this.applyStyles();
    }
    
    createSimpleHeader() {
        const header = document.createElement('div');
        header.className = 'simple-table-header';
        
        // Just show table name and minimal stats
        const title = document.createElement('h3');
        title.className = 'table-title';
        title.textContent = this.api.getTableName() || 'Tabella Dinamica';
        
        header.appendChild(title);
        
        return header;
    }
    
    createToolbarSection() {
        const toolbar = document.createElement('div');
        toolbar.className = 'table-toolbar';
        
        // Search section
        const searchSection = document.createElement('div');
        searchSection.className = 'toolbar-section search-section';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.className = 'global-search-input';
        searchInput.placeholder = 'Cerca in tutte le colonne...';
        searchInput.value = this.api.getQuery().globalSearch;
        
        // Debounced search
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.api.setGlobalSearch(e.target.value);
            }, 300);
        });
        
        const searchIcon = document.createElement('span');
        searchIcon.className = 'search-icon';
        searchIcon.innerHTML = '🔍';
        
        searchSection.appendChild(searchIcon);
        searchSection.appendChild(searchInput);
        
        // Filter section
        const filterSection = document.createElement('div');
        filterSection.className = 'toolbar-section filter-section';
        
        const activeFilters = document.createElement('div');
        activeFilters.className = 'active-filters';
        activeFilters.id = 'active-filters';
        
        const addFilterBtn = document.createElement('button');
        addFilterBtn.className = 'add-filter-btn';
        addFilterBtn.innerHTML = '+ Filtro';
        addFilterBtn.onclick = () => this.showAddFilterModal();
        
        filterSection.appendChild(activeFilters);
        filterSection.appendChild(addFilterBtn);
        
        // Actions section
        const actionsSection = document.createElement('div');
        actionsSection.className = 'toolbar-section actions-section';
        
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'toolbar-btn refresh-btn';
        refreshBtn.innerHTML = '🔄 Aggiorna';
        refreshBtn.onclick = () => this.api.fetchData();
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'toolbar-btn export-btn';
        exportBtn.innerHTML = '📥 Esporta';
        refreshBtn.onclick = () => this.exportData();
        
        actionsSection.appendChild(refreshBtn);
        actionsSection.appendChild(exportBtn);
        
        // Combine all sections
        toolbar.appendChild(searchSection);
        toolbar.appendChild(filterSection);
        toolbar.appendChild(actionsSection);
        
        return toolbar;
    }
    
    renderTableHeader() {
        this.thead.innerHTML = '';
        const tr = this.thead.insertRow();
        
        // Entity Type Cell (First cell)
        const typeCell = document.createElement('th');
        typeCell.className = 'entity-type-header';
        
        const entityType = this.api.getEntityType();
        if (entityType) {
            // Show selected entity type
            typeCell.textContent = entityType;
            typeCell.style.fontWeight = 'bold';
            typeCell.style.cursor = 'default';
        } else {
            // Show entity type selector
            this.renderEntityTypeInput(typeCell);
        }
        
        tr.appendChild(typeCell);
        
        // Data columns (attributes)
        this.api.getColumns().forEach(column => {
            this.appendSimpleHeaderCell(tr, column);
        });
        
        // Add column cell
        const addColCell = document.createElement('th');
        addColCell.className = 'add-column-cell';
        this.renderAddColumnInput(addColCell);
        
        tr.appendChild(addColCell);
    }
    
    renderEntityTypeInput(cell) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'entity-type-input';
        input.placeholder = 'Tipo entità...';
        
        // Setup autocomplete for entity types
        this.setupEntityTypeAutocomplete(input);
        
        cell.appendChild(input);
        input.focus();
    }
    
    renderAddColumnInput(cell) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'add-column-input';
        input.placeholder = '...';
        input.disabled = !this.api.getEntityType(); // Disable if no entity type selected
        
        if (this.api.getEntityType()) {
            // Setup autocomplete for attributes
            this.setupAttributeAutocomplete(input);
        }
        
        cell.appendChild(input);
    }
    
    appendSimpleHeaderCell(tr, column) {
        const th = document.createElement('th');
        th.className = 'column-header';
        th.dataset.columnName = column.name;
        
        // Just show column name, no fancy UI
        th.textContent = column.name;
        
        // Simple right-click to remove
        th.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`Rimuovere la colonna "${column.name}"?`)) {
                this.api.removeColumn(column.name);
            }
        });
        
        // Insert before add column cell
        const addColCell = tr.querySelector('.add-column-cell');
        tr.insertBefore(th, addColCell);
        
        return th;
    }
    
    renderAllRows() {
        this.tbody.innerHTML = '';
        this.rowElements.clear();
        this.cellElements.clear();
        
        const entities = this.api.getRows();
        entities.forEach(entity => this.renderRow(entity));
        
        // Add row control
        this.renderAddRowControl();
    }
    
    renderRow(entity) {
        const tr = document.createElement('tr');
        tr.className = 'data-row';
        tr.dataset.entityId = entity.id;
        
        // Store reference
        this.rowElements.set(entity.id, tr);
        
        // Main cell (entity identifier with autocomplete)
        const mainCell = document.createElement('td');
        mainCell.className = 'entity-main-cell';
        
        // Use bindCell with isEntityCell flag
        this.bindCell(mainCell, entity, { name: this.getPrimaryAttribute(), type: 'string' }, true);
        
        tr.appendChild(mainCell);
        
        // Data cells
        this.api.getColumns().forEach(column => {
            const td = document.createElement('td');
            td.className = 'data-cell';
            this.bindCell(td, entity, column);
            tr.appendChild(td);
            
            // Store cell reference
            this.cellElements.set(`${entity.id}:${column.name}`, td);
        });
        
        // Insert before add row control
        const addRowTr = this.tbody.querySelector('.add-row-control');
        if (addRowTr) {
            this.tbody.insertBefore(tr, addRowTr);
        } else {
            this.tbody.appendChild(tr);
        }
        
        return tr;
    }
    
    bindCell(cell, entity, column, isEntityCell = false) {
        if (isEntityCell) {
            // Special handling for entity cell with autocomplete
            this.bindEntityCell(cell, entity);
        } else if (column.type === 'reference') {
            // Reference cell with autocomplete component
            this.bindReferenceCell(cell, entity, column);
        } else {
            // Regular attribute cell
            const input = document.createElement('input');
            input.type = this.getInputType(column.type);
            input.className = 'cell-input';
            input.value = entity[column.name] || '';
            
            // Debounced change handler
            let changeTimeout;
            input.addEventListener('input', (e) => {
                clearTimeout(changeTimeout);
                changeTimeout = setTimeout(() => {
                    this.api.setCellValue(entity.id, column.name, e.target.value);
                }, 300);
            });
            
            // Immediate save on blur
            input.addEventListener('blur', (e) => {
                clearTimeout(changeTimeout);
                this.api.setCellValue(entity.id, column.name, e.target.value);
            });
            
            cell.appendChild(input);
        }
    }
    
    bindReferenceCell(cell, entity, column) {
        // Clear cell
        cell.innerHTML = '';
        cell.className = 'reference-cell';
        
        // Get current value (entity ID)
        const currentValue = entity[column.name];
        
        // Create autocomplete component
        const autocomplete = new AutocompleteComponent(cell, {
            initialEntityId: currentValue,
            targetEntityType: column.targetEntityType || 'Entity',
            displayAttribute: column.displayAttribute || 'name',
            placeholder: `Seleziona ${column.targetEntityType || 'entità'}...`,
            allowCreate: true,
            onSelect: (entityId, selectedEntity) => {
                // Update the entity attribute
                this.api.setCellValue(entity.id, column.name, entityId);
                
                // Log the selection
                if (selectedEntity) {
                    this.log(`Selected ${selectedEntity.name || selectedEntity.id} for ${column.name}`, 'info');
                } else {
                    this.log(`Cleared ${column.name}`, 'info');
                }
            }
        });
        
        // Store reference for cleanup
        cell.autocompleteComponent = autocomplete;
    }
    
    bindEntityCell(cell, entity) {
        // Create input for entity search/selection
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'entity-cell-input';
        
        const primaryAttr = this.getPrimaryAttribute();
        const displayValue = entity[primaryAttr] || entity.name || entity.id?.slice(-8) || '';
        input.value = displayValue;
        input.placeholder = 'Cerca o crea entità...';
        
        // Store reference to entity
        input.dataset.entityId = entity.id || '';
        
        // Setup autocomplete
        this.setupEntityAutocomplete(input, cell, entity);
        
        cell.appendChild(input);
    }
    
    async setupEntityAutocomplete(input, cell, currentEntity) {
        let searchTimeout;
        
        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                this.hideAutocomplete();
                return;
            }
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                await this.showEntitySuggestions(input, query, currentEntity);
            }, 300);
        });
        
        // Handle keyboard navigation
        input.addEventListener('keydown', (e) => {
            this.handleAutocompleteKeyboard(e, input);
        });
        
        // Hide autocomplete on blur (with delay for click handling)
        input.addEventListener('blur', () => {
            setTimeout(() => this.hideAutocomplete(), 150);
        });
        
        // Handle entity selection/creation on Enter
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await this.handleEntitySelection(input, currentEntity);
            }
        });
    }
    
    async showEntitySuggestions(input, query, currentEntity) {
        const entityType = this.api.getEntityType();
        if (!entityType) return;
        
        try {
            // Search existing entities
            let suggestions = [];
            
            if (this.entityManager && this.entityManager.searchEntities) {
                const result = await this.entityManager.searchEntities({
                    entityType,
                    query,
                    limit: 10
                });
                suggestions = result?.data || [];
            }
            
            // Add existing table entities to suggestions if not already included
            const tableEntities = this.api.getRows();
            tableEntities.forEach(entity => {
                const primaryAttr = this.getPrimaryAttribute();
                const entityValue = entity[primaryAttr] || entity.name || '';
                
                if (entityValue.toLowerCase().includes(query.toLowerCase())) {
                    // Check if not already in suggestions
                    if (!suggestions.find(s => s.id === entity.id)) {
                        suggestions.push(entity);
                    }
                }
            });
            
            // Add "Create new" option if query doesn't exactly match any suggestion
            const exactMatch = suggestions.find(s => {
                const primaryAttr = this.getPrimaryAttribute();
                const value = s[primaryAttr] || s.name || '';
                return value.toLowerCase() === query.toLowerCase();
            });
            
            if (!exactMatch) {
                suggestions.push({
                    id: 'CREATE_NEW',
                    [this.getPrimaryAttribute()]: `Crea nuovo: "${query}"`,
                    _isCreateNew: true,
                    _createValue: query
                });
            }
            
            this.showAutocomplete(input, suggestions, (selected) => {
                this.selectEntity(input, selected, currentEntity);
            });
            
        } catch (error) {
            console.error('Error searching entities:', error);
        }
    }
    
    async selectEntity(input, selectedEntity, currentEntity) {
        if (selectedEntity._isCreateNew) {
            // Create new entity
            await this.createNewEntity(input, selectedEntity._createValue, currentEntity);
        } else {
            // Select existing entity
            await this.selectExistingEntity(input, selectedEntity, currentEntity);
        }
        
        this.hideAutocomplete();
    }
    
    async createNewEntity(input, entityName, currentEntity) {
        const entityType = this.api.getEntityType();
        const primaryAttr = this.getPrimaryAttribute();
        
        try {
            // Create initial data with primary attribute
            const initialData = {
                [primaryAttr]: entityName
            };
            
            // If this is replacing a temporary entity, update it
            if (!currentEntity.id || currentEntity._temporary) {
                // Update current entity
                Object.assign(currentEntity, initialData);
                currentEntity.entityType = entityType;
                
                // Create the entity in the backend
                if (this.entityManager && this.entityManager.createEntity) {
                    const result = await this.entityManager.createEntity(entityType, initialData);
                    const newEntity = result?.data || result;
                    
                    if (newEntity && newEntity.id) {
                        // Update with real ID and data
                        Object.assign(currentEntity, newEntity);
                        delete currentEntity._temporary;
                        
                        // Update the row's dataset
                        const row = input.closest('tr');
                        if (row) {
                            row.dataset.entityId = newEntity.id;
                        }
                        
                        // Update API state
                        this.api.state.entityIds.add(newEntity.id);
                    }
                }
                
                input.value = entityName;
                input.dataset.entityId = currentEntity.id;
                
                this.log(`Created new entity: ${entityName}`, 'success');
            }
            
        } catch (error) {
            console.error('Error creating entity:', error);
            this.log(`Error creating entity: ${error.message}`, 'error');
        }
    }
    
    async selectExistingEntity(input, selectedEntity, currentEntity) {
        try {
            // Replace the temporary entity with the selected one
            if (currentEntity._temporary) {
                // Remove temporary entity
                this.api.state.entityIds.delete(currentEntity.id);
                this.api.temporaryEntities.delete(currentEntity.id);
            }
            
            // Update current entity reference
            Object.assign(currentEntity, selectedEntity);
            
            // Update input display
            const primaryAttr = this.getPrimaryAttribute();
            input.value = selectedEntity[primaryAttr] || selectedEntity.name || selectedEntity.id;
            input.dataset.entityId = selectedEntity.id;
            
            // Update row dataset
            const row = input.closest('tr');
            if (row) {
                row.dataset.entityId = selectedEntity.id;
            }
            
            // Update API state
            this.api.state.entityIds.add(selectedEntity.id);
            
            // Auto-populate all cells in this row with entity data
            this.autoPopulateRowCells(row, selectedEntity);
            
            this.log(`Selected entity: ${input.value}`, 'info');
            
        } catch (error) {
            console.error('Error selecting entity:', error);
        }
    }
    
    autoPopulateRowCells(row, entity) {
        const cells = row.querySelectorAll('.data-cell');
        const columns = this.api.getColumns();
        
        cells.forEach((cell, index) => {
            if (columns[index]) {
                const columnName = columns[index].name;
                const value = entity[columnName] || '';
                
                // Update the input value if it exists and is empty
                const input = cell.querySelector('input');
                if (input && !input.value) {
                    input.value = value;
                    
                    // Trigger change to update the entity
                    if (value) {
                        this.api.setCellValue(entity.id, columnName, value);
                    }
                }
                
                // For reference cells, update the autocomplete component
                if (cell.autocompleteComponent && value) {
                    cell.autocompleteComponent.setValue(value);
                }
            }
        });
    }
    
    handleAutocompleteKeyboard(e, input) {
        const dropdown = this.activeAutocomplete;
        if (!dropdown) return;
        
        const items = dropdown.querySelectorAll('.autocomplete-item');
        let selectedIndex = Array.from(items).findIndex(item => 
            item.classList.contains('selected')
        );
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.highlightAutocompleteItem(items, selectedIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.highlightAutocompleteItem(items, selectedIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    items[selectedIndex].click();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideAutocomplete();
                break;
        }
    }
    
    highlightAutocompleteItem(items, selectedIndex) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }
    
    async handleEntitySelection(input, currentEntity) {
        const value = input.value.trim();
        if (!value) return;
        
        // Check if we have an active autocomplete selection
        const dropdown = this.activeAutocomplete;
        if (dropdown) {
            const selectedItem = dropdown.querySelector('.autocomplete-item.selected');
            if (selectedItem) {
                selectedItem.click();
                return;
            }
        }
        
        // If no autocomplete selection, treat as create new
        await this.createNewEntity(input, value, currentEntity);
    }
    
    renderAddRowControl() {
        const tr = document.createElement('tr');
        tr.className = 'add-row-control';
        
        const td = document.createElement('td');
        td.colSpan = this.api.getColumns().length + 1;
        td.innerHTML = '<button class="add-row-btn">+ Aggiungi riga</button>';
        
        td.querySelector('.add-row-btn').addEventListener('click', () => {
            this.api.addRow();
        });
        
        tr.appendChild(td);
        this.tbody.appendChild(tr);
    }
    
    // Event Handlers
    
    handleEntityTypeSet(data) {
        // Update header
        this.renderTableHeader();
        
        // Enable the add column input now that we have entity type
        const addColInput = this.thead.querySelector('.add-column-input');
        if (addColInput) {
            addColInput.disabled = false;
            this.setupAttributeAutocomplete(addColInput);
        }
        
        // Clear rows but add one empty row to start
        this.tbody.innerHTML = '';
        this.api.addRow(); // Add first empty row
        this.renderAddRowControl();
    }
    
    handleEntitiesLoaded(data) {
        this.renderAllRows();
        this.updateStats();
    }
    
    handleColumnAdded(data) {
        const headerRow = this.thead.rows[0];
        this.appendHeaderCell(headerRow, data.column);
        
        // Add cells to existing rows
        this.api.getRows().forEach(entity => {
            const tr = this.rowElements.get(entity.id);
            if (tr) {
                const td = document.createElement('td');
                td.className = 'data-cell';
                this.bindCell(td, entity, data.column);
                
                // Insert before last cell
                const lastCell = tr.lastElementChild;
                tr.insertBefore(td, lastCell);
                
                // Store reference
                this.cellElements.set(`${entity.id}:${data.column.name}`, td);
            }
        });
        
        this.updateStats();
    }
    
    handleColumnRemoved(data) {
        // Remove header
        const th = this.thead.querySelector(`[data-column-name="${data.column.name}"]`);
        if (th) th.remove();
        
        // Remove cells
        this.cellElements.forEach((cell, key) => {
            if (key.endsWith(`:${data.column.name}`)) {
                cell.remove();
                this.cellElements.delete(key);
            }
        });
        
        this.updateStats();
    }
    
    handleRowAdded(data) {
        this.renderRow(data.entity);
        this.updateStats();
    }
    
    handleRowRemoved(data) {
        const tr = this.rowElements.get(data.entityId);
        if (tr) {
            tr.remove();
            this.rowElements.delete(data.entityId);
            
            // Remove cell references
            this.cellElements.forEach((cell, key) => {
                if (key.startsWith(`${data.entityId}:`)) {
                    this.cellElements.delete(key);
                }
            });
        }
        this.updateStats();
    }
    
    handleCellChanged(data) {
        // This is for programmatic changes, not user input
        const cell = this.cellElements.get(`${data.entityId}:${data.attributeName}`);
        if (cell) {
            const input = cell.querySelector('input');
            if (input && document.activeElement !== input) {
                input.value = data.value || '';
            }
        }
    }
    
    handleQueryChanged(data) {
        // Update toolbar to reflect query changes
        this.updateToolbarFromQuery(data.query);
        this.updateActiveFilters(data.query.filters);
    }
    
    handleDataLoading(data) {
        // Show/hide loading indicator
        const loadingIndicator = this.container.querySelector('.loading-indicator');
        if (data.loading) {
            if (!loadingIndicator) {
                const loader = document.createElement('div');
                loader.className = 'loading-indicator';
                loader.innerHTML = '⟳ Caricamento...';
                this.table.parentNode.insertBefore(loader, this.table);
            }
        } else {
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    }
    
    handleDataLoaded(data) {
        // Refresh the table content
        this.renderAllRows();
        this.updateStats();
        this.updatePagination(data.query);
        this.log(`Loaded ${data.entities.length} entities`, 'success');
    }
    
    handleNameChanged(data) {
        const nameInput = this.container.querySelector('.table-name-input');
        if (nameInput && document.activeElement !== nameInput) {
            nameInput.value = data.name;
        }
    }
    
    handleError(data) {
        console.error('Table error:', data);
        this.log(`Error: ${data.message}`, 'error');
        // Could show a toast notification here
    }
    
    handleExternalChange(event) {
        // Skip if change originated from this module
        if (event.metadata?.source === `table-module:${this.moduleInstance?.instanceId}`) {
            return;
        }
        
        // Update affected cell if visible
        const cell = this.cellElements.get(`${event.entityId}:${event.attributeName}`);
        if (cell) {
            const input = cell.querySelector('input');
            if (input && document.activeElement !== input) {
                input.value = event.newValue || '';
            }
        }
    }
    
    handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'entity:update') {
                // Handle entity updates
                this.handleExternalChange({
                    entityId: data.entityId,
                    attributeName: data.attributeName,
                    newValue: data.value
                });
            }
        } catch (error) {
            // Ignore parsing errors
        }
    }
    
    // UI Helper Methods
    
    showEntityTypeSelector(container) {
        container.innerHTML = '';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'entity-type-input';
        input.placeholder = 'Seleziona tipo entità...';
        
        // Setup autocomplete
        this.setupEntityTypeAutocomplete(input);
        
        container.appendChild(input);
        input.focus();
    }
    
    async setupEntityTypeAutocomplete(input) {
        let types = [];
        
        // Get available entity types
        if (window.SchemaService) {
            try {
                const result = await window.SchemaService.getAvailableEntityTypes();
                types = result?.data || [];
            } catch (error) {
                types = ['Contact', 'Project', 'Task', 'Note', 'Persona'];
            }
        }
        
        // Simple autocomplete
        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            if (value.length < 1) {
                this.hideAutocomplete();
                return;
            }
            
            const filtered = types.filter(t => t.toLowerCase().includes(value));
            
            // Show simple dropdown
            this.showSimpleAutocomplete(input, filtered, (selected) => {
                this.api.setEntityType(selected);
                this.hideAutocomplete();
            });
        });
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value) {
                const value = e.target.value;
                // Check if it's in the list or create new
                if (types.includes(value) || confirm(`Creare nuovo tipo di entità "${value}"?`)) {
                    this.api.setEntityType(value);
                    this.hideAutocomplete();
                }
            } else if (e.key === 'Escape') {
                this.hideAutocomplete();
            }
        });
        
        // Handle blur
        input.addEventListener('blur', () => {
            setTimeout(() => this.hideAutocomplete(), 200);
        });
    }
    
    async setupAttributeAutocomplete(input) {
        const entityType = this.api.getEntityType();
        if (!entityType) return;
        
        let attributes = [];
        
        // Get schema attributes
        if (window.SchemaService) {
            try {
                const result = await window.SchemaService.getEntitySchema(entityType);
                const schema = result?.data || {};
                if (schema.attributes) {
                    attributes = Object.keys(schema.attributes);
                }
            } catch (error) {
                console.log('Could not load schema attributes');
            }
        }
        
        // Add already used columns to avoid duplicates
        const existingColumns = this.api.getColumns().map(c => c.name);
        
        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            if (value.length < 1) {
                this.hideAutocomplete();
                return;
            }
            
            // Filter available attributes (not already used)
            const available = attributes.filter(attr => 
                !existingColumns.includes(attr) && 
                attr.toLowerCase().includes(value)
            );
            
            // Add option to create new attribute
            if (value && !attributes.includes(value) && !existingColumns.includes(value)) {
                available.push(`+ Crea "${value}"`);
            }
            
            this.showSimpleAutocomplete(input, available, (selected) => {
                if (selected.startsWith('+ Crea')) {
                    // Extract the attribute name
                    const attrName = value;
                    this.api.addColumn(attrName, {
                        type: 'string',
                        isContextual: true
                    });
                } else {
                    // Existing attribute
                    this.api.addColumn(selected, {
                        type: 'string',
                        isContextual: false
                    });
                }
                
                // Clear input and refocus
                input.value = '';
                input.focus();
                this.hideAutocomplete();
            });
        });
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value) {
                const value = e.target.value.trim();
                if (value && !existingColumns.includes(value)) {
                    const isIntrinsic = attributes.includes(value);
                    this.api.addColumn(value, {
                        type: 'string',
                        isContextual: !isIntrinsic
                    });
                    input.value = '';
                    this.hideAutocomplete();
                }
            } else if (e.key === 'Escape') {
                input.value = '';
                this.hideAutocomplete();
            }
        });
        
        // Handle blur
        input.addEventListener('blur', () => {
            setTimeout(() => {
                input.value = '';
                this.hideAutocomplete();
            }, 200);
        });
    }
    
    showSimpleAutocomplete(input, suggestions, onSelect) {
        this.hideAutocomplete();
        
        if (suggestions.length === 0) return;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'simple-autocomplete';
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            
            if (index === 0) {
                item.classList.add('selected');
            }
            
            item.onclick = () => {
                onSelect(suggestion);
            };
            
            dropdown.appendChild(item);
        });
        
        // Position below input
        const rect = input.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.minWidth = `${rect.width}px`;
        
        document.body.appendChild(dropdown);
        this.activeAutocomplete = dropdown;
        
        // Add keyboard navigation
        const handleKeyboard = (e) => {
            const items = dropdown.querySelectorAll('.autocomplete-item');
            const current = dropdown.querySelector('.selected');
            const currentIndex = Array.from(items).indexOf(current);
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (currentIndex < items.length - 1) {
                        current.classList.remove('selected');
                        items[currentIndex + 1].classList.add('selected');
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (currentIndex > 0) {
                        current.classList.remove('selected');
                        items[currentIndex - 1].classList.add('selected');
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    const selected = dropdown.querySelector('.selected');
                    if (selected) {
                        selected.click();
                    }
                    break;
            }
        };
        
        input.addEventListener('keydown', handleKeyboard);
        input.dataset.keyboardHandler = handleKeyboard;
    }
    
    showAddColumnInput(container) {
        // Create a more advanced column creation modal
        const modal = document.createElement('div');
        modal.className = 'column-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Aggiungi Colonna</h3>
                <div class="column-form">
                    <div class="form-group">
                        <label for="column-name">Nome Colonna:</label>
                        <input type="text" id="column-name" placeholder="Nome della colonna">
                    </div>
                    <div class="form-group">
                        <label for="column-type">Tipo:</label>
                        <select id="column-type">
                            <option value="string">Testo</option>
                            <option value="number">Numero</option>
                            <option value="date">Data</option>
                            <option value="boolean">Si/No</option>
                            <option value="email">Email</option>
                            <option value="reference">Riferimento ad entità</option>
                        </select>
                    </div>
                    <div class="form-group reference-options" style="display: none;">
                        <label for="target-entity-type">Tipo Entità di Riferimento:</label>
                        <input type="text" id="target-entity-type" placeholder="es: Contact, Project...">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="is-contextual" checked>
                            Attributo contestuale (solo per questa tabella)
                        </label>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="create-column">Crea Colonna</button>
                    <button id="cancel-column">Annulla</button>
                </div>
            </div>
        `;
        
        // Show/hide reference options based on type
        const typeSelect = modal.querySelector('#column-type');
        const referenceOptions = modal.querySelector('.reference-options');
        
        typeSelect.addEventListener('change', (e) => {
            referenceOptions.style.display = e.target.value === 'reference' ? 'block' : 'none';
        });
        
        // Modal handlers
        modal.querySelector('#create-column').onclick = () => {
            const name = modal.querySelector('#column-name').value.trim();
            const type = modal.querySelector('#column-type').value;
            const isContextual = modal.querySelector('#is-contextual').checked;
            const targetEntityType = modal.querySelector('#target-entity-type').value.trim();
            
            if (!name) {
                alert('Inserisci il nome della colonna');
                return;
            }
            
            if (type === 'reference' && !targetEntityType) {
                alert('Specifica il tipo di entità di riferimento');
                return;
            }
            
            const columnOptions = {
                type,
                isContextual,
                metadata: {}
            };
            
            if (type === 'reference') {
                columnOptions.targetEntityType = targetEntityType;
                columnOptions.displayAttribute = 'name'; // Default display attribute
            }
            
            this.api.addColumn(name, columnOptions);
            modal.remove();
        };
        
        modal.querySelector('#cancel-column').onclick = () => modal.remove();
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        document.body.appendChild(modal);
        modal.querySelector('#column-name').focus();
    }
    
    showColumnMenu(event, column) {
        event.stopPropagation();
        
        // Remove any existing menu
        const existingMenu = document.querySelector('.column-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.className = 'column-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="remove">
                <span class="menu-icon">🗑️</span>
                <span>Rimuovi colonna</span>
            </div>
            <div class="menu-item" data-action="rename">
                <span class="menu-icon">✏️</span>
                <span>Rinomina</span>
            </div>
            <div class="menu-item" data-action="type">
                <span class="menu-icon">🔧</span>
                <span>Cambia tipo</span>
            </div>
        `;
        
        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom}px`;
        menu.style.left = `${rect.left}px`;
        
        // Handle menu actions
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-item');
            if (item) {
                const action = item.dataset.action;
                switch (action) {
                    case 'remove':
                        if (confirm(`Rimuovere la colonna "${column.name}"?`)) {
                            this.api.removeColumn(column.name);
                        }
                        break;
                    case 'rename':
                        // TODO: Implement rename
                        alert('Funzionalità in sviluppo');
                        break;
                    case 'type':
                        // TODO: Implement type change
                        alert('Funzionalità in sviluppo');
                        break;
                }
                menu.remove();
            }
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
        
        document.body.appendChild(menu);
    }
    
    showAutocomplete(input, suggestions, onSelect) {
        this.hideAutocomplete();
        
        if (suggestions.length === 0) return;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            // Display the entity name or create new text
            if (suggestion._isCreateNew) {
                item.innerHTML = `<span class="create-new">${suggestion[this.getPrimaryAttribute()]}</span>`;
                item.classList.add('create-new-item');
            } else {
                const primaryAttr = this.getPrimaryAttribute();
                const displayValue = suggestion[primaryAttr] || suggestion.name || suggestion.id;
                item.textContent = displayValue;
                
                // Add entity type indicator if available
                if (suggestion.entityType) {
                    const typeSpan = document.createElement('span');
                    typeSpan.className = 'entity-type-indicator';
                    typeSpan.textContent = suggestion.entityType;
                    item.appendChild(typeSpan);
                }
            }
            
            // Highlight first item by default
            if (index === 0) {
                item.classList.add('selected');
            }
            
            item.addEventListener('click', () => {
                onSelect(suggestion);
                this.hideAutocomplete();
            });
            
            dropdown.appendChild(item);
        });
        
        // Position dropdown
        const rect = input.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.maxWidth = '300px';
        
        document.body.appendChild(dropdown);
        this.activeAutocomplete = dropdown;
    }
    
    hideAutocomplete() {
        if (this.activeAutocomplete) {
            this.activeAutocomplete.remove();
            this.activeAutocomplete = null;
        }
    }
    
    // Utility Methods
    
    getPrimaryAttribute() {
        const columns = this.api.getColumns();
        
        // Look for common primary attributes
        const primaryCandidates = ['name', 'nome', 'title', 'titolo', 'label'];
        for (const candidate of primaryCandidates) {
            if (columns.some(c => c.name === candidate)) {
                return candidate;
            }
        }
        
        // Return first string column
        const stringColumn = columns.find(c => c.type === 'string');
        return stringColumn ? stringColumn.name : 'id';
    }
    
    getInputType(columnType) {
        switch (columnType) {
            case 'number':
            case 'integer':
            case 'float':
                return 'number';
            case 'date':
                return 'date';
            case 'datetime':
                return 'datetime-local';
            case 'boolean':
                return 'checkbox';
            case 'email':
                return 'email';
            case 'url':
                return 'url';
            default:
                return 'text';
        }
    }
    
    updateStats() {
        const rowCountEl = document.getElementById('row-count-stat');
        const columnCountEl = document.getElementById('column-count-stat');
        
        if (rowCountEl) {
            const query = this.api.getQuery();
            const total = query.pagination.total;
            const current = this.api.getRows().length;
            rowCountEl.textContent = total > current ? `${current}/${total}` : current;
        }
        
        if (columnCountEl) {
            columnCountEl.textContent = this.api.getColumns().length;
        }
    }
    
    updateToolbarFromQuery(query) {
        const searchInput = this.container.querySelector('.global-search-input');
        if (searchInput && document.activeElement !== searchInput) {
            searchInput.value = query.globalSearch || '';
        }
    }
    
    updateActiveFilters(filters) {
        const activeFiltersEl = document.getElementById('active-filters');
        if (!activeFiltersEl) return;
        
        activeFiltersEl.innerHTML = '';
        
        filters.forEach((filter, index) => {
            const filterTag = document.createElement('div');
            filterTag.className = 'filter-tag';
            filterTag.innerHTML = `
                <span class="filter-text">${filter.column} ${filter.operator} "${filter.value}"</span>
                <button class="remove-filter-btn" data-filter-index="${index}">×</button>
            `;
            
            // Remove filter on click
            filterTag.querySelector('.remove-filter-btn').onclick = () => {
                this.api.setFilter(filter.column, filter.operator, ''); // Empty value removes filter
            };
            
            activeFiltersEl.appendChild(filterTag);
        });
    }
    
    updatePagination(query) {
        // Create pagination controls if not exists
        let paginationEl = this.container.querySelector('.pagination-controls');
        if (!paginationEl) {
            paginationEl = document.createElement('div');
            paginationEl.className = 'pagination-controls';
            this.table.parentNode.appendChild(paginationEl);
        }
        
        const { page, pageSize, total } = query.pagination;
        const totalPages = Math.ceil(total / pageSize);
        
        if (totalPages <= 1) {
            paginationEl.style.display = 'none';
            return;
        }
        
        paginationEl.style.display = 'flex';
        paginationEl.innerHTML = `
            <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="prev">‹ Precedente</button>
            <span class="pagination-info">Pagina ${page} di ${totalPages} (${total} elementi)</span>
            <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="next">Successiva ›</button>
        `;
        
        // Add pagination handlers
        paginationEl.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.onclick = (e) => {
                const action = e.target.dataset.page;
                if (action === 'prev' && page > 1) {
                    this.api.setPage(page - 1);
                } else if (action === 'next' && page < totalPages) {
                    this.api.setPage(page + 1);
                }
            };
        });
    }
    
    showAddFilterModal() {
        // Simple filter modal
        const columns = this.api.getColumns();
        if (columns.length === 0) {
            alert('Aggiungi prima delle colonne per poter filtrare');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'filter-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Aggiungi Filtro</h3>
                <div class="filter-form">
                    <select id="filter-column">
                        ${columns.map(col => `<option value="${col.name}">${col.name}</option>`).join('')}
                    </select>
                    <select id="filter-operator">
                        <option value="contains">Contiene</option>
                        <option value="equals">Uguale a</option>
                        <option value="starts">Inizia con</option>
                        <option value="ends">Finisce con</option>
                    </select>
                    <input type="text" id="filter-value" placeholder="Valore da cercare">
                </div>
                <div class="modal-actions">
                    <button id="apply-filter">Applica</button>
                    <button id="cancel-filter">Annulla</button>
                </div>
            </div>
        `;
        
        // Modal handlers
        modal.querySelector('#apply-filter').onclick = () => {
            const column = modal.querySelector('#filter-column').value;
            const operator = modal.querySelector('#filter-operator').value;
            const value = modal.querySelector('#filter-value').value.trim();
            
            if (value) {
                this.api.setFilter(column, operator, value);
            }
            
            modal.remove();
        };
        
        modal.querySelector('#cancel-filter').onclick = () => modal.remove();
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        document.body.appendChild(modal);
        modal.querySelector('#filter-value').focus();
    }
    
    exportData() {
        const config = this.api.getConfiguration ? this.api.getConfiguration() : {};
        const query = this.api.getQuery();
        const entities = this.api.getRows();
        
        const exportData = {
            metadata: {
                exported: new Date().toISOString(),
                module: 'evolved-table-module',
                version: '2.0.0'
            },
            configuration: config,
            query: query,
            data: entities
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `table-export-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.log('Data exported', 'success');
    }
    
    applyStyles() {
        // Add CSS if not already present
        if (!document.getElementById('evolved-table-styles')) {
            const style = document.createElement('style');
            style.id = 'evolved-table-styles';
            style.textContent = this.getStyles();
            document.head.appendChild(style);
        }
    }
    
    log(message, type = 'info') {
        // Try to log to demo console if available
        if (window.demo && window.demo.log) {
            window.demo.log(message, type);
        } else {
            console.log(`[TableController] ${message}`);
        }
    }
    
    getStyles() {
        return `
            .evolved-table-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                color: #333;
            }
            
            .simple-table-header {
                padding: 16px;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
                border: 1px solid #dee2e6;
                border-bottom: none;
            }
            
            .table-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #2c3e50;
            }
            
            .table-name-input {
                font-size: 18px;
                font-weight: 600;
                border: none;
                background: transparent;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .table-name-input:hover {
                background: white;
            }
            
            .table-name-input:focus {
                background: white;
                outline: 2px solid #4CAF50;
            }
            
            .table-stats {
                display: flex;
                gap: 20px;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .stat-label {
                color: #6c757d;
                font-size: 12px;
            }
            
            .stat-value {
                font-weight: 600;
                color: #495057;
            }
            
            .evolved-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 0 0 8px 8px;
            }
            
            .evolved-table th {
                background: white;
                padding: 8px 12px;
                text-align: left;
                font-weight: 600;
                border: 1px solid #dee2e6;
                position: relative;
            }
            
            .evolved-table td {
                padding: 0;
                border: 1px solid #dee2e6;
            }
            
            .entity-type-header {
                min-width: 150px;
                background: #f8f9fa;
            }
            
            .column-header {
                font-weight: normal;
                cursor: default;
            }
            
            .add-column-cell {
                width: 80px;
                padding: 0;
            }
            
            .entity-type-display {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .change-type-btn {
                background: none;
                border: none;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .change-type-btn:hover {
                opacity: 1;
            }
            
            .entity-type-input,
            .add-column-input {
                width: 100%;
                padding: 6px 8px;
                border: none;
                background: transparent;
                font-size: 14px;
                outline: none;
            }
            
            .entity-type-input {
                font-weight: 600;
            }
            
            .entity-type-input:focus,
            .add-column-input:focus {
                background: #f8f9fa;
            }
            
            .add-column-input:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .column-header-wrapper {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            
            .column-name {
                flex: 1;
            }
            
            .column-badge {
                font-size: 10px;
                padding: 2px 4px;
                border-radius: 3px;
                background: #e9ecef;
                color: #495057;
            }
            
            .column-badge.contextual {
                background: #fff3cd;
                color: #856404;
            }
            
            .column-menu-btn {
                background: none;
                border: none;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
                padding: 2px 4px;
            }
            
            .column-header:hover .column-menu-btn {
                opacity: 0.7;
            }
            
            .column-menu-btn:hover {
                opacity: 1 !important;
            }
            
            .add-column-cell {
                width: 120px;
                text-align: center;
            }
            
            .add-column-btn {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .add-column-btn:hover {
                background: #45a049;
            }
            
            .add-column-input {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
            }
            
            .entity-main-cell {
                background: #f8f9fa;
            }
            
            .data-cell {
                padding: 0;
            }
            
            .cell-input {
                width: 100%;
                padding: 8px 12px;
                border: none;
                background: transparent;
                font-size: 14px;
                outline: none;
            }
            
            .cell-input:focus {
                background: #fffbf0;
            }
            
            .entity-cell-input {
                font-weight: 500;
            }
            
            .add-row-control td {
                text-align: center;
                padding: 12px;
                background: #f8f9fa;
            }
            
            .add-row-btn {
                background: transparent;
                color: #4CAF50;
                border: 1px solid #4CAF50;
                padding: 6px 16px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .add-row-btn:hover {
                background: #4CAF50;
                color: white;
            }
            
            .column-menu {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 1000;
            }
            
            .menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .menu-item:hover {
                background: #f8f9fa;
            }
            
            .menu-icon {
                font-size: 16px;
            }
            
            /* Simple Autocomplete */
            .simple-autocomplete {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
            }
            
            .simple-autocomplete .autocomplete-item {
                padding: 8px 12px;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 14px;
            }
            
            .simple-autocomplete .autocomplete-item:hover,
            .simple-autocomplete .autocomplete-item.selected {
                background: #f8f9fa;
            }
            
            .simple-autocomplete .autocomplete-item:last-child {
                border-bottom: none;
            }
            
            /* Original autocomplete for entity cells */
            .autocomplete-dropdown {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
            }
            
            .autocomplete-item {
                padding: 8px 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .autocomplete-item:hover,
            .autocomplete-item.selected {
                background: #f8f9fa;
            }
            
            .create-new-item {
                background: #e8f5e9;
                font-style: italic;
            }
            
            .create-new-item:hover,
            .create-new-item.selected {
                background: #d4edda;
            }
            
            .create-new {
                color: #28a745;
                font-weight: 500;
            }
            
            .entity-type-indicator {
                float: right;
                font-size: 0.8em;
                color: #6c757d;
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 8px;
            }
            
            .entity-cell-input {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid transparent;
                background: transparent;
                border-radius: 4px;
                transition: all 0.2s;
                font-weight: 500;
            }
            
            .entity-cell-input:hover {
                background: #f8f9fa;
            }
            
            .entity-cell-input:focus {
                background: white;
                border-color: #007bff;
                outline: none;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            
            .toolbar-section {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .search-section {
                flex: 1;
                min-width: 200px;
                position: relative;
            }
            
            .global-search-input {
                width: 100%;
                padding: 8px 12px 8px 35px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .global-search-input:focus {
                border-color: #4CAF50;
                outline: none;
                box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.25);
            }
            
            .search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 16px;
                color: #6c757d;
                pointer-events: none;
            }
            
            .filter-section {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .active-filters {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .filter-tag {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #e3f2fd;
                border: 1px solid #2196f3;
                border-radius: 16px;
                padding: 4px 8px;
                font-size: 12px;
                color: #1976d2;
            }
            
            .filter-text {
                font-weight: 500;
            }
            
            .remove-filter-btn {
                background: none;
                border: none;
                color: #1976d2;
                cursor: pointer;
                font-weight: bold;
                padding: 0;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .remove-filter-btn:hover {
                background: rgba(25, 118, 210, 0.1);
            }
            
            .add-filter-btn {
                background: #2196f3;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .add-filter-btn:hover {
                background: #1976d2;
            }
            
            .toolbar-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .toolbar-btn:hover {
                background: #5a6268;
            }
            
            .refresh-btn {
                background: #28a745;
            }
            
            .refresh-btn:hover {
                background: #218838;
            }
            
            .export-btn {
                background: #17a2b8;
            }
            
            .export-btn:hover {
                background: #138496;
            }
            
            /* Column Header Enhancements */
            .column-name.sortable {
                cursor: pointer;
                transition: color 0.2s;
            }
            
            .column-name.sortable:hover {
                color: #4CAF50;
            }
            
            .sort-indicator {
                margin-left: 4px;
                font-weight: bold;
                color: #4CAF50;
            }
            
            .column-badge.reference {
                background: #fff3cd;
                color: #856404;
            }
            
            /* Loading Indicator */
            .loading-indicator {
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-style: italic;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-bottom: none;
            }
            
            /* Pagination */
            .pagination-controls {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                padding: 16px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-top: none;
                border-radius: 0 0 8px 8px;
            }
            
            .pagination-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .pagination-btn:hover:not([disabled]) {
                background: #5a6268;
            }
            
            .pagination-btn[disabled] {
                background: #e9ecef;
                color: #6c757d;
                cursor: not-allowed;
            }
            
            .pagination-info {
                font-size: 14px;
                color: #495057;
                font-weight: 500;
            }
            
            /* Filter Modal */
            .filter-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .modal-content {
                background: white;
                padding: 24px;
                border-radius: 8px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }
            
            .modal-content h3 {
                margin-bottom: 16px;
                color: #2c3e50;
            }
            
            .filter-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .filter-form select,
            .filter-form input {
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .modal-actions button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            #apply-filter {
                background: #4CAF50;
                color: white;
            }
            
            #apply-filter:hover {
                background: #45a049;
            }
            
            #cancel-filter {
                background: #6c757d;
                color: white;
            }
            
            #cancel-filter:hover {
                background: #5a6268;
            }
            
            /* Column Modal */
            .column-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .column-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-bottom: 20px;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .form-group label {
                font-weight: 500;
                color: #495057;
                font-size: 14px;
            }
            
            .form-group input,
            .form-group select {
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .form-group input[type="checkbox"] {
                width: auto;
                margin-right: 8px;
            }
            
            .form-group label:has(input[type="checkbox"]) {
                flex-direction: row;
                align-items: center;
            }
            
            .reference-options {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            #create-column {
                background: #4CAF50;
                color: white;
            }
            
            #create-column:hover {
                background: #45a049;
            }
            
            #cancel-column {
                background: #6c757d;
                color: white;
            }
            
            #cancel-column:hover {
                background: #5a6268;
            }
            
            /* Reference Cell Styles */
            .reference-cell {
                padding: 0;
            }
            
            .reference-cell .autocomplete-component {
                height: 100%;
                min-height: 32px;
            }
            
            .reference-cell .entity-display,
            .reference-cell .search-input {
                border: none;
                border-radius: 0;
                height: 100%;
                min-height: 32px;
            }
            
            .reference-cell .entity-display:hover {
                background: #f8f9fa;
            }
            
            .reference-cell .search-input:focus {
                box-shadow: none;
                border-color: #4CAF50;
            }
        `;
    }
    
    // Cleanup
    destroy() {
        // Clean up API
        if (this.api) {
            this.api.destroy();
        }
        
        // Clear references
        this.rowElements.clear();
        this.cellElements.clear();
        
        // Remove autocomplete
        this.hideAutocomplete();
        
        // Clear container
        this.container.innerHTML = '';
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableController;
} else {
    window.TableController = TableController;
}