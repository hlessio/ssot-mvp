/**
 * <entity-autocomplete> Web Component
 * Componente universale per autocomplete entità - VERSIONE SEMPLIFICATA
 * 
 * Può essere usato in qualsiasi modulo per selezionare entità con:
 * - Ricerca case-insensitive veloce
 * - Filtro per tipi di entità specifici
 * - Creazione di nuove entità al volo
 * - Integrazione con tutti i servizi SSOT
 */
class EntityAutocompleteComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Proprietà configurabili
        this.entityTypes = []; // Tipi di entità consentiti
        this.placeholder = 'Cerca entità...';
        this.allowCreate = true; // Permetti creazione nuove entità
        this.multiSelect = false; // Selezione multipla (futuro)
        this.required = false;
        this.value = null; // Entità selezionata
        this.fieldName = ''; // Nome del campo per eventi
        
        // Stato interno
        this.searchResults = [];
        this.isOpen = false;
        this.searchTimeout = null;
        this.isLoading = false;
        
        // Servizi
        this.entityService = window.EntityService;
        this.schemaService = window.SchemaService;
        
        console.log('🔍 EntityAutocomplete creato (versione semplificata)');
    }

    static get observedAttributes() {
        return [
            'entity-types',
            'placeholder', 
            'allow-create',
            'multi-select',
            'required',
            'field-name',
            'value'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'entity-types':
                this.entityTypes = newValue ? newValue.split(',').map(t => t.trim()) : [];
                break;
            case 'placeholder':
                this.placeholder = newValue || 'Cerca entità...';
                break;
            case 'allow-create':
                this.allowCreate = newValue !== 'false';
                break;
            case 'multi-select':
                this.multiSelect = newValue === 'true';
                break;
            case 'required':
                this.required = newValue === 'true';
                break;
            case 'field-name':
                this.fieldName = newValue || '';
                break;
            case 'value':
                this.setValue(newValue);
                break;
        }
        
        this.render();
    }

    connectedCallback() {
        this.render();
        // Setup WebSocket listeners dopo il rendering
        setTimeout(() => {
            this.setupWebSocketListeners();
        }, 0);
    }

    /**
     * Imposta il valore dell'entità selezionata
     */
    setValue(entityIdOrObject) {
        if (!entityIdOrObject) {
            this.value = null;
            this.render();
            return;
        }
        
        if (typeof entityIdOrObject === 'string') {
            // È un ID, carica l'entità
            this.loadEntityById(entityIdOrObject);
        } else {
            // È già un oggetto entità
            this.value = entityIdOrObject;
            this.render();
        }
    }

    /**
     * Carica un'entità per ID
     */
    async loadEntityById(entityId) {
        try {
            this.value = await this.entityService.getEntity(entityId);
            this.render();
        } catch (error) {
            console.error('❌ Errore caricamento entità:', error);
            this.value = null;
            this.render();
        }
    }

    /**
     * ✨ SEMPLIFICATO: Ricerca diretta e veloce
     */
    async searchEntities(query) {
        console.log(`🔍 searchEntities chiamata con query: "${query}"`);
        
        // Se query vuota o troppo corta, non mostrare nulla
        if (!query || query.length === 0) {
            console.log('🔍 Query vuota, pulisco risultati');
            this.searchResults = [];
            this.updateResults();
            return;
        }
        
        console.log(`🔍 Inizio ricerca per: "${query}"`);
        this.isLoading = true;
        this.updateResults(); // Mostra loading
        
        try {
            // Determina i tipi di entità da cercare
            const searchTypes = this.entityTypes.length > 0 
                ? this.entityTypes 
                : ['Contact', 'Persona'];
            
            console.log(`🔍 Cerco nei tipi: ${searchTypes.join(', ')}`);
            
            // ✨ Carica in parallelo SOLO quando necessario
            const loadPromises = searchTypes.map(async (entityType) => {
                try {
                    const entities = await this.entityService.getEntities(entityType);
                    console.log(`🔍 Trovate ${entities.length} entità di tipo ${entityType}`);
                    return entities.map(e => ({ 
                        ...e, 
                        entityType: e.entityType || entityType
                    }));
                } catch (error) {
                    console.log(`🔍 Tipo ${entityType} non trovato, continuo...`);
                    return []; // Ignora errori silenziosamente
                }
            });
            
            const results = await Promise.all(loadPromises);
            const allEntities = results.flat();
            console.log(`🔍 Totale entità caricate: ${allEntities.length}`);
            
            // ✨ Filtro semplice e veloce
            const searchText = query.toLowerCase();
            const matchingResults = allEntities.filter(entity => {
                const name = (entity.nome || entity.name || entity.title || '').toLowerCase();
                const surname = (entity.cognome || entity.surname || '').toLowerCase();
                const email = (entity.email || '').toLowerCase();
                
                return name.includes(searchText) || 
                       surname.includes(searchText) || 
                       email.includes(searchText);
            });
            
            console.log(`🔍 Risultati che matchano: ${matchingResults.length}`);
            
            // ✨ Ordina per rilevanza: prima chi inizia con la query
            const sorted = matchingResults.sort((a, b) => {
                const nameA = (a.nome || a.name || '').toLowerCase();
                const nameB = (b.nome || b.name || '').toLowerCase();
                
                const startsWithA = nameA.startsWith(searchText);
                const startsWithB = nameB.startsWith(searchText);
                
                if (startsWithA && !startsWithB) return -1;
                if (!startsWithA && startsWithB) return 1;
                return nameA.localeCompare(nameB);
            });
            
            // Limita risultati
            this.searchResults = sorted.slice(0, 6);
            console.log(`🔍 Risultati finali: ${this.searchResults.length}`);
            
            // Aggiungi opzioni di creazione se pochi risultati
            if (this.allowCreate && this.searchResults.length < 3) {
                this.addCreateOptions(query);
                console.log(`🔍 Aggiunte opzioni di creazione, totale: ${this.searchResults.length}`);
            }
            
        } catch (error) {
            console.error('❌ Errore ricerca entità:', error);
            this.searchResults = [];
        } finally {
            this.isLoading = false;
            this.updateResults();
            console.log(`🔍 Ricerca completata, isOpen: ${this.isOpen}`);
        }
    }

    /**
     * ✨ SEMPLIFICATO: Aggiunge opzioni di creazione
     */
    addCreateOptions(query) {
        if (!this.allowCreate || !query) return;
        
        const searchTypes = this.entityTypes.length > 0 
            ? this.entityTypes.slice(0, 2) // Max 2 opzioni di creazione
            : ['Contact', 'Persona'];
            
        const createOptions = searchTypes.map(entityType => ({
            id: `__create_${entityType}`,
            entityType: entityType,
            _isCreateOption: true,
            _displayName: `➕ Crea "${query}" (${entityType})`,
            _suggestedName: query
        }));
        
        this.searchResults = [...this.searchResults, ...createOptions];
    }

    /**
     * Aggiorna i risultati di ricerca
     */
    updateResults() {
        const resultsContainer = this.shadowRoot.querySelector('.results-container');
        if (!resultsContainer) return;
        
        if (this.isLoading) {
            this.isOpen = true;
            resultsContainer.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner">⏳</div>
                    Cercando...
                </div>
            `;
        } else if (this.searchResults.length > 0) {
            this.isOpen = true;
            resultsContainer.innerHTML = this.renderResults();
            this.attachResultListeners();
        } else {
            this.isOpen = false;
            resultsContainer.innerHTML = '';
        }
        
        resultsContainer.classList.toggle('open', this.isOpen);
    }

    /**
     * ✨ Migliorato: Estrae il nome da visualizzare per un'entità
     */
    getDisplayName(entity) {
        // Prova diversi campi in ordine di priorità
        return entity.nome || 
               entity.name || 
               entity.title || 
               entity.ragioneSociale ||
               entity.displayName ||
               `Entità ${entity.entityType}` || 
               entity.id;
    }

    /**
     * ✨ Migliorato: Estrae il cognome/secondario per un'entità  
     */
    getSecondareName(entity) {
        return entity.cognome || 
               entity.surname || 
               entity.lastName || 
               '';
    }

    /**
     * Renderizza i risultati di ricerca
     */
    renderResults() {
        return this.searchResults.map(entity => {
            if (entity._isCreateOption) {
                return `
                    <div class="result-item create-option" data-entity-id="${entity.id}" data-entity-type="${entity.entityType}">
                        <div class="entity-name create-name">${entity._displayName}</div>
                        <div class="entity-type">Crea nuovo</div>
                    </div>
                `;
            } else {
                // ✅ Usa metodi migliorati per il display
                const displayName = this.getDisplayName(entity);
                const secondaryName = this.getSecondareName(entity);
                const fullName = secondaryName ? `${displayName} ${secondaryName}` : displayName;
                
                return `
                    <div class="result-item" data-entity-id="${entity.id}">
                        <div class="entity-name">${fullName}</div>
                        <div class="entity-type">${entity.entityType}</div>
                        ${entity.email ? `<div class="entity-email">${entity.email}</div>` : ''}
                        ${entity.ragioneSociale && entity.ragioneSociale !== displayName ? 
                            `<div class="entity-email">${entity.ragioneSociale}</div>` : ''}
                    </div>
                `;
            }
        }).join('');
    }

    /**
     * Attacca event listeners ai risultati
     */
    attachResultListeners() {
        this.shadowRoot.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                const entityId = item.getAttribute('data-entity-id');
                
                if (entityId.startsWith('__create_')) {
                    // Creazione nuova entità
                    const entityType = item.getAttribute('data-entity-type');
                    const query = this.shadowRoot.querySelector('.search-input').value;
                    this.showCreateForm(entityType, query);
                } else {
                    // Selezione entità esistente
                    const entity = this.searchResults.find(e => e.id === entityId);
                    if (entity) {
                        this.selectEntity(entity);
                    }
                }
            });
        });
    }

    /**
     * Seleziona un'entità
     */
    selectEntity(entity) {
        this.value = entity;
        this.isOpen = false;
        this.searchResults = [];
        this.render();
        
        // Emetti evento di cambiamento
        this.dispatchEvent(new CustomEvent('entity-selected', {
            detail: { 
                entity: entity,
                fieldName: this.fieldName 
            },
            bubbles: true
        }));
        
        console.log('✅ Entità selezionata:', entity);
    }

    /**
     * Mostra form per creare nuova entità
     */
    showCreateForm(entityType, suggestedName) {
        // Per ora emettiamo un evento, ma in futuro potremmo aprire un modal
        this.dispatchEvent(new CustomEvent('create-entity-requested', {
            detail: { 
                entityType: entityType,
                suggestedName: suggestedName,
                fieldName: this.fieldName 
            },
            bubbles: true
        }));
    }

    /**
     * Pulisce la selezione
     */
    clearSelection() {
        this.value = null;
        this.render();
        
        this.dispatchEvent(new CustomEvent('entity-cleared', {
            detail: { fieldName: this.fieldName },
            bubbles: true
        }));
    }

    /**
     * ✨ CORRETTO: Setup event listeners per funzionare mentre si digita
     */
    setupEventListeners() {
        const searchInput = this.shadowRoot.querySelector('.search-input');
        if (searchInput) {
            // ✅ Event listener per digitazione - DEVE funzionare mentre digiti
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                console.log(`🔍 Digitando: "${query}"`);
                
                clearTimeout(this.searchTimeout);
                
                // ✅ Se vuoto, pulisci subito
                if (!query || query.length === 0) {
                    this.searchResults = [];
                    this.updateResults();
                    return;
                }
                
                // ✅ Ricerca con debounce
                this.searchTimeout = setTimeout(() => {
                    console.log(`🔍 Eseguo ricerca per: "${query}"`);
                    this.searchEntities(query);
                }, 200);
            });
            
            // ✅ Event listener per focus/blur gestione
            searchInput.addEventListener('focus', () => {
                console.log('🔍 Focus su search input');
                if (searchInput.value) {
                    this.searchEntities(searchInput.value);
                }
            });

            searchInput.addEventListener('blur', (e) => {
                // Ritarda la chiusura per permettere i click sui risultati
                setTimeout(() => {
                    console.log('🔍 Blur da search input, chiudo risultati');
                    this.isOpen = false;
                    this.searchResults = [];
                    this.updateResults();
                }, 200);
            });
            
            // ✅ NUOVO: Event listener per pulsante refresh
            const refreshBtn = this.shadowRoot.querySelector('.refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    console.log('🔄 Pulsante refresh cliccato');
                    const currentQuery = searchInput.value;
                    if (currentQuery) {
                        // Forza refresh anche con stesso query
                        this.searchEntities(currentQuery);
                    } else {
                        // Se non c'è query, fai una ricerca vuota per vedere tutte le entità
                        this.searchEntities(' '); // Spazio per triggerare la ricerca
                        // Poi pulisci il campo
                        setTimeout(() => {
                            searchInput.value = '';
                        }, 100);
                    }
                });
            }
            
            console.log('✅ Event listeners per input attaccati');
        } else {
            console.error('❌ searchInput non trovato!');
        }
        
        const clearBtn = this.shadowRoot.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
    }

    /**
     * Renderizza il componente
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .autocomplete-container {
                    position: relative;
                    width: 100%;
                }
                
                .input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                
                .search-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .search-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                
                .refresh-btn {
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: #f5f5f5;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }
                
                .refresh-btn:hover {
                    background: #e5e5e5;
                }
                
                .search-input:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }
                
                .search-input:required:invalid {
                    border-color: #dc3545;
                }
                
                .clear-btn {
                    position: absolute;
                    right: 8px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #666;
                    font-size: 16px;
                    padding: 4px;
                    border-radius: 3px;
                }
                
                .clear-btn:hover {
                    background: #f0f0f0;
                    color: #333;
                }
                
                .selected-entity {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #f8f9fa;
                    padding: 10px 12px;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                }
                
                .entity-info {
                    flex: 1;
                }
                
                .entity-name {
                    font-weight: 500;
                    color: #007bff;
                    margin-bottom: 2px;
                }
                
                .entity-type {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                }
                
                .entity-email {
                    font-size: 12px;
                    color: #666;
                    margin-top: 2px;
                }
                
                .results-container {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ccc;
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    max-height: 250px;
                    overflow-y: auto;
                    z-index: 1000;
                    display: none;
                }
                
                .results-container.open {
                    display: block;
                }
                
                .result-item {
                    padding: 10px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    transition: background-color 0.2s;
                }
                
                .result-item:hover {
                    background: #f8f9fa;
                }
                
                .result-item:last-child {
                    border-bottom: none;
                }
                
                .result-item.create-option {
                    background: #f8f9fa;
                    border-left: 3px solid #28a745;
                }
                
                .result-item.create-option:hover {
                    background: #e9ecef;
                }
                
                .create-name {
                    color: #28a745 !important;
                    font-weight: 500;
                }
                
                .loading {
                    padding: 10px 12px;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                
                .loading-spinner {
                    display: inline-block;
                    margin-right: 8px;
                }
            </style>
            
            <div class="autocomplete-container">
                ${this.value ? this.renderSelectedEntity() : this.renderSearchInput()}
                <div class="results-container"></div>
            </div>
        `;
        
        // ✅ Setup event listeners IMMEDIATAMENTE dopo il render
        this.setupEventListeners();
    }

    /**
     * Renderizza l'entità selezionata
     */
    renderSelectedEntity() {
        // ✅ Usa metodi migliorati per il display
        const displayName = this.getDisplayName(this.value);
        const secondaryName = this.getSecondareName(this.value);
        const fullName = secondaryName ? `${displayName} ${secondaryName}` : displayName;
        
        return `
            <div class="selected-entity">
                <div class="entity-info">
                    <div class="entity-name">${fullName}</div>
                    <div class="entity-type">${this.value.entityType || 'Unknown'}</div>
                    ${this.value.email ? `<div class="entity-email">${this.value.email}</div>` : ''}
                    ${this.value.ragioneSociale && this.value.ragioneSociale !== displayName ? 
                        `<div class="entity-email">${this.value.ragioneSociale}</div>` : ''}
                </div>
                <button type="button" class="clear-btn" title="Rimuovi selezione">✖</button>
            </div>
        `;
    }

    /**
     * Renderizza il campo di ricerca
     */
    renderSearchInput() {
        return `
            <div class="search-container">
                <input type="text" class="search-input" 
                       placeholder="${this.placeholder}" 
                       autocomplete="off" 
                       spellcheck="false">
                <button class="refresh-btn" title="Aggiorna lista">🔄</button>
            </div>
            <div class="results-container"></div>
        `;
    }

    /**
     * ✅ NUOVO: Setup WebSocket listeners per aggiornamenti automatici
     */
    setupWebSocketListeners() {
        if (!window.demoApp || !window.demoApp.websocketService) {
            console.log('🔗 WebSocket service non disponibile per autocomplete');
            return;
        }

        const wsService = window.demoApp.websocketService;
        
        // Listener per nuove entità create
        this.entityCreatedListener = (event) => {
            const { entity, entityType } = event.data;
            console.log(`🔗 WebSocket: Nuova entità ${entityType} creata:`, entity);
            
            // Se la nuova entità è di un tipo che stiamo gestendo, refresh automatico
            if (this.entityTypes.length === 0 || this.entityTypes.includes(entityType)) {
                // Se stiamo mostrando risultati, aggiorniamo la ricerca
                const searchInput = this.shadowRoot.querySelector('.search-input');
                const currentQuery = searchInput ? searchInput.value : '';
                
                if (currentQuery && this.isOpen) {
                    console.log(`🔗 Refresh automatico autocomplete per query "${currentQuery}"`);
                    // Aspetta un po' per dare al server tempo di processare
                    setTimeout(() => {
                        this.searchEntities(currentQuery);
                    }, 500);
                }
            }
        };

        // Listener per aggiornamenti entità
        this.entityUpdatedListener = (event) => {
            const { entityId, attributeName, newValue } = event.data;
            console.log(`🔗 WebSocket: Entità ${entityId} aggiornata: ${attributeName} = ${newValue}`);
            
            // Se abbiamo questa entità nei risultati, aggiorniamola
            if (this.searchResults.some(e => e.id === entityId)) {
                const searchInput = this.shadowRoot.querySelector('.search-input');
                const currentQuery = searchInput ? searchInput.value : '';
                
                if (currentQuery && this.isOpen) {
                    console.log(`🔗 Refresh automatico per aggiornamento entità ${entityId}`);
                    setTimeout(() => {
                        this.searchEntities(currentQuery);
                    }, 200);
                }
            }
        };

        // Registra i listeners usando il metodo subscribe corretto
        this.entityCreatedSubscriptionId = wsService.subscribe('entity-created', this.entityCreatedListener);
        this.entityUpdatedSubscriptionId = wsService.subscribe('attribute-updated', this.entityUpdatedListener);
        
        console.log('✅ WebSocket listeners registrati per autocomplete');
    }

    /**
     * ✅ NUOVO: Cleanup WebSocket listeners quando il componente viene rimosso
     */
    disconnectedCallback() {
        if (window.demoApp?.websocketService) {
            const wsService = window.demoApp.websocketService;
            if (this.entityCreatedSubscriptionId) {
                wsService.unsubscribe(this.entityCreatedSubscriptionId);
            }
            if (this.entityUpdatedSubscriptionId) {
                wsService.unsubscribe(this.entityUpdatedSubscriptionId);
            }
            console.log('🔗 WebSocket listeners rimossi per autocomplete');
        }
    }
}

// Registra il Web Component
customElements.define('entity-autocomplete', EntityAutocompleteComponent); 