/**
 * SimpleTableModule - Minimal spreadsheet-like table
 * 
 * Features:
 * - First cell: Entity type autocomplete
 * - Column headers: Schema attribute autocomplete  
 * - First column: Entity search with auto-population
 * - Inline editing with real-time save
 */

class SimpleTableModule {
    constructor(container, moduleInstance = null) {
        this.container = container;
        this.moduleInstance = moduleInstance;
        
        // Services
        this.entityService = window.EntityService;
        this.schemaService = window.SchemaService;
        
        // State
        this.entityType = null;
        this.columns = []; // Start with no columns
        this.rows = []; // Start with no rows
        this.schema = null;
        
        // DOM refs
        this.table = null;
        this.thead = null;
        this.tbody = null;
        
        // Search state
        this.searchTimeouts = new Map();
        this.activeSearches = new Set();
        this.currentDropdown = null;
        
        // Pending changes (per evitare aggiornamenti ad ogni lettera)
        this.pendingChanges = new Map(); // input -> {value, timer}
        
        // Real-time sync
        this.wsService = null;
        this.broadcastChannel = null;
        this.instanceId = `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Unique ID for this instance
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.initRealTimeSync();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="simple-table-wrapper">
                <table class="simple-table">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
            <style>
                .simple-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .simple-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 600px;
                }
                .simple-table th,
                .simple-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                    position: relative;
                    min-width: 120px;
                }
                .simple-table th {
                    background: #f8f9fa;
                    font-weight: 500;
                }
                .simple-table .entity-type-cell {
                    background: #e3f2fd;
                    font-weight: bold;
                }
                .simple-table .entity-name-cell {
                    background: #f3e5f5;
                    font-weight: 500;
                }
                .simple-table input {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 4px;
                    font: inherit;
                }
                .simple-table input:focus {
                    outline: 2px solid #4CAF50;
                    border-radius: 2px;
                }
                .autocomplete-dropdown {
                    position: fixed;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                    min-width: 200px;
                    max-width: 400px;
                }
                .autocomplete-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                }
                .autocomplete-item:hover,
                .autocomplete-item.selected {
                    background: #f8f9fa;
                }
                .autocomplete-item.create-new {
                    background: #e8f5e9;
                    font-style: italic;
                }
                .autocomplete-item.create-new:hover,
                .autocomplete-item.create-new.selected {
                    background: #d4edda;
                }
                .autocomplete-item.loading {
                    background: #f8f9fa;
                    color: #6c757d;
                    font-style: italic;
                    cursor: default;
                }
                .autocomplete-item.no-results {
                    background: #fff3cd;
                    color: #856404;
                    font-style: italic;
                    cursor: default;
                }
                .autocomplete-item.error {
                    background: #f8d7da;
                    color: #721c24;
                    cursor: default;
                }
                .add-column-btn {
                    background: #f8f9fa;
                    border: 1px dashed #ccc;
                    cursor: pointer;
                    color: #666;
                    text-align: center;
                }
                .add-column-btn:hover {
                    background: #e9ecef;
                    border-color: #999;
                }
                .add-row-btn {
                    background: #f8f9fa;
                    border: 1px dashed #ccc;
                    cursor: pointer;
                    color: #666;
                    text-align: center;
                    height: 40px;
                }
                .add-row-btn:hover {
                    background: #e9ecef;
                    border-color: #999;
                }
            </style>
        `;
        
        this.table = this.container.querySelector('.simple-table');
        this.thead = this.table.querySelector('thead');
        this.tbody = this.table.querySelector('tbody');
        
        this.renderTable();
    }
    
    renderTable() {
        this.renderHeader();
        this.renderBody();
        this.bindEvents(); // Rebind events after rendering
    }
    
    renderHeader() {
        const headerRow = document.createElement('tr');
        
        // First cell - Entity type selector
        const entityTypeCell = document.createElement('th');
        entityTypeCell.className = 'entity-type-cell';
        entityTypeCell.innerHTML = `
            <input type="text" 
                   placeholder="Tipo entità..." 
                   value="${this.entityType || ''}"
                   data-cell-type="entity-type">
        `;
        headerRow.appendChild(entityTypeCell);
        
        // Column headers
        this.columns.forEach(column => {
            const th = document.createElement('th');
            th.innerHTML = `
                <input type="text" 
                       placeholder="" 
                       value="${column}"
                       data-cell-type="column-header"
                       data-column="${column}">
            `;
            headerRow.appendChild(th);
        });
        
        // Add column button
        const addColumnCell = document.createElement('th');
        addColumnCell.className = 'add-column-btn';
        addColumnCell.textContent = '+';
        addColumnCell.onclick = () => this.addColumn();
        headerRow.appendChild(addColumnCell);
        
        this.thead.innerHTML = '';
        this.thead.appendChild(headerRow);
    }
    
    renderBody() {
        this.tbody.innerHTML = '';
        
        // Only render existing rows (no minimum rows)
        this.rows.forEach((row, index) => {
            this.renderRow(row, index);
        });
        
        // Add row button
        const addRowRow = document.createElement('tr');
        const addRowCell = document.createElement('td');
        addRowCell.colSpan = this.columns.length + 2;
        addRowCell.className = 'add-row-btn';
        addRowCell.textContent = '+';
        addRowCell.onclick = () => this.addRow();
        addRowRow.appendChild(addRowCell);
        this.tbody.appendChild(addRowRow);
    }
    
