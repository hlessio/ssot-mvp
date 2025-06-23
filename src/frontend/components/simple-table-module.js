/**
 * Simple Table Module - Spreadsheet-like interface for SSOT
 * 
 * A minimal, direct-manipulation table module inspired by modern spreadsheet apps
 * like Airtable and Google Sheets. All interactions happen inline within the table.
 */

class SimpleTableModule {
    constructor(container, moduleInstance) {
        this.container = container;
        this.moduleInstance = moduleInstance;
        this.entityManager = window.entityManager || window.EntityService;
        this.schemaService = window.SchemaService || window.schemaService;
        this.attributeSpace = window.attributeSpace;
        
        // Module state
        this.state = {
            entityType: null,
            columns: [], // Array of attribute names
            entities: [] // Array of Entity objects
        };
        
        // Track subscriptions for cleanup
        this.subscriptions = [];
        
        // Track active autocomplete
        this.activeAutocomplete = null;
        
        this.initialize();
    }
    
    async initialize() {
        console.log('🚀 Initializing Simple Table Module');
        
        // Load persisted state from module instance
        const savedState = this.moduleInstance?.state;
        if (savedState && savedState.entityType) {
            this.state = { ...this.state, ...savedState };
            // Don't auto-load entities - user will add them manually
            // if (this.moduleInstance.getLinkedEntities) {
            //     this.state.entities = await this.moduleInstance.getLinkedEntities();
            // } else {
            //     // Fallback: load entities by type
            //     await this.loadEntitiesByType(this.state.entityType);
            // }
        }
        
        this.render();
    }
    
