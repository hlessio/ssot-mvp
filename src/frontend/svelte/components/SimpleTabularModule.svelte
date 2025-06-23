<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import SmartInput from './SmartInput.svelte';
    import AttributeSuggestionService from '../services/AttributeSuggestionService.js';
    import EntitySearchService from '../services/EntitySearchService.js';
    
    const dispatch = createEventDispatcher();
    
    // Props del componente
    export let moduleId = null;
    export let projectId = null;
    export let title = 'Modulo Tabellare Semplice';
    export let allowAddRows = true;
    export let allowAddColumns = true;
    export let allowEdit = true;
    export let enableRealtime = true;
    
    // Servizi
    let attributeService = null;
    let entityService = null;
    
    // Stato del componente
    let selectedEntityType = null;
    let availableEntityTypes = ['Persona', 'Contact', 'Lead', 'Azienda', 'Progetto'];
    let columns = []; // [selectedEntityType, 'email', 'numero', ...]
    let rows = []; // [{entity: {nome: 'Mario Rossi'}, attributes: {email: 'mario@...', numero: '334...'}}]
    let isLoading = false;
    let error = null;
    let websocket = null;
    let isAddingColumn = false;
    
    // Reactive statements
    $: setupComplete = selectedEntityType !== null;
    $: if (selectedEntityType && columns.length === 0) {
        initializeTable();
    }
    
    onMount(async () => {
        // Inizializza servizi
        attributeService = new AttributeSuggestionService();
        entityService = new EntitySearchService();
        
        // Setup WebSocket se abilitato
        if (enableRealtime) {
            setupWebSocket();
        }
        
        console.log('📊 SimpleTabularModule montato');
    });
    
    /**
     * Inizializza la tabella con la prima colonna (tipo entità)
     */
    function initializeTable() {
        if (!selectedEntityType) return;
        
        // Prima colonna = tipo di entità selezionato
        columns = [selectedEntityType];
        rows = [];
        
        console.log(`📊 Tabella inizializzata per ${selectedEntityType}`);
    }
    
    /**
     * Gestisce selezione del tipo di entità
     */
    function handleEntityTypeSelect(event) {
        const newEntityType = event.detail.selectedItem || event.detail.value;
        selectedEntityType = newEntityType;
        
        console.log(`🎯 Tipo entità selezionato: ${selectedEntityType}`);
    }
    
    /**
     * Gestisce richiesta di creazione nuovo tipo entità
     */
    function handleEntityTypeCreateRequest(event) {
        const newTypeName = event.detail.queryText;
        
        // Aggiungi alla lista dei tipi disponibili
        if (!availableEntityTypes.includes(newTypeName)) {
            availableEntityTypes = [...availableEntityTypes, newTypeName];
        }
        
        // Seleziona il nuovo tipo
        selectedEntityType = newTypeName;
        
        console.log(`🆕 Nuovo tipo entità creato: ${newTypeName}`);
    }
    
    /**
     * Aggiunge una nuova colonna (attributo)
     */
    function startAddingColumn() {
        if (!allowAddColumns || !setupComplete) return;
        isAddingColumn = true;
    }
    
    /**
     * Conferma aggiunta nuova colonna
     */
    function confirmAddColumn(attributeName) {
        if (!attributeName || columns.includes(attributeName)) {
            isAddingColumn = false;
            return;
        }
        
        columns = [...columns, attributeName];
        isAddingColumn = false;
        
        // Aggiungi colonna vuota a tutte le righe esistenti
        rows = rows.map(row => ({
            ...row,
            attributes: {
                ...row.attributes,
                [attributeName]: ''
            }
        }));
        
        console.log(`➕ Colonna aggiunta: ${attributeName}`);
    }
    
    /**
     * Aggiunge una nuova riga
     */
    function addNewRow() {
        if (!allowAddRows || !setupComplete) return;
        
        const newRow = {
            id: `new_${Date.now()}`,
            entity: {
                id: null,
                entityType: selectedEntityType,
                name: ''
            },
            attributes: {},
            isNew: true,
            isDirty: false
        };
        
        // Inizializza attributi vuoti per tutte le colonne (esclusa la prima)
        columns.slice(1).forEach(columnName => {
            newRow.attributes[columnName] = '';
        });
        
        rows = [...rows, newRow];
        console.log('➕ Nuova riga aggiunta');
    }
    
    /**
     * Rimuove una riga
     */
    function removeRow(rowIndex) {
        rows = rows.filter((_, index) => index !== rowIndex);
        console.log(`🗑️ Riga rimossa: ${rowIndex}`);
    }
    
    /**
     * Rimuove una colonna
     */
    function removeColumn(columnName) {
        if (columnName === selectedEntityType) return; // Non rimuovere la prima colonna
        
        columns = columns.filter(col => col !== columnName);
        
        // Rimuovi attributo da tutte le righe
        rows = rows.map(row => {
            const newAttributes = { ...row.attributes };
            delete newAttributes[columnName];
            return {
                ...row,
                attributes: newAttributes
            };
        });
        
        console.log(`🗑️ Colonna rimossa: ${columnName}`);
    }
    
    /**
     * Aggiorna valore cella
     */
    function updateCellValue(rowIndex, columnName, newValue) {
        if (columnName === selectedEntityType) {
            // Prima colonna - nome entità
            rows[rowIndex].entity.name = newValue;
        } else {
            // Altre colonne - attributi
            rows[rowIndex].attributes[columnName] = newValue;
        }
        
        rows[rowIndex].isDirty = true;
        rows = [...rows]; // Trigger reactivity
    }
    
    /**
     * Ottiene valore cella
     */
    function getCellValue(row, columnName) {
        if (columnName === selectedEntityType) {
            return row.entity.name || '';
        } else {
            return row.attributes[columnName] || '';
        }
    }
    
    /**
     * Determina se un attributo è intrinseco o relazionale
     */
    function isIntrinsicAttribute(attributeName) {
        if (attributeName === selectedEntityType) return true; // Prima colonna è sempre entità
        
        const intrinsicAttrs = ['nome', 'name', 'cognome', 'surname', 'email', 'telefono', 'phone', 'numero', 'indirizzo', 'citta'];
        return intrinsicAttrs.includes(attributeName.toLowerCase());
    }
    
    /**
     * Setup WebSocket per real-time updates
     */
    function setupWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            websocket = new WebSocket(wsUrl);
            
            websocket.onopen = () => {
                console.log('🔌 WebSocket connesso');
            };
            
            websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📡 WebSocket message:', message);
                } catch (err) {
                    console.error('❌ Errore parsing WebSocket:', err);
                }
            };
            
            websocket.onclose = () => {
                console.log('🔌 WebSocket disconnesso');
                setTimeout(setupWebSocket, 3000);
            };
            
        } catch (err) {
            console.error('❌ Errore setup WebSocket:', err);
        }
    }
    
    /**
     * Crea searchFunction per tipi entità
     */
    function createEntityTypeSearchFunction() {
        return async (query) => {
            const filtered = availableEntityTypes.filter(type => 
                type.toLowerCase().includes(query.toLowerCase())
            );
            return filtered.map(type => ({ name: type, label: type, value: type }));
        };
    }
    
    /**
     * Crea searchFunction per attributi
     */
    function createAttributeSearchFunction() {
        return attributeService.createAttributeSearchFunction(selectedEntityType, moduleId);
    }
    
    /**
     * Gestisce selezione attributo dall'autocomplete
     */
    function handleAttributeSelect(event) {
        const selectedAttribute = event.detail.selectedItem;
        const attributeName = selectedAttribute.name || selectedAttribute;
        confirmAddColumn(attributeName);
    }
    
    /**
     * Gestisce richiesta creazione nuovo attributo
     */
    function handleAttributeCreateRequest(event) {
        const queryText = event.detail.queryText;
        confirmAddColumn(queryText);
    }
