/**
 * ListModule - Visualizzazione lista compatta per entità
 * 
 * Mostra le entità in una lista pulita con azioni rapide
 * Ottimizzato per visualizzazione di molte entità
 */

class ListModule {
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
        this.sortBy = null;
        this.sortDirection = 'asc';
        this.searchQuery = '';
        
        // DOM refs
        this.listContainer = null;
        this.searchInput = null;
        
        // Sync
        this.instanceId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.init();
    }
    
    async init() {
        try {
            this.render();
            await this.loadSchema();
            await this.loadEntities();
            this.initRealTimeSync();
            
        } catch (error) {
            console.error('❌ Errore inizializzazione ListModule:', error);
            this.renderError(error.message);
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="list-module">
                <div class="list-module-header mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h6 class="mb-1">Lista: ${this.entityType}</h6>
                            <small class="text-muted" id="list-count">0 elementi</small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" id="add-item">
                                <i class="bi bi-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" id="refresh-list">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="search-box">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">
                                <i class="bi bi-search"></i>
                            </span>
                            <input type="text" 
                                   class="form-control" 
                                   id="search-input"
                                   placeholder="Cerca entità...">
                            <button class="btn btn-outline-secondary" type="button" id="clear-search">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="list-container" id="list-container">
                    <div class="text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.listContainer = this.container.querySelector('#list-container');
        this.searchInput = this.container.querySelector('#search-input');
        this.bindEvents();
    }
    
    bindEvents() {
        // Add item button
        this.container.querySelector('#add-item').addEventListener('click', () => {
            this.createNewEntity();
        });
        
        // Refresh button
        this.container.querySelector('#refresh-list').addEventListener('click', () => {
            this.loadEntities();
        });
        
        // Search input
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.trim();
                this.filterAndRenderList();
            }, 300);
        });
        
        // Clear search
        this.container.querySelector('#clear-search').addEventListener('click', () => {
            this.searchInput.value = '';
            this.searchQuery = '';
            this.filterAndRenderList();
        });
    }
    
    async loadSchema() {
        try {
            const response = await fetch(`/api/schema/entity/${this.entityType}?format=semantic-ui`);
            const result = await response.json();
            
            if (result.success) {
                this.schema = result.data;
                
                // Set default sort by primary attribute
                const primaryAttrs = this.getPrimaryAttributes();
                if (primaryAttrs.length > 0) {
                    this.sortBy = primaryAttrs[0];
                }
            } else {
                throw new Error(result.error || 'Schema non trovato');
            }
        } catch (error) {
            console.error('❌ Errore caricamento schema ListModule:', error);
            throw error;
        }
    }
    
    async loadEntities() {
        try {
            this.setLoadingState(true);
            
            const response = await fetch(`/api/entities?entityType=${this.entityType}&limit=100`);
            const result = await response.json();
            
            if (result.success) {
                this.entities = result.data || [];
                this.sortEntities();
                this.filterAndRenderList();
                this.updateCount();
            } else {
                throw new Error(result.error || 'Errore caricamento entità');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento entità ListModule:', error);
            this.renderError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    sortEntities() {
        if (!this.sortBy) return;
        
        this.entities.sort((a, b) => {
            let aVal = a[this.sortBy] || '';
            let bVal = b[this.sortBy] || '';
            
            // Handle different types
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }
            
            if (this.sortDirection === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }
    
    filterAndRenderList() {
        let filteredEntities = this.entities;
        
        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredEntities = this.entities.filter(entity => {
                return Object.values(entity).some(value => {
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(query);
                    }
                    return false;
                });
            });
        }
        
        this.renderList(filteredEntities);
        this.updateCount(filteredEntities.length);
    }
    
    renderList(entities) {
        if (!entities.length) {
            this.listContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-list-ul" style="font-size: 2rem;"></i>
                    <div class="mt-2">
                        ${this.searchQuery ? 'Nessun risultato trovato' : 'Nessuna entità trovata'}
                    </div>
                    ${!this.searchQuery ? `
                        <button class="btn btn-sm btn-outline-primary mt-2" id="create-first-list">
                            <i class="bi bi-plus me-1"></i>Crea prima entità
                        </button>
                    ` : ''}
                </div>
            `;
            
            this.listContainer.querySelector('#create-first-list')?.addEventListener('click', () => {
                this.createNewEntity();
            });
            return;
        }
        
        const listItems = entities.map(entity => this.renderListItem(entity)).join('');
        
        this.listContainer.innerHTML = `
            <div class="list-group list-group-flush">
                ${this.renderListHeader()}
                ${listItems}
            </div>
        `;
        
        this.bindListEvents();
    }
    
    renderListHeader() {
        if (!this.schema?.attributes) return '';
        
        const visibleAttributes = this.getVisibleAttributes();
        
        const headerCols = visibleAttributes.map(attr => {
            const uiMetadata = this.schema.attributes[attr]?.uiMetadata || {};
            const label = uiMetadata.label || attr;
            const isSorted = this.sortBy === attr;
            const sortIcon = isSorted ? 
                (this.sortDirection === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up') : 
                'bi-sort-alpha-down text-muted';
            
            return `
                <div class="col list-header-col" data-sort="${attr}">
                    <small class="text-muted fw-bold cursor-pointer">
                        ${label}
                        <i class="bi ${sortIcon} ms-1"></i>
                    </small>
                </div>
            `;
        }).join('');
        
        return `
            <div class="list-group-item bg-light border-0">
                <div class="row align-items-center">
                    ${headerCols}
                    <div class="col-auto">
                        <small class="text-muted fw-bold">Azioni</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderListItem(entity) {
        if (!this.schema?.attributes) return '';
        
        const visibleAttributes = this.getVisibleAttributes();
        
        const cols = visibleAttributes.map(attr => {
            const value = entity[attr] || '';
            const uiMetadata = this.schema.attributes[attr]?.uiMetadata || {};
            const icon = uiMetadata.icon || this.getDefaultIcon(this.schema.attributes[attr]?.type);
            
            let displayValue = value;
            
            // Format based on type
            if (this.schema.attributes[attr]?.type === 'date' && value) {
                displayValue = this.formatDate(value);
            } else if (this.schema.attributes[attr]?.type === 'boolean') {
                displayValue = value ? '✓' : '✗';
            } else if (typeof value === 'string' && value.length > 30) {
                displayValue = value.substring(0, 30) + '...';
            }
            
            return `
                <div class="col">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${icon} text-muted me-2" style="font-size: 0.875rem;"></i>
                        <span class="editable-value" 
                              data-entity-id="${entity.id}" 
                              data-attribute="${attr}"
                              data-bs-toggle="tooltip" 
                              title="${value}">${displayValue}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="list-group-item border-0 list-item" data-entity-id="${entity.id}">
                <div class="row align-items-center">
                    ${cols}
                    <div class="col-auto">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary btn-sm edit-item" 
                                    data-entity-id="${entity.id}"
                                    data-bs-toggle="tooltip" title="Modifica">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm duplicate-item" 
                                    data-entity-id="${entity.id}"
                                    data-bs-toggle="tooltip" title="Duplica">
                                <i class="bi bi-copy"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-sm delete-item" 
                                    data-entity-id="${entity.id}"
                                    data-bs-toggle="tooltip" title="Elimina">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="row mt-1">
                    <div class="col">
                        <small class="text-muted">
                            <i class="bi bi-clock me-1"></i>
                            ${this.formatDate(entity.modifiedAt || entity.createdAt)}
                            <span class="ms-2">ID: ${entity.id.substr(0, 8)}...</span>
                        </small>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindListEvents() {
        // Sort headers
        this.listContainer.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', () => {
                const sortBy = header.dataset.sort;
                
                if (this.sortBy === sortBy) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortBy;
                    this.sortDirection = 'asc';
                }
                
                this.sortEntities();
                this.filterAndRenderList();
            });
        });
        
        // Inline editing
        this.listContainer.querySelectorAll('.editable-value').forEach(span => {
            span.addEventListener('click', (e) => {
                this.makeValueEditable(e.target);
            });
        });
        
        // Action buttons
        this.listContainer.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entityId = e.target.closest('[data-entity-id]').dataset.entityId;
                this.editEntity(entityId);
            });
        });
        
        this.listContainer.querySelectorAll('.duplicate-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entityId = e.target.closest('[data-entity-id]').dataset.entityId;
                this.duplicateEntity(entityId);
            });
        });
        
        this.listContainer.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entityId = e.target.closest('[data-entity-id]').dataset.entityId;
                this.deleteEntity(entityId);
            });
        });
    }
    
    makeValueEditable(span) {
        const currentValue = span.textContent;
        const entityId = span.dataset.entityId;
        const attributeName = span.dataset.attribute;
        
        // Create inline input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'form-control form-control-sm';
        input.style.width = 'auto';
        input.style.minWidth = '120px';
        
        // Replace span with input
        span.style.display = 'none';
        span.parentNode.insertBefore(input, span.nextSibling);
        input.focus();
        input.select();
        
        const saveEdit = async () => {
            const newValue = input.value.trim();
            
            if (newValue !== currentValue && newValue !== '') {
                try {
                    await this.updateEntityAttribute(entityId, attributeName, newValue);
                    span.textContent = newValue;
                    span.title = newValue;
                    this.showSyncIndicator(entityId);
                } catch (error) {
                    console.error('❌ Errore aggiornamento:', error);
                    span.textContent = currentValue;
                }
            }
            
            // Restore span
            input.remove();
            span.style.display = '';
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                input.remove();
                span.style.display = '';
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
        
        // Update local cache
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
                this.sortEntities();
                this.filterAndRenderList();
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
                this.filterAndRenderList();
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
        this.broadcastChannel = new BroadcastChannel('ssot-list-module');
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
                
                // Re-render list to show updated value
                this.filterAndRenderList();
                this.showSyncIndicator(entityId);
                
                console.log(`🔄 ListModule sincronizzato via WebSocket: ${attributeName} = ${newValue}`);
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
            
            this.filterAndRenderList();
            this.showSyncIndicator(entityId);
            
            console.log(`🔄 ListModule sincronizzato via BroadcastChannel: ${attributeName} = ${value}`);
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
    
    showSyncIndicator(entityId) {
        const item = this.listContainer.querySelector(`[data-entity-id="${entityId}"]`);
        if (item) {
            item.classList.add('bg-success-subtle');
            setTimeout(() => {
                item.classList.remove('bg-success-subtle');
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
        
        // Fallback: first string attribute
        const stringAttrs = Object.entries(this.schema.attributes)
            .filter(([_, def]) => def.type === 'string')
            .map(([name]) => name);
            
        return stringAttrs.slice(0, 1);
    }
    
    getVisibleAttributes() {
        if (!this.schema?.attributes) return [];
        
        const primary = this.getPrimaryAttributes();
        const all = Object.keys(this.schema.attributes);
        
        // Primary + next most important attributes (max 4 per row)
        const visible = [...primary];
        const remaining = all.filter(attr => !visible.includes(attr) && attr !== 'id');
        
        // Priority order for secondary attributes
        const secondaryOrder = ['email', 'telefono', 'phone', 'descrizione', 'description', 'status'];
        
        for (const attr of secondaryOrder) {
            if (remaining.includes(attr) && visible.length < 4) {
                visible.push(attr);
            }
        }
        
        // Fill remaining slots
        for (const attr of remaining) {
            if (visible.length >= 4) break;
            if (!visible.includes(attr)) {
                visible.push(attr);
            }
        }
        
        return visible;
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
            this.listContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                </div>
            `;
        }
    }
    
    updateCount(filteredCount = null) {
        const countElement = this.container.querySelector('#list-count');
        if (countElement) {
            const total = this.entities.length;
            const displayed = filteredCount !== null ? filteredCount : total;
            
            if (filteredCount !== null && filteredCount !== total) {
                countElement.textContent = `${displayed} di ${total} elementi`;
            } else {
                countElement.textContent = `${total} elementi`;
            }
        }
    }
    
    renderError(message) {
        this.listContainer.innerHTML = `
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
window.ListModule = ListModule;