    render() {
        // Clear container and create base table structure
        this.container.innerHTML = `
            <div class="simple-table-wrapper">
                <table class="simple-table">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        
        this.table = this.container.querySelector('.simple-table');
        this.thead = this.table.querySelector('thead');
        this.tbody = this.table.querySelector('tbody');
        
        this.renderHeader();
        this.renderBody();
        this.applyStyles();
    }
    
    renderHeader() {
        this.thead.innerHTML = '';
        const headerRow = document.createElement('tr');
        
        // First cell: Entity Type selector or display
        const typeCell = document.createElement('th');
        typeCell.className = 'entity-type-cell';
        
        if (!this.state.entityType) {
            // Show input for entity type selection
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Tipo di Entità';
            input.className = 'entity-type-input';
            
            // Simple autocomplete
            input.addEventListener('input', (e) => this.showEntityTypeSuggestions(e));
            
            // Handle Enter key to confirm
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value) {
                        this.setEntityType(value);
                    }
                }
            });
            
            typeCell.appendChild(input);
            
            // Suggestions dropdown
            const suggestions = document.createElement('div');
            suggestions.className = 'suggestions-dropdown';
            suggestions.style.display = 'none';
            typeCell.appendChild(suggestions);
        } else {
            // Display selected entity type
            typeCell.textContent = this.state.entityType;
            typeCell.title = 'Click per cambiare tipo';
            typeCell.style.cursor = 'pointer';
            typeCell.addEventListener('click', () => this.resetEntityType());
        }
        
        headerRow.appendChild(typeCell);
        
        // Column headers for existing columns
        this.state.columns.forEach((columnName, index) => {
            const th = document.createElement('th');
            th.className = 'column-header';
            th.textContent = columnName;
            th.dataset.column = columnName;
            th.dataset.index = index;
            
            // Allow column removal on right-click
            th.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`Rimuovere la colonna "${columnName}"?`)) {
                    this.removeColumn(columnName);
                }
            });
            
            headerRow.appendChild(th);
        });
        
        // Add column button (always last)
        const addColumnCell = document.createElement('th');
        addColumnCell.className = 'add-column-cell';
        addColumnCell.innerHTML = '<button class="add-btn">+</button>';
        addColumnCell.querySelector('button').addEventListener('click', () => this.addNewColumn());
        headerRow.appendChild(addColumnCell);
        
        this.thead.appendChild(headerRow);
    }
    
    renderBody() {
        this.tbody.innerHTML = '';
        
        // Render existing entities
        this.state.entities.forEach(entity => {
            this.renderRow(entity);
        });
        
        // Always render add row control if we have an entity type
        if (this.state.entityType) {
            this.renderAddRowControl();
        }
    }
    
    renderRow(entity) {
        const tr = document.createElement('tr');
        // For temporary entities without ID, use a temporary identifier
        tr.dataset.entityId = entity.id || `temp_${Date.now()}_${Math.random()}`;
        tr.className = 'data-row';
        
        // First cell: Entity primary representation
        const primaryCell = document.createElement('td');
        primaryCell.className = 'entity-primary-cell';
        const primaryAttribute = this.getPrimaryAttribute();
        this.bindCell(primaryCell, entity, primaryAttribute, true); // Pass true for first column
        tr.appendChild(primaryCell);
        
        // Data cells for each column
        this.state.columns.forEach(columnName => {
            const td = document.createElement('td');
            td.className = 'data-cell';
            this.bindCell(td, entity, columnName, false);
            tr.appendChild(td);
        });
        
        // Empty cell to align with add column button
        const emptyCell = document.createElement('td');
        emptyCell.className = 'empty-cell';
        tr.appendChild(emptyCell);
        
        this.tbody.appendChild(tr);
    }
    
    renderAddRowControl() {
        const tr = document.createElement('tr');
        tr.className = 'add-row-control';
        
        const td = document.createElement('td');
        // Calculate colSpan: 1 for entity column + number of data columns + 1 for empty cell
        const totalColumns = 1 + this.state.columns.length + 1;
        td.colSpan = totalColumns;
        td.innerHTML = '<button class="add-btn">+ Aggiungi Riga</button>';
        td.querySelector('button').addEventListener('click', () => this.addNewEntity());
        
        tr.appendChild(td);
        this.tbody.appendChild(tr);
    }
    
    bindCell(cell, entity, attributeName, isFirstColumn = false) {
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        
        // Initial value
        const initialValue = entity.getAttributeValue ? 
            entity.getAttributeValue(attributeName) : 
            entity[attributeName];
        input.value = initialValue || '';
        
        // Check if this is the first column (entity selection)
        if (isFirstColumn || cell.classList.contains('entity-primary-cell')) {
            // Setup autocomplete for entity search
            const searchFunction = async (query) => {
                let entities = [];
                
                // First, include entities already in this table (excluding current entity and temporary ones)
                const tableEntities = this.state.entities.filter(e => 
                    e.id && // Has real ID (not temporary)
                    e.id !== entity.id && // Not current entity
                    e.entityType === this.state.entityType // Same type
                );
                
                // Filter table entities by query
                const matchingTableEntities = tableEntities.filter(e => {
                    const primaryValue = e[attributeName] || e.name || e.nome || '';
                    return primaryValue.toString().toLowerCase().includes(query.toLowerCase());
                });
                
                entities = [...matchingTableEntities];
                
                // Then search for additional entities from backend
                if (this.state.entityType && this.entityManager) {
                    try {
                        let response;
                        if (typeof this.entityManager.searchEntities === 'function') {
                            response = await this.entityManager.searchEntities({
                                entityType: this.state.entityType,
                                query: query,
                                limit: 10
                            });
                        } else if (typeof this.entityManager.getEntities === 'function') {
                            response = await this.entityManager.getEntities(this.state.entityType);
                        }
                        
                        const backendEntities = response?.data || response || [];
                        
                        // Filter by query on primary attribute
                        const matchingBackendEntities = backendEntities.filter(e => {
                            const primaryValue = e[attributeName] || e.name || e.nome || '';
                            return primaryValue.toString().toLowerCase().includes(query.toLowerCase());
                        });
                        
                        // Exclude entities already in table and current entity
                        const tableEntityIds = new Set(this.state.entities.map(e => e.id).filter(Boolean));
                        const newEntities = matchingBackendEntities.filter(e => 
                            !tableEntityIds.has(e.id) && e.id !== entity.id
                        );
                        
                        entities = [...entities, ...newEntities];
                    } catch (error) {
                        console.warn('Could not search entities:', error);
                    }
                }
                
                // Remove duplicates based on ID
                const uniqueEntities = entities.filter((e, index, arr) => 
                    arr.findIndex(other => other.id === e.id) === index
                );
                
                return uniqueEntities.slice(0, 8).map(e => ({
                    value: e[attributeName] || e.name || e.nome || '',
                    label: e[attributeName] || e.name || e.nome || 'Senza nome',
                    entityId: e.id,
                    entity: e
                }));
            };
            
            // Track autocomplete selections to prevent duplicates
            let lastSelectionTime = 0;
            let lastSelectionValue = null;
            
            const onSelect = async (selected) => {
                const now = Date.now();
                const selectionKey = selected.isNew ? `new:${selected.value}` : `existing:${selected.entity?.id}`;
                
                // Prevent duplicate selections within 500ms
                if (now - lastSelectionTime < 500 && lastSelectionValue === selectionKey) {
                    console.log('🚫 Duplicate autocomplete selection blocked:', selectionKey);
                    return;
                }
                
                lastSelectionTime = now;
                lastSelectionValue = selectionKey;
                
                console.log('🎯 Entity autocomplete selection:', selected);
                
                if (selected.isNew) {
                    // Create new entity with this name
                    console.log('📝 Creating new entity with name:', selected.value);
                    input.value = selected.value;
                    await saveValue();
                } else if (selected.entity) {
                    // Replace current entity with selected one (REUSE existing entity)
                    console.log('🔄 Reusing existing entity:', selected.entity.id, selected.entity.nome || selected.entity.name);
                    
                    const currentRowElement = cell.closest('tr');
                    const rowIndex = Array.from(this.tbody.querySelectorAll('.data-row')).findIndex(
                        row => row === currentRowElement
                    );
                    
                    if (rowIndex >= 0) {
                        // Update entity in state - replace temporary with existing
                        this.state.entities[rowIndex] = selected.entity;
                        
                        // Update entity reference for this binding
                        Object.assign(entity, selected.entity);
                        
                        // Update the row's dataset
                        currentRowElement.dataset.entityId = selected.entity.id;
                        
                        // Update input value
                        input.value = selected.entity[attributeName] || selected.entity.name || selected.entity.nome || '';
                        
                        console.log('✅ Replaced entity in table position', rowIndex, 'with existing entity', selected.entity.id);
                    }
                }
            };
            
            // Setup autocomplete after cell is added to DOM
            setTimeout(() => {
                this.createAutocomplete(input, searchFunction, onSelect);
                
                input.addEventListener('autocomplete-select', (e) => {
                    onSelect(e.detail);
                });
            }, 0);
        }
        
        // Global saving state management per entity
        const entityKey = `${entity.id || 'temp'}_${attributeName}`;
        if (!this.savingStates) {
            this.savingStates = new Map();
        }
        
        let saveCallCount = 0;
        
        // Save changes on blur or enter
        const saveValue = async () => {
            saveCallCount++;
            const callId = saveCallCount;
            const currentEntityKey = `${entity.id || 'temp'}_${attributeName}`;
            
            console.log(`🎯 saveValue CALL #${callId} START:`, {
                newValue: input.value.trim(), 
                oldValue: initialValue || '', 
                entityId: entity.id, 
                entityTemp: entity._temporary,
                isFirstColumn, 
                attributeName,
                entityKey: currentEntityKey,
                isSaving: this.savingStates.get(currentEntityKey),
                stack: new Error().stack.split('\n')[1].trim()
            });
            
            // Check if we're already saving this specific entity/attribute combination
            if (this.savingStates.get(currentEntityKey)) {
                console.log(`⏳ saveValue CALL #${callId} BLOCKED - ${currentEntityKey} already in progress`);
                return;
            }
            
            const newValue = input.value.trim();
            const oldValue = initialValue || '';
            
            if (newValue !== oldValue) {
                // Mark this entity/attribute as being saved
                this.savingStates.set(currentEntityKey, true);
                console.log(`🚀 saveValue CALL #${callId} PROCEEDING...`);
                // Create metadata for contextual attributes
                const metadata = {
                    source: `simple-table:${this.moduleInstance?.instanceId || 'unknown'}`,
                    context: `Definito nella tabella '${this.moduleInstance?.state?.name || 'Senza nome'}'`
                };
                
                // Special handling for first column (entity primary attribute)
                if (isFirstColumn && newValue && (!entity.id || entity._temporary)) {
                    // This is a new entity being created in first column
                    console.log('💾 Creating new entity for temporary row with name:', newValue);
                    try {
                        const newEntityData = {
                            entityType: this.state.entityType,
                            [attributeName]: newValue
                        };
                        
                        let created;
                        console.log('🚀 About to call createEntity API with data:', newEntityData);
                        if (this.moduleInstance?.createLinkedEntity) {
                            created = await this.moduleInstance.createLinkedEntity(this.state.entityType, newEntityData);
                        } else if (this.entityManager.createEntity) {
                            const response = await this.entityManager.createEntity(this.state.entityType, newEntityData);
                            created = response?.data || response;
                        }
                        console.log('📥 API returned entity:', created);
                        
                        if (created) {
                            // Replace the temporary entity with the created one
                            const rowIndex = this.state.entities.findIndex(e => e === entity);
                            if (rowIndex >= 0) {
                                this.state.entities[rowIndex] = created;
                                
                                // IMPORTANTE: Aggiorna anche il riferimento dell'entità locale
                                // così che le chiamate successive di saveValue vedano l'ID
                                Object.assign(entity, created);
                                
                                // Update the row's dataset
                                const row = cell.closest('tr');
                                if (row) {
                                    row.dataset.entityId = created.id;
                                }
                                
                                console.log('✅ New entity created with name:', newValue, 'ID:', created.id);
                                console.log('🔧 Entity reference updated:', entity);
                            }
                        }
                    } catch (error) {
                        console.error('Error creating new entity:', error);
                    }
                } else if (entity.id && !entity._temporary) {
                    // This is an existing entity - just update the attribute
                    console.log('🔧 Updating existing entity attribute:', entity.id, attributeName, newValue);
                    if (entity.setAttribute) {
                        entity.setAttribute(attributeName, newValue, 'text', metadata);
                    } else {
                        // Fallback for simple objects
                        entity[attributeName] = newValue;
                        this.notifyChange(entity.id, attributeName, newValue);
                    }
                } else {
                    console.log('⚠️ Unexpected entity state:', entity);
                }
                
                // Clear the saving state for this entity/attribute
                this.savingStates.delete(currentEntityKey);
                console.log(`✅ saveValue CALL #${callId} COMPLETED`);
            } else {
                console.log(`⏭️ saveValue CALL #${callId} SKIPPED - no change`);
            }
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('⌨️ ENTER pressed - calling saveValue');
                e.preventDefault();
                saveValue();
                input.blur();
            }
        });
        
        // For first column (entity search), allow blur to trigger autocomplete selection
        if (isFirstColumn || cell.classList.contains('entity-primary-cell')) {
            input.addEventListener('blur', () => {
                console.log('👁️ BLUR event - calling saveValue with delay');
                setTimeout(saveValue, 200); // Small delay for autocomplete selection
            });
        }
        
        // Subscribe to external changes
        if (this.attributeSpace) {
            const subscription = this.attributeSpace.subscribe(entity.id, attributeName, (event) => {
                if (document.activeElement !== input) {
                    input.value = event.newValue || '';
                }
            });
            this.subscriptions.push(subscription);
        }
        
        cell.appendChild(input);
    }
    
    async setEntityType(typeName) {
        if (!typeName || typeName === this.state.entityType) return;
        
        console.log(`Setting entity type to: ${typeName}`);
        this.state.entityType = typeName;
        
        // Clear existing data
        this.state.entities = [];
        this.state.columns = [];
        
        // Save state
        this.saveState();
        
        // Don't auto-load entities - user will add them manually
        // await this.loadEntitiesByType(typeName);
        
        // Re-render
        this.render();
    }
    
    async loadEntitiesByType(entityType) {
        if (!this.entityManager) return;
        
        try {
            let entities = [];
            
            // Try different methods based on available API
            if (typeof this.entityManager.getEntities === 'function') {
                const response = await this.entityManager.getEntities(entityType);
                entities = response?.data || response || [];
            } else if (typeof this.entityManager.searchEntities === 'function') {
                const response = await this.entityManager.searchEntities({ entityType });
                entities = response?.data || [];
            }
            
            // Ensure it's an array
            if (!Array.isArray(entities)) {
                entities = entities ? [entities] : [];
            }
            
            this.state.entities = entities;
            
            // Don't auto-discover columns - let user add them manually
            // if (entities.length > 0) {
            //     this.autoDiscoverColumns(entities);
            // }
            
            console.log(`Loaded ${entities.length} entities of type ${entityType}`);
        } catch (error) {
            console.error('Error loading entities:', error);
        }
    }
    
    autoDiscoverColumns(entities) {
        const attributeFrequency = new Map();
        
        // Count attribute frequency
        entities.forEach(entity => {
            Object.keys(entity).forEach(key => {
                if (key !== 'id' && key !== 'entityType' && !this.isPrimaryAttribute(key)) {
                    attributeFrequency.set(key, (attributeFrequency.get(key) || 0) + 1);
                }
            });
        });
        
        // Add columns for frequent attributes (appear in >30% of entities)
        const threshold = Math.max(1, Math.floor(entities.length * 0.3));
        attributeFrequency.forEach((count, attrName) => {
            if (count >= threshold && !this.state.columns.includes(attrName)) {
                this.state.columns.push(attrName);
            }
        });
        
        this.saveState();
    }
    
    addNewColumn() {
        // Find the add button cell
        const addCell = this.thead.querySelector('.add-column-cell');
        
        // Create new header cell with input
        const newTh = document.createElement('th');
        newTh.className = 'column-header editing';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Nome colonna';
        input.className = 'column-name-input';
        
        const saveColumn = () => {
            const columnName = input.value.trim();
            if (columnName && !this.state.columns.includes(columnName)) {
                // Cleanup autocomplete
                if (this.activeAutocomplete) {
                    this.activeAutocomplete.cleanup();
                    this.activeAutocomplete = null;
                }
                
                // Add to state
                this.state.columns.push(columnName);
                this.saveState();
                
                // Update header
                newTh.textContent = columnName;
                newTh.classList.remove('editing');
                newTh.dataset.column = columnName;
                
                // Add cells to existing rows
                const dataRows = this.tbody.querySelectorAll('.data-row');
                dataRows.forEach(row => {
                    const entity = this.state.entities.find(e => e.id === row.dataset.entityId);
                    if (entity) {
                        const td = document.createElement('td');
                        td.className = 'data-cell';
                        this.bindCell(td, entity, columnName);
                        // Insert before the last empty cell
                        row.insertBefore(td, row.lastElementChild);
                    }
                });
                
                console.log(`Added column: ${columnName}`);
            } else {
                // Remove the header if no name or duplicate
                newTh.remove();
            }
        };
        
        // Setup autocomplete for attributes
        const searchFunction = async (query) => {
            let attributes = [];
            
            console.log('🔍 Searching attributes for entity type:', this.state.entityType);
            console.log('🔍 Query:', query);
            
            // Get attributes from schema if entity type is selected
            if (this.state.entityType && this.schemaService) {
                try {
                    console.log('📡 Calling getEntitySchema for:', this.state.entityType);
                    const response = await this.schemaService.getEntitySchema(this.state.entityType);
                    console.log('📡 Schema response:', response);
                    
                    if (response?.success && response.data?.attributes) {
                        console.log('✅ Found attributes in schema:', response.data.attributes);
                        // Extract attribute names from schema
                        if (Array.isArray(response.data.attributes)) {
                            attributes = response.data.attributes.map(attr => attr.name);
                        } else if (typeof response.data.attributes === 'object') {
                            attributes = Object.keys(response.data.attributes);
                        }
                        console.log('📝 Extracted attribute names:', attributes);
                    } else {
                        console.warn('❌ Schema response invalid or no attributes found');
                    }
                } catch (error) {
                    console.warn('❌ Could not fetch entity schema:', error);
                }
            } else {
                console.warn('⚠️ No entity type or schema service available');
            }
            
            // Add some common attributes as fallback
            const commonAttributes = ['nome', 'email', 'telefono', 'description', 'name', 'title'];
            attributes = [...new Set([...attributes, ...commonAttributes])];
            
            // Filter out already used columns
            attributes = attributes.filter(attr => !this.state.columns.includes(attr));
            console.log('🔧 Available attributes after filtering:', attributes);
            
            // Filter by query
            const filtered = attributes.filter(attr => 
                attr.toLowerCase().includes(query.toLowerCase())
            );
            console.log('🎯 Filtered attributes for query "' + query + '":', filtered);
            
            return filtered.map(attr => ({
                value: attr,
                label: attr
            }));
        };
        
        const onSelect = (selected) => {
            // Trigger save
            saveColumn();
        };
        
        newTh.appendChild(input);
        
        // Insert before add button
        this.thead.querySelector('tr').insertBefore(newTh, addCell);
        
        // Set up autocomplete after input is in DOM
        setTimeout(() => {
            this.createAutocomplete(input, searchFunction, onSelect);
            
            input.addEventListener('autocomplete-select', (e) => {
                onSelect(e.detail);
            });
        }, 0);
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveColumn();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                newTh.remove(); // Remove the header if user cancels
            }
        });
        
        // Focus the input
        input.focus();
    }
    
    removeColumn(columnName) {
        const index = this.state.columns.indexOf(columnName);
        if (index > -1) {
            this.state.columns.splice(index, 1);
            this.saveState();
            this.render();
            console.log(`Removed column: ${columnName}`);
        }
    }
    
    async addNewEntity() {
        if (!this.state.entityType) return;
        
        try {
            // Create a temporary entity that will be persisted when user enters name
            const tempEntity = {
                entityType: this.state.entityType,
                [this.getPrimaryAttribute()]: '',
                // No ID - this marks it as temporary
                _temporary: true
            };
            
            this.state.entities.push(tempEntity);
            
            // Remove add row control
            const addRowControl = this.tbody.querySelector('.add-row-control');
            if (addRowControl) {
                addRowControl.remove();
            }
            
            // Render new row
            this.renderRow(tempEntity);
            
            // Re-add control
            this.renderAddRowControl();
            
            // Focus first input in new row
            const newRow = this.tbody.querySelector(`tr:last-of-type`);
            if (newRow && newRow.classList.contains('data-row')) {
                const firstInput = newRow.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                    firstInput.placeholder = `Inserisci ${this.getPrimaryAttribute()}...`;
                }
            }
            
            console.log('Temporary entity created for user input');
        } catch (error) {
            console.error('Error creating temporary entity:', error);
        }
    }
    
    /**
     * Generic autocomplete helper
     * @param {HTMLInputElement} input - The input element
     * @param {Function} searchFunction - Async function that returns suggestions
     * @param {Function} onSelect - Callback when item is selected
     */
    createAutocomplete(input, searchFunction, onSelect) {
        let currentIndex = -1;
        let suggestions = [];
        let suggestionsDiv = input.nextElementSibling;
        
        // Create suggestions dropdown if it doesn't exist
        if (!suggestionsDiv || !suggestionsDiv.classList.contains('suggestions-dropdown')) {
            suggestionsDiv = document.createElement('div');
            suggestionsDiv.className = 'suggestions-dropdown';
            suggestionsDiv.style.display = 'none';
            
            // Store reference to the input this dropdown belongs to
            suggestionsDiv.targetInput = input;
            // Store the onSelect callback for click handlers
            suggestionsDiv.onSelectCallback = onSelect;
            
            // Try appending to body instead of parent to avoid overflow issues
            document.body.appendChild(suggestionsDiv);
            
            // Position it manually relative to input
            const positionDropdown = () => {
                if (input && suggestionsDiv) {
                    const rect = input.getBoundingClientRect();
                    suggestionsDiv.style.position = 'fixed';
                    suggestionsDiv.style.top = (rect.bottom + 2) + 'px';
                    suggestionsDiv.style.left = rect.left + 'px';
                    suggestionsDiv.style.width = Math.max(200, rect.width) + 'px';
                }
            };
            
            // Position initially and on scroll/resize
            positionDropdown();
            window.addEventListener('scroll', positionDropdown);
            window.addEventListener('resize', positionDropdown);
        }
        
        const updateSuggestions = async () => {
            const query = input.value.trim();
            
            if (!query) {
                this.hideAutocomplete(suggestionsDiv);
                return;
            }
            
            try {
                // Get suggestions from search function
                suggestions = await searchFunction(query) || [];
                
                // Always add "Create new" option if query has value
                if (query.length > 0) {
                    suggestions.push({
                        value: query,
                        label: `Crea nuovo: "${query}"`,
                        isNew: true
                    });
                }
                
                if (suggestions.length > 0 && suggestionsDiv) {
                    this.renderAutocomplete(suggestionsDiv, suggestions, currentIndex, input, onSelect);
                    
                    // Position and style the dropdown
                    const rect = input.getBoundingClientRect();
                    suggestionsDiv.style.position = 'fixed';
                    suggestionsDiv.style.top = (rect.bottom + 2) + 'px';
                    suggestionsDiv.style.left = rect.left + 'px';
                    suggestionsDiv.style.width = Math.max(200, rect.width) + 'px';
                    suggestionsDiv.style.backgroundColor = 'white';
                    suggestionsDiv.style.border = '2px solid #007bff';
                    suggestionsDiv.style.borderRadius = '4px';
                    suggestionsDiv.style.zIndex = '999999';
                    suggestionsDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    suggestionsDiv.style.fontSize = '14px';
                    suggestionsDiv.style.maxHeight = '200px';
                    suggestionsDiv.style.overflowY = 'auto';
                    
                    suggestionsDiv.style.display = 'block';
                    
                    
                } else {
                    this.hideAutocomplete(suggestionsDiv);
                }
            } catch (error) {
                console.warn('Error updating suggestions:', error);
                this.hideAutocomplete(suggestionsDiv);
            }
        };
        
        // Input handler with debouncing
        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateSuggestions, 300);
        });
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (suggestionsDiv.style.display === 'none') return;
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentIndex = Math.min(currentIndex + 1, suggestions.length - 1);
                    this.renderAutocomplete(suggestionsDiv, suggestions, currentIndex, input, onSelect);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    currentIndex = Math.max(currentIndex - 1, -1);
                    this.renderAutocomplete(suggestionsDiv, suggestions, currentIndex, input, onSelect);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (currentIndex >= 0 && suggestions[currentIndex]) {
                        const selected = suggestions[currentIndex];
                        input.value = selected.value;
                        onSelect(selected);
                        this.hideAutocomplete(suggestionsDiv);
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    this.hideAutocomplete(suggestionsDiv);
                    break;
            }
        });
        
        // Click outside to close
        const clickOutside = (e) => {
            if (suggestionsDiv && 
                suggestionsDiv.style.display === 'block' &&
                !input.contains(e.target) && 
                !suggestionsDiv.contains(e.target) &&
                e.target !== input) {
                console.log('Hiding autocomplete due to outside click');
                this.hideAutocomplete(suggestionsDiv);
            }
        };
        
        // Store cleanup function
        this.activeAutocomplete = {
            hide: () => this.hideAutocomplete(suggestionsDiv),
            cleanup: () => {
                document.removeEventListener('click', clickOutside);
                clearTimeout(debounceTimer);
            }
        };
        
        document.addEventListener('click', clickOutside);
        
        return this.activeAutocomplete;
    }
    
    renderAutocomplete(container, suggestions, currentIndex, targetInput = null, onSelectCallback = null) {
        const html = suggestions.map((item, index) => {
            const className = index === currentIndex ? 'suggestion-item selected' : 'suggestion-item';
            return `<div class="${className}" data-index="${index}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; color: #333; font-size: 14px;">${item.label}</div>`;
        }).join('');
        
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.suggestion-item').forEach((el, index) => {
            el.addEventListener('click', () => {
                const selected = suggestions[index];
                
                // Use parameters passed directly to method, fallback to stored values
                const input = targetInput || container.targetInput;
                const callback = onSelectCallback || container.onSelectCallback;
                
                if (input && callback) {
                    input.value = selected.value;
                    
                    // Call the callback directly
                    callback(selected);
                    
                    // Also trigger custom event for any additional listeners
                    const event = new CustomEvent('autocomplete-select', { detail: selected });
                    input.dispatchEvent(event);
                    
                    // Focus the input
                    input.focus();
                }
                
                this.hideAutocomplete(container);
            });
        });
    }
    
    hideAutocomplete(container) {
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }
    
    async showEntityTypeSuggestions(event) {
        const input = event.target;
        
        // Only setup autocomplete once
        if (!input.dataset.autocompleteSetup) {
            input.dataset.autocompleteSetup = 'true';
            
            const searchFunction = async (query) => {
                let types = [];
                
                // Try to get entity types from schema service
                if (this.schemaService) {
                    try {
                        const response = await this.schemaService.getAvailableEntityTypes();
                        types = response?.data || response || [];
                    } catch (error) {
                        console.warn('Could not fetch entity types:', error);
                    }
                }
                
                // Fallback to common types
                if (!Array.isArray(types) || types.length === 0) {
                    types = ['Contact', 'Person', 'Project', 'Task', 'Note', 'Cliente', 'Prodotto', 'Evento'];
                }
                
                // Filter by query
                const filtered = types.filter(type => 
                    type.toLowerCase().includes(query.toLowerCase())
                );
                
                return filtered.map(type => ({
                    value: type,
                    label: type
                }));
            };
            
            const onSelect = (selected) => {
                this.setEntityType(selected.value);
            };
            
            // Setup autocomplete after input is in DOM
            setTimeout(() => {
                this.createAutocomplete(input, searchFunction, onSelect);
                
                // Handle custom event for click selection
                input.addEventListener('autocomplete-select', (e) => {
                    onSelect(e.detail);
                });
            }, 0);
        }
    }
    
    hideSuggestions() {
        const suggestions = this.container.querySelector('.suggestions-dropdown');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }
    
    resetEntityType() {
        if (confirm('Cambiare tipo di entità cancellerà tutti i dati. Continuare?')) {
            this.state.entityType = null;
            this.state.entities = [];
            this.state.columns = [];
            this.saveState();
            this.render();
        }
    }
    
    getPrimaryAttribute() {
        // Common primary attributes by entity type
        const primaryMap = {
            'Contact': 'nome',
            'Person': 'nome',
            'Persona': 'nome',
            'Project': 'name',
            'Task': 'title',
            'Cliente': 'nome'
        };
        
        return primaryMap[this.state.entityType] || 'name';
    }
    
    isPrimaryAttribute(attrName) {
        const primaryAttrs = ['nome', 'name', 'title'];
        return primaryAttrs.includes(attrName.toLowerCase());
    }
    
    saveState() {
        if (this.moduleInstance?.updateState) {
            this.moduleInstance.updateState({
                entityType: this.state.entityType,
                columns: this.state.columns
            });
        }
    }
    
    notifyChange(entityId, attributeName, newValue) {
        // Broadcast change if WebSocket service available and has broadcast method
        if (window.WebSocketService && typeof window.WebSocketService.broadcast === 'function') {
            try {
                window.WebSocketService.broadcast({
                    type: 'entity-updated',
                    entityId,
                    attributeName,
                    newValue
                });
            } catch (error) {
                console.warn('Could not broadcast change:', error);
            }
        }
    }
    
    applyStyles() {
        // Inject styles if not already present
        if (!document.querySelector('#simple-table-styles')) {
            const style = document.createElement('style');
            style.id = 'simple-table-styles';
            style.textContent = `
                .simple-table-wrapper {
                    width: 100%;
                    overflow: auto;
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 16px;
                }
                
                .simple-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .simple-table th,
                .simple-table td {
                    padding: 0;
                    border: 1px solid #e9ecef;
                    position: relative;
                }
                
                .entity-type-cell {
                    background: #6c757d;
                    color: white;
                    font-weight: 600;
                    padding: 12px;
                    min-width: 150px;
                    position: relative;
                }
                
                .entity-type-input {
                    width: 100%;
                    padding: 8px;
                    border: none;
                    background: rgba(255,255,255,0.9);
                    border-radius: 4px;
                    color: #333;
                    font-weight: 600;
                }
                
                .column-header {
                    background: #f8f9fa;
                    font-weight: 500;
                    padding: 12px;
                    color: #495057;
                    min-width: 120px;
                    cursor: default;
                    user-select: none;
                }
                
                .column-header:hover {
                    background: #e9ecef;
                }
                
                .column-header.editing {
                    padding: 0;
                    position: relative;
                }
                
                .column-name-input {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    background: transparent;
                    font-weight: 500;
                    outline: none;
                }
                
                .add-column-cell {
                    width: 40px;
                    background: #f8f9fa;
                    text-align: center;
                    padding: 0;
                }
                
                .cell-input {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-family: inherit;
                    font-size: inherit;
                }
                
                .cell-input:focus {
                    background: #f0f8ff;
                    box-shadow: inset 0 0 0 2px #4CAF50;
                }
                
                .entity-primary-cell {
                    background: #f8f9fa;
                    font-weight: 500;
                }
                
                .data-cell {
                    background: white;
                }
                
                .empty-cell {
                    background: #f8f9fa;
                    width: 40px;
                }
                
                .add-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #4CAF50;
                    padding: 8px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .add-btn:hover {
                    background: rgba(76, 175, 80, 0.1);
                    transform: scale(1.2);
                }
                
                .add-row-control td {
                    background: #f8f9fa;
                    text-align: center;
                    padding: 8px;
                }
                
                .suggestions-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 10000;
                    max-height: 200px;
                    overflow-y: auto;
                    min-width: 200px;
                    max-width: 300px;
                    width: max-content;
                }
                
                .suggestion-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    color: #333;
                    font-size: 14px;
                    font-weight: 500;
                    border-bottom: 1px solid #f0f0f0;
                    background: white;
                    display: block;
                    width: 100%;
                }
                
                .suggestion-item:hover {
                    background: #f8f9fa;
                }
                
                .suggestion-item.selected {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                
                .data-row:hover {
                    background: #fafbfc;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .simple-table {
                        font-size: 14px;
                    }
                    
                    .cell-input,
                    .column-name-input {
                        padding: 8px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    destroy() {
        // Clean up subscriptions
        this.subscriptions.forEach(sub => {
            if (sub && sub.unsubscribe) {
                sub.unsubscribe();
            }
        });
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Register globally
if (typeof window !== 'undefined') {
    window.SimpleTableModule = SimpleTableModule;
    console.log('✅ SimpleTableModule registered globally');
}