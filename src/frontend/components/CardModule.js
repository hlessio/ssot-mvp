/**
 * CardModule - Visualizzazione a schede per entità
 * 
 * Mostra le entità come cards con attributi principali visibili
 * Supporta editing inline e sincronizzazione real-time
 */

class CardModule {
    constructor(container, entityType = null) {
        this.container = container;
        this.entityType = entityType || 'Persona';
        
        // Services
        this.entityService = window.EntityService;
        this.wsService = null;
        this.broadcastChannel = null;
        
        // State
        this.entities = [];
        this.schema = null;
        this.isLoading = false;
        
        // DOM refs
        this.cardsContainer = null;
        
        // Sync
        this.instanceId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.init();
    }
    
    async init() {
        try {
            this.render();
            await this.loadSchema();
            await this.loadEntities();
            this.initRealTimeSync();
            
        } catch (error) {
            console.error('❌ Errore inizializzazione CardModule:', error);
            this.renderError(error.message);
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="card-module">
                <div class="card-module-header mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Entità: ${this.entityType}</h6>
                            <small class="text-muted" id="card-count">0 cards</small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" id="add-card">
                                <i class="bi bi-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" id="refresh-cards">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="cards-container" id="cards-container">
                    <div class="text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.cardsContainer = this.container.querySelector('#cards-container');
        this.bindEvents();
    }
    
    bindEvents() {
        // Add card button
        this.container.querySelector('#add-card').addEventListener('click', () => {
            this.createNewEntity();
        });
        
        // Refresh button
        this.container.querySelector('#refresh-cards').addEventListener('click', () => {
            this.loadEntities();
        });
    }
    
    async loadSchema() {
        try {
            const response = await fetch(`/api/schema/entity/${this.entityType}?format=semantic-ui`);
            const result = await response.json();
            
            if (result.success) {
                this.schema = result.data;
            } else {
                throw new Error(result.error || 'Schema non trovato');
            }
        } catch (error) {
            console.error('❌ Errore caricamento schema CardModule:', error);
            throw error;
        }
    }
    
    async loadEntities() {
        try {
            this.setLoadingState(true);
            
            const response = await fetch(`/api/entities?entityType=${this.entityType}&limit=20`);
            const result = await response.json();
            
            if (result.success) {
                this.entities = result.data || [];
                this.renderCards();
                this.updateCount();
            } else {
                throw new Error(result.error || 'Errore caricamento entità');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento entità CardModule:', error);
            this.renderError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    renderCards() {
        if (!this.schema || !this.entities.length) {
            this.cardsContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-card-text" style="font-size: 2rem;"></i>
                    <div class="mt-2">Nessuna entità trovata</div>
                    <button class="btn btn-sm btn-outline-primary mt-2" id="create-first">
                        <i class="bi bi-plus me-1"></i>Crea prima entità
                    </button>
                </div>
            `;
            
            this.cardsContainer.querySelector('#create-first')?.addEventListener('click', () => {
                this.createNewEntity();
            });
            return;
        }
        
        const cardsHtml = this.entities.map(entity => this.renderSingleCard(entity)).join('');
        
        this.cardsContainer.innerHTML = `
            <div class="row">
                ${cardsHtml}
            </div>
        `;
        
        // Bind events for individual cards
        this.bindCardEvents();
    }
    
    renderSingleCard(entity) {
        if (!this.schema?.attributes) return '';
        
        // Ottieni attributi principali per la card
        const primaryAttributes = this.getPrimaryAttributes();
        const secondaryAttributes = this.getSecondaryAttributes();
        
        // Primary attribute (di solito nome/titolo)
        const primaryAttr = primaryAttributes[0];
        const primaryValue = entity[primaryAttr] || 'Senza nome';
        
        // Secondary attributes
        const secondaryItems = secondaryAttributes.map(attr => {
            const value = entity[attr];
            const uiMetadata = this.schema.attributes[attr]?.uiMetadata || {};
            const icon = uiMetadata.icon || this.getDefaultIcon(this.schema.attributes[attr]?.type);
            const label = uiMetadata.label || attr;
            
            if (!value) return '';
            
            return `
                <div class="d-flex align-items-center mb-1">
                    <i class="bi bi-${icon} text-muted me-2"></i>
                    <small class="text-muted me-2">${label}:</small>
                    <small class="editable-field" 
                           data-entity-id="${entity.id}" 
                           data-attribute="${attr}"
                           data-bs-toggle="tooltip" 
                           title="Click per modificare">${value}</small>
                </div>
            `;
        }).filter(Boolean).join('');
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 entity-card" data-entity-id="${entity.id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0 editable-field" 
                                data-entity-id="${entity.id}" 
                                data-attribute="${primaryAttr}"
                                data-bs-toggle="tooltip" 
                                title="Click per modificare">${primaryValue}</h6>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item edit-entity" href="#" data-entity-id="${entity.id}">
                                        <i class="bi bi-pencil me-2"></i>Modifica
                                    </a></li>
                                    <li><a class="dropdown-item duplicate-entity" href="#" data-entity-id="${entity.id}">
                                        <i class="bi bi-copy me-2"></i>Duplica
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger delete-entity" href="#" data-entity-id="${entity.id}">
                                        <i class="bi bi-trash me-2"></i>Elimina
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="card-attributes">
                            ${secondaryItems}
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>
                                ${this.formatDate(entity.modifiedAt || entity.createdAt)}
                            </small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <small class="text-muted">ID: ${entity.id.substr(0, 8)}...</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindCardEvents() {
        // Inline editing
        this.cardsContainer.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('click', (e) => {
                this.makeFieldEditable(e.target);
            });
        });
        
        // Card actions
        this.cardsContainer.querySelectorAll('.edit-entity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const entityId = e.target.closest('[data-entity-id]').dataset.entityId;
                this.editEntity(entityId);
            });
        });
        
        this.cardsContainer.querySelectorAll('.duplicate-entity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const entityId = e.target.closest('[data-entity-id]').dataset.entityId;
                this.duplicateEntity(entityId);
            });
        });
        
        this.cardsContainer.querySelectorAll('.delete-entity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const entityId = e.target.closest('[data-entity-id]').dataset.entityId;
                this.deleteEntity(entityId);
            });
        });
    }
    
    makeFieldEditable(field) {
        const currentValue = field.textContent;
        const entityId = field.dataset.entityId;
        const attributeName = field.dataset.attribute;
        
        // Crea input temporaneo
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'form-control form-control-sm';
        
        // Sostituisci temporaneamente
        field.style.display = 'none';
        field.parentNode.insertBefore(input, field.nextSibling);
        input.focus();
        input.select();
        
        const saveEdit = async () => {
            const newValue = input.value.trim();
            
            if (newValue !== currentValue && newValue !== '') {
                try {
                    await this.updateEntityAttribute(entityId, attributeName, newValue);
                    field.textContent = newValue;
                    this.showSyncIndicator(entityId);
                } catch (error) {
                    console.error('❌ Errore aggiornamento:', error);
                    // Ripristina valore originale
                    field.textContent = currentValue;
                }
            }
            
            // Ripristina visualizzazione normale
            input.remove();
            field.style.display = '';
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                input.remove();
                field.style.display = '';
            }
        });
    }
    
    async updateEntityAttribute(entityId, attributeName, value) {
        const response = await fetch(`/api/entity/${entityId}/attribute`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attributeName, value })
        });
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Errore aggiornamento');
        }
        
        // Aggiorna cache locale
        const entity = this.entities.find(e => e.id === entityId);
        if (entity) {
            entity[attributeName] = value;
            entity.modifiedAt = new Date().toISOString();
        }
        
        // Broadcast change
        this.broadcastChange(entityId, attributeName, value);
        
        return result;
    }
    
    async createNewEntity() {
        try {
            const primaryAttr = this.getPrimaryAttributes()[0] || 'nome';
            const timestamp = Date.now();
            
            const entityData = {
                entityType: this.entityType,
                [primaryAttr]: `Nuova ${this.entityType} ${timestamp}`
            };
            
            const response = await fetch('/api/entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entityData)
            });
            
            const result = await response.json();
            if (result.success) {
                this.entities.unshift(result.data);
                this.renderCards();
                this.updateCount();
                this.showSyncIndicator(result.data.id);
                
                console.log('✅ Nuova entità creata:', result.data);
            } else {
                throw new Error(result.error || 'Errore creazione entità');
            }
            
        } catch (error) {
            console.error('❌ Errore creazione entità:', error);
            alert(`Errore creazione entità: ${error.message}`);
        }
    }
    
    async deleteEntity(entityId) {
        if (!confirm('Sei sicuro di voler eliminare questa entità?')) return;
        
        try {
            const response = await fetch(`/api/entity/${entityId}`, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.entities = this.entities.filter(e => e.id !== entityId);
                this.renderCards();
                this.updateCount();
                
                console.log('✅ Entità eliminata:', entityId);
            } else {
                throw new Error(result.error || 'Errore eliminazione');
            }
            
        } catch (error) {
            console.error('❌ Errore eliminazione entità:', error);
            alert(`Errore eliminazione: ${error.message}`);
        }
    }
    
    initRealTimeSync() {
        // WebSocket sync
        if (window.wsService) {
            this.wsService = window.wsService;
            
            this.wsService.subscribe({
                type: 'change',
                entityType: this.entityType
            }, (message) => {
                this.handleWebSocketUpdate(message);
            });
        }
        
        // BroadcastChannel sync
        this.broadcastChannel = new BroadcastChannel('ssot-card-module');
        this.broadcastChannel.onmessage = (event) => {
            this.handleBroadcastMessage(event.data);
        };
    }
    
    handleWebSocketUpdate(message) {
        const { entityId, attributeName, data } = message;
        const newValue = data?.newValue;
        
        if (newValue !== undefined) {
            const entity = this.entities.find(e => e.id === entityId);
            if (entity && entity[attributeName] !== newValue) {
                entity[attributeName] = newValue;
                entity.modifiedAt = new Date().toISOString();
                
                // Re-render only affected card
                this.updateSingleCard(entityId);
                this.showSyncIndicator(entityId);
                
                console.log(`🔄 CardModule sincronizzato via WebSocket: ${attributeName} = ${newValue}`);
            }
        }
    }
    
    handleBroadcastMessage(data) {
        if (data.senderId === this.instanceId) return;
        if (data.entityType !== this.entityType) return;
        
        const { entityId, attributeName, value } = data;
        const entity = this.entities.find(e => e.id === entityId);
        
        if (entity && entity[attributeName] !== value) {
            entity[attributeName] = value;
            entity.modifiedAt = new Date().toISOString();
            
            this.updateSingleCard(entityId);
            this.showSyncIndicator(entityId);
            
            console.log(`🔄 CardModule sincronizzato via BroadcastChannel: ${attributeName} = ${value}`);
        }
    }
    
    broadcastChange(entityId, attributeName, value) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'attribute-updated',
                senderId: this.instanceId,
                entityType: this.entityType,
                entityId,
                attributeName,
                value,
                timestamp: Date.now()
            });
        }
    }
    
    updateSingleCard(entityId) {
        const entity = this.entities.find(e => e.id === entityId);
        if (!entity) return;
        
        const cardElement = this.cardsContainer.querySelector(`[data-entity-id="${entityId}"]`);
        if (cardElement) {
            const cardHtml = this.renderSingleCard(entity);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHtml;
            const newCard = tempDiv.firstElementChild;
            
            cardElement.parentNode.replaceChild(newCard, cardElement);
            
            // Re-bind events for the new card
            this.bindCardEventsForElement(newCard);
        }
    }
    
    bindCardEventsForElement(cardElement) {
        // Inline editing
        cardElement.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('click', (e) => {
                this.makeFieldEditable(e.target);
            });
        });
        
        // Actions
        const entityId = cardElement.dataset.entityId;
        
        cardElement.querySelector('.edit-entity')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.editEntity(entityId);
        });
        
        cardElement.querySelector('.duplicate-entity')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.duplicateEntity(entityId);
        });
        
        cardElement.querySelector('.delete-entity')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.deleteEntity(entityId);
        });
    }
    
    showSyncIndicator(entityId) {
        const card = this.cardsContainer.querySelector(`[data-entity-id="${entityId}"]`);
        if (card) {
            card.classList.add('border-success');
            setTimeout(() => {
                card.classList.remove('border-success');
            }, 1000);
        }
    }
    
    getPrimaryAttributes() {
        if (!this.schema?.attributes) return ['nome'];
        
        const priorityOrder = ['nome', 'name', 'title', 'titolo', 'label'];
        
        for (const attr of priorityOrder) {
            if (this.schema.attributes[attr]) {
                return [attr];
            }
        }
        
        // Fallback: primo attributo string
        const stringAttrs = Object.entries(this.schema.attributes)
            .filter(([_, def]) => def.type === 'string')
            .map(([name]) => name);
            
        return stringAttrs.slice(0, 1);
    }
    
    getSecondaryAttributes() {
        if (!this.schema?.attributes) return [];
        
        const primary = this.getPrimaryAttributes()[0];
        const all = Object.keys(this.schema.attributes);
        
        return all.filter(attr => attr !== primary && attr !== 'id').slice(0, 3);
    }
    
    getDefaultIcon(type) {
        const iconMap = {
            'string': 'type',
            'email': 'envelope',
            'phone': 'telephone',
            'number': 'hash',
            'date': 'calendar',
            'boolean': 'check-square'
        };
        return iconMap[type] || 'circle';
    }
    
    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Data non valida';
        }
    }
    
    setLoadingState(loading) {
        if (loading) {
            this.cardsContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                </div>
            `;
        }
    }
    
    updateCount() {
        const countElement = this.container.querySelector('#card-count');
        if (countElement) {
            countElement.textContent = `${this.entities.length} cards`;
        }
    }
    
    renderError(message) {
        this.cardsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Errore: ${message}
            </div>
        `;
    }
    
    // Public methods
    setEntityType(entityType) {
        this.entityType = entityType;
        this.loadSchema().then(() => this.loadEntities());
    }
    
    refresh() {
        this.loadEntities();
    }
    
    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
    }
}

// Export per uso globale
window.CardModule = CardModule;