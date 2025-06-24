/**
 * <relation-list> Web Component
 * Fase 3: Relazioni, Sub-moduli e Riutilizzo Avanzato
 * 
 * Visualizza una lista di entità correlate a un'entità specifica.
 * Supporta:
 * - Rendering tramite sub-module template
 * - Filtri per tipo di relazione e direzione
 * - Azioni su relazioni (crea, elimina, naviga)
 * - Real-time updates via WebSocket
 * - Lazy loading e paginazione
 */
class RelationListComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Proprietà configurabili
        this.sourceEntityId = null;
        this.relationType = null; // null = tutti i tipi
        this.direction = 'both'; // 'out', 'in', 'both'
        this.subModuleId = null; // Template per ogni item
        this.maxItems = 50; // Limite per lazy loading
        this.showActions = true;
        this.allowCreate = true;
        this.allowDelete = true;
        
        // Stato interno
        this.relatedEntities = [];
        this.isLoading = false;
        this.error = null;
        this.relationEventCallback = null;
        
        // Servizi
        this.relationService = window.RelationService;
        this.entityService = window.EntityService;
        this.moduleService = window.ModuleDefinitionService;
        this.webSocketService = window.WebSocketService;
        
        console.log('🔗 RelationListComponent creato');
    }

    static get observedAttributes() {
        return [
            'source-entity-id',
            'relation-type', 
            'direction',
            'sub-module-id',
            'max-items',
            'show-actions',
            'allow-create',
            'allow-delete'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'source-entity-id':
                this.sourceEntityId = newValue;
                break;
            case 'relation-type':
                this.relationType = newValue || null;
                break;
            case 'direction':
                this.direction = newValue || 'both';
                break;
            case 'sub-module-id':
                this.subModuleId = newValue || null;
                break;
            case 'max-items':
                this.maxItems = parseInt(newValue) || 50;
                break;
            case 'show-actions':
                this.showActions = newValue !== 'false';
                break;
            case 'allow-create':
                this.allowCreate = newValue !== 'false';
                break;
            case 'allow-delete':
                this.allowDelete = newValue !== 'false';
                break;
        }
        
        // Re-carica i dati se l'entità sorgente è cambiata
        if (name === 'source-entity-id' && this.sourceEntityId) {
            this.loadRelatedEntities();
        } else {
            this.render();
        }
    }

    connectedCallback() {
        this.setupWebSocketSubscription();
        this.render();
        
        if (this.sourceEntityId) {
            this.loadRelatedEntities();
        }
    }

    disconnectedCallback() {
        this.teardownWebSocketSubscription();
    }

    /**
     * Configura sottoscrizione WebSocket per aggiornamenti real-time
     */
    setupWebSocketSubscription() {
        if (!this.relationService || !this.webSocketService) return;
        
        this.relationEventCallback = (eventType, data) => {
            // Ricarica se l'evento riguarda la nostra entità
            if (this.isEventRelevant(eventType, data)) {
                console.log('🔄 RelationList: Evento relazione rilevante, ricarico');
                this.loadRelatedEntities();
            }
        };
        
        this.relationService.onRelationEvent(this.relationEventCallback);
    }

    /**
     * Rimuove sottoscrizione WebSocket
     */
    teardownWebSocketSubscription() {
        if (this.relationEventCallback && this.relationService) {
            this.relationService.offRelationEvent(this.relationEventCallback);
        }
    }

    /**
     * Determina se un evento WebSocket è rilevante per questo componente
     */
    isEventRelevant(eventType, data) {
        if (!this.sourceEntityId || !data.data) return false;
        
        const eventData = data.data;
        
        // Controlla se l'evento coinvolge la nostra entità
        if (eventData.sourceEntityId === this.sourceEntityId || 
            eventData.targetEntityId === this.sourceEntityId) {
            
            // Se abbiamo un filtro per tipo relazione, controlla che corrisponda
            if (this.relationType && eventData.relationType !== this.relationType) {
                return false;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Carica le entità correlate dal backend
     */
    async loadRelatedEntities() {
        if (!this.sourceEntityId || !this.relationService) {
            console.warn('RelationList: sourceEntityId o relationService mancanti');
            return;
        }

        this.isLoading = true;
        this.error = null;
        this.render();

        try {
            console.log(`🔍 RelationList: Caricamento entità correlate per ${this.sourceEntityId}`);
            console.log(`🔍 RelationList: relationType=${this.relationType}, direction=${this.direction}`);
            
            const result = await this.relationService.getRelatedEntities(
                this.sourceEntityId,
                this.relationType,
                this.direction
            );
            
            console.log(`🔍 RelationList: Risposta ricevuta:`, result);
            
            // ✅ CORREZIONE: Verifica che result sia un array
            if (!Array.isArray(result)) {
                console.error('❌ RelationList: La risposta non è un array:', result);
                this.error = 'Formato dati non valido ricevuto dal server';
                return;
            }
            
            this.relatedEntities = result;
            
            // Applica limite se necessario
            if (this.relatedEntities.length > this.maxItems) {
                this.relatedEntities = this.relatedEntities.slice(0, this.maxItems);
            }
            
            console.log(`✅ RelationList: Caricate ${this.relatedEntities.length} entità correlate`);
            console.log(`🔍 RelationList: Prima entità:`, this.relatedEntities[0]);
            
        } catch (error) {
            console.error('❌ RelationList: Errore caricamento entità correlate:', error);
            console.error('❌ RelationList: Stack trace:', error.stack);
            this.error = error.message;
        } finally {
            console.log(`🔍 RelationList: Termine caricamento - isLoading=${false}, error=${this.error}, count=${this.relatedEntities.length}`);
            this.isLoading = false;
            this.render();
        }
    }

    /**
     * Crea una nuova relazione
     */
    async createRelation(targetEntityId, newRelationType = null) {
        if (!this.sourceEntityId || !targetEntityId || !this.relationService) return;
        
        const relType = newRelationType || this.relationType || 'Correlato';
        
        try {
            console.log(`➕ RelationList: Creazione relazione ${relType}`);
            
            await this.relationService.createRelation(
                relType,
                this.sourceEntityId,
                targetEntityId
            );
            
            this.dispatchEvent(new CustomEvent('relation-created', {
                detail: {
                    relationType: relType,
                    sourceEntityId: this.sourceEntityId,
                    targetEntityId: targetEntityId
                },
                bubbles: true
            }));
            
        } catch (error) {
            console.error('❌ RelationList: Errore creazione relazione:', error);
            this.showError(`Errore creazione relazione: ${error.message}`);
        }
    }

    /**
     * Elimina una relazione esistente
     */
    async deleteRelation(relationId) {
        if (!relationId || !this.relationService) return;
        
        if (!confirm('Sei sicuro di voler eliminare questa relazione?')) {
            return;
        }
        
        try {
            console.log(`🗑️ RelationList: Eliminazione relazione ${relationId}`);
            
            await this.relationService.deleteRelation(relationId);
            
            this.dispatchEvent(new CustomEvent('relation-deleted', {
                detail: { relationId },
                bubbles: true
            }));
            
        } catch (error) {
            console.error('❌ RelationList: Errore eliminazione relazione:', error);
            this.showError(`Errore eliminazione relazione: ${error.message}`);
        }
    }

    /**
     * Naviga a un'entità correlata
     */
    navigateToEntity(entityId) {
        this.dispatchEvent(new CustomEvent('entity-navigate', {
            detail: { entityId },
            bubbles: true
        }));
    }

    /**
     * Mostra un errore temporaneo
     */
    showError(message) {
        this.error = message;
        this.render();
        
        // Rimuovi errore dopo 5 secondi
        setTimeout(() => {
            this.error = null;
            this.render();
        }, 5000);
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
                
                .relation-list {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                    overflow: hidden;
                }
                
                .header {
                    background: #f5f5f5;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .title {
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                }
                
                .count {
                    background: #007bff;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .actions {
                    display: flex;
                    gap: 8px;
                }
                
                .btn {
                    padding: 6px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .btn:hover {
                    background: #f0f0f0;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }
                
                .btn-primary:hover {
                    background: #0056b3;
                }
                
                .btn-danger {
                    background: #dc3545;
                    color: white;
                    border-color: #dc3545;
                }
                
                .btn-danger:hover {
                    background: #c82333;
                }
                
                .content {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .loading {
                    padding: 20px;
                    text-align: center;
                    color: #666;
                }
                
                .error {
                    padding: 12px 16px;
                    background: #f8d7da;
                    color: #721c24;
                    border-left: 4px solid #dc3545;
                    margin: 8px;
                    border-radius: 4px;
                }
                
                .empty {
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                
                .entity-item {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                }
                
                .entity-item:last-child {
                    border-bottom: none;
                }
                
                .entity-item:hover {
                    background: #f8f9fa;
                }
                
                .entity-content {
                    flex: 1;
                    cursor: pointer;
                }
                
                .entity-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
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
                
                .relation-info {
                    font-size: 12px;
                    color: #666;
                    margin-top: 4px;
                }
                
                .relation-type {
                    background: #e9ecef;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-weight: 500;
                }
                
                .entity-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex-shrink: 0;
                }
                
                .icon-btn {
                    width: 24px;
                    height: 24px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .icon-btn:hover {
                    background: #e9ecef;
                }
                
                .sub-module-container {
                    margin-top: 8px;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                @media (max-width: 768px) {
                    .entity-item {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .entity-actions {
                        flex-direction: row;
                        align-self: flex-end;
                    }
                }
            </style>
            
            <div class="relation-list">
                <div class="header">
                    <div>
                        <h4 class="title">
                            ${this.getTitle()}
                            ${this.relatedEntities.length > 0 ? `<span class="count">${this.relatedEntities.length}</span>` : ''}
                        </h4>
                    </div>
                    ${this.showActions ? this.renderHeaderActions() : ''}
                </div>
                
                <div class="content">
                    ${this.renderContent()}
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    /**
     * Restituisce il titolo del componente
     */
    getTitle() {
        if (this.relationType) {
            return `Relazioni: ${this.relationType}`;
        }
        return 'Entità Correlate';
    }

    /**
     * Renderizza le azioni dell'header
     */
    renderHeaderActions() {
        return `
            <div class="actions">
                ${this.allowCreate ? '<button class="btn btn-primary" data-action="create">➕ Crea Relazione</button>' : ''}
                <button class="btn" data-action="refresh">🔄 Aggiorna</button>
            </div>
        `;
    }

    /**
     * Renderizza il contenuto principale
     */
    renderContent() {
        if (this.isLoading) {
            return '<div class="loading">🔄 Caricamento entità correlate...</div>';
        }
        
        if (this.error) {
            return `<div class="error">❌ ${this.error}</div>`;
        }
        
        if (this.relatedEntities.length === 0) {
            return '<div class="empty">Nessuna entità correlata trovata</div>';
        }
        
        return this.relatedEntities.map(relatedEntity => this.renderEntityItem(relatedEntity)).join('');
    }

    /**
     * Renderizza un singolo item entità correlata
     */
    renderEntityItem(relatedEntity) {
        const entity = relatedEntity.relatedEntity;
        const relation = relatedEntity.relation;
        
        // Determina nome visualizzato
        const displayName = entity.nome || entity.name || entity.title || 
                          entity.cognome || entity.id || 'Entità Senza Nome';
        
        return `
            <div class="entity-item" data-entity-id="${entity.id}" data-relation-id="${relation.id}">
                <div class="entity-content" data-action="navigate">
                    <div class="entity-info">
                        <div class="entity-name">${displayName}</div>
                        <div class="entity-type">${entity.entityType || 'Unknown'}</div>
                        <div class="relation-info">
                            <span class="relation-type">${relation.relationType}</span>
                            ${relation.created ? `• ${new Date(relation.created).toLocaleDateString('it-IT')}` : ''}
                        </div>
                    </div>
                    ${this.subModuleId ? this.renderSubModule(entity) : ''}
                </div>
                
                ${this.showActions ? this.renderEntityActions(relation.id) : ''}
            </div>
        `;
    }

    /**
     * Renderizza le azioni per un'entità
     */
    renderEntityActions(relationId) {
        return `
            <div class="entity-actions">
                ${this.allowDelete ? `<button class="icon-btn" data-action="delete" data-relation-id="${relationId}" title="Elimina relazione">🗑️</button>` : ''}
                <button class="icon-btn" data-action="edit" data-relation-id="${relationId}" title="Modifica relazione">✏️</button>
            </div>
        `;
    }

    /**
     * Renderizza sub-modulo per un'entità (placeholder per ora)
     */
    renderSubModule(entity) {
        if (!this.subModuleId) return '';
        
        return `
            <div class="sub-module-container">
                <!-- Sub-modulo: ${this.subModuleId} per entità ${entity.id} -->
                <div style="padding: 8px; font-size: 12px; color: #666;">
                    Sub-modulo: ${this.subModuleId} (da implementare)
                </div>
            </div>
        `;
    }

    /**
     * Attacca event listener agli elementi del DOM
     */
    attachEventListeners() {
        // Header actions
        this.shadowRoot.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handleAction(action, e.target);
            });
        });
        
        // Entity navigation
        this.shadowRoot.querySelectorAll('.entity-content[data-action="navigate"]').forEach(element => {
            element.addEventListener('click', (e) => {
                const entityId = e.currentTarget.closest('.entity-item').getAttribute('data-entity-id');
                this.navigateToEntity(entityId);
            });
        });
    }

    /**
     * Gestisce le azioni dell'interfaccia
     */
    async handleAction(action, element) {
        switch (action) {
            case 'create':
                this.handleCreateAction();
                break;
            case 'refresh':
                await this.loadRelatedEntities();
                break;
            case 'delete':
                const relationId = element.getAttribute('data-relation-id');
                await this.deleteRelation(relationId);
                break;
            case 'edit':
                const editRelationId = element.getAttribute('data-relation-id');
                this.handleEditRelation(editRelationId);
                break;
        }
    }

    /**
     * Gestisce l'azione di creazione relazione
     */
    handleCreateAction() {
        // Per ora, dispatcha evento per gestione esterna
        this.dispatchEvent(new CustomEvent('create-relation-request', {
            detail: {
                sourceEntityId: this.sourceEntityId,
                relationType: this.relationType
            },
            bubbles: true
        }));
    }

    /**
     * Gestisce l'editing di una relazione
     */
    handleEditRelation(relationId) {
        // Per ora, dispatcha evento per gestione esterna
        this.dispatchEvent(new CustomEvent('edit-relation-request', {
            detail: { relationId },
            bubbles: true
        }));
    }
}

// Registra il Web Component
customElements.define('relation-list', RelationListComponent); 