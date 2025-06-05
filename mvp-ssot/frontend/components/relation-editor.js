/**
 * <relation-editor> Web Component
 * Fase 3: Relazioni, Sub-moduli e Riutilizzo Avanzato
 * 
 * Editor per creare e modificare relazioni tipizzate.
 * Supporta:
 * - Ricerca e selezione entità target
 * - Selezione tipo di relazione
 * - Editing attributi della relazione
 * - Validazione schema-aware
 * - Modalità creazione e editing
 */
class RelationEditorComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Modalità: 'create' o 'edit'
        this.mode = 'create';
        
        // Proprietà configurabili
        this.sourceEntityId = null;
        this.relationId = null; // Per modalità edit
        this.allowedRelationTypes = []; // Se vuoto, mostra tutti
        this.targetEntityTypes = []; // Limita i tipi di entità target
        this.showAdvanced = false; // Mostra opzioni avanzate
        
        // Stato interno
        this.relation = null;
        this.sourceEntity = null;
        this.targetEntity = null;
        this.availableRelationTypes = [];
        this.searchResults = [];
        this.isLoading = false;
        this.error = null;
        
        // Form data
        this.formData = {
            relationType: '',
            targetEntityId: '',
            attributes: {}
        };
        
        // Servizi
        this.relationService = window.RelationService;
        this.entityService = window.EntityService;
        this.schemaService = window.SchemaService;
        
        console.log('✏️ RelationEditorComponent creato');
    }

    static get observedAttributes() {
        return [
            'mode',
            'source-entity-id',
            'relation-id',
            'allowed-relation-types',
            'target-entity-types',
            'show-advanced'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'mode':
                this.mode = newValue || 'create';
                break;
            case 'source-entity-id':
                this.sourceEntityId = newValue;
                break;
            case 'relation-id':
                this.relationId = newValue;
                if (this.relationId) {
                    this.mode = 'edit';
                }
                break;
            case 'allowed-relation-types':
                this.allowedRelationTypes = newValue ? newValue.split(',').map(t => t.trim()) : [];
                break;
            case 'target-entity-types':
                this.targetEntityTypes = newValue ? newValue.split(',').map(t => t.trim()) : [];
                break;
            case 'show-advanced':
                this.showAdvanced = newValue === 'true';
                break;
        }
        
        this.initialize();
    }

    connectedCallback() {
        this.initialize();
    }

    /**
     * Inizializza il componente
     */
    async initialize() {
        if (!this.sourceEntityId && this.mode === 'create') {
            console.warn('RelationEditor: source-entity-id richiesto per modalità create');
            return;
        }
        
        if (!this.relationId && this.mode === 'edit') {
            console.warn('RelationEditor: relation-id richiesto per modalità edit');
            return;
        }
        
        this.render();
        
        try {
            // Carica dati necessari
            await this.loadInitialData();
            this.render();
        } catch (error) {
            console.error('❌ RelationEditor: Errore inizializzazione:', error);
            this.error = error.message;
            this.render();
        }
    }

    /**
     * Carica i dati iniziali necessari
     */
    async loadInitialData() {
        this.isLoading = true;
        
        try {
            // Carica sempre l'entità sorgente
            if (this.sourceEntityId) {
                this.sourceEntity = await this.entityService.getEntity(this.sourceEntityId);
            }
            
            // Se in modalità edit, carica la relazione esistente
            if (this.mode === 'edit' && this.relationId) {
                await this.loadExistingRelation();
            }
            
            // Carica tipi di relazione disponibili
            await this.loadRelationTypes();
            
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Carica una relazione esistente per l'editing
     */
    async loadExistingRelation() {
        this.relation = await this.relationService.getRelation(this.relationId);
        
        // Popola il form con i dati esistenti
        this.formData.relationType = this.relation.relationType;
        this.formData.targetEntityId = this.relation.targetEntityId;
        this.formData.attributes = { ...this.relation.attributes };
        
        // Carica l'entità target
        this.targetEntity = await this.entityService.getEntity(this.relation.targetEntityId);
        
        console.log('✅ RelationEditor: Relazione caricata per editing:', this.relation);
    }

    /**
     * Carica i tipi di relazione disponibili
     */
    async loadRelationTypes() {
        try {
            // Per ora usiamo tipi predefiniti, ma potrebbe venire da API schema
            const defaultTypes = [
                'Correlato',
                'Conosce',
                'HaCliente',
                'Lavora_Per',
                'Appartiene_A',
                'Ha_Padre',
                'Ha_Figlio',
                'È_Sposato_Con',
                'È_Amico_Di',
                'Ha_Task',
                'Dipende_Da'
            ];
            
            this.availableRelationTypes = this.allowedRelationTypes.length > 0 
                ? this.allowedRelationTypes 
                : defaultTypes;
                
        } catch (error) {
            console.error('❌ Errore caricamento tipi relazione:', error);
            this.availableRelationTypes = ['Correlato']; // Fallback
        }
    }

    /**
     * Ricerca entità per auto-completamento con opzione "Aggiungi nuova"
     */
    async searchEntities(query) {
        if (!query || query.length < 1) { // Riduciamo a 1 carattere per essere più reattivi
            this.searchResults = [];
            this.updateSearchResults();
            return;
        }
        
        try {
            // Recupera tutte le entità e filtra localmente
            const allEntityTypes = this.targetEntityTypes.length > 0 
                ? this.targetEntityTypes 
                : ['Contact', 'Persona', 'Cliente']; // Default types
            
            let allResults = [];
            
            for (const entityType of allEntityTypes) {
                try {
                    const entities = await this.entityService.getEntities(entityType);
                    const typedEntities = entities.map(e => ({ 
                        ...e, 
                        entityType: e.entityType || entityType,
                        _isExisting: true 
                    }));
                    allResults = allResults.concat(typedEntities);
                } catch (error) {
                    // Ignora errori per tipi che non esistono
                    console.log(`Tipo entità ${entityType} non trovato, continuo...`);
                }
            }
            
            // Filtra i risultati in base alla query
            const matchingResults = allResults.filter(entity => {
                const searchText = query.toLowerCase();
                const name = (entity.nome || entity.name || entity.title || '').toLowerCase();
                const surname = (entity.cognome || entity.surname || '').toLowerCase();
                const email = (entity.email || '').toLowerCase();
                
                return name.includes(searchText) || 
                       surname.includes(searchText) || 
                       email.includes(searchText) ||
                       entity.id.toLowerCase().includes(searchText);
            }).slice(0, 8); // Limita a 8 risultati per lasciare spazio alle opzioni di creazione
            
            // Aggiungi opzioni "Crea nuova entità" per ogni tipo
            const createOptions = allEntityTypes.map(entityType => ({
                id: `__create_${entityType}`,
                entityType: entityType,
                _isCreateOption: true,
                _displayName: `➕ Crea nuova entità "${query}" (${entityType})`,
                _suggestedName: query
            }));
            
            this.searchResults = [...matchingResults, ...createOptions];
            console.log('searchResults before updateSearchResults in searchEntities:', JSON.stringify(this.searchResults)); // Diagnostic log
            this.updateSearchResults();
            
        } catch (error) {
            console.error('❌ Errore ricerca entità:', error);
            this.searchResults = [];
        }
    }

    /**
     * Aggiorna solo i risultati di ricerca senza re-render completo
     */
    updateSearchResults() {
        const searchContainer = this.shadowRoot.querySelector('.search-container');
        if (!searchContainer) {
            console.warn('⚠️ Search container non trovato');
            return;
        }
        
        // Salva il valore corrente dell'input per ripristinarlo se necessario
        const searchInput = searchContainer.querySelector('[data-field="search"]');
        const currentSearchValue = searchInput ? searchInput.value : '';
        
        let existingResults = searchContainer.querySelector('.search-results');
        
        if (this.searchResults.length > 0) {
            const resultsHtml = `
                <div class="search-results">
                    ${this.searchResults.map(entity => {
                        if (entity._isCreateOption) {
                            return `
                                <div class="search-result create-option" data-entity-id="${entity.id}" data-entity-type="${entity.entityType}">
                                    <div class="entity-name create-name">${entity._displayName}</div>
                                    <div class="entity-type">Crea nuovo</div>
                                </div>
                            `;
                        } else {
                            const displayName = entity.nome || entity.name || entity.title || entity.id;
                            const surname = entity.cognome || entity.surname || '';
                            const fullName = surname ? `${displayName} ${surname}` : displayName;
                            
                            return `
                                <div class="search-result" data-entity-id="${entity.id}">
                                    <div class="entity-name">${fullName}</div>
                                    <div class="entity-type">${entity.entityType}</div>
                                    ${entity.email ? `<div class="entity-email">${entity.email}</div>` : ''}
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            `;
            
            if (existingResults) {
                existingResults.outerHTML = resultsHtml;
            } else {
                searchContainer.insertAdjacentHTML('beforeend', resultsHtml);
            }
            
            // Riattacca event listeners per i nuovi risultati
            this.attachSearchResultListeners();
            
            console.log(`🔍 Risultati aggiornati: ${this.searchResults.length} trovati`);
            
        } else {
            if (existingResults) {
                existingResults.remove();
                console.log('🔍 Risultati rimossi (nessun match)');
            }
        }
        
        // Ripristina il valore dell'input se è stato perso
        const newSearchInput = searchContainer.querySelector('[data-field="search"]');
        if (newSearchInput && newSearchInput.value !== currentSearchValue) {
            newSearchInput.value = currentSearchValue;
        }
    }

    /**
     * Attacca event listeners solo per i risultati di ricerca
     */
    attachSearchResultListeners() {
        this.shadowRoot.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', () => {
                const entityId = result.getAttribute('data-entity-id');
                
                if (entityId.startsWith('__create_')) {
                    // Opzione di creazione
                    const entityType = result.getAttribute('data-entity-type');
                    const suggestedName = this.shadowRoot.querySelector('[data-field="search"]').value;
                    this.showCreateEntityForm(entityType, suggestedName);
                } else {
                    // Entità esistente
                    const entity = this.searchResults.find(e => e.id === entityId);
                    if (entity) {
                        this.selectTargetEntity(entity);
                    }
                }
            });
        });
    }

    /**
     * Mostra il form per creare una nuova entità
     */
    showCreateEntityForm(entityType, suggestedName = '') {
        const createFormHtml = `
            <div class="create-entity-form">
                <div class="form-header">
                    <h4>➕ Crea nuova entità ${entityType}</h4>
                    <button type="button" class="close-create-btn">✖</button>
                </div>
                <div class="form-fields">
                    <div class="form-group">
                        <label for="new-entity-name">Nome *</label>
                        <input type="text" id="new-entity-name" name="newEntityName" 
                               value="${suggestedName}" placeholder="Nome dell'entità" required>
                    </div>
                    ${this.renderAdditionalFields(entityType)}
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary cancel-create-btn">Annulla</button>
                    <button type="button" class="btn btn-primary create-entity-btn" data-entity-type="${entityType}">
                        Crea ${entityType}
                    </button>
                </div>
            </div>
        `;
        
        // Sostituisci i risultati di ricerca con il form
        const searchContainer = this.shadowRoot.querySelector('.search-container');
        const existingResults = searchContainer.querySelector('.search-results');
        
        if (existingResults) {
            existingResults.outerHTML = createFormHtml;
        } else {
            searchContainer.insertAdjacentHTML('beforeend', createFormHtml);
        }
        
        // Attacca event listeners per il form di creazione
        this.attachCreateFormListeners();
        
        // Focus sul campo nome
        this.shadowRoot.querySelector('#new-entity-name').focus();
    }

    /**
     * Renderizza campi aggiuntivi basati sul tipo di entità
     */
    renderAdditionalFields(entityType) {
        const commonFields = {
            'Persona': `
                <div class="form-group">
                    <label for="new-entity-surname">Cognome</label>
                    <input type="text" id="new-entity-surname" name="cognome" placeholder="Cognome">
                </div>
                <div class="form-group">
                    <label for="new-entity-email">Email</label>
                    <input type="email" id="new-entity-email" name="email" placeholder="email@esempio.com">
                </div>
            `,
            'Contact': `
                <div class="form-group">
                    <label for="new-entity-surname">Cognome</label>
                    <input type="text" id="new-entity-surname" name="cognome" placeholder="Cognome">
                </div>
                <div class="form-group">
                    <label for="new-entity-email">Email</label>
                    <input type="email" id="new-entity-email" name="email" placeholder="email@esempio.com">
                </div>
                <div class="form-group">
                    <label for="new-entity-phone">Telefono</label>
                    <input type="tel" id="new-entity-phone" name="telefono" placeholder="+39 123 456 7890">
                </div>
            `,
            'Cliente': `
                <div class="form-group">
                    <label for="new-entity-company">Azienda</label>
                    <input type="text" id="new-entity-company" name="azienda" placeholder="Nome azienda">
                </div>
                <div class="form-group">
                    <label for="new-entity-email">Email</label>
                    <input type="email" id="new-entity-email" name="email" placeholder="email@esempio.com">
                </div>
            `
        };
        
        return commonFields[entityType] || '';
    }

    /**
     * Attacca event listeners per il form di creazione entità
     */
    attachCreateFormListeners() {
        // Annullamento
        this.shadowRoot.querySelectorAll('.close-create-btn, .cancel-create-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideCreateEntityForm();
            });
        });
        
        // Creazione entità
        this.shadowRoot.querySelector('.create-entity-btn')?.addEventListener('click', async (e) => {
            const entityType = e.target.getAttribute('data-entity-type');
            await this.createNewEntity(entityType);
        });
        
        // Enter per conferma
        this.shadowRoot.querySelectorAll('.create-entity-form input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const entityType = this.shadowRoot.querySelector('.create-entity-btn').getAttribute('data-entity-type');
                    this.createNewEntity(entityType);
                }
            });
        });
    }

    /**
     * Crea una nuova entità con i dati del form
     */
    async createNewEntity(entityType) {
        try {
            // Raccogli i dati dal form
            const formData = {};
            this.shadowRoot.querySelectorAll('.create-entity-form input').forEach(input => {
                const name = input.name || input.id.replace('new-entity-', '');
                if (input.value.trim()) {
                    formData[name] = input.value.trim();
                }
            });
            
            // Assicurati che ci sia almeno il nome
            if (!formData.newEntityName && !formData.nome) {
                throw new Error('Nome richiesto');
            }
            
            // Normalizza i dati
            const entityData = {
                nome: formData.newEntityName || formData.nome,
                entityType: entityType,
                ...formData
            };
            
            // Rimuovi il campo temporaneo
            delete entityData.newEntityName;
            
            console.log('🔄 Creazione nuova entità:', entityData);
            
            // Disabilita il button durante la creazione
            const createBtn = this.shadowRoot.querySelector('.create-entity-btn');
            createBtn.disabled = true;
            createBtn.textContent = 'Creando...';
            
            // Crea l'entità tramite EntityService
            const newEntity = await this.entityService.createEntity(entityType, entityData);
            
            console.log('✅ Nuova entità creata:', newEntity);
            
            // Seleziona automaticamente la nuova entità
            this.selectTargetEntity(newEntity);
            
            // Chiudi il form
            this.hideCreateEntityForm();
            
        } catch (error) {
            console.error('❌ Errore creazione entità:', error);
            // Mostra errore nel form
            let errorDiv = this.shadowRoot.querySelector('.create-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'create-error';
                this.shadowRoot.querySelector('.form-fields').appendChild(errorDiv);
            }
            errorDiv.textContent = `Errore: ${error.message}`;
            
            // Riabilita il button
            const createBtn = this.shadowRoot.querySelector('.create-entity-btn');
            createBtn.disabled = false;
            createBtn.textContent = `Crea ${entityType}`;
        }
    }

    /**
     * Nasconde il form di creazione entità
     */
    hideCreateEntityForm() {
        const createForm = this.shadowRoot.querySelector('.create-entity-form');
        if (createForm) {
            createForm.remove();
        }
        
        // Ripulisci i risultati di ricerca
        this.searchResults = [];
        this.updateSearchResults();
        
        // Rimetti il focus sul campo di ricerca
        const searchInput = this.shadowRoot.querySelector('[data-field="search"]');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Seleziona un'entità target
     */
    selectTargetEntity(entity) {
        this.targetEntity = entity;
        this.formData.targetEntityId = entity.id;
        this.searchResults = [];
        this.render(); // Necessario qui per mostrare l'entità selezionata
    }

    /**
     * Aggiorna un attributo della relazione
     */
    updateAttribute(attributeName, value) {
        this.formData.attributes[attributeName] = value;
        console.log(`🔄 RelationEditor: Aggiornato attributo ${attributeName}:`, value);
    }

    /**
     * Salva la relazione (crea o aggiorna)
     */
    async saveRelation() {
        try {
            this.error = null;
            
            // Validazione
            if (!this.formData.relationType) {
                throw new Error('Tipo di relazione richiesto');
            }
            
            if (!this.formData.targetEntityId) {
                throw new Error('Entità target richiesta');
            }
            
            if (this.mode === 'create') {
                // Crea nuova relazione
                const newRelation = await this.relationService.createRelation(
                    this.formData.relationType,
                    this.sourceEntityId,
                    this.formData.targetEntityId,
                    this.formData.attributes
                );
                
                this.dispatchEvent(new CustomEvent('relation-created', {
                    detail: { relation: newRelation },
                    bubbles: true
                }));
                
                console.log('✅ RelationEditor: Relazione creata:', newRelation);
                
            } else if (this.mode === 'edit') {
                // Aggiorna relazione esistente
                await this.relationService.updateRelationAttributes(
                    this.relationId,
                    this.formData.attributes
                );
                
                this.dispatchEvent(new CustomEvent('relation-updated', {
                    detail: { relationId: this.relationId, attributes: this.formData.attributes },
                    bubbles: true
                }));
                
                console.log('✅ RelationEditor: Relazione aggiornata:', this.relationId);
            }
            
            // Chiudi l'editor
            this.close();
            
        } catch (error) {
            console.error('❌ RelationEditor: Errore salvataggio:', error);
            this.error = error.message;
            this.render();
        }
    }

    /**
     * Chiude l'editor
     */
    close() {
        this.dispatchEvent(new CustomEvent('editor-close', {
            bubbles: true
        }));
    }

    /**
     * Renderizza il componente
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .editor-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .editor-dialog {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: slideIn 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .header {
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                }
                
                .close-btn:hover {
                    background: #f0f0f0;
                }
                
                .content {
                    padding: 24px;
                }
                
                .form-group {
                    margin-bottom: 20px;
                }
                
                .form-label {
                    display: block;
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 6px;
                }
                
                .form-input,
                .form-select {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }
                
                .form-input:focus,
                .form-select:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }
                
                .entity-info {
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 4px;
                    border: 1px solid #e9ecef;
                }
                
                .entity-name {
                    font-weight: 500;
                    color: #007bff;
                }
                
                .entity-type {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                }
                
                .search-container {
                    position: relative;
                }
                
                .search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ccc;
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1001;
                }
                
                .search-result {
                    padding: 10px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .search-result:hover {
                    background: #f8f9fa;
                }
                
                .search-result:last-child {
                    border-bottom: none;
                }
                
                .search-result.create-option {
                    background: #f8f9fa;
                    border-left: 3px solid #28a745;
                }
                
                .search-result.create-option:hover {
                    background: #e9ecef;
                }
                
                .create-name {
                    color: #28a745 !important;
                    font-weight: 500;
                }
                
                .entity-email {
                    font-size: 12px;
                    color: #666;
                    margin-top: 2px;
                }
                
                .create-entity-form {
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 16px;
                    margin-top: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .form-header h4 {
                    margin: 0;
                    color: #28a745;
                    font-size: 16px;
                }
                
                .close-create-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 18px;
                    color: #666;
                    padding: 4px;
                }
                
                .close-create-btn:hover {
                    color: #333;
                }
                
                .form-fields .form-group {
                    margin-bottom: 12px;
                }
                
                .form-fields label {
                    display: block;
                    font-size: 12px;
                    font-weight: 500;
                    color: #666;
                    margin-bottom: 4px;
                }
                
                .form-fields input {
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    font-size: 14px;
                }
                
                .form-fields input:focus {
                    outline: none;
                    border-color: #28a745;
                    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
                }
                
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid #e0e0e0;
                }
                
                .create-error {
                    background: #f8d7da;
                    color: #721c24;
                    padding: 8px 12px;
                    border-radius: 3px;
                    margin: 8px 0;
                    font-size: 12px;
                    border: 1px solid #f5c6cb;
                }
                
                .loading {
                    text-align: center;
                    padding: 20px;
                    color: #666;
                }
                
                .error {
                    background: #f8d7da;
                    color: #721c24;
                    padding: 12px;
                    border-radius: 4px;
                    margin-bottom: 16px;
                    border: 1px solid #f5c6cb;
                }
                
                .attributes-section {
                    margin-top: 24px;
                    padding-top: 24px;
                    border-top: 1px solid #e0e0e0;
                }
                
                .attribute-input {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                    align-items: center;
                }
                
                .attribute-input input[type="text"]:first-child {
                    flex: 0 0 150px;
                }
                
                .attribute-input input[type="text"]:last-child {
                    flex: 1;
                }
                
                .add-attribute-btn {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .add-attribute-btn:hover {
                    background: #218838;
                }
                
                .remove-attribute-btn {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .remove-attribute-btn:hover {
                    background: #c82333;
                }
                
                .footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                
                .btn {
                    padding: 10px 20px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .btn-secondary {
                    background: white;
                    color: #666;
                }
                
                .btn-secondary:hover {
                    background: #f8f9fa;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }
                
                .btn-primary:hover {
                    background: #0056b3;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>
            
            <div class="editor-overlay">
                <div class="editor-dialog">
                    <div class="header">
                        <h3 class="title">
                            ${this.mode === 'create' ? '➕ Crea Relazione' : '✏️ Modifica Relazione'}
                        </h3>
                        <button class="close-btn" data-action="close">✖</button>
                    </div>
                    
                    <div class="content">
                        ${this.renderContent()}
                    </div>
                    
                    <div class="footer">
                        <button class="btn btn-secondary" data-action="close">Annulla</button>
                        <button class="btn btn-primary" data-action="save" ${this.isLoading ? 'disabled' : ''}>
                            ${this.mode === 'create' ? 'Crea' : 'Salva'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    /**
     * Renderizza il contenuto principale
     */
    renderContent() {
        if (this.isLoading) {
            return '<div class="loading">🔄 Caricamento...</div>';
        }
        
        return `
            ${this.error ? `<div class="error">❌ ${this.error}</div>` : ''}
            
            ${this.renderSourceEntity()}
            ${this.renderRelationTypeSelection()}
            ${this.renderTargetEntitySelection()}
            ${this.showAdvanced ? this.renderAttributesSection() : ''}
        `;
    }

    /**
     * Renderizza le informazioni dell'entità sorgente
     */
    renderSourceEntity() {
        if (!this.sourceEntity) return '';
        
        const displayName = this.sourceEntity.nome || this.sourceEntity.name || 
                          this.sourceEntity.title || this.sourceEntity.id;
        
        return `
            <div class="form-group">
                <label class="form-label">Entità Sorgente</label>
                <div class="entity-info">
                    <div class="entity-name">${displayName}</div>
                    <div class="entity-type">${this.sourceEntity.entityType || 'Unknown'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizza la selezione del tipo di relazione
     */
    renderRelationTypeSelection() {
        return `
            <div class="form-group">
                <label class="form-label" for="relation-type-select">Tipo di Relazione</label>
                <select id="relation-type-select" name="relationType" class="form-select" data-field="relationType">
                    <option value="">Seleziona tipo di relazione...</option>
                    ${this.availableRelationTypes.map(type => `
                        <option value="${type}" ${this.formData.relationType === type ? 'selected' : ''}>
                            ${type}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    /**
     * Renderizza la selezione dell'entità target
     */
    renderTargetEntitySelection() {
        // If a target entity is already selected (either in edit mode or after selection in create mode)
        // display its information. Otherwise, show the autocomplete search.
        if (this.targetEntity) {
            const displayName = this.targetEntity.nome || this.targetEntity.name || 
                              this.targetEntity.title || this.targetEntity.id;
            
            return `
                <div class="form-group target-entity-display"> {/* Added class for easier selection */}
                    <label class="form-label">Entità Target</label>
                    <div class="entity-info">
                        <div class="entity-name">${displayName}</div>
                        <div class="entity-type">${this.targetEntity.entityType || 'Unknown'}</div>
                    </div>
                </div>
            `;
        }
        
        // Only show autocomplete if no target entity is selected yet.
        return `
            <div class="form-group">
                <label class="form-label" for="target-entity-autocomplete">Entità Target</label>
                <entity-autocomplete 
                    id="target-entity-autocomplete"
                    entity-types="${this.targetEntityTypes.join(',') || 'Contact,Persona,Cliente'}"
                    placeholder="Cerca entità target..."
                    allow-create="true"
                    required="true"
                    field-name="targetEntity">
                </entity-autocomplete>
            </div>
        `;
    }

    /**
     * Renderizza la sezione attributi (opzionale)
     */
    renderAttributesSection() {
        const attributes = Object.entries(this.formData.attributes);
        
        return `
            <div class="attributes-section">
                <label class="form-label">Attributi Relazione (Opzionale)</label>
                ${attributes.map(([key, value], index) => `
                    <div class="attribute-input">
                        <input type="text" id="attr-key-${index}" name="attrKey${index}" 
                               value="${key}" data-attr-key="${key}" data-field="attr-key" 
                               placeholder="Nome attributo">
                        <input type="text" id="attr-value-${index}" name="attrValue${index}" 
                               value="${value}" data-attr-key="${key}" data-field="attr-value" 
                               placeholder="Valore">
                        <button type="button" class="remove-attribute-btn" data-attr-key="${key}">✖</button>
                    </div>
                `).join('')}
                <button type="button" class="add-attribute-btn" data-action="add-attribute">➕ Aggiungi Attributo</button>
            </div>
        `;
    }

    /**
     * Rimuove l'entità target selezionata
     */
    clearTargetEntity() {
        this.targetEntity = null;
        this.formData.targetEntityId = '';
        this.render();
    }

    /**
     * Attacca gli event listener
     */
    attachEventListeners() {
        // Chiusura dialog
        this.shadowRoot.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
        
        // Salvataggio
        this.shadowRoot.querySelector('[data-action="save"]')?.addEventListener('click', () => {
            this.saveRelation();
        });
        
        // Gestione entity-autocomplete per entità target
        const entityAutocomplete = this.shadowRoot.querySelector('entity-autocomplete');
        if (entityAutocomplete) {
            // Quando un'entità viene selezionata
            entityAutocomplete.addEventListener('entity-selected', (e) => {
                const { entity, fieldName } = e.detail;
                if (fieldName === 'targetEntity') {
                    this.targetEntity = entity;
                    this.formData.targetEntityId = entity.id;
                    console.log('✅ Entità target selezionata:', entity);
                    this.render(); // Use vanilla component render method
                }
            });
            
            // Quando viene richiesta la creazione di una nuova entità
            entityAutocomplete.addEventListener('create-entity-requested', async (e) => {
                const { entityType, suggestedName, fieldName } = e.detail;
                if (fieldName === 'targetEntity') {
                    await this.handleCreateNewEntity(entityType, suggestedName, entityAutocomplete);
                }
            });
            
            // Quando la selezione viene pulita
            entityAutocomplete.addEventListener('entity-cleared', (e) => {
                const { fieldName } = e.detail;
                if (fieldName === 'targetEntity') {
                    this.targetEntity = null;
                    this.formData.targetEntityId = '';
                    console.log('🗑️ Entità target rimossa');
                }
            });
        }
        
        // Selezione tipo relazione - SENZA chiamare render()
        const relationTypeSelect = this.shadowRoot.querySelector('[data-field="relationType"]');
        if (relationTypeSelect) {
            relationTypeSelect.addEventListener('change', (e) => {
                this.formData.relationType = e.target.value;
                console.log('🔄 Tipo relazione aggiornato:', e.target.value);
                // NON chiamare render() qui per evitare interferenze con autocomplete
            });
        }
        
        // Gestione attributi
        this.shadowRoot.querySelectorAll('[data-field="attr-key"], [data-field="attr-value"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateAttributeFromInput(e.target);
            });
        });
        
        // Rimozione attributi
        this.shadowRoot.querySelectorAll('.remove-attribute-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attrKey = e.target.getAttribute('data-attr-key');
                delete this.formData.attributes[attrKey];
                this.render(); // Solo qui è necessario il re-render completo
            });
        });
        
        // Aggiunta attributo
        this.shadowRoot.querySelector('[data-action="add-attribute"]')?.addEventListener('click', () => {
            const newKey = `attributo_${Date.now()}`;
            this.formData.attributes[newKey] = '';
            this.render(); // Solo qui è necessario il re-render completo
        });
        
        // Chiusura su click overlay
        this.shadowRoot.querySelector('.editor-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('editor-overlay')) {
                this.close();
            }
        });
    }

    /**
     * Gestisce la creazione di una nuova entità dall'autocomplete
     */
    async handleCreateNewEntity(entityType, suggestedName, autocompleteComponent) {
        try {
            console.log(`🔄 Creazione nuova entità ${entityType} con nome: ${suggestedName}`);
            
            // Crea i dati minimi per l'entità
            const entityData = {
                nome: suggestedName,
                entityType: entityType
            };
            
            // Aggiungi campi specifici per tipo se necessario
            if (entityType === 'Contact') {
                // Per Contact aggiungiamo campi vuoti che possono essere compilati dopo
                entityData.cognome = '';
                entityData.email = '';
                entityData.telefono = '';
            } else if (entityType === 'Persona') {
                entityData.cognome = '';
                entityData.email = '';
            }
            
            // Crea l'entità tramite EntityService
            const newEntity = await this.entityService.createEntity(entityType, entityData);
            
            console.log('✅ Nuova entità creata:', newEntity);
            
            // Seleziona automaticamente la nuova entità nell'autocomplete
            autocompleteComponent.setValue(newEntity);
            
        } catch (error) {
            console.error('❌ Errore creazione entità:', error);
            // Mostra un alert per ora, in futuro potremmo fare qualcosa di più elegante
            alert(`Errore nella creazione dell'entità: ${error.message}`);
        }
    }

    /**
     * Aggiorna un attributo dal campo input
     */
    updateAttributeFromInput(input) {
        const oldKey = input.getAttribute('data-attr-key');
        const fieldType = input.getAttribute('data-field');
        
        if (fieldType === 'attr-key') {
            // Rinomina chiave attributo
            const newKey = input.value;
            const value = this.formData.attributes[oldKey];
            delete this.formData.attributes[oldKey];
            this.formData.attributes[newKey] = value;
        } else if (fieldType === 'attr-value') {
            // Aggiorna valore attributo
            this.formData.attributes[oldKey] = input.value;
        }
    }
}

// Registra il Web Component
customElements.define('relation-editor', RelationEditorComponent); 