</script>

<div class="simple-tabular-module">
    <!-- Header del modulo -->
    <div class="module-header">
        <div class="header-left">
            <h3 class="module-title">📊 {title}</h3>
            {#if setupComplete}
                <div class="module-meta">
                    <span class="entity-type">{selectedEntityType}</span>
                    <span class="stats">{rows.length} righe × {columns.length} colonne</span>
                </div>
            {/if}
        </div>
        
        <div class="header-actions">
            {#if setupComplete && allowAddColumns}
                <button class="btn btn-secondary" on:click={startAddingColumn}>
                    ➕ Colonna
                </button>
            {/if}
            {#if setupComplete && allowAddRows}
                <button class="btn btn-primary" on:click={addNewRow}>
                    ➕ Riga
                </button>
            {/if}
        </div>
    </div>
    
    <!-- Entity Type Selector -->
    {#if !setupComplete}
        <div class="entity-type-selector">
            <div class="selector-content">
                <h4>🎯 Seleziona Tipo di Entità</h4>
                <p>Scegli che tipo di entità vuoi gestire in questa tabella.</p>
                
                <div class="selector-input">
                    <SmartInput
                        placeholder="Cerca o crea tipo entità (es. Persona, Azienda)..."
                        searchFunction={createEntityTypeSearchFunction()}
                        labelFunction={(item) => typeof item === 'string' ? item : item.name}
                        valueFunction={(item) => typeof item === 'string' ? item : item.value}
                        allowCreateFunction={(query) => query && query.length >= 2}
                        createLabelFunction={(query) => `➕ Crea nuovo tipo: "${query}"`}
                        on:select={handleEntityTypeSelect}
                        on:createRequest={handleEntityTypeCreateRequest}
                    />
                </div>
                
                <div class="suggestions">
                    {#each availableEntityTypes.slice(0, 4) as type}
                        <button class="suggestion-chip" on:click={() => handleEntityTypeSelect({detail: {selectedItem: type}})}>
                            {type}
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Tabella Semplice -->
    {#if setupComplete}
        <div class="table-container">
            <table class="simple-table">
                <thead>
                    <tr>
                        <!-- Headers delle colonne -->
                        {#each columns as column, i}
                            <th class="column-header" class:entity-column={i === 0} class:intrinsic={isIntrinsicAttribute(column)} class:relational={!isIntrinsicAttribute(column)}>
                                <div class="header-content">
                                    <span class="column-name">{column}</span>
                                    {#if i > 0 && allowEdit}
                                        <button class="btn-remove" on:click={() => removeColumn(column)}>✕</button>
                                    {/if}
                                </div>
                            </th>
                        {/each}
                        
                        <!-- Colonna per aggiungere attributo -->
                        {#if isAddingColumn}
                            <th class="adding-column">
                                <SmartInput
                                    placeholder="Nome attributo..."
                                    searchFunction={createAttributeSearchFunction()}
                                    labelFunction={AttributeSuggestionService.formatAttributeLabel}
                                    valueFunction={AttributeSuggestionService.extractAttributeValue}
                                    allowCreateFunction={AttributeSuggestionService.shouldAllowCreateAttribute}
                                    createLabelFunction={AttributeSuggestionService.getCreateAttributeLabel}
                                    on:select={handleAttributeSelect}
                                    on:createRequest={handleAttributeCreateRequest}
                                />
                            </th>
                        {:else if allowAddColumns}
                            <th class="add-column">
                                <button class="btn-add-column" on:click={startAddingColumn}>
                                    ➕
                                </button>
                            </th>
                        {/if}
                        
                        <th class="actions-column">Azioni</th>
                    </tr>
                </thead>
                
                <tbody>
                    {#each rows as row, rowIndex (row.id)}
                        <tr class="data-row" class:new-row={row.isNew} class:dirty-row={row.isDirty}>
                            <!-- Celle per ogni colonna -->
                            {#each columns as column, colIndex}
                                <td class="data-cell" class:entity-cell={colIndex === 0}>
                                    <input
                                        type="text"
                                        class="cell-input"
                                        value={getCellValue(row, column)}
                                        placeholder={colIndex === 0 ? `Nome ${selectedEntityType}` : column}
                                        on:input={(e) => updateCellValue(rowIndex, column, e.target.value)}
                                    />
                                </td>
                            {/each}
                            
                            <!-- Cella vuota per colonna in aggiunta -->
                            {#if isAddingColumn || allowAddColumns}
                                <td class="empty-cell"></td>
                            {/if}
                            
                            <!-- Azioni -->
                            <td class="actions-cell">
                                <button class="btn-action delete" on:click={() => removeRow(rowIndex)}>
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    {/each}
                    
                    <!-- Riga vuota se nessun dato -->
                    {#if rows.length === 0}
                        <tr class="empty-row">
                            <td colspan={columns.length + 2} class="empty-message">
                                <div class="empty-content">
                                    <div class="empty-icon">📋</div>
                                    <h4>Tabella {selectedEntityType} vuota</h4>
                                    <p>Aggiungi il primo {selectedEntityType} per iniziare</p>
                                    <button class="btn btn-primary" on:click={addNewRow}>
                                        ➕ Primo {selectedEntityType}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .simple-tabular-module {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .module-header {
        background: #f8f9fa;
        padding: 20px;
        border-bottom: 1px solid #e1e5e9;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 15px;
    }
    
    .header-left {
        flex: 1;
    }
    
    .module-title {
        margin: 0 0 8px 0;
        color: #2c3e50;
        font-size: 1.4em;
        font-weight: 600;
    }
    
    .module-meta {
        display: flex;
        gap: 15px;
        font-size: 0.9em;
        color: #666;
    }
    
    .entity-type {
        background: #e8f4fd;
        color: #0066cc;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 500;
    }
    
    .stats {
        background: #f1f3f4;
        padding: 3px 10px;
        border-radius: 12px;
    }
    
    .header-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .btn {
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.9em;
        cursor: pointer;
        transition: all 0.3s;
        font-weight: 500;
    }
    
    .btn-primary {
        background: #27ae60;
        color: white;
    }
    
    .btn-primary:hover {
        background: #229954;
        transform: translateY(-1px);
    }
    
    .btn-secondary {
        background: #3498db;
        color: white;
    }
    
    .btn-secondary:hover {
        background: #2980b9;
        transform: translateY(-1px);
    }
    
    /* Entity Type Selector */
    .entity-type-selector {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 30px;
        text-align: center;
        color: white;
    }
    
    .selector-content {
        max-width: 600px;
        margin: 0 auto;
    }
    
    .selector-content h4 {
        font-size: 24px;
        margin-bottom: 12px;
        font-weight: 600;
    }
    
    .selector-content p {
        font-size: 16px;
        opacity: 0.9;
        margin-bottom: 30px;
        line-height: 1.5;
    }
    
    .selector-input {
        margin-bottom: 25px;
    }
    
    .suggestions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .suggestion-chip {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .suggestion-chip:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-2px);
    }
    
    /* Tabella */
    .table-container {
        overflow-x: auto;
    }
    
    .simple-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;
    }
    
    th, td {
        border-bottom: 1px solid #ecf0f1;
        vertical-align: middle;
        text-align: left;
    }
    
    th {
        background: #34495e;
        color: white;
        font-weight: 600;
        position: sticky;
        top: 0;
        z-index: 10;
        padding: 12px;
    }
    
    .column-header.entity-column {
        background: #2c3e50;
        min-width: 200px;
    }
    
    .column-header.intrinsic {
        background: #3498db;
    }
    
    .column-header.relational {
        background: #9b59b6;
    }
    
    .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    
    .column-name {
        flex: 1;
    }
    
    .btn-remove {
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
    }
    
    .btn-remove:hover {
        background: rgba(255,255,255,0.4);
    }
    
    .adding-column {
        background: #27ae60;
        min-width: 200px;
    }
    
    .add-column {
        background: #95a5a6;
        text-align: center;
        width: 50px;
    }
    
    .btn-add-column {
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
    }
    
    .btn-add-column:hover {
        background: rgba(255,255,255,0.4);
    }
    
    .actions-column {
        background: #e74c3c;
        width: 80px;
        text-align: center;
    }
    
    .data-cell {
        padding: 8px 12px;
    }
    
    .data-cell.entity-cell {
        background: #f8f9fa;
        font-weight: 500;
    }
    
    .cell-input {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.9em;
        background: transparent;
    }
    
    .cell-input:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    .data-row.new-row {
        background: #fff3cd;
    }
    
    .data-row.dirty-row {
        background: #f8f9fa;
    }
    
    .data-row:hover {
        background: #f1f3f4;
    }
    
    .empty-cell {
        background: #f8f9fa;
        padding: 12px;
    }
    
    .actions-cell {
        text-align: center;
        padding: 8px;
    }
    
    .btn-action {
        background: none;
        border: none;
        font-size: 1.1em;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.3s;
    }
    
    .btn-action:hover {
        background: rgba(0,0,0,0.1);
    }
    
    .empty-row {
        text-align: center;
    }
    
    .empty-content {
        padding: 60px 20px;
        color: #666;
        text-align: center;
    }
    
    .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.7;
    }
    
    .empty-content h4 {
        font-size: 20px;
        margin-bottom: 8px;
        color: #495057;
    }
    
    .empty-content p {
        margin-bottom: 24px;
        font-size: 16px;
        opacity: 0.8;
    }
</style>