/**
 * FormModule - Visualizzazione form tradizionale per entità
 * 
 * Mostra un form con tutti gli attributi dell'entità
 * Supporta validazione real-time e sincronizzazione
 */

class FormModule {
    constructor(container, entityType = null) {
        this.container = container;
        this.entityType = entityType || 'Persona';
        
        // Services
        this.entityService = window.EntityService;
        this.wsService = null;
        this.broadcastChannel = null;
        
        // State
        this.currentEntity = null;
        this.schema = null;
        this.isLoading = false;
        this.isDirty = false;
        
        // DOM refs
        this.form = null;
        this.entitySelector = null;
        
        // Sync
        this.instanceId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.init();
    }
    
    async init() {
        try {
            this.render();
            await this.loadSchema();
            await this.loadEntityList();
            this.initRealTimeSync();
            
        } catch (error) {
            console.error('❌ Errore inizializzazione FormModule:', error);
            this.renderError(error.message);
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="form-module">
                <div class="form-module-header mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Form Editor: ${this.entityType}</h6>
                            <small class="text-muted">Modifica diretta con validazione real-time</small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-success" id="save-form" disabled>
                                <i class="bi bi-check"></i> Salva
                            </button>
                            <button class="btn btn-sm btn-outline-primary" id="new-form">
                                <i class="bi bi-plus"></i> Nuovo
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="entity-selector mb-3">
                    <label class="form-label">Seleziona Entità</label>
                    <select class="form-select" id="entity-selector">
                        <option value="">-- Seleziona entità esistente --</option>
                    </select>
                </div>
                
                <div class="form-container" id="form-container">
                    <div class="text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Caricamento schema...</span>
                        </div>
                    </div>
                </div>
                
                <div class="form-status mt-3" id="form-status">
                    <small class="text-muted">Pronto per modifiche</small>
                </div>
            </div>
        `;
        
        this.entitySelector = this.container.querySelector('#entity-selector');
        this.bindEvents();
    }
    
    bindEvents() {
        // Entity selector
        this.entitySelector.addEventListener('change', (e) => {
            const entityId = e.target.value;
            if (entityId) {
                this.loadEntity(entityId);
            } else {
                this.clearForm();
            }
        });
        
        // Save button
        this.container.querySelector('#save-form').addEventListener('click', () => {
            this.saveForm();
        });
        
        // New button
        this.container.querySelector('#new-form').addEventListener('click', () => {
            this.createNewEntity();
        });
    }
    
    async loadSchema() {
        try {
            const response = await fetch(`/api/schema/entity/${this.entityType}?format=semantic-ui`);
            const result = await response.json();
            
            if (result.success) {
                this.schema = result.data;
                this.renderForm();
            } else {
                throw new Error(result.error || 'Schema non trovato');
            }
        } catch (error) {
            console.error('❌ Errore caricamento schema FormModule:', error);
            throw error;
        }
    }
    
    async loadEntityList() {
        try {
            const response = await fetch(`/api/entities?entityType=${this.entityType}&limit=50`);
            const result = await response.json();
            
            if (result.success) {
                this.populateEntitySelector(result.data || []);
            }
        } catch (error) {
            console.error('❌ Errore caricamento lista entità:', error);
        }
    }
    
    populateEntitySelector(entities) {
        const options = entities.map(entity => {
            const label = this.getEntityLabel(entity);
            return `<option value="${entity.id}">${label}</option>`;
        }).join('');
        
        this.entitySelector.innerHTML = `
            <option value="">-- Seleziona entità esistente --</option>
            ${options}
        `;
    }
    
    getEntityLabel(entity) {
        const primaryAttrs = ['nome', 'name', 'title', 'titolo', 'label'];
        
        for (const attr of primaryAttrs) {
            if (entity[attr]) {
                return `${entity[attr]} (${entity.id.substr(0, 8)}...)`;
            }
        }
        
        return `Entità ${entity.id.substr(0, 8)}...`;
    }
    
    renderForm() {
        if (!this.schema?.attributes) {
            this.container.querySelector('#form-container').innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Schema non disponibile per ${this.entityType}
                </div>
            `;
            return;
        }
        
        const formGroups = this.renderFormGroups();
        
        this.container.querySelector('#form-container').innerHTML = `
            <form id="entity-form" novalidate>
                ${formGroups}
            </form>
        `;
        
        this.form = this.container.querySelector('#entity-form');
        this.bindFormEvents();
    }
    