    renderRow(row, index) {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = index;
        
        // First cell - Entity selector
        const entityCell = document.createElement('td');
        entityCell.className = 'entity-name-cell';
        entityCell.innerHTML = `
            <input type="text" 
                   placeholder="${this.entityType ? 'Seleziona ' + this.entityType : 'Seleziona entità...'}" 
                   value="${this.getDisplayName(row.entity)}"
                   data-cell-type="entity-selector"
                   data-row-index="${index}">
        `;
        tr.appendChild(entityCell);
        
        // Data cells
        this.columns.forEach(column => {
            const td = document.createElement('td');
            const value = row.entity ? (row.entity[column] || '') : '';
            td.innerHTML = `
                <input type="text" 
                       placeholder="" 
                       value="${value}"
                       data-cell-type="data"
                       data-row-index="${index}"
                       data-column="${column}">
            `;
            tr.appendChild(td);
        });
        
        this.tbody.appendChild(tr);
    }
    
    bindEvents() {
        // Remove old listeners first
        this.unbindEvents();
        
        // Event delegation for all inputs
        this.inputHandler = this.handleInput.bind(this);
        this.focusHandler = this.handleFocus.bind(this);
        this.blurHandler = this.handleBlur.bind(this);
        this.keydownHandler = this.handleKeydown.bind(this);
        
        this.table.addEventListener('input', this.inputHandler);
        this.table.addEventListener('focus', this.focusHandler, true);
        this.table.addEventListener('blur', this.blurHandler, true);
        this.table.addEventListener('keydown', this.keydownHandler);
    }
    
    unbindEvents() {
        if (this.table && this.inputHandler) {
            this.table.removeEventListener('input', this.inputHandler);
            this.table.removeEventListener('focus', this.focusHandler, true);
            this.table.removeEventListener('blur', this.blurHandler, true);
            this.table.removeEventListener('keydown', this.keydownHandler);
        }
    }
    
    handleInput(e) {
        const input = e.target;
        if (input.tagName !== 'INPUT') return;
        
        const cellType = input.dataset.cellType;
        const inputId = this.getInputId(input);
        
        // Clear previous timeout for this input
        if (this.searchTimeouts.has(inputId)) {
            clearTimeout(this.searchTimeouts.get(inputId));
        }
        
        // Set debounced search
        const timeout = setTimeout(() => {
            this.searchTimeouts.delete(inputId);
            
            switch (cellType) {
                case 'entity-type':
                    this.handleEntityTypeSearch(input);
                    break;
                case 'column-header':
                    this.handleColumnHeaderSearch(input);
                    break;
                case 'entity-selector':
                    this.handleEntitySelectorSearch(input);
                    break;
                case 'data':
                    // Per le celle di dati, solo aggiorniamo la UI locale ma non salviamo
                    this.handleDataInputChange(input);
                    break;
            }
        }, 300);
        
        this.searchTimeouts.set(inputId, timeout);
    }
    
    handleFocus(e) {
        const input = e.target;
        if (input.tagName !== 'INPUT') return;
        
        // Clear existing dropdowns
        this.clearDropdowns();
        
        const cellType = input.dataset.cellType;
        
        // Trigger search based on cell type
        switch (cellType) {
            case 'entity-type':
                // Only show if has content (minimum 2 chars)
                if (input.value && input.value.length >= 2) {
                    this.handleEntityTypeSearch(input);
                }
                break;
            case 'column-header':
                // Always show available attributes on focus
                this.handleColumnHeaderSearch(input);
                break;
            case 'entity-selector':
                // Only show if has content (minimum 2 chars)  
                if (input.value && input.value.length >= 2) {
                    this.handleEntitySelectorSearch(input);
                }
                break;
        }
    }
    
    handleBlur(e) {
        const input = e.target;
        if (input.tagName === 'INPUT' && input.dataset.cellType === 'data') {
            // Salva le modifiche quando l'utente esce dal campo
            this.handleDataInputSave(input);
        }
        
        // Delay clearing dropdowns to allow clicks
        setTimeout(() => {
            if (!this.container.contains(document.activeElement)) {
                this.clearDropdowns();
            }
        }, 200);
    }
    
