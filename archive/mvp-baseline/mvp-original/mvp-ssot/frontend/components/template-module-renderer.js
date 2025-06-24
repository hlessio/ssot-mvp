/**
 * template-module-renderer.js - Web Component core per renderizzare moduli da template
 * 
 * Questo è il componente centrale della Fase 1 del frontend evoluto.
 * Responsabilità:
 * - Caricare e renderizzare moduli basati su template JSON
 * - Integrazione con tutti i servizi (ModuleDefinition, Schema, Entity, WebSocket)
 * - Gestire sottoscrizioni WebSocket per aggiornamenti real-time
 * - Fornire base per future espansioni (editing, azioni, relazioni)
 * 
 * ✨ FASE 2: Aggiunto supporto editing e azioni:
 * - Modalità editing con attribute-editor
 * - Azione "Salva Vista Come..." per creare ModuleInstance
 * - Gestione azioni configurabili da template
 */

class TemplateModuleRenderer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Stato del componente
        this.moduleDefinition = null;
        this.entityData = null;
        this.isLoading = false;
        this.hasError = false;
        this.errorMessage = '';
        
        // ✨ FASE 2: Stato editing
        this.isEditMode = false;
        this.dirtyAttributes = new Set();
        this.saveInProgress = false;
        
        // Sottoscrizioni WebSocket
        this.wsSubscriptions = [];
        
        // Cache
        this.attributeComponents = new Map();
        
        // Binding metodi
        this.handleSaveAs = this.handleSaveAs.bind(this);
        this.handleToggleEdit = this.handleToggleEdit.bind(this);
        this.handleSaveChanges = this.handleSaveChanges.bind(this);
        this.handleCancelEdit = this.handleCancelEdit.bind(this);
    }

    static get observedAttributes() {
        return [
            'module-id', 'entity-id', 'entity-type', 'view-mode', 
            'show-title', 'show-actions', 'auto-refresh', 'edit-mode'
        ];
    }

    connectedCallback() {
        this.loadAndRender();
        this.setupWebSocketSubscriptions();
    }

    disconnectedCallback() {
        this.cleanupWebSocketSubscriptions();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.isConnected) {
            // Re-carica completamente se cambiano parametri critici
            if (['module-id', 'entity-id'].includes(name)) {
                this.loadAndRender();
            } else if (name === 'edit-mode') {
                this.isEditMode = newValue === 'true';
                this.render();
            } else {
                this.render();
            }
        }
    }

    /**
     * Carica definizione e dati, poi renderizza
     */
    async loadAndRender() {
        try {
            this.isLoading = true;
            this.hasError = false;
            this.render(); // Mostra stato loading

            await Promise.all([
                this.loadModuleDefinition(),
                this.loadEntityData()
            ]);

            this.isLoading = false;
            this.render();

        } catch (error) {
            console.error('❌ [template-module-renderer] Errore caricamento:', error);
            this.isLoading = false;
            this.hasError = true;
            this.errorMessage = error.message;
            this.render();
        }
    }

    /**
     * Carica la definizione del modulo
     */
    async loadModuleDefinition() {
        const moduleId = this.getAttribute('module-id');
        if (!moduleId) {
            throw new Error('module-id è richiesto');
        }

        if (!window.moduleDefinitionService) {
            throw new Error('ModuleDefinitionService non disponibile');
        }

        this.moduleDefinition = await window.moduleDefinitionService.getDefinition(moduleId);
        console.log(`✅ [template-module-renderer] Definizione caricata: ${moduleId}`);
    }

    /**
     * Carica i dati dell'entità
     */
    async loadEntityData() {
        const entityId = this.getAttribute('entity-id');
        if (!entityId) {
            throw new Error('entity-id è richiesto');
        }

        if (!window.entityService) {
            throw new Error('EntityService non disponibile');
        }

        this.entityData = await window.entityService.getEntity(entityId);
        console.log(`✅ [template-module-renderer] Dati entità caricati: ${entityId}`);
    }

    /**
     * Renderizza il modulo
     */
    render() {
        if (this.isLoading) {
            this.renderLoading();
        } else if (this.hasError) {
            this.renderError();
        } else if (this.moduleDefinition && this.entityData) {
            this.renderModule();
        } else {
            this.renderEmpty();
        }
    }

    /**
     * Renderizza stato di caricamento
     */
    renderLoading() {
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
                .loading-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #6b7280;
                }
                .loading-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #e5e7eb;
                    border-top: 2px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 0.5rem;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div class="module-container">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    Caricamento modulo...
                </div>
            </div>
        `;
    }

    /**
     * Renderizza stato di errore
     */
    renderError() {
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
                .error-container {
                    background-color: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    color: #dc2626;
                }
                .error-title {
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }
                .error-message {
                    font-size: 0.875rem;
                }
            </style>
            <div class="module-container">
                <div class="error-container">
                    <div class="error-title">Errore nel caricamento del modulo</div>
                    <div class="error-message">${this.errorMessage}</div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizza stato vuoto
     */
    renderEmpty() {
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
                .empty-container {
                    padding: 2rem;
                    text-align: center;
                    color: #6b7280;
                }
            </style>
            <div class="module-container">
                <div class="empty-container">
                    Nessun modulo da visualizzare
                </div>
            </div>
        `;
    }

    /**
     * Renderizza il modulo completo
     */
    renderModule() {
        const showTitle = this.getAttribute('show-title') !== 'false';
        const showActions = this.getAttribute('show-actions') !== 'false';

        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
                ${this.getModuleStyles()}
                ${this.getEditStyles()}
            </style>
            <div class="module-container ${this.isEditMode ? 'edit-mode' : ''}">
                ${showTitle ? this.renderModuleHeader() : ''}
                ${this.renderModuleContent()}
                ${showActions ? this.renderModuleActions() : ''}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Renderizza header del modulo
     */
    renderModuleHeader() {
        const title = this.moduleDefinition.description || this.moduleDefinition.moduleId;
        const entityName = this.entityData.nome || this.entityData.name || 'Entità';
        
        return `
            <div class="module-header">
                <h3 class="module-title">${title}: ${entityName}</h3>
                <div class="module-meta">
                    <span>ID: ${this.getAttribute('entity-id')}</span>
                    <span>Template: ${this.moduleDefinition.moduleId}</span>
                    ${this.isEditMode ? '<span class="edit-indicator">✏️ Modalità Editing</span>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Renderizza contenuto del modulo
     */
    renderModuleContent() {
        const viewMode = this.getAttribute('view-mode') || 'default';
        const view = this.getViewConfiguration(viewMode);
        
        return `
            <div class="module-content">
                ${this.renderViewContent(view)}
            </div>
        `;
    }

    /**
     * Renderizza contenuto basato sulla vista
     */
    renderViewContent(view) {
        if (view.renderer === 'StandardCardRenderer') {
            return this.renderStandardCard(view);
        } else if (view.renderer === 'CompactCardRenderer') {
            return this.renderCompactCard(view);
        } else {
            // Default rendering
            return this.renderStandardCard(view);
        }
    }

    /**
     * Renderizza vista standard card
     */
    renderStandardCard(view) {
        if (view.layout && Array.isArray(view.layout)) {
            return this.renderStructuredLayout(view.layout);
        } else {
            const attributesToShow = this.getAttributesToShow(view);
            return this.renderSimpleAttributes(attributesToShow);
        }
    }

    /**
     * Renderizza layout strutturato con sezioni
     */
    renderStructuredLayout(layout) {
        return layout.map(section => `
            <div class="content-section">
                <h4 class="section-title">${section.sectionTitle}</h4>
                <div class="section-attributes">
                    ${section.attributes.map(attr => this.renderAttributeComponent(attr)).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderizza attributi semplici
     */
    renderSimpleAttributes(attributesToShow) {
        return `
            <div class="attributes-container">
                ${attributesToShow.map(attr => this.renderAttributeComponent(attr)).join('')}
            </div>
        `;
    }

    /**
     * Normalizza il tipo di entità da array a stringa singola
     * @param {string|Array} entityType - Tipo di entità dal template
     * @returns {string} - Tipo di entità normalizzato
     */
    normalizeEntityType(entityType) {
        if (!entityType) return 'Contact';
        
        // Se è array, prendi il primo elemento
        if (Array.isArray(entityType)) {
            return entityType[0] || 'Contact';
        }
        
        // Se è stringa, restituiscila così com'è
        return entityType;
    }

    /**
     * Renderizza componente attributo (display o editor)
     */
    renderAttributeComponent(attributeName) {
        const value = this.entityData[attributeName];
        const entityId = this.getAttribute('entity-id');
        const entityType = this.normalizeEntityType(
            this.getAttribute('entity-type') || this.moduleDefinition.targetEntityType
        );

        if (this.isEditMode) {
            // ✨ FASE 2: Usa attribute-editor in modalità editing
            return `
                <attribute-editor
                    attribute-name="${attributeName}"
                    value="${value || ''}"
                    entity-id="${entityId}"
                    entity-type="${entityType}"
                    show-actions="true"
                    data-attribute="${attributeName}">
                </attribute-editor>
            `;
        } else {
            // Modalità visualizzazione standard
            return `
                <attribute-display
                    attribute-name="${attributeName}"
                    value="${value || ''}"
                    entity-type="${entityType}"
                    data-attribute="${attributeName}">
                </attribute-display>
            `;
        }
    }

    /**
     * Renderizza vista compact card
     */
    renderCompactCard(view) {
        const attributesToShow = this.getAttributesToShow(view);
        
        return `
            <div class="compact-attributes">
                ${attributesToShow.map(attr => this.renderCompactAttribute(attr)).join('')}
            </div>
        `;
    }

    /**
     * Renderizza attributo compatto
     */
    renderCompactAttribute(attributeName) {
        const value = this.entityData[attributeName];
        const entityType = this.normalizeEntityType(
            this.getAttribute('entity-type') || this.moduleDefinition.targetEntityType
        );
        
        if (this.isEditMode) {
            return `
                <attribute-editor
                    attribute-name="${attributeName}"
                    value="${value || ''}"
                    entity-id="${this.getAttribute('entity-id')}"
                    entity-type="${entityType}"
                    data-attribute="${attributeName}">
                </attribute-editor>
            `;
        } else {
            return `
                <attribute-display
                    attribute-name="${attributeName}"
                    value="${value || ''}"
                    entity-type="${entityType}"
                    data-attribute="${attributeName}"
                    compact="true">
                </attribute-display>
            `;
        }
    }

    /**
     * ✨ FASE 2: Renderizza azioni del modulo con nuove funzionalità
     */
    renderModuleActions() {
        const actions = this.moduleDefinition.actions || [];
        const hasConfigurableFields = this.moduleDefinition.instanceConfigurableFields && 
                                      this.moduleDefinition.instanceConfigurableFields.length > 0;

        return `
            <div class="module-actions">
                ${this.renderEditActions()}
                ${hasConfigurableFields ? this.renderSaveAsAction() : ''}
                ${actions.map(action => this.renderCustomAction(action)).join('')}
            </div>
        `;
    }

    /**
     * ✨ FASE 2: Renderizza azioni di editing
     */
    renderEditActions() {
        if (this.isEditMode) {
            return `
                <button class="action-button save-changes-button" ${this.saveInProgress ? 'disabled' : ''}>
                    ${this.saveInProgress ? '⏳' : '💾'} Salva Modifiche
                </button>
                <button class="action-button cancel-edit-button">
                    ❌ Annulla
                </button>
            `;
        } else {
            return `
                <button class="action-button edit-mode-button">
                    ✏️ Modifica
                </button>
            `;
        }
    }

    /**
     * ✨ FASE 2: Renderizza azione "Salva Vista Come..."
     */
    renderSaveAsAction() {
        return `
            <button class="action-button save-as-button">
                📋 Salva Vista Come...
            </button>
        `;
    }

    /**
     * Renderizza azioni personalizzate dal template
     */
    renderCustomAction(action) {
        return `
            <button class="action-button custom-action-button" data-action-id="${action.actionId}">
                ${action.label}
            </button>
        `;
    }

    /**
     * Ottiene configurazione vista
     */
    getViewConfiguration(viewMode) {
        const views = this.moduleDefinition.views || {};
        
        if (viewMode !== 'default' && views[viewMode]) {
            return views[viewMode];
        }
        
        return this.moduleDefinition.defaultView || { attributesToDisplay: [] };
    }

    /**
     * Ottiene attributi da mostrare per una vista
     */
    getAttributesToShow(view) {
        if (view.layout && Array.isArray(view.layout)) {
            // Estrae attributi dalle sezioni del layout
            return view.layout.reduce((attrs, section) => {
                return attrs.concat(section.attributes || []);
            }, []);
        }
        
        return view.attributesToDisplay || [];
    }

    /**
     * ✨ FASE 2: Gestori eventi evoluti
     */
    attachEventListeners() {
        // Gestori azioni editing
        const editButton = this.shadowRoot.querySelector('.edit-mode-button');
        const saveButton = this.shadowRoot.querySelector('.save-changes-button');
        const cancelButton = this.shadowRoot.querySelector('.cancel-edit-button');
        const saveAsButton = this.shadowRoot.querySelector('.save-as-button');

        if (editButton) editButton.addEventListener('click', this.handleToggleEdit);
        if (saveButton) saveButton.addEventListener('click', this.handleSaveChanges);
        if (cancelButton) cancelButton.addEventListener('click', this.handleCancelEdit);
        if (saveAsButton) saveAsButton.addEventListener('click', this.handleSaveAs);

        // Gestori azioni personalizzate
        const customButtons = this.shadowRoot.querySelectorAll('.custom-action-button');
        customButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const actionId = button.getAttribute('data-action-id');
                this.handleAction(actionId, event);
            });
        });

        // ✨ FASE 2: Listener per eventi attribute-editor
        const attributeEditors = this.shadowRoot.querySelectorAll('attribute-editor');
        attributeEditors.forEach(editor => {
            editor.addEventListener('value-saved', this.handleAttributeSaved.bind(this));
            editor.addEventListener('value-changing', this.handleAttributeChanging.bind(this));
            editor.addEventListener('save-error', this.handleAttributeSaveError.bind(this));
        });
    }

    /**
     * ✨ FASE 2: Gestisce toggle modalità editing
     */
    handleToggleEdit() {
        this.isEditMode = !this.isEditMode;
        this.setAttribute('edit-mode', this.isEditMode.toString());
        console.log(`🔧 [template-module-renderer] Modalità editing: ${this.isEditMode}`);
    }

    /**
     * ✨ FASE 2: Gestisce salvataggio modifiche batch
     */
    async handleSaveChanges() {
        if (this.saveInProgress) return;
        
        try {
            this.saveInProgress = true;
            this.render(); // Aggiorna UI

            // Salva tutte le modifiche pendenti tramite attribute-editor
            const attributeEditors = this.shadowRoot.querySelectorAll('attribute-editor');
            const savePromises = Array.from(attributeEditors)
                .filter(editor => editor.isDirty)
                .map(editor => editor.handleSave());

            await Promise.all(savePromises);
            
            this.dirtyAttributes.clear();
            this.isEditMode = false;
            this.setAttribute('edit-mode', 'false');
            
            console.log('✅ [template-module-renderer] Tutte le modifiche salvate');

        } catch (error) {
            console.error('❌ [template-module-renderer] Errore salvataggio modifiche:', error);
        } finally {
            this.saveInProgress = false;
            this.render();
        }
    }

    /**
     * ✨ FASE 2: Gestisce annullamento editing
     */
    handleCancelEdit() {
        // Annulla modifiche in tutti gli attribute-editor
        const attributeEditors = this.shadowRoot.querySelectorAll('attribute-editor');
        attributeEditors.forEach(editor => {
            if (editor.isDirty) {
                editor.handleCancel();
            }
        });

        this.dirtyAttributes.clear();
        this.isEditMode = false;
        this.setAttribute('edit-mode', 'false');
        
        console.log('❌ [template-module-renderer] Editing annullato');
    }

    /**
     * ✨ FASE 2: Gestisce "Salva Vista Come..."
     */
    async handleSaveAs() {
        try {
            const instanceName = prompt('Nome per la vista salvata:');
            if (!instanceName) return;

            if (!window.saveInstanceService) {
                throw new Error('SaveInstanceService non disponibile');
            }

            const currentConfig = this.extractCurrentConfig();
            
            const instanceData = {
                instanceName,
                templateModuleId: this.moduleDefinition.moduleId,
                targetEntityId: this.getAttribute('entity-id'),
                targetEntityType: this.normalizeEntityType(
                    this.getAttribute('entity-type') || this.moduleDefinition.targetEntityType
                ),
                ownerUserId: 'current-user', // TODO: Gestire utente corrente
                instanceConfigOverrides: typeof currentConfig === 'object' ? JSON.stringify(currentConfig) : currentConfig,
                description: `Vista personalizzata di ${this.moduleDefinition.description || this.moduleDefinition.moduleId}`
            };

            const savedInstance = await window.saveInstanceService.createInstance(instanceData);
            
            console.log('✅ [template-module-renderer] Vista salvata:', savedInstance);
            
            // Notifica successo
            this.dispatchEvent(new CustomEvent('instance-saved', {
                detail: { instance: savedInstance },
                bubbles: true
            }));

        } catch (error) {
            console.error('❌ [template-module-renderer] Errore salvataggio vista:', error);
            alert('Errore nel salvataggio della vista: ' + error.message);
        }
    }

    /**
     * ✨ FASE 2: Estrae configurazione corrente salvabile
     */
    extractCurrentConfig() {
        if (!window.saveInstanceService || !this.moduleDefinition) {
            return {};
        }

        const currentConfig = {
            viewMode: this.getAttribute('view-mode') || 'default',
            showTitle: this.getAttribute('show-title') !== 'false',
            showActions: this.getAttribute('show-actions') !== 'false'
        };

        return window.saveInstanceService.extractSavableConfig(
            this.moduleDefinition, 
            currentConfig
        );
    }

    /**
     * ✨ FASE 2: Gestisce eventi attribute-editor
     */
    handleAttributeSaved(event) {
        const { attributeName } = event.detail;
        this.dirtyAttributes.delete(attributeName);
        console.log(`✅ [template-module-renderer] Attributo salvato: ${attributeName}`);
    }

    handleAttributeChanging(event) {
        const { attributeName, isDirty } = event.detail;
        if (isDirty) {
            this.dirtyAttributes.add(attributeName);
        } else {
            this.dirtyAttributes.delete(attributeName);
        }
    }

    handleAttributeSaveError(event) {
        const { attributeName, error } = event.detail;
        console.error(`❌ [template-module-renderer] Errore salvataggio ${attributeName}:`, error);
    }

    /**
     * Gestisce azioni personalizzate
     */
    handleAction(actionId, event) {
        console.log(`🎬 [template-module-renderer] Azione: ${actionId}`);
        
        // Emette evento per gestione esterna
        this.dispatchEvent(new CustomEvent('module-action', {
            detail: {
                actionId,
                moduleId: this.moduleDefinition.moduleId,
                entityId: this.getAttribute('entity-id'),
                entityData: this.entityData
            },
            bubbles: true
        }));
    }

    /**
     * Gestisce azioni attributo
     */
    handleAttributeAction(actionDetail) {
        console.log('🎯 [template-module-renderer] Azione attributo:', actionDetail);
        
        this.dispatchEvent(new CustomEvent('attribute-action', {
            detail: actionDetail,
            bubbles: true
        }));
    }

    /**
     * Aggiorna dati
     */
    async refreshData() {
        try {
            const entityId = this.getAttribute('entity-id');
            if (window.entityService && entityId) {
                this.entityData = await window.entityService.getEntity(entityId);
                this.render();
                console.log('🔄 [template-module-renderer] Dati aggiornati');
            }
        } catch (error) {
            console.error('❌ [template-module-renderer] Errore aggiornamento dati:', error);
        }
    }

    /**
     * Configura sottoscrizioni WebSocket
     */
    setupWebSocketSubscriptions() {
        if (!window.webSocketService) return;

        const entityId = this.getAttribute('entity-id');
        const entityType = this.normalizeEntityType(
            this.getAttribute('entity-type') || this.moduleDefinition?.targetEntityType
        );

        // Sottoscrizione per cambiamenti attributi
        const attrSubId = window.webSocketService.subscribe('attributeChange', (message) => {
            this.handleAttributeChange(message);
        });
        this.wsSubscriptions.push(attrSubId);

        // Sottoscrizione per cambiamenti schema (se specificato entity-type)
        if (entityType) {
            const schemaSubId = window.webSocketService.subscribe(`schema-update:${entityType}`, (message) => {
                this.handleSchemaUpdate(message);
            });
            this.wsSubscriptions.push(schemaSubId);
        }

        console.log(`📡 [template-module-renderer] Sottoscrizioni WebSocket attive: ${this.wsSubscriptions.length}`);
    }

    /**
     * Gestisce cambiamenti attributi via WebSocket
     */
    handleAttributeChange(message) {
        if (message.data && message.data.entityId === this.getAttribute('entity-id')) {
            const { attributeName, newValue } = message.data;
            
            // Aggiorna i dati locali
            if (this.entityData) {
                this.entityData[attributeName] = newValue;
            }

            // Aggiorna il display dell'attributo specifico
            const attributeDisplay = this.shadowRoot.querySelector(`attribute-display[data-attribute="${attributeName}"]`);
            if (attributeDisplay) {
                attributeDisplay.updateValue(newValue);
            }

            // ✨ FASE 2: Aggiorna anche attribute-editor se in modalità editing
            const attributeEditor = this.shadowRoot.querySelector(`attribute-editor[data-attribute="${attributeName}"]`);
            if (attributeEditor && !this.isEditMode) {
                attributeEditor.setValue(newValue);
            }

            console.log(`🔄 [template-module-renderer] Attributo aggiornato: ${attributeName} = ${newValue}`);
        }
    }

    /**
     * Gestisce aggiornamenti schema via WebSocket
     */
    handleSchemaUpdate(message) {
        console.log('📐 [template-module-renderer] Schema aggiornato, re-rendering...');
        this.loadAndRender(); // Re-carica tutto per nuova struttura
    }

    /**
     * Pulisce sottoscrizioni WebSocket
     */
    cleanupWebSocketSubscriptions() {
        if (window.webSocketService) {
            this.wsSubscriptions.forEach(subId => {
                window.webSocketService.unsubscribe(subId);
            });
        }
        this.wsSubscriptions = [];
    }

    /**
     * ✨ FASE 2: API pubbliche estese
     */
    enterEditMode() {
        this.isEditMode = true;
        this.setAttribute('edit-mode', 'true');
    }

    exitEditMode() {
        this.isEditMode = false;
        this.setAttribute('edit-mode', 'false');
    }

    hasUnsavedChanges() {
        return this.dirtyAttributes.size > 0;
    }

    getDirtyAttributes() {
        return Array.from(this.dirtyAttributes);
    }

    /**
     * Stili CSS base
     */
    getBaseStyles() {
        return `
            :host {
                display: block;
                margin-bottom: 1rem;
            }
            
            .module-container {
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                background-color: white;
                overflow: hidden;
                transition: all 0.2s ease-in-out;
            }
            
            .module-container.edit-mode {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
        `;
    }

    /**
     * ✨ FASE 2: Stili editing
     */
    getEditStyles() {
        return `
            .edit-indicator {
                background-color: #3b82f6;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.625rem;
                font-weight: 500;
            }

            .save-changes-button {
                background-color: #10b981;
                color: white;
                border-color: #10b981;
            }

            .save-changes-button:hover:not(:disabled) {
                background-color: #059669;
            }

            .save-changes-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .cancel-edit-button {
                background-color: #ef4444;
                color: white;
                border-color: #ef4444;
            }

            .cancel-edit-button:hover {
                background-color: #dc2626;
            }

            .edit-mode-button {
                background-color: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }

            .edit-mode-button:hover {
                background-color: #2563eb;
            }

            .save-as-button {
                background-color: #f59e0b;
                color: white;
                border-color: #f59e0b;
            }

            .save-as-button:hover {
                background-color: #d97706;
            }
        `;
    }

    /**
     * Stili CSS per il modulo
     */
    getModuleStyles() {
        return `
            .module-header {
                background-color: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                padding: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .module-title {
                margin: 0;
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
            }
            
            .module-meta {
                display: flex;
                gap: 0.5rem;
                font-size: 0.75rem;
                color: #6b7280;
                align-items: center;
            }
            
            .module-content {
                padding: 1rem;
            }
            
            .content-section {
                margin-bottom: 1.5rem;
            }
            
            .content-section:last-child {
                margin-bottom: 0;
            }
            
            .section-title {
                margin: 0 0 0.75rem 0;
                font-size: 1rem;
                font-weight: 500;
                color: #374151;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 0.25rem;
            }
            
            .section-attributes {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }
            
            .attributes-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }
            
            .compact-attributes {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .module-actions {
                border-top: 1px solid #e5e7eb;
                padding: 0.75rem 1rem;
                background-color: #f9fafb;
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
            }
            
            .action-button {
                padding: 0.5rem 1rem;
                border: 1px solid #d1d5db;
                border-radius: 0.375rem;
                background-color: white;
                color: #374151;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.15s ease-in-out;
            }
            
            .action-button:hover:not(:disabled) {
                background-color: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .action-button:active {
                background-color: #e5e7eb;
            }
            
            /* Responsive */
            @media (max-width: 640px) {
                .section-attributes,
                .attributes-container {
                    grid-template-columns: 1fr;
                }
                
                .compact-attributes {
                    flex-direction: column;
                }
                
                .module-actions {
                    flex-direction: column;
                }
            }
        `;
    }
}

// Registra il Web Component
customElements.define('template-module-renderer', TemplateModuleRenderer);

console.log('✅ [template-module-renderer] Web Component registrato (Fase 2 - Editing & Actions)'); 