    renderFormGroups() {
        const attributes = this.schema.attributes;
        const groups = this.schema.groups || {};
        
        // Se ci sono gruppi definiti, usali
        if (Object.keys(groups).length > 0) {
            return Object.entries(groups).map(([groupName, group]) => {
                const groupFields = group.attributes.map(attrName => {
                    const attr = attributes[attrName];
                    return this.renderFormField(attrName, attr);
                }).join('');
                
                return `
                    <div class="form-group-section mb-4">
                        <h6 class="text-primary mb-3">
                            <i class="bi bi-folder me-2"></i>${group.label || groupName}
                        </h6>
                        <div class="row">
                            ${groupFields}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Altrimenti raggruppa automaticamente
            const allFields = Object.entries(attributes).map(([name, attr]) => {
                return this.renderFormField(name, attr);
            }).join('');
            
            return `<div class="row">${allFields}</div>`;
        }
    }
    
    renderFormField(attributeName, attributeDefinition) {
        const uiMetadata = attributeDefinition.uiMetadata || {};
        const component = uiMetadata.component || 'TextInput';
        const label = uiMetadata.label || attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
        const placeholder = uiMetadata.placeholder || `Inserisci ${label.toLowerCase()}...`;
        const icon = uiMetadata.icon || this.getDefaultIcon(attributeDefinition.type);
        const required = attributeDefinition.required ? 'required' : '';
        const colClass = this.getColumnClass(component);
        
        let inputHtml = '';
        let validationHtml = '';
        
        // Validation feedback
        validationHtml = `
            <div class="invalid-feedback" id="${attributeName}-error">
                Campo obbligatorio
            </div>
            <div class="valid-feedback">
                ✓ Valido
            </div>
        `;
        
        switch (component) {
            case 'TextArea':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <textarea class="form-control" 
                                  id="${attributeName}" 
                                  name="${attributeName}"
                                  placeholder="${placeholder}"
                                  rows="3"
                                  ${required}></textarea>
                    </div>
                `;
                break;
                
            case 'EmailInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="email" 
                               class="form-control" 
                               id="${attributeName}" 
                               name="${attributeName}"
                               placeholder="${placeholder}"
                               ${required}>
                    </div>
                `;
                break;
                
            case 'PhoneInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="tel" 
                               class="form-control" 
                               id="${attributeName}" 
                               name="${attributeName}"
                               placeholder="${placeholder}"
                               ${required}>
                    </div>
                `;
                break;
                
            case 'NumberInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="number" 
                               class="form-control" 
                               id="${attributeName}" 
                               name="${attributeName}"
                               placeholder="${placeholder}"
                               ${required}>
                    </div>
                `;
                break;
                
            case 'DateInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="date" 
                               class="form-control" 
                               id="${attributeName}" 
                               name="${attributeName}"
                               ${required}>
                    </div>
                `;
                break;
                
            case 'BooleanInput':
                inputHtml = `
                    <div class="form-check">
                        <input class="form-check-input" 
                               type="checkbox" 
                               id="${attributeName}" 
                               name="${attributeName}">
                        <label class="form-check-label" for="${attributeName}">
                            <i class="bi bi-${icon} me-2"></i>${label}
                        </label>
                    </div>
                `;
                validationHtml = ''; // No validation feedback for checkbox
                break;
                
            default: // TextInput
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="text" 
                               class="form-control" 
                               id="${attributeName}" 
                               name="${attributeName}"
                               placeholder="${placeholder}"
                               ${required}>
                    </div>
                `;
                break;
        }
        
        // Per checkbox usa layout diverso
        if (component === 'BooleanInput') {
            return `
                <div class="${colClass}">
                    <div class="mb-3">
                        ${inputHtml}
                        <small class="form-text text-muted">${uiMetadata.description || ''}</small>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="${colClass}">
                <div class="mb-3">
                    <label for="${attributeName}" class="form-label">
                        ${label}
                        ${required ? '<span class="text-danger">*</span>' : ''}
                    </label>
                    ${inputHtml}
                    ${validationHtml}
                    ${uiMetadata.description ? `<small class="form-text text-muted">${uiMetadata.description}</small>` : ''}
                </div>
            </div>
        `;
    }
    
    bindFormEvents() {
        if (!this.form) return;
        
        // Real-time validation e dirty state
        this.form.addEventListener('input', (e) => {
            this.validateField(e.target);
            this.setDirtyState(true);
        });
        
        this.form.addEventListener('change', (e) => {
            this.validateField(e.target);
            this.setDirtyState(true);
        });
        
        // Auto-save after pause
        let autoSaveTimeout;
        this.form.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                if (this.isDirty && this.currentEntity) {
                    this.saveForm();
                }
            }, 2000);
        });
    }
    
    validateField(field) {
        const isValid = field.checkValidity();
        
        field.classList.remove('is-valid', 'is-invalid');
        
        if (field.value.trim() !== '') {
            field.classList.add(isValid ? 'is-valid' : 'is-invalid');
        }
        
        return isValid;
    }
    
    validateForm() {
        if (!this.form) return false;
        
        let isValid = true;
        const inputs = this.form.querySelectorAll('input:not([type="checkbox"]), textarea, select');
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    async loadEntity(entityId) {
        try {
            this.setLoadingState(true);
            
            const response = await fetch(`/api/entity/${entityId}`);
            const result = await response.json();
            
            if (result.success) {
                this.currentEntity = result.data;
                this.populateForm(this.currentEntity);
                this.setDirtyState(false);
                this.updateStatus(`Caricata entità: ${this.getEntityLabel(this.currentEntity)}`);
            } else {
                throw new Error(result.error || 'Entità non trovata');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento entità:', error);
            this.updateStatus(`Errore: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    populateForm(entity) {
        if (!this.form || !entity) return;
        
        Object.entries(entity).forEach(([key, value]) => {
            const field = this.form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else {
                    field.value = value || '';
                }
                
                // Trigger validation
                this.validateField(field);
            }
        });
    }
    
    getFormData() {
        if (!this.form) return {};
        
        const formData = new FormData(this.form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            const field = this.form.querySelector(`[name="${key}"]`);
            
            if (field?.type === 'checkbox') {
                data[key] = field.checked;
            } else if (field?.type === 'number') {
                data[key] = value ? parseFloat(value) : null;
            } else {
                data[key] = value || null;
            }
        }
        
        return data;
    }
    
    async saveForm() {
        if (!this.validateForm()) {
            this.updateStatus('Correggi gli errori prima di salvare', 'error');
            return;
        }
        
        try {
            this.setLoadingState(true);
            const formData = this.getFormData();
            
            if (this.currentEntity) {
                // Update existing entity
                await this.updateEntity(formData);
            } else {
                // Create new entity
                await this.createEntity(formData);
            }
            
            this.setDirtyState(false);
            
        } catch (error) {
            console.error('❌ Errore salvataggio form:', error);
            this.updateStatus(`Errore salvataggio: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    async updateEntity(formData) {
        const updates = {};
        
        // Solo campi modificati
        Object.entries(formData).forEach(([key, value]) => {
            if (this.currentEntity[key] !== value) {
                updates[key] = value;
            }
        });
        
        if (Object.keys(updates).length === 0) {
            this.updateStatus('Nessuna modifica da salvare');
            return;
        }
        
        // Aggiorna attributi uno per uno per trigger WebSocket events
        for (const [attributeName, value] of Object.entries(updates)) {
            const response = await fetch(`/api/entity/${this.currentEntity.id}/attribute`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attributeName, value })
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || `Errore aggiornamento ${attributeName}`);
            }
            
            // Aggiorna cache locale
            this.currentEntity[attributeName] = value;
            
            // Broadcast change
            this.broadcastChange(this.currentEntity.id, attributeName, value);
        }
        
        this.currentEntity.modifiedAt = new Date().toISOString();
        this.updateStatus(`✅ Salvato: ${Object.keys(updates).length} campi aggiornati`);
    }
    
    async createEntity(formData) {
        const entityData = {
            ...formData,
            entityType: this.entityType
        };
        
        const response = await fetch('/api/entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entityData)
        });
        
        const result = await response.json();
        if (result.success) {
            this.currentEntity = result.data;
            
            // Aggiorna entity selector
            await this.loadEntityList();
            this.entitySelector.value = this.currentEntity.id;
            
            this.updateStatus(`✅ Nuova entità creata: ${this.getEntityLabel(this.currentEntity)}`);
        } else {
            throw new Error(result.error || 'Errore creazione entità');
        }
    }
    
    async createNewEntity() {
        this.currentEntity = null;
        this.entitySelector.value = '';
        this.clearForm();
        this.setDirtyState(false);
        this.updateStatus('Nuovo form pronto per inserimento');
    }
    
    clearForm() {
        if (!this.form) return;
        
        this.form.reset();
        
        // Remove validation classes
        this.form.querySelectorAll('.is-valid, .is-invalid').forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
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
        this.broadcastChannel = new BroadcastChannel('ssot-form-module');
        this.broadcastChannel.onmessage = (event) => {
            this.handleBroadcastMessage(event.data);
        };
    }
    
    handleWebSocketUpdate(message) {
        if (!this.currentEntity) return;
        
        const { entityId, attributeName, data } = message;
        const newValue = data?.newValue;
        
        if (entityId === this.currentEntity.id && newValue !== undefined) {
            const field = this.form?.querySelector(`[name="${attributeName}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(newValue);
                } else {
                    field.value = newValue || '';
                }
                
                this.validateField(field);
                this.currentEntity[attributeName] = newValue;
                this.showSyncIndicator(field);
                
                console.log(`🔄 FormModule sincronizzato via WebSocket: ${attributeName} = ${newValue}`);
            }
        }
    }
    
    handleBroadcastMessage(data) {
        if (data.senderId === this.instanceId) return;
        if (!this.currentEntity || data.entityId !== this.currentEntity.id) return;
        
        const { attributeName, value } = data;
        const field = this.form?.querySelector(`[name="${attributeName}"]`);
        
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = value || '';
            }
            
            this.validateField(field);
            this.currentEntity[attributeName] = value;
            this.showSyncIndicator(field);
            
            console.log(`🔄 FormModule sincronizzato via BroadcastChannel: ${attributeName} = ${value}`);
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
    
    showSyncIndicator(field) {
        field.classList.add('border-success');
        setTimeout(() => {
            field.classList.remove('border-success');
        }, 1000);
    }
    
    setDirtyState(dirty) {
        this.isDirty = dirty;
        const saveBtn = this.container.querySelector('#save-form');
        if (saveBtn) {
            saveBtn.disabled = !dirty;
            saveBtn.innerHTML = dirty ? 
                '<i class="bi bi-check"></i> Salva *' : 
                '<i class="bi bi-check"></i> Salva';
        }
    }
    
    setLoadingState(loading) {
        const saveBtn = this.container.querySelector('#save-form');
        if (saveBtn) {
            if (loading) {
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';
                saveBtn.disabled = true;
            } else {
                saveBtn.innerHTML = '<i class="bi bi-check"></i> Salva';
                saveBtn.disabled = !this.isDirty;
            }
        }
    }
    
    updateStatus(message, type = 'info') {
        const statusElement = this.container.querySelector('#form-status');
        if (statusElement) {
            const iconMap = {
                'info': 'info-circle',
                'error': 'exclamation-triangle',
                'success': 'check-circle'
            };
            
            const colorMap = {
                'info': 'text-muted',
                'error': 'text-danger', 
                'success': 'text-success'
            };
            
            statusElement.innerHTML = `
                <small class="${colorMap[type] || 'text-muted'}">
                    <i class="bi bi-${iconMap[type] || 'info-circle'} me-1"></i>
                    ${message}
                </small>
            `;
        }
    }
    
    getColumnClass(component) {
        const fullWidthComponents = ['TextArea'];
        return fullWidthComponents.includes(component) ? 'col-12' : 'col-md-6';
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
        return iconMap[type] || 'input-cursor-text';
    }
    
    renderError(message) {
        this.container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Errore: ${message}
            </div>
        `;
    }
    
    // Public methods
    setEntityType(entityType) {
        this.entityType = entityType;
        this.loadSchema().then(() => this.loadEntityList());
    }
    
    refresh() {
        this.loadEntityList();
        if (this.currentEntity) {
            this.loadEntity(this.currentEntity.id);
        }
    }
    
    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
    }
}

// Export per uso globale
window.FormModule = FormModule;