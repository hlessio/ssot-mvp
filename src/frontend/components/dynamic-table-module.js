/**
 * Dynamic Table Module - Componente tabella dinamica per SSOT-4000
 * Supporta colonne intrinseche e relazionali con ConfiguredTable e TableRowLink
 */

class DynamicTableModule {
    constructor(container, config = {}) {
        this.container = container;
        this.config = {
            moduleInstanceId: config.moduleInstanceId || null,
            configuredTableId: config.configuredTableId || null,
            tableName: config.tableName || 'Nuova Tabella',
            rowEntityType: config.rowEntityType || null,
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
            configuredTable: null,
            rowEntityType: this.config.rowEntityType,
            columnDefinitions: [],
            tableRows: new Map(), // rowEntityId -> EntityData
            tableRowLinks: new Map(), // rowEntityId -> TableRowLink
            availableEntityTypes: [],
            availableAttributes: new Map(), // entityType -> attributes
            isLoading: false,
            editingCell: null,
            selectedRows: new Set()
        };
        
        // Services
        this.entityService = window.EntityService || null;
        this.schemaService = window.SchemaService || null;
        this.wsService = window.WebSocketService || null;
        
        // Debounce settings
        this.saveTimeout = null;
        this.SAVE_DELAY = 2000;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Inizializzazione Dynamic Table Module', this.config);
            
            // Setup WebSocket per real-time updates
            this.setupWebSocketListeners();
            
            // Carica o crea ConfiguredTable
            if (this.config.configuredTableId) {
                await this.loadConfiguredTable();
            }
            
            // Carica entity types disponibili
            await this.loadAvailableEntityTypes();
            
            // Render initial UI
            this.render();
            
            console.log('✅ Dynamic Table Module inizializzato');
        } catch (error) {
            console.error('❌ Errore inizializzazione Dynamic Table Module:', error);
            this.renderError(error.message);
        }
    }
    
    setupWebSocketListeners() {
        if (!this.wsService) return;
        
        // Listen for entity changes
        this.wsService.addEventListener('message', (event) => {
            const data = event.data;
            
            if (data.type === 'change' || data.type === 'entity-updated') {
                this.handleEntityChange(data);
            } else if (data.type === 'entity-created') {
                this.handleEntityCreated(data);
            } else if (data.type === 'entity-deleted') {
                this.handleEntityDeleted(data);
            }
        });
    }
    
    async loadConfiguredTable() {
        if (!this.config.configuredTableId || !this.entityService) return;
        
        try {
            this.state.isLoading = true;
            this.updateLoadingState();
            
            const response = await this.entityService.getEntity(this.config.configuredTableId);
            if (response.success) {
                this.state.configuredTable = response.data;
                this.state.rowEntityType = response.data.rowEntityType;
                this.state.columnDefinitions = JSON.parse(response.data.columnDefinitions || '[]');
                
                // Carica le righe della tabella
                await this.loadTableRows();
            }
        } catch (error) {
            console.error('Errore caricamento ConfiguredTable:', error);
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState();
        }
    }
    
    async loadTableRows() {
        if (!this.state.configuredTable || !this.entityService) return;
        
        try {
            // Trova tutti i TableRowLink per questa tabella
            const linkResponse = await this.entityService.searchEntities({
                entityType: 'TableRowLink',
                filters: {
                    tableConfigEntityId: this.state.configuredTable.id,
                    isActive: true
                }
            });
            
            if (linkResponse.success && linkResponse.data) {
                const links = Array.isArray(linkResponse.data) ? linkResponse.data : [linkResponse.data];
                
                // Carica le entità riga
                for (const link of links) {
                    this.state.tableRowLinks.set(link.rowEntityId, link);
                    
                    // Carica l'entità riga effettiva
                    const entityResponse = await this.entityService.getEntity(link.rowEntityId);
                    if (entityResponse.success) {
                        this.state.tableRows.set(link.rowEntityId, entityResponse.data);
                    }
                }
            }
        } catch (error) {
            console.error('Errore caricamento table rows:', error);
        }
    }
    
    async loadAvailableEntityTypes() {
        if (!this.schemaService) return;
        
        try {
            const response = await this.schemaService.getAvailableEntityTypes();
            if (response.success) {
                this.state.availableEntityTypes = response.data || [];
            }
        } catch (error) {
            console.error('Errore caricamento entity types:', error);
            // Fallback con tipi comuni
            this.state.availableEntityTypes = ['Contact', 'Task', 'Note', 'Project', 'Person'];
        }
    }
    
    async loadEntityAttributes(entityType) {
        if (!entityType || this.state.availableAttributes.has(entityType)) return;
        
        try {
            const response = await this.schemaService.getEntitySchema(entityType);
            if (response.success && response.data) {
                const attributes = Object.keys(response.data.attributes || {});
                this.state.availableAttributes.set(entityType, attributes);
            }
        } catch (error) {
            console.error(`Errore caricamento attributi per ${entityType}:`, error);
            // Fallback con attributi comuni
            this.state.availableAttributes.set(entityType, ['nome', 'description', 'status', 'createdAt']);
        }
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="dynamic-table-container">
                ${this.renderHeader()}
                ${this.renderControls()}
                ${this.renderTable()}
                ${this.state.isLoading ? '<div class="loading-overlay"><div class="spinner"></div></div>' : ''}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    renderHeader() {
        return `
            <div class="table-header">
                <input type="text" 
                       class="table-name-input" 
                       placeholder="Nome tabella..." 
                       value="${this.config.tableName}"
                       ${this.config.permissions.canEditColumns ? '' : 'readonly'}>
                <div class="table-info">
                    ${this.state.tableRows.size} righe • ${this.state.columnDefinitions.length} colonne
                </div>
            </div>
        `;
    }
    
    renderControls() {
        const canEdit = this.config.permissions.canEditColumns;
        const canAddRows = this.config.permissions.canAddRows;
        
        return `
            <div class="table-controls">
                <div class="entity-type-section">
                    <label>Tipo Entità:</label>
                    <div class="entity-type-selector">
                        <input type="text" 
                               class="entity-type-input" 
                               placeholder="Seleziona tipo entità..."
                               value="${this.state.rowEntityType || ''}"
                               ${canEdit ? '' : 'readonly'}>
                        <div class="autocomplete-dropdown" style="display: none;"></div>
                    </div>
                </div>
                
                <div class="table-actions">
                    ${canAddRows ? '<button class="add-row-btn">➕ Aggiungi Riga</button>' : ''}
                    ${canEdit ? '<button class="add-column-btn">➕ Aggiungi Colonna</button>' : ''}
                    <button class="refresh-btn">🔄 Aggiorna</button>
                    ${this.state.selectedRows.size > 0 ? '<button class="delete-selected-btn">🗑️ Elimina Selezionate</button>' : ''}
                </div>
            </div>
        `;
    }
    
    renderTable() {
        if (!this.state.rowEntityType) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>Seleziona un tipo di entità per iniziare</p>
                </div>
            `;
        }
        
        return `
            <div class="table-main">
                <table class="table-grid">
                    ${this.renderTableHeader()}
                    ${this.renderTableBody()}
                </table>
            </div>
        `;
    }
    
    renderTableHeader() {
        const headers = [''];  // Prima colonna per checkbox
        
        // Aggiungi colonne definite
        for (const col of this.state.columnDefinitions) {
            const typeIndicator = col.type === 'intrinsic' ? '🟢' : '🟡';
            headers.push(`${typeIndicator} ${col.name}`);
        }
        
        // Colonna per azioni
        headers.push('Azioni');
        
        // Colonna per aggiungere nuove colonne
        if (this.config.permissions.canAddColumns) {
            headers.push('➕');
        }
        
        return `
            <thead>
                <tr class="table-header-row">
                    ${headers.map(header => `<th class="table-header-cell">${header}</th>`).join('')}
                </tr>
            </thead>
        `;
    }
    
    renderTableBody() {
        const rows = Array.from(this.state.tableRows.entries());
        
        if (rows.length === 0) {
            return `
                <tbody>
                    <tr>
                        <td colspan="${this.state.columnDefinitions.length + 3}" class="empty-row">
                            <div class="empty-state">
                                <p>Nessuna riga presente</p>
                                ${this.config.permissions.canAddRows ? '<button class="add-first-row-btn">➕ Aggiungi prima riga</button>' : ''}
                            </div>
                        </td>
                    </tr>
                </tbody>
            `;
        }
        
        return `
            <tbody>
                ${rows.map(([rowEntityId, rowData]) => this.renderTableRow(rowEntityId, rowData)).join('')}
            </tbody>
        `;
    }
    
    renderTableRow(rowEntityId, rowData) {
        const rowLink = this.state.tableRowLinks.get(rowEntityId);
        const isSelected = this.state.selectedRows.has(rowEntityId);
        
        let cells = [`<td class="table-cell"><input type="checkbox" ${isSelected ? 'checked' : ''} data-row-id="${rowEntityId}"></td>`];
        
        // Render celle dati
        for (const col of this.state.columnDefinitions) {
            const cellValue = this.getCellValue(rowData, rowLink, col);
            const isEditable = this.config.permissions.canEditRows;
            
            cells.push(`
                <td class="table-cell ${isEditable ? 'table-cell-editable' : ''} column-type-${col.type}" 
                    data-row-id="${rowEntityId}" 
                    data-column="${col.name}">
                    <span class="cell-content" ${isEditable ? 'contenteditable="true"' : ''}>${cellValue || ''}</span>
                </td>
            `);
        }
        
        // Colonna azioni
        cells.push(`
            <td class="table-cell actions-cell">
                ${this.config.permissions.canDeleteRows ? `<button class="remove-btn" data-row-id="${rowEntityId}">🗑️</button>` : ''}
            </td>
        `);
        
        // Colonna per aggiungere colonne (placeholder)
        if (this.config.permissions.canAddColumns) {
            cells.push('<td class="table-cell add-column-placeholder"></td>');
        }
        
        return `<tr class="table-row" data-row-id="${rowEntityId}">${cells.join('')}</tr>`;
    }
    
    getCellValue(rowData, rowLink, columnDef) {
        if (columnDef.type === 'intrinsic') {
            return rowData[columnDef.sourceAttribute] || '';
        } else if (columnDef.type === 'relational' && rowLink) {
            return rowLink[columnDef.relationalKey] || '';
        }
        return '';
    }
    
    renderError(message) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Errore</h3>
                <p>${message}</p>
                <button class="retry-btn">🔄 Riprova</button>
            </div>
        `;
    }
    
    updateLoadingState() {
        const overlay = this.container.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = this.state.isLoading ? 'flex' : 'none';
        }
    }
    
    attachEventListeners() {
        // Event listeners per i controlli della tabella
        this.attachHeaderListeners();
        this.attachControlListeners();
        this.attachTableListeners();
    }
    
    attachHeaderListeners() {
        const tableNameInput = this.container.querySelector('.table-name-input');
        if (tableNameInput) {
            tableNameInput.addEventListener('blur', (e) => {
                this.config.tableName = e.target.value;
                this.debouncedSave();
            });
        }
    }
    
    attachControlListeners() {
        // Entity type selector
        const entityTypeInput = this.container.querySelector('.entity-type-input');
        if (entityTypeInput) {
            entityTypeInput.addEventListener('input', (e) => {
                this.showEntityTypeAutocomplete(e.target.value);
            });
            
            entityTypeInput.addEventListener('blur', () => {
                setTimeout(() => this.hideEntityTypeAutocomplete(), 200);
            });
        }
        
        // Action buttons
        const addRowBtn = this.container.querySelector('.add-row-btn, .add-first-row-btn');
        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => this.handleAddRow());
        }
        
        const addColumnBtn = this.container.querySelector('.add-column-btn');
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this.handleAddColumn());
        }
        
        const refreshBtn = this.container.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
        }
    }
    
    attachTableListeners() {
        // Cell editing
        const editableCells = this.container.querySelectorAll('.table-cell-editable .cell-content');
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
        const checkboxes = this.container.querySelectorAll('input[type="checkbox"][data-row-id]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleRowSelection(e));
        });
        
        // Remove row buttons
        const removeButtons = this.container.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRemoveRow(e.target.dataset.rowId));
        });
    }
    
    showEntityTypeAutocomplete(query) {
        const dropdown = this.container.querySelector('.autocomplete-dropdown');
        if (!dropdown) return;
        
        const filtered = this.state.availableEntityTypes
            .filter(type => type.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10);
        
        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        dropdown.innerHTML = filtered.map(type => 
            `<div class="autocomplete-item" data-value="${type}">${type}</div>`
        ).join('');
        
        dropdown.style.display = 'block';
        
        // Attach click listeners
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectEntityType(e.target.dataset.value);
            });
        });
    }
    
    hideEntityTypeAutocomplete() {
        const dropdown = this.container.querySelector('.autocomplete-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
    
    async selectEntityType(entityType) {
        this.state.rowEntityType = entityType;
        this.config.rowEntityType = entityType;
        
        const input = this.container.querySelector('.entity-type-input');
        if (input) input.value = entityType;
        
        this.hideEntityTypeAutocomplete();
        
        // Carica attributi per questo tipo di entità
        await this.loadEntityAttributes(entityType);
        
        // Re-render per mostrare la tabella
        this.render();
        
        this.debouncedSave();
    }
    
    async handleAddRow() {
        if (!this.state.rowEntityType || !this.entityService) return;
        
        try {
            // Crea nuova entità del tipo specificato
            const newEntityData = {
                entityType: this.state.rowEntityType
            };
            
            const entityResponse = await this.entityService.createEntity(this.state.rowEntityType, newEntityData);
            if (!entityResponse.success) throw new Error('Errore creazione entità');
            
            const newEntity = entityResponse.data;
            
            // Crea TableRowLink
            const linkData = {
                tableConfigEntityId: this.state.configuredTable?.id || 'temp',
                rowEntityId: newEntity.id,
                rowEntityType: this.state.rowEntityType,
                rowOrder: this.state.tableRows.size,
                isActive: true
            };
            
            const linkResponse = await this.entityService.createEntity('TableRowLink', linkData);
            if (!linkResponse.success) throw new Error('Errore creazione TableRowLink');
            
            // Aggiorna stato locale
            this.state.tableRows.set(newEntity.id, newEntity);
            this.state.tableRowLinks.set(newEntity.id, linkResponse.data);
            
            // Re-render tabella
            this.render();
            
        } catch (error) {
            console.error('Errore aggiunta riga:', error);
            alert('Errore durante l\'aggiunta della riga: ' + error.message);
        }
    }
    
    handleAddColumn() {
        // Mostra modal per configurazione colonna
        this.showAddColumnModal();
    }
    
    showAddColumnModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Aggiungi Colonna</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nome Colonna:</label>
                        <input type="text" class="column-name-input" placeholder="Nome colonna...">
                    </div>
                    <div class="form-group">
                        <label>Tipo Colonna:</label>
                        <select class="column-type-select">
                            <option value="intrinsic">Intrinseca (da entità)</option>
                            <option value="relational">Relazionale (personalizzata)</option>
                        </select>
                    </div>
                    <div class="form-group attribute-group" style="display: none;">
                        <label>Attributo Sorgente:</label>
                        <select class="source-attribute-select"></select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Annulla</button>
                    <button class="btn-add">Aggiungi</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup modal event listeners
        this.setupAddColumnModal(modal);
    }
    
    setupAddColumnModal(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const addBtn = modal.querySelector('.btn-add');
        const typeSelect = modal.querySelector('.column-type-select');
        const attributeGroup = modal.querySelector('.attribute-group');
        const attributeSelect = modal.querySelector('.source-attribute-select');
        
        // Close modal
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        // Type change
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'intrinsic') {
                attributeGroup.style.display = 'block';
                this.populateAttributeSelect(attributeSelect);
            } else {
                attributeGroup.style.display = 'none';
            }
        });
        
        // Add column
        addBtn.addEventListener('click', () => {
            const columnName = modal.querySelector('.column-name-input').value;
            const columnType = typeSelect.value;
            const sourceAttribute = attributeSelect.value;
            
            if (!columnName) {
                alert('Inserisci un nome per la colonna');
                return;
            }
            
            this.addColumn(columnName, columnType, sourceAttribute);
            modal.remove();
        });
    }
    
    populateAttributeSelect(select) {
        const attributes = this.state.availableAttributes.get(this.state.rowEntityType) || [];
        select.innerHTML = attributes.map(attr => 
            `<option value="${attr}">${attr}</option>`
        ).join('');
    }
    
    addColumn(name, type, sourceAttribute = null) {
        const columnDef = {
            name,
            type,
            sourceAttribute: type === 'intrinsic' ? sourceAttribute : null,
            relationalKey: type === 'relational' ? `custom_${name.toLowerCase().replace(/\s+/g, '_')}` : null
        };
        
        this.state.columnDefinitions.push(columnDef);
        this.render();
        this.debouncedSave();
    }
    
    handleCellEdit(event) {
        const cell = event.target.closest('.table-cell-editable');
        const rowId = cell.dataset.rowId;
        const columnName = cell.dataset.column;
        const newValue = event.target.textContent.trim();
        
        this.updateCellValue(rowId, columnName, newValue);
    }
    
    async updateCellValue(rowId, columnName, newValue) {
        const columnDef = this.state.columnDefinitions.find(col => col.name === columnName);
        if (!columnDef) return;
        
        try {
            if (columnDef.type === 'intrinsic') {
                // Aggiorna entità riga
                const rowData = this.state.tableRows.get(rowId);
                if (rowData) {
                    rowData[columnDef.sourceAttribute] = newValue;
                    await this.entityService.updateEntity(rowId, { [columnDef.sourceAttribute]: newValue });
                }
            } else if (columnDef.type === 'relational') {
                // Aggiorna TableRowLink
                const rowLink = this.state.tableRowLinks.get(rowId);
                if (rowLink) {
                    rowLink[columnDef.relationalKey] = newValue;
                    await this.entityService.updateEntity(rowLink.id, { [columnDef.relationalKey]: newValue });
                }
            }
        } catch (error) {
            console.error('Errore aggiornamento cella:', error);
        }
    }
    
    handleRowSelection(event) {
        const rowId = event.target.dataset.rowId;
        
        if (event.target.checked) {
            this.state.selectedRows.add(rowId);
        } else {
            this.state.selectedRows.delete(rowId);
        }
        
        // Update controls
        this.updateControls();
    }
    
    updateControls() {
        const controlsContainer = this.container.querySelector('.table-controls');
        if (controlsContainer) {
            const actionsHtml = controlsContainer.querySelector('.table-actions').innerHTML;
            controlsContainer.querySelector('.table-actions').innerHTML = this.renderControls().match(/<div class="table-actions">(.*?)<\/div>/s)[1];
        }
    }
    
    async handleRemoveRow(rowId) {
        if (!confirm('Sei sicuro di voler rimuovere questa riga?')) return;
        
        try {
            // Rimuovi TableRowLink
            const rowLink = this.state.tableRowLinks.get(rowId);
            if (rowLink) {
                await this.entityService.deleteEntity(rowLink.id);
            }
            
            // Opzionalmente rimuovi anche l'entità riga
            const shouldDeleteEntity = confirm('Vuoi eliminare anche l\'entità collegata?');
            if (shouldDeleteEntity) {
                await this.entityService.deleteEntity(rowId);
            }
            
            // Aggiorna stato locale
            this.state.tableRows.delete(rowId);
            this.state.tableRowLinks.delete(rowId);
            this.state.selectedRows.delete(rowId);
            
            this.render();
        } catch (error) {
            console.error('Errore rimozione riga:', error);
            alert('Errore durante la rimozione della riga');
        }
    }
    
    async handleRefresh() {
        await this.loadConfiguredTable();
        this.render();
    }
    
    // Real-time event handlers
    handleEntityChange(data) {
        // Aggiorna entità se presente nella tabella
        if (this.state.tableRows.has(data.entityId)) {
            // Ricarica l'entità aggiornata
            this.refreshEntityRow(data.entityId);
        }
    }
    
    handleEntityCreated(data) {
        // Se è un nuovo TableRowLink per questa tabella, aggiornalo
        if (data.entityType === 'TableRowLink' && 
            data.tableConfigEntityId === this.state.configuredTable?.id) {
            this.loadTableRows().then(() => this.render());
        }
    }
    
    handleEntityDeleted(data) {
        if (this.state.tableRows.has(data.entityId)) {
            this.state.tableRows.delete(data.entityId);
            this.state.tableRowLinks.delete(data.entityId);
            this.render();
        }
    }
    
    async refreshEntityRow(entityId) {
        try {
            const response = await this.entityService.getEntity(entityId);
            if (response.success) {
                this.state.tableRows.set(entityId, response.data);
                this.render();
            }
        } catch (error) {
            console.error('Errore refresh entity row:', error);
        }
    }
    
    // Debounced save per performance
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveConfiguration();
        }, this.SAVE_DELAY);
    }
    
    async saveConfiguration() {
        if (!this.state.configuredTable && this.config.tableName && this.state.rowEntityType) {
            // Crea nuovo ConfiguredTable
            await this.createConfiguredTable();
        } else if (this.state.configuredTable) {
            // Aggiorna ConfiguredTable esistente
            await this.updateConfiguredTable();
        }
    }
    
    async createConfiguredTable() {
        try {
            const tableData = {
                name: this.config.tableName,
                description: `Tabella dinamica per ${this.state.rowEntityType}`,
                rowEntityType: this.state.rowEntityType,
                columnDefinitions: JSON.stringify(this.state.columnDefinitions),
                ownerId: this.config.contextEntityId || 'system',
                displaySettings: JSON.stringify({
                    sortBy: null,
                    sortOrder: 'asc',
                    filters: {},
                    pageSize: 50
                }),
                permissions: JSON.stringify(this.config.permissions)
            };
            
            const response = await this.entityService.createEntity('ConfiguredTable', tableData);
            if (response.success) {
                this.state.configuredTable = response.data;
                this.config.configuredTableId = response.data.id;
                console.log('✅ ConfiguredTable creata:', response.data.id);
            }
        } catch (error) {
            console.error('Errore creazione ConfiguredTable:', error);
        }
    }
    
    async updateConfiguredTable() {
        try {
            const updates = {
                name: this.config.tableName,
                rowEntityType: this.state.rowEntityType,
                columnDefinitions: JSON.stringify(this.state.columnDefinitions),
                permissions: JSON.stringify(this.config.permissions),
                modifiedAt: new Date().toISOString()
            };
            
            const response = await this.entityService.updateEntity(this.state.configuredTable.id, updates);
            if (response.success) {
                Object.assign(this.state.configuredTable, updates);
                console.log('✅ ConfiguredTable aggiornata');
            }
        } catch (error) {
            console.error('Errore aggiornamento ConfiguredTable:', error);
        }
    }
    
    // Public API
    getConfiguration() {
        return {
            configuredTableId: this.config.configuredTableId,
            tableName: this.config.tableName,
            rowEntityType: this.state.rowEntityType,
            columnDefinitions: this.state.columnDefinitions,
            permissions: this.config.permissions
        };
    }
    
    updateConfiguration(newConfig) {
        Object.assign(this.config, newConfig);
        this.render();
        this.debouncedSave();
    }
    
    destroy() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Remove WebSocket listeners if needed
        if (this.wsService) {
            // Cleanup listeners
        }
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export per uso in SSOT-4000
if (typeof window !== 'undefined') {
    window.DynamicTableModule = DynamicTableModule;
}

export { DynamicTableModule };