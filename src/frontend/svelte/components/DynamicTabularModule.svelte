<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import SmartInput from './SmartInput.svelte';
    import AttributeSuggestionService from '../services/AttributeSuggestionService.js';
    import EntitySearchService from '../services/EntitySearchService.js';
    
    const dispatch = createEventDispatcher();
    
    // Props del componente
    export let moduleId = null; // ID del ModuleInstance
    export let entityTypeContext = null; // Tipo di entità - ORA OPZIONALE, deve essere selezionato
    export let projectId = null; // ID progetto (per contesto)
    export let title = 'Modulo Tabellare Dinamico';
    export let allowAddRows = true;
    export let allowAddColumns = true;
    export let allowEdit = true;
    export let enableRealtime = true;
    
    // Servizi
    let attributeService = null;
    let entityService = null;
    
    // Stato del componente
    let selectedEntityType = entityTypeContext; // Tipo di entità selezionato dall'utente
    let availableEntityTypes = ['Persona', 'Contact', 'Lead', 'Azienda', 'Progetto']; // Lista tipi disponibili
    let rows = []; // Array di righe con entità e attributi
    let columns = []; // Array di definizioni colonne
    let isLoading = false;
    let error = null;
    let websocket = null;
    let isAddingColumn = false;
    let setupComplete = false; // Indica se il setup iniziale è completo
    
    // Reactive statements
    $: setupComplete = selectedEntityType !== null;
    $: if (moduleId && selectedEntityType) {
        loadModuleData();
    }
    $: if (selectedEntityType) {
        console.log(`🎯 Entity type selezionato: ${selectedEntityType}`);
        // Reset colonne quando cambia il tipo di entità
        if (columns.length === 0) {
            initializeDefaultColumns();
        }
    }
    
    onMount(async () => {
        // Inizializza servizi
        attributeService = new AttributeSuggestionService();
        entityService = new EntitySearchService();
        
        // Setup WebSocket se abilitato
        if (enableRealtime) {
            setupWebSocket();
        }
        
        // Se entityTypeContext è già impostato, considera il setup completo
        if (entityTypeContext) {
            selectedEntityType = entityTypeContext;
            setupComplete = true;
        }
        
        // Carica dati se moduleId è già disponibile e setup completo
        if (moduleId && setupComplete) {
            await loadModuleData();
        }
        
        console.log('🎯 DynamicTabularModule montato', { 
            moduleId, 
            selectedEntityType, 
            projectId,
            setupComplete
        });
    });
    
    /**
     * Carica dati del modulo dal backend
     */
    async function loadModuleData() {
        if (!moduleId) return;
        
        isLoading = true;
        error = null;
        
        try {
            console.log(`📊 Caricamento dati modulo: ${moduleId}`);
            
            // Carica membri del modulo
            const response = await fetch(`/api/modules/${moduleId}/members`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Errore caricamento membri modulo');
            }
            
            const members = result.data || [];
            
            // Estrai colonne (attributi) dai membri esistenti
            const attributeSet = new Set();
            
            members.forEach(member => {
                // Attributi intrinseci dell'entità
                if (member.entity) {
                    Object.keys(member.entity).forEach(key => {
                        if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(key)) {
                            attributeSet.add(key);
                        }
                    });
                }
                
                // Attributi relazionali
                if (member.relationAttributes) {
                    Object.keys(member.relationAttributes).forEach(key => {
                        if (!['id', 'addedAt', 'lastModified'].includes(key)) {
                            attributeSet.add(key);
                        }
                    });
                }
            });
            
            // Costruisci struttura colonne
            columns = Array.from(attributeSet).map(attrName => ({
                name: attrName,
                type: 'string', // Tipo inferito, migliorabile
                source: 'auto', // Sarà determinato dinamicamente
                editable: true
            }));
            
            // Costruisci struttura righe
            rows = members.map(member => ({
                id: member.entity.id,
                entity: member.entity,
                relationAttributes: member.relationAttributes || {},
                isNew: false,
                isDirty: false
            }));
            
            console.log(`✅ Dati modulo caricati: ${rows.length} righe, ${columns.length} colonne`);
            
        } catch (err) {
            console.error('❌ Errore caricamento dati modulo:', err);
            error = err.message;
        } finally {
            isLoading = false;
        }
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
                console.log('🔌 WebSocket connesso per DynamicTabularModule');
            };
            
            websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (err) {
                    console.error('❌ Errore parsing WebSocket message:', err);
                }
            };
            
            websocket.onclose = () => {
                console.log('🔌 WebSocket disconnesso');
                // Riconnetti dopo 3 secondi
                setTimeout(setupWebSocket, 3000);
            };
            
        } catch (err) {
            console.error('❌ Errore setup WebSocket:', err);
        }
    }
    
    /**
     * Gestisce messaggi WebSocket
     */
    function handleWebSocketMessage(message) {
        if (message.type === 'change') {
            // Aggiorna entità modificata
            const row = rows.find(r => r.entity.id === message.entityId);
            if (row && row.entity) {
                row.entity[message.attributeName] = message.data?.newValue;
                rows = [...rows]; // Trigger reactivity
            }
        } else if (message.type === 'relation-change') {
            // Aggiorna attributi relazionali
            if (message.targetEntityId === moduleId) {
                loadModuleData(); // Ricarica per semplicità
            }
        }
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
                // Altri attributi saranno aggiunti dinamicamente
            },
            relationAttributes: {},
            isNew: true,
            isDirty: false
        };
        
        rows = [...rows, newRow];
        console.log('➕ Nuova riga aggiunta');
    }
    
    /**
     * Aggiunge una nuova colonna (attributo)
     */
    function startAddingColumn() {
        if (!allowAddColumns) return;
        isAddingColumn = true;
    }
    
    /**
     * Conferma aggiunta nuova colonna
     */
    async function confirmAddColumn(attributeName) {
        if (!attributeName || columns.some(col => col.name === attributeName)) {
            isAddingColumn = false;
            return;
        }
        
        const isIntrinsic = isIntrinsicAttribute(attributeName);
        
        const newColumn = {
            name: attributeName,
            type: 'string',
            source: isIntrinsic ? 'intrinsic' : 'relational',
            editable: true,
            isEntityColumn: false
        };
        
        columns = [...columns, newColumn];
        isAddingColumn = false;
        
        // Auto-popolamento: per ogni riga esistente, cerca il valore di questo attributo
        await populateColumnForExistingRows(attributeName, isIntrinsic);
        
        console.log(`➕ Nuova colonna aggiunta: ${attributeName} (${isIntrinsic ? 'intrinseca' : 'relazionale'})`);
    }
    
    /**
     * Rimuove una colonna
     */
    function removeColumn(columnName) {
        if (!allowEdit) return;
        
        columns = columns.filter(col => col.name !== columnName);
        console.log(`🗑️ Colonna rimossa: ${columnName}`);
    }
    
    /**
     * Salva una riga (entità + relazioni)
     */
    async function saveRow(row) {
        if (!allowEdit) return;
        
        try {
            console.log('💾 Salvando riga:', row);
            
            if (row.isNew) {
                // Crea nuova entità e aggiungila al modulo
                await createEntityAndAddToModule(row);
            } else {
                // Aggiorna entità esistente e attributi relazionali
                await updateEntityAndRelations(row);
            }
            
            row.isDirty = false;
            row.isNew = false;
            
        } catch (err) {
            console.error('❌ Errore salvataggio riga:', err);
            error = err.message;
        }
    }
    
    /**
     * Crea entità e la aggiunge al modulo
     */
    async function createEntityAndAddToModule(row) {
        // 1. Crea entità
        const entityData = { ...row.entity };
        delete entityData.id; // Rimuovi ID temporaneo
        
        const newEntity = await entityService.createEntity(entityTypeContext, entityData);
        
        // 2. Aggiorna row con ID reale
        row.entity = newEntity;
        row.id = newEntity.id;
        
        // 3. Aggiungi al modulo con attributi relazionali
        if (moduleId) {
            const response = await fetch(`/api/modules/${moduleId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: newEntity.id,
                    relationAttributes: row.relationAttributes
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Errore aggiunta al modulo');
            }
        }
    }
    
    /**
     * Aggiorna entità e relazioni esistenti
     */
    async function updateEntityAndRelations(row) {
        // 1. Aggiorna attributi intrinseci dell'entità
        for (const [attrName, value] of Object.entries(row.entity)) {
            if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(attrName)) {
                await fetch(`/api/entity/${row.entity.id}/attribute`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attributeName: attrName,
                        value: value
                    })
                });
            }
        }
        
        // 2. Aggiorna attributi relazionali
        if (moduleId && Object.keys(row.relationAttributes).length > 0) {
            await fetch(`/api/modules/${moduleId}/members/${row.entity.id}/attributes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributes: row.relationAttributes
                })
            });
        }
    }
    
    /**
     * Rimuove una riga
     */
    async function removeRow(row) {
        if (!allowEdit) return;
        
        try {
            if (!row.isNew && moduleId) {
                // Rimuovi dal modulo
                await fetch(`/api/modules/${moduleId}/members/${row.entity.id}`, {
                    method: 'DELETE'
                });
            }
            
            rows = rows.filter(r => r.id !== row.id);
            console.log(`🗑️ Riga rimossa: ${row.id}`);
            
        } catch (err) {
            console.error('❌ Errore rimozione riga:', err);
            error = err.message;
        }
    }
    
    /**
     * Gestisce selezione entità dall'autocomplete
     */
    function handleEntitySelect(row, event) {
        const selectedEntity = event.detail.selectedItem;
        row.entity = { ...selectedEntity };
        row.id = selectedEntity.id;
        row.isDirty = true;
        
        console.log('👤 Entità selezionata:', selectedEntity);
        rows = [...rows]; // Trigger reactivity
    }
    
    /**
     * Gestisce richiesta creazione nuova entità
     */
    function handleEntityCreateRequest(row, event) {
        const queryText = event.detail.queryText;
        
        // Prepara dati base per nuova entità
        const entityData = EntitySearchService.prepareEntityDataFromName(entityTypeContext, queryText);
        
        // Aggiorna la riga con i dati preparati
        row.entity = {
            ...row.entity,
            ...entityData
        };
        row.isDirty = true;
        
        console.log('🆕 Richiesta creazione entità:', queryText, entityData);
        rows = [...rows]; // Trigger reactivity
    }
    
    /**
     * Gestisce selezione attributo dall'autocomplete colonna
     */
    function handleAttributeSelect(event) {
        const selectedAttribute = event.detail.selectedItem;
        confirmAddColumn(selectedAttribute.name);
    }
    
    /**
     * Gestisce richiesta creazione nuovo attributo
     */
    function handleAttributeCreateRequest(event) {
        const queryText = event.detail.queryText;
        confirmAddColumn(queryText);
    }
    
    /**
     * Determina se un attributo è intrinseco o relazionale
     */
    function isIntrinsicAttribute(attributeName) {
        // Lista attributi che sono tipicamente intrinseci
        const intrinsicAttrs = ['nome', 'name', 'cognome', 'surname', 'email', 'telefono', 'phone', 'indirizzo', 'citta', 'ragioneSociale'];
        
        if (intrinsicAttrs.includes(attributeName)) return true;
        
        // Attributi che sono tipicamente relazionali
        const relationalAttrs = ['fee', 'role', 'ruolo', 'startDate', 'endDate', 'notes', 'status', 'priority'];
        
        if (relationalAttrs.includes(attributeName)) return false;
        
        // Default: attributi sconosciuti vanno nell'entità (intrinseci)
        return true;
    }
    
    /**
     * Aggiorna valore cella
     */
    function updateCellValue(row, columnName, newValue) {
        if (isIntrinsicAttribute(columnName)) {
            // Attributo intrinseco - va nell'entità
            row.entity[columnName] = newValue;
        } else {
            // Attributo relazionale - va negli attributi di relazione
            row.relationAttributes[columnName] = newValue;
        }
        
        row.isDirty = true;
        rows = [...rows]; // Trigger reactivity
    }
    
    /**
     * Ottiene valore cella
     */
    function getCellValue(row, columnName) {
        if (isIntrinsicAttribute(columnName)) {
            return row.entity[columnName] || '';
        } else {
            return row.relationAttributes[columnName] || '';
        }
    }
    
    /**
     * Crea searchFunction per entità
     */
    function createEntitySearchFunction() {
        if (!selectedEntityType) return null;
        return entityService.createEntitySearchFunction(selectedEntityType, { limit: 10 });
    }
    
    /**
     * Auto-popola una colonna per le righe esistenti
     */
    async function populateColumnForExistingRows(attributeName, isIntrinsic) {
        if (rows.length === 0) return;
        
        console.log(`🔄 Auto-popolamento colonna ${attributeName} per ${rows.length} righe`);
        
        for (const row of rows) {
            if (isIntrinsic && row.entity && row.entity[attributeName]) {
                // Attributo intrinseco già presente nell'entità
                continue;
            } else if (!isIntrinsic && row.relationAttributes && row.relationAttributes[attributeName]) {
                // Attributo relazionale già presente
                continue;
            } else {
                // Valore mancante - inizializza vuoto
                if (isIntrinsic) {
                    if (!row.entity) row.entity = {};
                    row.entity[attributeName] = '';
                } else {
                    if (!row.relationAttributes) row.relationAttributes = {};
                    row.relationAttributes[attributeName] = '';
                }
            }
        }
        
        // Trigger reactivity
        rows = [...rows];
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
</script>

<div class="dynamic-tabular-module">
    <!-- Header del modulo -->
    <div class="module-header">
        <div class="header-left">
            <h3 class="module-title">
                📊 {title}
                {#if moduleId}
                    <span class="module-id">({moduleId.substring(0, 8)}...)</span>
                {/if}
            </h3>
            {#if setupComplete}
                <div class="module-meta">
                    <span class="entity-type">{selectedEntityType}</span>
                    <span class="row-count">{rows.length} righe</span>
                    <span class="col-count">{columns.length} colonne</span>
                </div>
            {/if}
        </div>
        
        <div class="header-actions">
            {#if setupComplete && allowAddRows}
                <button class="btn btn-primary" on:click={addNewRow}>
                    ➕ Riga
                </button>
            {/if}
            
            {#if setupComplete && allowAddColumns}
                <button class="btn btn-secondary" on:click={startAddingColumn}>
                    ➕ Colonna
                </button>
            {/if}
            
            {#if setupComplete}
                <button class="btn btn-refresh" on:click={loadModuleData}>
                    🔄 Ricarica
                </button>
            {/if}
        </div>
    </div>
    
    <!-- Entity Type Selector (FASE 1: Setup Obbligatorio) -->
    {#if !setupComplete}
        <div class="entity-type-selector">
            <div class="selector-content">
                <div class="selector-header">
                    <h4>🎯 Seleziona Tipo di Entità</h4>
                    <p>Prima di iniziare, scegli che tipo di entità vuoi gestire in questa tabella.</p>
                </div>
                
                <div class="selector-input">
                    <SmartInput
                        placeholder="Cerca o crea tipo entità (es. Persona, Azienda, Progetto)..."
                        searchFunction={createEntityTypeSearchFunction()}
                        labelFunction={(item) => typeof item === 'string' ? item : item.name}
                        valueFunction={(item) => typeof item === 'string' ? item : item.value}
                        allowCreateFunction={(query) => query && query.length >= 2}
                        createLabelFunction={(query) => `➕ Crea nuovo tipo: "${query}"`}
                        on:select={handleEntityTypeSelect}
                        on:createRequest={handleEntityTypeCreateRequest}
                    />
                </div>
                
                <div class="selector-suggestions">
                    <strong>Suggerimenti:</strong>
                    {#each availableEntityTypes.slice(0, 4) as type}
                        <button class="suggestion-chip" on:click={() => handleEntityTypeSelect({detail: {selectedItem: type}})}>
                            {type}
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Messaggi di stato -->
    {#if error}
        <div class="error-message">
            ❌ {error}
        </div>
    {/if}
    
    {#if isLoading}
        <div class="loading-message">
            ⏳ Caricamento dati modulo...
        </div>
    {:else if setupComplete}
        <!-- FASE 2: Tabella Dinamica (Layout Orizzontale) -->
        <div class="table-container">
            <table class="dynamic-table">
                <thead>
                    <tr>
                        <!-- Prima colonna: sempre il tipo di entità selezionato -->
                        {#each columns as column}
                            <th class="attribute-column" 
                                class:entity-base={column.isEntityColumn}
                                class:intrinsic={column.source === 'intrinsic'} 
                                class:relational={column.source === 'relational'}>
                                <div class="column-header">
                                    <span class="column-name">{column.name}</span>
                                    <span class="column-type">
                                        {#if column.isEntityColumn}
                                            <span class="type-badge entity">BASE</span>
                                        {:else if column.source === 'intrinsic'}
                                            <span class="type-badge intrinsic">I</span>
                                        {:else}
                                            <span class="type-badge relational">R</span>
                                        {/if}
                                    </span>
                                    {#if allowEdit && !column.isEntityColumn}
                                        <button class="btn-remove-column" on:click={() => removeColumn(column.name)}>
                                            ✕
                                        </button>
                                    {/if}
                                </div>
                            </th>
                        {/each}
                        
                        <!-- Colonna per aggiunta nuova colonna -->
                        {#if isAddingColumn}
                            <th class="new-column">
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
                            <th class="add-column-header">
                                <button class="btn-add-column" on:click={startAddingColumn}>
                                    ➕ Attributo
                                </button>
                            </th>
                        {/if}
                        
                        <th class="actions-column">Azioni</th>
                    </tr>
                </thead>
                
                <tbody>
                    {#each rows as row, i (row.id)}
                        <tr class="data-row" class:new-row={row.isNew} class:dirty-row={row.isDirty}>
                            <!-- Colonne secondo layout orizzontale -->
                            {#each columns as column}
                                <td class="attribute-cell" 
                                    class:entity-base={column.isEntityColumn}
                                    class:intrinsic={column.source === 'intrinsic'} 
                                    class:relational={column.source === 'relational'}>
                                    
                                    {#if column.isEntityColumn}
                                        <!-- Prima colonna: selezione entità del tipo selezionato -->
                                        <SmartInput
                                            value={EntitySearchService.formatEntityLabel(row.entity)}
                                            placeholder={`Seleziona ${selectedEntityType}...`}
                                            searchFunction={createEntitySearchFunction()}
                                            labelFunction={EntitySearchService.formatEntityLabel}
                                            valueFunction={EntitySearchService.extractEntityDisplayName}
                                            allowCreateFunction={EntitySearchService.shouldAllowCreateEntity}
                                            createLabelFunction={(query) => EntitySearchService.getCreateEntityLabel(query, selectedEntityType)}
                                            on:select={(e) => handleEntitySelect(row, e)}
                                            on:createRequest={(e) => handleEntityCreateRequest(row, e)}
                                        />
                                    {:else}
                                        <!-- Colonne attributi -->
                                        <SmartInput
                                            value={getCellValue(row, column.name)}
                                            placeholder={`${column.name}...`}
                                            inputType={column.type === 'date' ? 'date' : column.type === 'currency' ? 'currency' : 'text'}
                                            on:change={(e) => updateCellValue(row, column.name, e.detail.value)}
                                        />
                                    {/if}
                                </td>
                            {/each}
                            
                            <!-- Spazio per nuova colonna -->
                            {#if isAddingColumn}
                                <td class="empty-cell"></td>
                            {:else if allowAddColumns}
                                <td class="empty-cell"></td>
                            {/if}
                            
                            <!-- Azioni -->
                            <td class="actions-cell">
                                <div class="row-actions">
                                    {#if allowEdit}
                                        <button class="btn-action save" on:click={() => saveRow(row)} disabled={!row.isDirty}>
                                            💾
                                        </button>
                                        <button class="btn-action delete" on:click={() => removeRow(row)}>
                                            🗑️
                                        </button>
                                    {/if}
                                </div>
                            </td>
                        </tr>
                    {/each}
                    
                    <!-- Riga per aggiungere nuova entità -->
                    {#if allowAddRows}
                        <tr class="add-row">
                            <td class="add-entity-cell" colspan={columns.length + (isAddingColumn || allowAddColumns ? 1 : 0) + 1}>
                                <button class="btn-add-row" on:click={addNewRow}>
                                    ➕ Aggiungi nuovo {selectedEntityType}
                                </button>
                            </td>
                        </tr>
                    {/if}
                    
                    <!-- Riga vuota se nessun dato -->
                    {#if rows.length === 0}
                        <tr class="empty-row">
                            <td colspan={columns.length + (isAddingColumn || allowAddColumns ? 1 : 0) + 1} class="empty-message">
                                <div class="empty-content">
                                    <div class="empty-icon">📋</div>
                                    <h4>Tabella {selectedEntityType} vuota</h4>
                                    <p>Inizia aggiungendo il primo {selectedEntityType} alla tabella</p>
                                    {#if allowAddRows}
                                        <button class="btn btn-primary" on:click={addNewRow}>
                                            ➕ Aggiungi primo {selectedEntityType}
                                        </button>
                                    {/if}
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
    .dynamic-tabular-module {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    /* Entity Type Selector Styles */
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
    
    .selector-header h4 {
        font-size: 24px;
        margin-bottom: 12px;
        font-weight: 600;
    }
    
    .selector-header p {
        font-size: 16px;
        opacity: 0.9;
        margin-bottom: 30px;
        line-height: 1.5;
    }
    
    .selector-input {
        margin-bottom: 25px;
    }
    
    .selector-suggestions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        opacity: 0.9;
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
        backdrop-filter: blur(10px);
    }
    
    .suggestion-chip:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
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
    
    .module-id {
        font-size: 0.7em;
        color: #666;
        font-weight: normal;
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
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
    }
    
    .row-count, .col-count {
        background: #f1f3f4;
        padding: 2px 8px;
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
    
    .btn-refresh {
        background: #ecf0f1;
        color: #34495e;
        border: 1px solid #bdc3c7;
    }
    
    .btn-refresh:hover {
        background: #d5dbdb;
    }
    
    .error-message, .loading-message {
        padding: 15px 20px;
        text-align: center;
        font-weight: 500;
    }
    
    .error-message {
        background: #f8d7da;
        color: #721c24;
        border-bottom: 1px solid #f5c6cb;
    }
    
    .loading-message {
        background: #d1ecf1;
        color: #0c5460;
        border-bottom: 1px solid #bee5eb;
    }
    
    .table-container {
        overflow-x: auto;
        max-height: 600px;
        overflow-y: auto;
    }
    
    .dynamic-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;
    }
    
    th, td {
        padding: 12px;
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
    }
    
    .entity-column {
        min-width: 200px;
        background: #2c3e50;
    }
    
    .attribute-column {
        min-width: 150px;
    }
    
    .attribute-column.entity-base {
        background: #2c3e50;
        min-width: 200px;
    }
    
    .attribute-column.intrinsic {
        background: #3d6db7;
    }
    
    .attribute-column.relational {
        background: #8e44ad;
    }
    
    .new-column {
        min-width: 200px;
        background: #27ae60;
    }
    
    .actions-column {
        width: 100px;
        background: #e74c3c;
    }
    
    .column-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .column-name {
        flex: 1;
    }
    
    .column-type {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .type-badge {
        background: rgba(255,255,255,0.2);
        color: white;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 0.8em;
        font-weight: bold;
        border: 1px solid rgba(255,255,255,0.3);
    }
    
    .type-badge.entity {
        background: rgba(52, 152, 219, 0.3);
        border-color: rgba(52, 152, 219, 0.5);
    }
    
    .type-badge.intrinsic {
        background: rgba(61, 109, 183, 0.3);
        border-color: rgba(61, 109, 183, 0.5);
    }
    
    .type-badge.relational {
        background: rgba(142, 68, 173, 0.3);
        border-color: rgba(142, 68, 173, 0.5);
    }
    
    .btn-remove-column {
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
    }
    
    .btn-remove-column:hover {
        background: rgba(255,255,255,0.3);
    }
    
    .data-row {
        transition: background-color 0.3s;
    }
    
    .data-row:hover {
        background: #f8f9fa;
    }
    
    .data-row.new-row {
        background: #e8f5e8;
    }
    
    .data-row.dirty-row {
        background: #fff3cd;
    }
    
    .entity-cell {
        font-weight: 500;
    }
    
    .attribute-cell.entity-base {
        border-left: 3px solid #2c3e50;
        font-weight: 500;
        background: #f8f9fa;
    }
    
    .attribute-cell.intrinsic {
        border-left: 3px solid #3d6db7;
    }
    
    .attribute-cell.relational {
        border-left: 3px solid #8e44ad;
    }
    
    .empty-cell {
        background: #f8f9fa;
    }
    
    .actions-cell {
        text-align: center;
    }
    
    .row-actions {
        display: flex;
        gap: 5px;
        justify-content: center;
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
    
    .btn-action:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .empty-row {
        text-align: center;
    }
    
    .empty-content {
        padding: 40px 20px;
        color: #666;
    }
    
    .add-column-header {
        background: #f8f9fa;
        text-align: center;
        padding: 8px;
        border-bottom: 1px solid #e1e5e9;
    }
    
    .btn-add-column {
        background: #27ae60;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .btn-add-column:hover {
        background: #229954;
        transform: translateY(-1px);
    }
    
    .add-row {
        background: #f8fff9;
    }
    
    .add-entity-cell {
        text-align: center;
        padding: 15px;
    }
    
    .btn-add-row {
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.95em;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
    }
    
    .btn-add-row:hover {
        background: #218838;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
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