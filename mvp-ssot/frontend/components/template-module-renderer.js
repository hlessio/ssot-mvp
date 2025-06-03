/**
 * template-module-renderer.js - Web Component core per renderizzare moduli da template
 * 
 * Questo è il componente centrale della Fase 1 del frontend evoluto.
 * Responsabilità:
 * - Caricare e renderizzare moduli basati su template JSON
 * - Integrazione con tutti i servizi (ModuleDefinition, Schema, Entity, WebSocket)
 * - Gestire sottoscrizioni WebSocket per aggiornamenti real-time
 * - Fornire base per future espansioni (editing, azioni, relazioni)
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
        
        // Sottoscrizioni WebSocket
        this.wsSubscriptions = [];
        
        // Cache
        this.attributeComponents = new Map();
    }

    static get observedAttributes() {
        return [
            'module-id', 'entity-id', 'entity-type', 'view-mode', 
            'show-title', 'show-actions', 'auto-refresh'
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #9ca3af;
                    font-style: italic;
                }
            </style>
            <div class="module-container">
                <div class="empty-container">
                    Nessun dato da visualizzare
                </div>
            </div>
        `;
    }

    /**
     * Renderizza il modulo principale
     */
    renderModule() {
        const showTitle = this.hasAttribute('show-title');
        const viewMode = this.getAttribute('view-mode') || 'default';
        
        // Determina quale vista usare
        const view = this.getViewConfiguration(viewMode);
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
                ${this.getModuleStyles()}
            </style>
            <div class="module-container" data-module-id="${this.moduleDefinition.moduleId}">
                ${showTitle ? this.renderModuleHeader() : ''}
                ${this.renderModuleContent(view)}
                ${this.renderModuleActions()}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Renderizza l'header del modulo
     */
    renderModuleHeader() {
        return `
            <div class="module-header">
                <h3 class="module-title">${this.moduleDefinition.description || this.moduleDefinition.moduleId}</h3>
                <div class="module-meta">
                    <span class="module-version">v${this.moduleDefinition.moduleVersion}</span>
                    <span class="entity-type">${this.moduleDefinition.targetEntityType}</span>
                </div>
            </div>
        `;
    }

    /**
     * Renderizza il contenuto del modulo
     */
    renderModuleContent(view) {
        const renderer = view.renderer || 'StandardCardRenderer';
        
        switch (renderer) {
            case 'StandardCardRenderer':
                return this.renderStandardCard(view);
            case 'CompactCardRenderer':
                return this.renderCompactCard(view);
            case 'ListRenderer':
                return this.renderList(view);
            default:
                return this.renderStandardCard(view);
        }
    }

    /**
     * Renderizza una vista card standard
     */
    renderStandardCard(view) {
        const attributesToShow = this.getAttributesToShow(view);
        const layout = view.layout || null;

        if (layout && Array.isArray(layout)) {
            // Rendering con layout strutturato
            return this.renderStructuredLayout(layout, attributesToShow);
        } else {
            // Rendering semplice per attributi
            return this.renderSimpleAttributes(attributesToShow);
        }
    }

    /**
     * Renderizza layout strutturato con sezioni
     */
    renderStructuredLayout(layout, attributesToShow) {
        return `
            <div class="module-content structured">
                ${layout.map(section => `
                    <div class="content-section">
                        ${section.sectionTitle ? `<h4 class="section-title">${section.sectionTitle}</h4>` : ''}
                        <div class="section-attributes">
                            ${section.attributes.map(attrName => 
                                this.renderAttributeDisplay(attrName)
                            ).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Renderizza attributi in forma semplice
     */
    renderSimpleAttributes(attributesToShow) {
        return `
            <div class="module-content simple">
                <div class="attributes-container">
                    ${attributesToShow.map(attrName => 
                        this.renderAttributeDisplay(attrName)
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Renderizza un singolo attribute-display
     */
    renderAttributeDisplay(attributeName) {
        const value = this.entityData[attributeName] || '';
        const entityType = this.entityData.entityType || this.getAttribute('entity-type') || this.moduleDefinition.targetEntityType;
        
        return `
            <attribute-display
                attribute-name="${attributeName}"
                value="${value}"
                entity-type="${entityType}"
                entity-id="${this.entityData.id}"
                show-label
                class="module-attribute"
                data-attribute="${attributeName}">
            </attribute-display>
        `;
    }

    /**
     * Renderizza vista compatta
     */
    renderCompactCard(view) {
        const attributesToShow = this.getAttributesToShow(view);
        
        return `
            <div class="module-content compact">
                <div class="compact-attributes">
                    ${attributesToShow.slice(0, 3).map(attrName => 
                        this.renderCompactAttribute(attrName)
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Renderizza attributo in forma compatta
     */
    renderCompactAttribute(attributeName) {
        const value = this.entityData[attributeName] || '';
        const entityType = this.entityData.entityType || this.getAttribute('entity-type') || this.moduleDefinition.targetEntityType;
        
        return `
            <attribute-display
                attribute-name="${attributeName}"
                value="${value}"
                entity-type="${entityType}"
                entity-id="${this.entityData.id}"
                inline
                class="compact-attribute"
                data-attribute="${attributeName}">
            </attribute-display>
        `;
    }

    /**
     * Renderizza le azioni del modulo
     */
    renderModuleActions() {
        if (!this.hasAttribute('show-actions') || !this.moduleDefinition.actions) {
            return '';
        }

        return `
            <div class="module-actions">
                ${this.moduleDefinition.actions.map(action => `
                    <button class="action-button" data-action="${action.actionId}">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    /**
     * Ottiene la configurazione della vista
     */
    getViewConfiguration(viewMode) {
        if (viewMode !== 'default' && this.moduleDefinition.views && this.moduleDefinition.views[viewMode]) {
            return this.moduleDefinition.views[viewMode];
        }
        return this.moduleDefinition.defaultView;
    }

    /**
     * Ottiene gli attributi da mostrare per una vista
     */
    getAttributesToShow(view) {
        if (view.attributesToDisplay) {
            return view.attributesToDisplay;
        }
        
        if (view.layout && Array.isArray(view.layout)) {
            return view.layout.flatMap(section => section.attributes || []);
        }
        
        // Fallback: tutti gli attributi dell'entità tranne quelli di sistema
        return Object.keys(this.entityData).filter(key => 
            !['id', 'entityType', 'createdAt', 'updatedAt'].includes(key)
        );
    }

    /**
     * Attacca event listeners
     */
    attachEventListeners() {
        // Event listeners per azioni
        const actionButtons = this.shadowRoot.querySelectorAll('.action-button');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const actionId = e.target.getAttribute('data-action');
                this.handleAction(actionId, e);
            });
        });

        // Event listeners per attribute-display components
        const attributeDisplays = this.shadowRoot.querySelectorAll('attribute-display');
        attributeDisplays.forEach(display => {
            display.addEventListener('attribute-action', (e) => {
                this.handleAttributeAction(e.detail);
            });
        });
    }

    /**
     * Gestisce le azioni del modulo
     */
    handleAction(actionId, event) {
        console.log(`🎬 [template-module-renderer] Azione: ${actionId}`);
        
        // Emetti evento personalizzato
        this.dispatchEvent(new CustomEvent('module-action', {
            detail: {
                actionId: actionId,
                moduleId: this.moduleDefinition.moduleId,
                entityId: this.entityData.id,
                entityData: this.entityData
            },
            bubbles: true
        }));

        // Gestione azioni predefinite
        switch (actionId) {
            case 'refresh':
                this.refreshData();
                break;
            case 'edit':
                this.enableEditMode();
                break;
            default:
                console.log(`⚠️ [template-module-renderer] Azione non gestita: ${actionId}`);
        }
    }

    /**
     * Gestisce azioni su attributi
     */
    handleAttributeAction(actionDetail) {
        console.log(`🎬 [template-module-renderer] Azione attributo:`, actionDetail);
        
        // Propaga l'evento
        this.dispatchEvent(new CustomEvent('attribute-action', {
            detail: {
                ...actionDetail,
                moduleId: this.moduleDefinition.moduleId
            },
            bubbles: true
        }));
    }

    /**
     * Aggiorna i dati dell'entità
     */
    async refreshData() {
        try {
            this.entityData = await window.entityService.getEntity(
                this.getAttribute('entity-id'), 
                { forceRefresh: true }
            );
            this.render();
        } catch (error) {
            console.error('❌ [template-module-renderer] Errore refresh:', error);
        }
    }

    /**
     * Abilita modalità editing (per future implementazioni)
     */
    enableEditMode() {
        console.log('🔧 [template-module-renderer] Modalità editing non ancora implementata');
        // TODO: Implementare in Fase 2
    }

    /**
     * Configura sottoscrizioni WebSocket
     */
    setupWebSocketSubscriptions() {
        if (!window.webSocketService) return;

        const entityId = this.getAttribute('entity-id');
        const entityType = this.getAttribute('entity-type') || this.moduleDefinition?.targetEntityType;

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
            
            .action-button:hover {
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
                
                .module-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
            }
        `;
    }
}

// Registra il Web Component
customElements.define('template-module-renderer', TemplateModuleRenderer);

export default TemplateModuleRenderer; 