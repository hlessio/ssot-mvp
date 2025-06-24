/**
 * saved-module-instance.js - Web Component per renderizzare istanze di modulo salvate
 * 
 * ✨ FASE 2: Componente per gestire ModuleInstance salvabili
 * 
 * Responsabilità:
 * - Caricare istanza di modulo da SaveInstanceService
 * - Applicare configurazioni override dalla istanza
 * - Delegare rendering a template-module-renderer con configurazioni merge
 * - Gestire aggiornamenti istanza (nome, configurazioni)
 * - Supportare azioni specifiche per istanze (duplica, elimina, modifica config)
 */

class SavedModuleInstance extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Stato del componente
        this.instanceData = null;
        this.templateDefinition = null;
        this.entityData = null;
        this.isLoading = false;
        this.hasError = false;
        this.errorMessage = '';
        
        // Configurazione merge
        this.mergedConfig = null;
        
        // Binding metodi
        this.handleInstanceAction = this.handleInstanceAction.bind(this);
        this.handleConfigEdit = this.handleConfigEdit.bind(this);
        this.handleDuplicate = this.handleDuplicate.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
    }

    static get observedAttributes() {
        return [
            'instance-id', 'show-instance-actions', 'show-title', 
            'edit-mode', 'compact-mode'
        ];
    }

    connectedCallback() {
        this.loadInstanceAndRender();
    }

    disconnectedCallback() {
        // Cleanup se necessario
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.isConnected) {
            if (name === 'instance-id') {
                this.loadInstanceAndRender();
            } else {
                this.render();
            }
        }
    }

    /**
     * Carica istanza e tutti i dati correlati, poi renderizza
     */
    async loadInstanceAndRender() {
        try {
            this.isLoading = true;
            this.hasError = false;
            this.render(); // Mostra loading

            await this.loadInstanceData();
            await this.loadTemplateDefinition();
            await this.loadEntityData();
            this.mergeConfigurations();

            this.isLoading = false;
            this.render();

        } catch (error) {
            console.error('❌ [saved-module-instance] Errore caricamento:', error);
            this.isLoading = false;
            this.hasError = true;
            this.errorMessage = error.message;
            this.render();
        }
    }

    /**
     * Carica dati istanza da SaveInstanceService
     */
    async loadInstanceData() {
        const instanceId = this.getAttribute('instance-id');
        if (!instanceId) {
            throw new Error('instance-id è richiesto');
        }

        if (!window.saveInstanceService) {
            throw new Error('SaveInstanceService non disponibile');
        }

        this.instanceData = await window.saveInstanceService.getInstance(instanceId);
        console.log(`✅ [saved-module-instance] Istanza caricata: ${instanceId}`, this.instanceData);
    }

    /**
     * Carica template definition basata sull'istanza
     */
    async loadTemplateDefinition() {
        if (!this.instanceData || !window.moduleDefinitionService) {
            throw new Error('Dati istanza o ModuleDefinitionService non disponibili');
        }

        this.templateDefinition = await window.moduleDefinitionService.getDefinition(
            this.instanceData.templateModuleId
        );
        console.log(`✅ [saved-module-instance] Template caricato: ${this.instanceData.templateModuleId}`);
    }

    /**
     * Carica dati entità target
     */
    async loadEntityData() {
        if (!this.instanceData || !window.entityService) {
            throw new Error('Dati istanza o EntityService non disponibili');
        }

        if (this.instanceData.targetEntityId) {
            this.entityData = await window.entityService.getEntity(this.instanceData.targetEntityId);
            console.log(`✅ [saved-module-instance] Entità caricata: ${this.instanceData.targetEntityId}`);
        } else {
            // Istanza senza entità specifica (possibile per query-based instances)
            this.entityData = null;
            console.log('ℹ️ [saved-module-instance] Istanza senza entità target specifica');
        }
    }

    /**
     * Merge configurazioni template + override istanza
     */
    mergeConfigurations() {
        if (!this.templateDefinition || !this.instanceData) {
            this.mergedConfig = {};
            return;
        }

        if (!window.saveInstanceService) {
            this.mergedConfig = this.templateDefinition;
            return;
        }

        // Usa SaveInstanceService per merge intelligente
        this.mergedConfig = window.saveInstanceService.mergeConfigOverrides(
            this.templateDefinition,
            this.instanceData.instanceConfigOverrides || {}
        );

        console.log('🔧 [saved-module-instance] Configurazioni merge completato:', this.mergedConfig);
    }

    /**
     * Renderizza il componente
     */
    render() {
        if (this.isLoading) {
            this.renderLoading();
        } else if (this.hasError) {
            this.renderError();
        } else if (this.instanceData && this.templateDefinition) {
            this.renderInstance();
        } else {
            this.renderEmpty();
        }
    }

    /**
     * Renderizza stato loading
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
                    border-top: 2px solid #f59e0b;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 0.5rem;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div class="instance-container">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    Caricamento istanza...
                </div>
            </div>
        `;
    }

    /**
     * Renderizza stato errore
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
            <div class="instance-container">
                <div class="error-container">
                    <div class="error-title">Errore nel caricamento dell'istanza</div>
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
            <div class="instance-container">
                <div class="empty-container">
                    Nessuna istanza da visualizzare
                </div>
            </div>
        `;
    }

    /**
     * Renderizza istanza completa
     */
    renderInstance() {
        const showInstanceActions = this.getAttribute('show-instance-actions') !== 'false';
        const compactMode = this.hasAttribute('compact-mode');

        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
                ${this.getInstanceStyles()}
            </style>
            <div class="instance-container ${compactMode ? 'compact' : ''}">
                ${this.renderInstanceHeader()}
                ${this.renderInstanceContent()}
                ${showInstanceActions ? this.renderInstanceActions() : ''}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Renderizza header istanza con metadati
     */
    renderInstanceHeader() {
        const showTitle = this.getAttribute('show-title') !== 'false';
        if (!showTitle) return '';

        const instanceName = this.instanceData.instanceName;
        const templateName = this.templateDefinition.description || this.templateDefinition.moduleId;
        const entityName = this.entityData ? 
            (this.entityData.nome || this.entityData.name || 'Entità') : 'N/A';

        return `
            <div class="instance-header">
                <div class="instance-title-section">
                    <h3 class="instance-title">📋 ${instanceName}</h3>
                    <div class="instance-subtitle">basata su: ${templateName}</div>
                </div>
                <div class="instance-meta">
                    <span class="meta-item">🎯 ${entityName}</span>
                    <span class="meta-item">⚙️ ${Object.keys(this.instanceData.instanceConfigOverrides || {}).length} override</span>
                    <span class="meta-item">📅 ${this.formatDate(this.instanceData.createdAt)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Renderizza contenuto delegando a template-module-renderer
     */
    renderInstanceContent() {
        if (!this.entityData) {
            return `
                <div class="no-entity-message">
                    <p>⚠️ Questa istanza non ha un'entità target specifica</p>
                    <p>Tipo target: ${this.instanceData.targetEntityType}</p>
                </div>
            `;
        }

        // Estrae configurazioni per template-module-renderer
        const viewMode = this.instanceData.instanceConfigOverrides?.viewMode || 'default';
        const showTitle = this.instanceData.instanceConfigOverrides?.showTitle !== false;
        const showActions = this.instanceData.instanceConfigOverrides?.showActions !== false;
        const editMode = this.getAttribute('edit-mode') === 'true';

        return `
            <template-module-renderer
                module-id="${this.instanceData.templateModuleId}"
                entity-id="${this.instanceData.targetEntityId}"
                entity-type="${this.instanceData.targetEntityType}"
                view-mode="${viewMode}"
                show-title="${showTitle}"
                show-actions="${showActions}"
                edit-mode="${editMode}"
                class="embedded-renderer">
            </template-module-renderer>
        `;
    }

    /**
     * Renderizza azioni specifiche per istanze
     */
    renderInstanceActions() {
        return `
            <div class="instance-actions">
                <button class="instance-action-button edit-config-button">
                    ⚙️ Modifica Config
                </button>
                <button class="instance-action-button duplicate-button">
                    📋 Duplica
                </button>
                <button class="instance-action-button delete-button">
                    🗑️ Elimina
                </button>
            </div>
        `;
    }

    /**
     * Gestori eventi
     */
    attachEventListeners() {
        // Azioni istanza
        const editConfigButton = this.shadowRoot.querySelector('.edit-config-button');
        const duplicateButton = this.shadowRoot.querySelector('.duplicate-button');
        const deleteButton = this.shadowRoot.querySelector('.delete-button');

        if (editConfigButton) editConfigButton.addEventListener('click', this.handleConfigEdit);
        if (duplicateButton) duplicateButton.addEventListener('click', this.handleDuplicate);
        if (deleteButton) deleteButton.addEventListener('click', this.handleDelete);

        // Propaga eventi da template-module-renderer embeddato
        const embeddedRenderer = this.shadowRoot.querySelector('.embedded-renderer');
        if (embeddedRenderer) {
            embeddedRenderer.addEventListener('module-action', this.handleInstanceAction);
            embeddedRenderer.addEventListener('instance-saved', this.handleInstanceAction);
        }
    }

    /**
     * Gestisce azioni dall'embedded template-module-renderer
     */
    handleInstanceAction(event) {
        // Arricchisce l'evento con dati istanza
        const enrichedDetail = {
            ...event.detail,
            instanceId: this.instanceData.id,
            instanceName: this.instanceData.instanceName,
            isFromSavedInstance: true
        };

        this.dispatchEvent(new CustomEvent(event.type, {
            detail: enrichedDetail,
            bubbles: true
        }));
    }

    /**
     * Gestisce modifica configurazione istanza
     */
    async handleConfigEdit() {
        try {
            console.log('⚙️ [saved-module-instance] Modifica configurazione istanza');
            
            // Mostra dialogo semplice per editing configurazioni
            const newName = prompt(
                'Nome istanza:', 
                this.instanceData.instanceName
            );
            
            if (newName && newName !== this.instanceData.instanceName) {
                await window.saveInstanceService.updateInstance(this.instanceData.id, {
                    instanceName: newName
                });
                
                // Ricarica istanza
                await this.loadInstanceAndRender();
                
                this.dispatchEvent(new CustomEvent('instance-updated', {
                    detail: { instanceId: this.instanceData.id, changes: { instanceName: newName } },
                    bubbles: true
                }));
            }

        } catch (error) {
            console.error('❌ [saved-module-instance] Errore modifica configurazione:', error);
            alert('Errore nella modifica: ' + error.message);
        }
    }

    /**
     * Gestisce duplicazione istanza
     */
    async handleDuplicate() {
        try {
            const newName = prompt(
                'Nome per la copia:', 
                `Copia di ${this.instanceData.instanceName}`
            );
            
            if (!newName) return;

            console.log('📋 [saved-module-instance] Duplicando istanza');
            
            const duplicatedInstance = await window.saveInstanceService.duplicateInstance(
                this.instanceData.id, 
                newName
            );
            
            this.dispatchEvent(new CustomEvent('instance-duplicated', {
                detail: { 
                    originalInstanceId: this.instanceData.id,
                    duplicatedInstance: duplicatedInstance
                },
                bubbles: true
            }));

            console.log('✅ [saved-module-instance] Istanza duplicata:', duplicatedInstance);

        } catch (error) {
            console.error('❌ [saved-module-instance] Errore duplicazione:', error);
            alert('Errore nella duplicazione: ' + error.message);
        }
    }

    /**
     * Gestisce eliminazione istanza
     */
    async handleDelete() {
        const confirmDelete = confirm(
            `Sei sicuro di voler eliminare l'istanza "${this.instanceData.instanceName}"?\n\nQuesta operazione non può essere annullata.`
        );
        
        if (!confirmDelete) return;

        try {
            console.log('🗑️ [saved-module-instance] Eliminando istanza');
            
            await window.saveInstanceService.deleteInstance(this.instanceData.id);
            
            this.dispatchEvent(new CustomEvent('instance-deleted', {
                detail: { instanceId: this.instanceData.id },
                bubbles: true
            }));

            // Remove self from DOM
            this.remove();

            console.log('✅ [saved-module-instance] Istanza eliminata');

        } catch (error) {
            console.error('❌ [saved-module-instance] Errore eliminazione:', error);
            alert('Errore nell\'eliminazione: ' + error.message);
        }
    }

    /**
     * API pubbliche
     */
    async refreshInstance() {
        // Invalida cache e ricarica
        if (window.saveInstanceService) {
            window.saveInstanceService.invalidateCache(this.instanceData?.id);
        }
        await this.loadInstanceAndRender();
    }

    getInstanceData() {
        return this.instanceData;
    }

    getMergedConfig() {
        return this.mergedConfig;
    }

    /**
     * Utilità
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    }

    /**
     * Stili base
     */
    getBaseStyles() {
        return `
            :host {
                display: block;
                margin-bottom: 1rem;
            }
            
            .instance-container {
                border: 2px solid #f59e0b;
                border-radius: 0.5rem;
                background-color: white;
                overflow: hidden;
                position: relative;
            }

            .instance-container.compact {
                border-width: 1px;
                border-color: #d1d5db;
            }

            .instance-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #f59e0b, #d97706);
            }

            .no-entity-message {
                padding: 2rem;
                text-align: center;
                color: #6b7280;
                background-color: #fffbeb;
                border: 1px solid #fef3c7;
                margin: 1rem;
                border-radius: 0.5rem;
            }

            .no-entity-message p {
                margin: 0.5rem 0;
            }
        `;
    }

    /**
     * Stili specifici istanze
     */
    getInstanceStyles() {
        return `
            .instance-header {
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                border-bottom: 1px solid #f59e0b;
                padding: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .instance-title-section {
                flex: 1;
            }

            .instance-title {
                margin: 0 0 0.25rem 0;
                font-size: 1.125rem;
                font-weight: 600;
                color: #92400e;
            }

            .instance-subtitle {
                font-size: 0.875rem;
                color: #a16207;
                font-style: italic;
            }

            .instance-meta {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                font-size: 0.75rem;
                color: #a16207;
                text-align: right;
            }

            .meta-item {
                background-color: rgba(245, 158, 11, 0.1);
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
            }

            .embedded-renderer {
                border: none;
                margin: 0;
            }

            .instance-actions {
                border-top: 1px solid #f59e0b;
                padding: 0.75rem 1rem;
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
            }

            .instance-action-button {
                padding: 0.375rem 0.75rem;
                border: 1px solid #d97706;
                border-radius: 0.375rem;
                background-color: #f59e0b;
                color: white;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.15s ease-in-out;
            }

            .instance-action-button:hover {
                background-color: #d97706;
                border-color: #b45309;
            }

            .delete-button {
                background-color: #ef4444;
                border-color: #dc2626;
            }

            .delete-button:hover {
                background-color: #dc2626;
                border-color: #b91c1c;
            }

            /* Compact mode */
            .instance-container.compact .instance-header {
                padding: 0.5rem 1rem;
            }

            .instance-container.compact .instance-title {
                font-size: 1rem;
            }

            .instance-container.compact .instance-meta {
                display: none;
            }

            /* Responsive */
            @media (max-width: 640px) {
                .instance-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .instance-meta {
                    flex-direction: row;
                    text-align: left;
                }

                .instance-actions {
                    flex-direction: column;
                }
            }
        `;
    }
}

// Registra il Web Component
customElements.define('saved-module-instance', SavedModuleInstance);

console.log('✅ [saved-module-instance] Web Component registrato (Fase 2 - Module Instances)'); 