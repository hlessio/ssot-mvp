/**
 * AtomicSlot - Componente per slot singoli di attributi
 * 
 * Ogni slot gestisce un singolo attributo di un'entità specifica
 * Si sincronizza in real-time con tutti gli altri moduli
 */

class AtomicSlot {
    constructor(container, attributeName, entityType, entityId = null) {
        this.container = container;
        this.attributeName = attributeName;
        this.entityType = entityType;
        this.entityId = entityId;
        
        // Services
        this.entityService = window.EntityService;
        this.wsService = null;
        this.broadcastChannel = null;
        
        // State
        this.schema = null;
        this.currentValue = null;
        this.isUpdating = false;
        
        // DOM refs
        this.input = null;
        
        // Unique instance ID for broadcast channel
        this.instanceId = `atomic-${attributeName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadSchema();
            this.render();
            this.bindEvents();
            this.initRealTimeSync();
            
            // Se abbiamo un entityId, carica il valore corrente
            if (this.entityId) {
                await this.loadCurrentValue();
            }
            
        } catch (error) {
            console.error(`❌ Errore inizializzazione AtomicSlot ${this.attributeName}:`, error);
            this.renderError(error.message);
        }
    }
    
    async loadSchema() {
        try {
            const response = await fetch(`/api/schema/entity/${this.entityType}?format=semantic-ui`);
            const result = await response.json();
            
            if (result.success && result.data.attributes[this.attributeName]) {
                this.schema = result.data.attributes[this.attributeName];
            } else {
                // Fallback: crea schema di base
                this.schema = {
                    type: 'string',
                    uiMetadata: {
                        component: 'TextInput',
                        label: this.attributeName.charAt(0).toUpperCase() + this.attributeName.slice(1),
                        placeholder: `Inserisci ${this.attributeName}...`
                    }
                };
            }
        } catch (error) {
            console.error(`❌ Errore caricamento schema per ${this.attributeName}:`, error);
            throw error;
        }
    }
    
    async loadCurrentValue() {
        if (!this.entityId) return;
        
        try {
            const response = await fetch(`/api/entity/${this.entityId}`);
            const result = await response.json();
            
            if (result.success && result.data[this.attributeName] !== undefined) {
                this.currentValue = result.data[this.attributeName];
                this.updateInputValue(this.currentValue);
            }
        } catch (error) {
            console.error(`❌ Errore caricamento valore per ${this.attributeName}:`, error);
        }
    }
    
    render() {
        const uiMetadata = this.schema.uiMetadata || {};
        const component = uiMetadata.component || 'TextInput';
        const placeholder = uiMetadata.placeholder || `Inserisci ${this.attributeName}...`;
        const icon = uiMetadata.icon || this.getDefaultIcon(this.schema.type);
        
        let inputHtml = '';
        
        switch (component) {
            case 'EmailInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="email" 
                               class="form-control" 
                               placeholder="${placeholder}"
                               data-attribute="${this.attributeName}">
                    </div>
                `;
                break;
                
            case 'PhoneInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="tel" 
                               class="form-control" 
                               placeholder="${placeholder}"
                               data-attribute="${this.attributeName}">
                    </div>
                `;
                break;
                
            case 'NumberInput':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="number" 
                               class="form-control" 
                               placeholder="${placeholder}"
                               data-attribute="${this.attributeName}">
                    </div>
                `;
                break;
                
            case 'TextArea':
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <textarea class="form-control" 
                                  rows="3"
                                  placeholder="${placeholder}"
                                  data-attribute="${this.attributeName}"></textarea>
                    </div>
                `;
                break;
                
            default: // TextInput
                inputHtml = `
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-${icon}"></i></span>
                        <input type="text" 
                               class="form-control" 
                               placeholder="${placeholder}"
                               data-attribute="${this.attributeName}">
                    </div>
                `;
                break;
        }
        
        this.container.innerHTML = `
            <div class="atomic-slot-content">
                ${inputHtml}
                <div class="mt-2">
                    <small class="text-muted">
                        <span class="me-2">Tipo: ${this.schema.type}</span>
                        <span class="me-2">Componente: ${component}</span>
                        ${this.entityId ? `<span>ID: ${this.entityId.substr(0, 8)}...</span>` : ''}
                    </small>
                </div>
            </div>
        `;
        
        // Salva riferimento all'input
        this.input = this.container.querySelector(`[data-attribute="${this.attributeName}"]`);
    }
    
    bindEvents() {
        if (!this.input) return;
        
        // Debounced save on change
        let saveTimeout;
        
        this.input.addEventListener('blur', () => {
            this.saveValue();
        });
        
        this.input.addEventListener('input', (e) => {
            // Visual feedback immediato
            this.currentValue = e.target.value;
            
            // Debounced save
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveValue();
            }, 500);
        });
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.saveValue();
            }
        });
    }
    
    async saveValue() {
        if (!this.entityId || this.isUpdating) return;
        
        const newValue = this.input.value;
        
        // Se il valore non è cambiato, non salvare
        if (newValue === this.currentValue) return;
        
        try {
            this.setLoadingState(true);
            
            const response = await fetch(`/api/entity/${this.entityId}/attribute`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributeName: this.attributeName,
                    value: newValue
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentValue = newValue;
                this.showSuccess();
                
                // Broadcast change to other modules
                this.broadcastChange(newValue);
                
                console.log(`✅ AtomicSlot ${this.attributeName} aggiornato:`, newValue);
            } else {
                throw new Error(result.error || 'Errore aggiornamento');
            }
            
        } catch (error) {
            console.error(`❌ Errore salvataggio ${this.attributeName}:`, error);
            this.showError(error.message);
            
            // Ripristina valore precedente
            this.updateInputValue(this.currentValue);
            
        } finally {
            this.setLoadingState(false);
        }
    }
    
    initRealTimeSync() {
        // WebSocket per sync da server
        if (window.wsService) {
            this.wsService = window.wsService;
            
            // Subscribe agli aggiornamenti di questo attributo
            this.wsService.subscribe({
                type: 'change',
                entityId: this.entityId,
                attributeName: this.attributeName
            }, (message) => {
                this.handleWebSocketUpdate(message);
            });
        }
        
        // BroadcastChannel per sync tra finestre
        this.broadcastChannel = new BroadcastChannel('ssot-atomic-slots');
        this.broadcastChannel.onmessage = (event) => {
            this.handleBroadcastMessage(event.data);
        };
    }
    
    handleWebSocketUpdate(message) {
        if (this.isUpdating) return; // Evita loop
        
        const newValue = message.data?.newValue;
        if (newValue !== undefined && newValue !== this.currentValue) {
            this.currentValue = newValue;
            this.updateInputValue(newValue);
            this.showSyncIndicator();
            
            console.log(`🔄 AtomicSlot ${this.attributeName} sincronizzato via WebSocket:`, newValue);
        }
    }
    
    handleBroadcastMessage(data) {
        if (data.senderId === this.instanceId) return; // Ignore own messages
        if (data.entityId !== this.entityId) return;
        if (data.attributeName !== this.attributeName) return;
        
        const newValue = data.value;
        if (newValue !== this.currentValue) {
            this.currentValue = newValue;
            this.updateInputValue(newValue);
            this.showSyncIndicator();
            
            console.log(`🔄 AtomicSlot ${this.attributeName} sincronizzato via BroadcastChannel:`, newValue);
        }
    }
    
    broadcastChange(newValue) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'attribute-updated',
                senderId: this.instanceId,
                entityId: this.entityId,
                attributeName: this.attributeName,
                value: newValue,
                timestamp: Date.now()
            });
        }
    }
    
    updateInputValue(value) {
        if (this.input && this.input.value !== value) {
            this.isUpdating = true;
            this.input.value = value || '';
            
            // Reset flag dopo un breve delay
            setTimeout(() => {
                this.isUpdating = false;
            }, 100);
        }
    }
    
    setLoadingState(loading) {
        if (!this.input) return;
        
        if (loading) {
            this.input.disabled = true;
            this.input.classList.add('opacity-50');
        } else {
            this.input.disabled = false;
            this.input.classList.remove('opacity-50');
        }
    }
    
    showSuccess() {
        const parent = this.container.parentElement;
        if (parent) {
            parent.classList.add('updated');
            setTimeout(() => {
                parent.classList.remove('updated');
            }, 1000);
        }
    }
    
    showError(message) {
        console.error(`❌ AtomicSlot ${this.attributeName} error:`, message);
        
        // Mostra toast error se disponibile
        if (window.showToast) {
            window.showToast(`Errore ${this.attributeName}: ${message}`, 'error');
        }
    }
    
    showSyncIndicator() {
        const parent = this.container.parentElement;
        if (parent) {
            parent.classList.add('updated');
            setTimeout(() => {
                parent.classList.remove('updated');
            }, 800);
        }
    }
    
    renderError(message) {
        this.container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Errore caricamento: ${message}
            </div>
        `;
    }
    
    getDefaultIcon(type) {
        const iconMap = {
            'string': 'type',
            'email': 'envelope',
            'phone': 'telephone',
            'number': 'hash',
            'integer': 'hash',
            'date': 'calendar',
            'boolean': 'check-square',
            'url': 'link'
        };
        
        return iconMap[type] || 'input-cursor-text';
    }
    
    // Public methods
    setEntityId(entityId) {
        this.entityId = entityId;
        this.loadCurrentValue();
    }
    
    refresh() {
        this.loadSchema().then(() => {
            this.render();
            this.bindEvents();
            if (this.entityId) {
                this.loadCurrentValue();
            }
        });
    }
    
    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
        
        if (this.wsService && this.entityId) {
            // Cleanup WebSocket subscriptions if needed
        }
    }
}

// Export per uso globale
window.AtomicSlot = AtomicSlot;