    handleKeydown(e) {
        const input = e.target;
        
        if (e.key === 'Enter' && input.tagName === 'INPUT' && input.dataset.cellType === 'data') {
            // Salva le modifiche quando l'utente preme Enter
            this.handleDataInputSave(input);
            return;
        }
        
        if (e.key === 'Tab') {
            // Salva le modifiche prima del tab se è una cella di dati
            if (input.tagName === 'INPUT' && input.dataset.cellType === 'data') {
                this.handleDataInputSave(input);
            }
            // Let default tab behavior work
            return;
        }
        
        if (e.key === 'Enter') {
            e.preventDefault();
            const dropdown = this.currentDropdown || document.querySelector('.autocomplete-dropdown');
            if (dropdown) {
                const selected = dropdown.querySelector('.selected');
                if (selected && !selected.classList.contains('loading') && !selected.classList.contains('no-results') && !selected.classList.contains('error')) {
                    selected.click();
                } else {
                    const first = dropdown.querySelector('.autocomplete-item:not(.loading):not(.no-results):not(.error)');
                    if (first) first.click();
                }
            }
        }
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            this.handleDropdownNavigation(e);
        }
    }
    
    getInputId(input) {
        return `${input.dataset.cellType || 'unknown'}-${input.dataset.rowIndex || '0'}-${input.dataset.column || 'default'}`;
    }
    
    async handleEntityTypeSearch(input) {
        const value = input.value;
        
        if (value.length < 2) {
            this.clearDropdowns();
            return;
        }
        
        const searchId = this.getInputId(input);
        if (this.activeSearches.has(searchId)) return;
        
        this.activeSearches.add(searchId);
        this.showLoadingDropdown(input);
        
        try {
            if (!this.schemaService) {
                throw new Error('Schema service not available');
            }
            
            const result = await this.schemaService.getAvailableEntityTypes();
            
            // Handle both mock service format {data: []} and real service format []
            const types = Array.isArray(result) ? result : (result.data || []);
            
            const filtered = types.filter(type => 
                type.toLowerCase().includes(value.toLowerCase())
            );
            
            if (filtered.length === 0) {
                this.showNoResultsDropdown(input);
            } else {
                this.showDropdown(input, filtered.map(type => ({
                    text: type,
                    value: type,
                    action: () => this.setEntityType(type)
                })));
            }
        } catch (error) {
            console.error('Error fetching entity types:', error);
            this.showErrorDropdown(input, 'Errore nel caricamento dei tipi di entità');
        } finally {
            this.activeSearches.delete(searchId);
        }
    }
    
    async handleColumnHeaderSearch(input) {
        if (!this.entityType) {
            this.showErrorDropdown(input, 'Seleziona prima un tipo di entità');
            return;
        }
        
        const value = input.value;
        const oldColumn = input.dataset.column;
        
        const searchId = this.getInputId(input);
        if (this.activeSearches.has(searchId)) return;
        
        this.activeSearches.add(searchId);
        this.showLoadingDropdown(input);
        
        try {
            if (!this.schemaService) {
                throw new Error('Schema service not available');
            }
            
            const result = await this.schemaService.getEntitySchema(this.entityType);
            // Handle both mock service format {data: {}} and real service format {}
            const schema = result.data || result || {};
            
            // Handle different attribute formats
            let attributes = [];
            if (schema.attributes) {
                if (Array.isArray(schema.attributes)) {
                    // Backend returns array of attribute objects
                    attributes = schema.attributes.map(attr => attr.name || attr.attributeName).filter(Boolean);
                } else if (typeof schema.attributes === 'object') {
                    // Mock service returns object with attribute names as keys
                    attributes = Object.keys(schema.attributes);
                }
            }
            
            // ONLY show intrinsic attributes from schema - no discovery from existing entities
            // This ensures clean separation between intrinsic vs contextual attributes
            
            // Filter attributes based on input value, or show all if empty
            let filtered = attributes;
            if (value && value.length > 0) {
                filtered = attributes.filter(attr => 
                    attr.toLowerCase().includes(value.toLowerCase())
                );
            }
            
            const items = filtered.map(attr => ({
                text: `${attr} (intrinseco)`,
                value: attr,
                action: () => this.updateColumnName(oldColumn, attr)
            }));
            
            // Add create new option for contextual attributes
            if (value && value.length > 0) {
                const exactMatch = attributes.find(attr => attr.toLowerCase() === value.toLowerCase());
                if (!exactMatch) {
                    items.push({
                        text: `Crea "${value}" (contestuale)`,
                        value: value,
                        className: 'create-new',
                        action: () => this.updateColumnName(oldColumn, value)
                    });
                }
            }
            
            if (items.length === 0) {
                this.showNoResultsDropdown(input);
            } else {
                this.showDropdown(input, items);
            }
        } catch (error) {
            console.error('Error fetching schema:', error);
            this.showErrorDropdown(input, 'Errore nel caricamento dello schema');
        } finally {
            this.activeSearches.delete(searchId);
        }
    }
    
    async handleEntitySelectorSearch(input) {
        if (!this.entityType) {
            this.showErrorDropdown(input, 'Seleziona prima un tipo di entità');
            return;
        }
        
        const value = input.value;
        const rowIndex = parseInt(input.dataset.rowIndex);
        
        if (value.length < 2) {
            this.clearDropdowns();
            return;
        }
        
        const searchId = this.getInputId(input);
        if (this.activeSearches.has(searchId)) return;
        
        this.activeSearches.add(searchId);
        this.showLoadingDropdown(input);
        
        try {
            if (!this.entityService) {
                throw new Error('Entity service not available');
            }
            
            // Use getEntities to get all entities of the type, then filter locally
            let allEntities;
            if (this.entityService.searchEntities) {
                // Try search method first (mock service)
                const result = await this.entityService.searchEntities({
                    entityType: this.entityType,
                    query: value,
                    limit: 10
                });
                allEntities = Array.isArray(result) ? result : (result.data || []);
            } else {
                // Fallback to getEntities and filter locally (real service)
                allEntities = await this.entityService.getEntities(this.entityType);
                
                // Filter entities based on the search query
                allEntities = allEntities.filter(entity => {
                    const displayName = this.getDisplayName(entity);
                    return displayName.toLowerCase().includes(value.toLowerCase());
                }).slice(0, 10); // Limit to 10 results
            }
            
            const entities = allEntities;
            
            const items = entities.map(entity => ({
                text: this.getDisplayName(entity),
                value: entity.id,
                entity: entity,
                action: () => this.selectEntity(rowIndex, entity)
            }));
            
            // Always add create new option when there's text
            if (value && value.trim().length > 0) {
                // Check if exact match exists
                const exactMatch = entities.some(e => 
                    this.getDisplayName(e).toLowerCase() === value.toLowerCase()
                );
                
                // Always show create option, but change text based on whether it exists
                items.push({
                    text: exactMatch ? `Crea nuovo "${value}"` : `Crea "${value}"`,
                    value: value,
                    className: 'create-new',
                    action: () => this.createAndSelectEntity(rowIndex, value)
                });
            }
            
            if (items.length === 0) {
                this.showNoResultsDropdown(input);
            } else {
                this.showDropdown(input, items);
            }
        } catch (error) {
            console.error('Error searching entities:', error);
            this.showErrorDropdown(input, 'Errore nella ricerca delle entità');
        } finally {
            this.activeSearches.delete(searchId);
        }
    }
    
    // Gestisce il cambio di input senza salvare (solo aggiorna UI locale)
    handleDataInputChange(input) {
        const rowIndex = parseInt(input.dataset.rowIndex);
        const column = input.dataset.column;
        const value = input.value;
        
        // Aggiorna solo i dati locali temporanei
        if (!this.rows[rowIndex]) {
            this.rows[rowIndex] = { entity: null, data: {} };
        }
        
        // Memorizza il valore in pending changes per salvare poi
        const inputId = this.getInputId(input);
        this.pendingChanges.set(inputId, {
            input: input,
            rowIndex: rowIndex,
            column: column,
            value: value,
            lastChanged: Date.now()
        });
        
        // Aggiorna visivamente l'entità se esistente (senza salvare)
        if (this.rows[rowIndex].entity) {
            this.rows[rowIndex].entity[column] = value;
        } else {
            // Store in temporary data for new entities
            this.rows[rowIndex].data[column] = value;
        }
    }
    
    // Salva effettivamente le modifiche quando confermato (blur, Enter, Tab)
    async handleDataInputSave(input) {
        const inputId = this.getInputId(input);
        const pendingChange = this.pendingChanges.get(inputId);
        
        if (!pendingChange) {
            return; // Nessuna modifica pendente
        }
        
        const { rowIndex, column, value } = pendingChange;
        
        console.log(`💾 [SimpleTableModule] Saving data change: row ${rowIndex}, column ${column}, value: ${value}`);
        
        // Rimuovi dalle modifiche pendenti
        this.pendingChanges.delete(inputId);
        
        // Update row data persistentemente
        if (!this.rows[rowIndex]) {
            this.rows[rowIndex] = { entity: null, data: {} };
        }
        
        if (this.rows[rowIndex].entity) {
            // Check if this is an intrinsic attribute or contextual
            const isIntrinsic = await this.isIntrinsicAttribute(column);
            
            if (isIntrinsic) {
                // Update intrinsic attribute on the entity itself
                this.updateEntityAttribute(this.rows[rowIndex].entity.id, column, value);
            } else {
                // Update contextual attribute on the entity-module relation
                this.updateContextualAttribute(this.rows[rowIndex].entity.id, column, value);
            }
        } else {
            // Store in temporary data
            this.rows[rowIndex].data[column] = value;
        }
    }
    
    showDropdown(input, items) {
        this.clearDropdowns();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        
        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item' + (item.className ? ' ' + item.className : '');
            if (index === 0) div.classList.add('selected');
            div.textContent = item.text;
            div.onclick = item.action;
            dropdown.appendChild(div);
        });
        
        // Position dropdown using fixed positioning
        document.body.appendChild(dropdown);
        // Wait for next frame to ensure DOM is updated
        requestAnimationFrame(() => {
            this.positionDropdown(input, dropdown);
        });
        this.currentDropdown = dropdown;
    }
    
    positionDropdown(input, dropdown) {
        const inputRect = input.getBoundingClientRect();
        const dropdownHeight = dropdown.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        // Position directly below input without additional scroll offset
        let top = inputRect.bottom + 2; // Small gap between input and dropdown
        let left = inputRect.left;
        
        // If dropdown would go below viewport, position above input
        if (inputRect.bottom + dropdownHeight > viewportHeight) {
            top = inputRect.top - dropdownHeight - 2;
        }
        
        // Ensure dropdown doesn't go off-screen horizontally
        const dropdownWidth = dropdown.offsetWidth;
        if (left + dropdownWidth > window.innerWidth) {
            left = window.innerWidth - dropdownWidth - 10;
        }
        
        // Ensure dropdown doesn't go off-screen on the left
        if (left < 10) {
            left = 10;
        }
        
        dropdown.style.top = top + 'px';
        dropdown.style.left = left + 'px';
    }
    
    clearDropdowns() {
        // Remove dropdowns from container
        this.container.querySelectorAll('.autocomplete-dropdown').forEach(d => d.remove());
        // Remove dropdowns from document body
        document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.remove());
        this.currentDropdown = null;
    }
    
    showLoadingDropdown(input) {
        this.clearDropdowns();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.innerHTML = '<div class="autocomplete-item loading">Caricamento...</div>';
        
        document.body.appendChild(dropdown);
        requestAnimationFrame(() => {
            this.positionDropdown(input, dropdown);
        });
        this.currentDropdown = dropdown;
    }
    
    showNoResultsDropdown(input) {
        this.clearDropdowns();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.innerHTML = '<div class="autocomplete-item no-results">Nessun risultato trovato</div>';
        
        document.body.appendChild(dropdown);
        requestAnimationFrame(() => {
            this.positionDropdown(input, dropdown);
        });
        this.currentDropdown = dropdown;
    }
    
    showErrorDropdown(input, message) {
        this.clearDropdowns();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.innerHTML = `<div class="autocomplete-item error">${message}</div>`;
        
        document.body.appendChild(dropdown);
        requestAnimationFrame(() => {
            this.positionDropdown(input, dropdown);
        });
        this.currentDropdown = dropdown;
    }
    
    handleDropdownNavigation(e) {
        e.preventDefault();
        const dropdown = this.currentDropdown || document.querySelector('.autocomplete-dropdown');
        if (!dropdown) return;
        
        const items = dropdown.querySelectorAll('.autocomplete-item');
        let selected = dropdown.querySelector('.selected');
        let index = Array.from(items).indexOf(selected);
        
        if (e.key === 'ArrowDown') {
            index = Math.min(index + 1, items.length - 1);
        } else {
            index = Math.max(index - 1, 0);
        }
        
        items.forEach(item => item.classList.remove('selected'));
        items[index].classList.add('selected');
    }
    
    setEntityType(type) {
        // Check if we're changing to a different entity type
        const isChangingType = this.entityType && this.entityType !== type;
        const hasExistingEntities = this.rows.some(row => row.entity);
        
        if (isChangingType && hasExistingEntities) {
            const entityCount = this.rows.filter(row => row.entity).length;
            const confirmed = confirm(
                `Stai cambiando da "${this.entityType}" a "${type}".\n\n` +
                `Questo rimuoverà ${entityCount} entità esistenti di tipo "${this.entityType}".\n\n` +
                `Vuoi continuare?`
            );
            
            if (!confirmed) {
                // Restore the previous entity type in the input
                const entityTypeInput = this.container.querySelector('input[data-cell-type="entity-type"]');
                if (entityTypeInput) {
                    entityTypeInput.value = this.entityType || '';
                }
                this.clearDropdowns();
                return;
            }
            
            // Clear all existing entities and data
            this.clearAllEntities();
        }
        
        this.entityType = type;
        this.loadSchema();
        this.clearDropdowns();
        this.renderTable();
    }
    
    async loadSchema() {
        if (!this.entityType) return;
        
        try {
            const result = await this.schemaService.getEntitySchema(this.entityType);
            // Handle both mock service format {data: {}} and real service format {}
            this.schema = result.data || result || {};
        } catch (error) {
            console.error('Error loading schema:', error);
        }
    }
    
    updateColumnName(oldName, newName) {
        const index = this.columns.indexOf(oldName);
        if (index !== -1) {
            this.columns[index] = newName;
        }
        this.clearDropdowns();
        this.renderTable();
    }
    
    addColumn() {
        this.columns.push(''); // Add empty column
        this.renderTable();
        
        // Focus on the new column input
        setTimeout(() => {
            const lastColumnInput = this.thead.querySelector(`th:nth-child(${this.columns.length + 1}) input`);
            if (lastColumnInput) {
                lastColumnInput.focus();
            }
        }, 0);
    }
    
    async isIntrinsicAttribute(attributeName) {
        if (!this.entityType || !attributeName) return false;
        
        try {
            const result = await this.schemaService.getEntitySchema(this.entityType);
            const schema = result.data || result || {};
            
            let schemaAttributes = [];
            if (schema.attributes) {
                if (Array.isArray(schema.attributes)) {
                    schemaAttributes = schema.attributes.map(attr => attr.name || attr.attributeName).filter(Boolean);
                } else if (typeof schema.attributes === 'object') {
                    schemaAttributes = Object.keys(schema.attributes);
                }
            }
            
            // ONLY schema-defined attributes are intrinsic
            return schemaAttributes.includes(attributeName);
        } catch (error) {
            console.error('Error checking if attribute is intrinsic:', error);
            return false; // Default to contextual if schema check fails
        }
    }
    
    async getCommonlyUsedAttributes() {
        if (!this.entityType) return [];
        
        try {
            // Get a sample of entities to discover commonly used attributes
            const entities = await this.entityService.getEntities(this.entityType);
            const attributeSet = new Set();
            
            // Analyze the first 10 entities to find common attributes
            entities.slice(0, 10).forEach((entity, index) => {
                const attrs = Object.keys(entity).filter(key => 
                    !['id', 'entityType', 'createdAt', 'modifiedAt', '_temporary'].includes(key)
                );
                attrs.forEach(key => attributeSet.add(key));
            });
            
            return Array.from(attributeSet);
        } catch (error) {
            console.error('Error getting commonly used attributes:', error);
            return [];
        }
    }
    
    addRow() {
        this.rows.push({ entity: null, data: {} });
        this.renderBody(); // Only re-render body, not the whole table
        this.bindEvents(); // Re-bind events for new elements
    }
    
    clearAllEntities() {
        // Clear all entity data but keep the row structure
        this.rows = this.rows.map(row => ({
            entity: null,
            data: {}
        }));
        
        // Reset all columns/attributes since they belong to the previous entity type
        this.columns = [];
        
        // Also clear any contextual data
        if (this.contextualData) {
            this.contextualData.clear();
        }
        
        console.log(`🧹 Cleared all entities and attributes due to entity type change`);
    }
    
    selectEntity(rowIndex, entity) {
        if (!this.rows[rowIndex]) {
            this.rows[rowIndex] = { entity: null, data: {} };
        }
        
        this.rows[rowIndex].entity = entity;
        this.clearDropdowns();
        
        // Update only the specific row without re-rendering the whole table
        const existingRow = this.tbody.querySelector(`tr[data-row-index="${rowIndex}"]`);
        if (existingRow) {
            // Update the first cell with the entity name
            const entityCell = existingRow.querySelector('td:first-child input');
            if (entityCell) {
                entityCell.value = this.getDisplayName(entity);
            }
            
            // Update data cells with entity attributes
            this.columns.forEach((column, colIndex) => {
                const cell = existingRow.querySelector(`td:nth-child(${colIndex + 2}) input`);
                if (cell && entity[column]) {
                    cell.value = entity[column] || '';
                }
            });
        }
    }
    
    async createAndSelectEntity(rowIndex, name) {
        try {
            console.log('🎯 [SimpleTableModule] Creating entity:', { entityType: this.entityType, name, rowIndex });
            
            // Check for duplicates before creating
            const isDuplicate = await this.checkForDuplicates(name);
            if (isDuplicate) {
                alert(`Un'entità "${this.entityType}" con nome "${name}" esiste già.`);
                return;
            }
            
            const entityData = {
                nome: name,  // Always use 'nome' as the primary display attribute
                ...this.rows[rowIndex]?.data
            };
            
            console.log('🎯 [SimpleTableModule] Entity data to create:', entityData);
            console.log('🎯 [SimpleTableModule] Using EntityService:', !!this.entityService);
            
            const result = await this.entityService.createEntity(this.entityType, entityData);
            console.log('🎯 [SimpleTableModule] Creation result:', result);
            
            // Handle both mock service format {data: {}} and real service format {}
            const newEntity = result.data || result;
            console.log('🎯 [SimpleTableModule] New entity:', newEntity);
            
            // Ensure the display name is set correctly
            if (!newEntity.nome && name) {
                newEntity.nome = name;
            }
            
            this.selectEntity(rowIndex, newEntity);
            
            // Broadcast the creation to other windows
            this.broadcastToOtherWindows({
                type: 'table-action',
                action: 'entity-created',
                entityType: this.entityType
            });
            
            console.log('🎯 [SimpleTableModule] Entity creation completed successfully');
        } catch (error) {
            console.error('❌ [SimpleTableModule] Error creating entity:', error);
        }
    }
    
    
    async updateContextualAttribute(entityId, attribute, value) {
        try {
            // TODO: Implement contextual attribute update via ModuleRelationService
            // This should update the relationship between the entity and this module instance
            // with the contextual attribute (like fee, role, etc.)
            
            // Silent update for contextual attributes
            // console.log(`💡 Contextual attribute update: Entity ${entityId}, Attribute: ${attribute}, Value: ${value}`);
            // console.log(`📍 This should be saved on the MEMBER_OF relationship with moduleInstanceId: ${this.moduleInstance?.instanceId}`);
            
            // For now, just store locally until the backend API is implemented
            if (!this.contextualData) {
                this.contextualData = new Map();
            }
            
            const key = `${entityId}:${attribute}`;
            this.contextualData.set(key, value);
            
        } catch (error) {
            console.error('Error updating contextual attribute:', error);
        }
    }
    
    async checkForDuplicates(name) {
        if (!this.entityType || !name) return false;
        
        try {
            // Get all entities of this type
            const entities = await this.entityService.getEntities(this.entityType);
            
            // Check for case-insensitive name match
            const normalizedName = name.trim().toLowerCase();
            return entities.some(entity => {
                const entityName = this.getDisplayName(entity).trim().toLowerCase();
                return entityName === normalizedName;
            });
        } catch (error) {
            console.error('Error checking for duplicates:', error);
            return false; // If check fails, allow creation
        }
    }
    
    getDisplayName(entity) {
        if (!entity) return '';
        // Prioritize 'nome' field for display, fallback to other common name fields, avoid showing ID
        return entity.nome || entity.name || entity.title || '';
    }
    
    // ============================================
    // REAL-TIME SYNCHRONIZATION
    // ============================================
    
    initRealTimeSync() {
        try {
            // Removed verbose logging for performance - uncomment for debugging
            // console.log('🔄 [SimpleTableModule] Initializing real-time sync...');
            // console.log('🔄 [SimpleTableModule] WebSocketService available:', !!window.WebSocketService);
            // console.log('🔄 [SimpleTableModule] BroadcastChannel available:', typeof BroadcastChannel !== 'undefined');
            
            // Initialize WebSocket connection if available
            if (window.WebSocketService) {
                this.wsService = window.WebSocketService;
                // console.log('🔄 [SimpleTableModule] WebSocket connection state:', this.wsService.isConnected);
                
                // Subscribe to entity changes (multiple patterns for compatibility)
                this.wsService.subscribe('entity-changes', (message) => {
                    // console.log('📡 [SimpleTableModule] Entity change received:', message);
                    this.handleEntityChange(message);
                });
                
                this.wsService.subscribe('attribute-updated', (message) => {
                    // console.log('📡 [SimpleTableModule] Attribute updated received:', message);
                    this.handleEntityChange(message);
                });
                
                this.wsService.subscribe('change', (message) => {
                    // console.log('📡 [SimpleTableModule] Change received:', message);
                    this.handleEntityChange(message);
                });
                
                this.wsService.subscribe('entity-created', (message) => {
                    // console.log('📡 [SimpleTableModule] Entity created received:', message);
                    this.handleEntityCreated(message);
                });
                
                this.wsService.subscribe('entity-deleted', (message) => {
                    // console.log('📡 [SimpleTableModule] Entity deleted received:', message);
                    this.handleEntityDeleted(message);
                });
                
                // Subscribe to schema changes (multiple patterns for compatibility)
                this.wsService.subscribe('schema-changes', (message) => {
                    // console.log('📡 [SimpleTableModule] Schema change received:', message);
                    this.handleSchemaChange(message);
                });
                
                this.wsService.subscribe('schema-evolved', (message) => {
                    // console.log('📡 [SimpleTableModule] Schema evolved received:', message);
                    this.handleSchemaChange(message);
                });
                
                this.wsService.subscribe('schema-created', (message) => {
                    // console.log('📡 [SimpleTableModule] Schema created received:', message);
                    this.handleSchemaChange(message);
                });
                
                // console.log('✅ [SimpleTableModule] WebSocket subscriptions registered');
            } else {
                console.warn('⚠️ [SimpleTableModule] WebSocketService not available');
            }
            
            // Initialize BroadcastChannel for cross-window sync
            if (typeof BroadcastChannel !== 'undefined') {
                this.broadcastChannel = new BroadcastChannel('ssot-table-sync');
                
                this.broadcastChannel.addEventListener('message', (event) => {
                    // Ignore our own messages to prevent loops
                    if (event.data.senderId === this.instanceId) {
                        console.log('🚫 [SimpleTableModule] Ignoring own message from', event.data.senderId);
                        return;
                    }
                    console.log('📻 [SimpleTableModule] Processing external message from', event.data.senderId, 'to', this.instanceId);
                    this.handleCrossWindowSync(event.data);
                });
                
                // console.log('✅ [SimpleTableModule] BroadcastChannel initialized');
            } else {
                console.warn('⚠️ [SimpleTableModule] BroadcastChannel not available');
            }
            
            // console.log('✅ [SimpleTableModule] Real-time sync initialized');
            
        } catch (error) {
            console.error('❌ [SimpleTableModule] Error initializing real-time sync:', error);
        }
    }
    
    handleEntityChange(message, fromBroadcastChannel = false) {
        // console.log(`🔄 [SimpleTableModule] Processing entity change:`, message);
        
        // Extract data from message (support multiple formats)
        let entityId, attributeName, newValue, entityType;
        
        if (message.type === 'attribute-updated') {
            // Backend format: {type: 'attribute-updated', data: {entityId, entityType, attributeName, newValue}}
            entityId = message.data.entityId;
            attributeName = message.data.attributeName;
            newValue = message.data.newValue;
            entityType = message.data.entityType || this.entityType; // Use from message or fallback to table type
        } else if (message.type === 'change') {
            // AttributeSpace format: {type: 'change', entityType, entityId, attributeName, data: {newValue, oldValue}}
            entityType = message.entityType;
            entityId = message.entityId;
            attributeName = message.attributeName;
            newValue = message.data ? message.data.newValue : message.newValue;
        } else {
            // Frontend format: {entityType, entityId, attributeName, data: {newValue}}
            entityType = message.entityType;
            entityId = message.entityId;
            attributeName = message.attributeName;
            newValue = message.data ? message.data.newValue : message.newValue;
        }
        
        // Only handle changes for our current entity type (if we have one set)
        if (this.entityType && entityType && entityType !== this.entityType) {
            // console.log(`🔄 [SimpleTableModule] Ignoring change for different entity type: ${entityType} vs ${this.entityType}`);
            return;
        }
        
        // console.log(`🔄 [SimpleTableModule] Handling entity change: ${entityType}/${entityId}/${attributeName} = ${newValue}`);
        
        // Find the affected row
        const rowIndex = this.rows.findIndex(row => row.entity && row.entity.id === entityId);
        
        if (rowIndex !== -1) {
            // Update the entity data in memory
            if (this.rows[rowIndex].entity) {
                this.rows[rowIndex].entity[attributeName] = newValue;
                // console.log(`🔄 [SimpleTableModule] Updated entity data for row ${rowIndex}`);
            }
            
            // Update the UI cell if it's visible
            this.updateTableCell(rowIndex, attributeName, newValue);
        } else {
            // console.log(`🔄 [SimpleTableModule] Entity ${entityId} not found in current table rows`);
        }
        
        // Broadcast to other windows (but not if this came from BroadcastChannel to avoid loops)
        if (!fromBroadcastChannel) {
            this.broadcastToOtherWindows({
                type: 'entity-change',
                entityType: entityType || this.entityType,
                entityId,
                attributeName,
                data: { newValue }
            });
        }
    }
    
    handleSchemaChange(message, fromBroadcastChannel = false) {
        // console.log(`🔄 [SimpleTableModule] Processing schema change:`, message);
        
        // Extract data from message (support multiple formats)
        let entityType, evolution;
        
        if (message.type === 'schema-evolved' || message.type === 'schema-created') {
            // Backend format: {type: 'schema-evolved', data: {entityType, evolution, schema}}
            entityType = message.data.entityType;
            evolution = message.data.evolution;
        } else {
            // Frontend format: {data: {entityType, evolution}}
            entityType = message.data?.entityType || message.entityType;
            evolution = message.data?.evolution || message.evolution;
        }
        
        // Only handle schema changes for our current entity type
        if (!this.entityType || entityType !== this.entityType) {
            // console.log(`🔄 [SimpleTableModule] Ignoring schema change for different entity type: ${entityType} vs ${this.entityType}`);
            return;
        }
        
        // console.log(`🔄 [SimpleTableModule] Handling schema change for ${entityType}:`, evolution);
        
        // Clear schema cache and reload
        this.schema = null;
        this.loadSchema().then(() => {
            // Refresh the table structure if columns changed
            if (evolution && (evolution.addAttributes || evolution.removeAttributes || evolution.renameAttributes)) {
                // console.log(`🔄 [SimpleTableModule] Refreshing table structure due to schema changes`);
                this.refreshTableStructure();
            }
        }).catch(error => {
            console.error('❌ [SimpleTableModule] Error reloading schema:', error);
        });
        
        // Broadcast to other windows (but not if this came from BroadcastChannel to avoid loops)
        if (!fromBroadcastChannel) {
            this.broadcastToOtherWindows({
                type: 'schema-change',
                entityType,
                evolution
            });
        }
    }
    
    handleEntityCreated(message) {
        // console.log(`🔄 [SimpleTableModule] Processing entity created:`, message);
        
        // Extract entity data from message
        let entity;
        if (message.type === 'entity-created' && message.data && message.data.entity) {
            entity = message.data.entity;
        } else if (message.entity) {
            entity = message.entity;
        } else {
            console.warn('❌ [SimpleTableModule] No entity data in created message');
            return;
        }
        
        // Only handle entities of our current type
        if (this.entityType && entity.entityType !== this.entityType) {
            // console.log(`🔄 [SimpleTableModule] Ignoring created entity of different type: ${entity.entityType} vs ${this.entityType}`);
            return;
        }
        
        // console.log(`🔄 [SimpleTableModule] Handling entity creation: ${entity.entityType}/${entity.id}`);
        
        // Refresh the entities to include the new one
        this.refreshEntities();
        
        // Broadcast to other windows
        this.broadcastToOtherWindows({
            type: 'table-action',
            action: 'entity-created',
            entityType: entity.entityType
        });
    }
    
    handleEntityDeleted(message) {
        // console.log(`🔄 [SimpleTableModule] Processing entity deleted:`, message);
        
        // Extract entity data from message
        let entityId, entityType;
        if (message.type === 'entity-deleted' && message.data) {
            entityId = message.data.entityId;
            entityType = message.data.entityType || this.entityType;
        } else {
            entityId = message.entityId;
            entityType = message.entityType || this.entityType;
        }
        
        // Only handle entities of our current type
        if (this.entityType && entityType !== this.entityType) {
            // console.log(`🔄 [SimpleTableModule] Ignoring deleted entity of different type: ${entityType} vs ${this.entityType}`);
            return;
        }
        
        // console.log(`🔄 [SimpleTableModule] Handling entity deletion: ${entityType}/${entityId}`);
        
        // Find and remove the entity from our rows
        const rowIndex = this.rows.findIndex(row => row.entity && row.entity.id === entityId);
        if (rowIndex !== -1) {
            this.rows.splice(rowIndex, 1);
            this.renderTable(); // Re-render to remove the row
            // console.log(`🔄 [SimpleTableModule] Removed deleted entity from row ${rowIndex}`);
        }
        
        // Broadcast to other windows
        this.broadcastToOtherWindows({
            type: 'table-action',
            action: 'entity-deleted',
            entityType: entityType
        });
    }
    
    handleCrossWindowSync(data) {
        if (!this.entityType || data.entityType !== this.entityType) return;
        
        switch (data.type) {
            case 'entity-change':
                // console.log(`🔄 [SimpleTableModule] Cross-window entity change: ${data.attributeName}`);
                this.handleEntityChange(data, true); // true = from BroadcastChannel
                break;
                
            case 'schema-change':
                // console.log(`🔄 [SimpleTableModule] Cross-window schema change`);
                this.handleSchemaChange(data, true); // true = from BroadcastChannel
                break;
                
            case 'table-action':
                // Handle table-specific actions like add/delete rows
                // console.log(`🔄 [SimpleTableModule] Cross-window table action: ${data.action}`);
                if (data.action === 'entity-created' || data.action === 'entity-deleted') {
                    this.refreshEntities();
                }
                break;
        }
    }
    
    updateTableCell(rowIndex, attributeName, newValue) {
        // Find the column index for this attribute
        const columnIndex = this.columns.indexOf(attributeName);
        if (columnIndex === -1) return;
        
        // Find the table cell and update it
        const row = this.tbody.querySelector(`tr[data-row-index="${rowIndex}"]`);
        if (!row) return;
        
        // Column index + 1 to account for the entity name column
        const cell = row.querySelector(`td:nth-child(${columnIndex + 2}) input`);
        if (cell && cell.value !== newValue) {
            cell.value = newValue || '';
            
            // Add visual feedback for the update
            cell.style.backgroundColor = '#e8f5e9';
            setTimeout(() => {
                cell.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    refreshTableStructure() {
        // Get current schema and update columns
        this.loadSchema().then(() => {
            // Re-render the table with new structure
            this.renderTable();
        });
    }
    
    async refreshEntities() {
        if (!this.entityType) return;
        
        try {
            // Clear cache and reload entities
            if (this.entityService.clearTypeCache) {
                this.entityService.clearTypeCache(this.entityType);
            }
            
            // Refresh data for all rows
            for (let i = 0; i < this.rows.length; i++) {
                if (this.rows[i].entity) {
                    try {
                        const updatedEntity = await this.entityService.getEntity(this.rows[i].entity.id, { forceRefresh: true });
                        this.rows[i].entity = updatedEntity;
                    } catch (error) {
                        // Entity might have been deleted
                        console.warn(`Entity ${this.rows[i].entity.id} no longer exists, removing from table`);
                        this.rows.splice(i, 1);
                        i--; // Adjust index after removal
                    }
                }
            }
            
            // Re-render the table
            this.renderTable();
            
        } catch (error) {
            console.error('Error refreshing entities:', error);
        }
    }
    
    broadcastToOtherWindows(data) {
        if (this.broadcastChannel) {
            // Add sender ID to prevent processing our own messages
            this.broadcastChannel.postMessage({
                ...data,
                senderId: this.instanceId
            });
        }
    }
    
    // Override entity update methods to include broadcasting
    async updateEntityAttribute(entityId, attribute, value) {
        try {
            if (this.entityService.updateEntityAttribute) {
                // Use updateEntityAttribute if available (real service)
                await this.entityService.updateEntityAttribute(entityId, attribute, value);
            } else if (this.entityService.updateEntity) {
                // Use updateEntity if available (mock service)
                await this.entityService.updateEntity(entityId, {
                    [attribute]: value
                });
            } else {
                console.warn('No update method available in EntityService');
            }
            
            // Broadcast the change to other windows
            this.broadcastToOtherWindows({
                type: 'table-action',
                action: 'entity-updated',
                entityType: this.entityType,
                entityId,
                attribute,
                value
            });
            
        } catch (error) {
            console.error('Error updating entity:', error);
        }
    }
    
    
    // Cleanup method
    destroy() {
        this.clearDropdowns();
        this.unbindEvents();
        
        // Clear all timeouts
        this.searchTimeouts.forEach(timeout => clearTimeout(timeout));
        this.searchTimeouts.clear();
        this.activeSearches.clear();
        
        // Cleanup real-time sync
        if (this.wsService) {
            this.wsService.unsubscribe('entity-changes');
            this.wsService.unsubscribe('attribute-updated');
            this.wsService.unsubscribe('change');
            this.wsService.unsubscribe('entity-created');
            this.wsService.unsubscribe('entity-deleted');
            this.wsService.unsubscribe('schema-changes');
            this.wsService.unsubscribe('schema-evolved');
            this.wsService.unsubscribe('schema-created');
        }
        
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
    }
}

// Export
window.SimpleTableModule = SimpleTableModule;