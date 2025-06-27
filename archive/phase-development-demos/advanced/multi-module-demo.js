/**
 * Multi-Module Demo Controller
 * 
 * Coordina tutti i moduli per dimostrare la sincronizzazione real-time
 * e il layer di traduzione semantica
 */

class MultiModuleDemo {
    constructor() {
        // Services
        this.websocketService = new WebSocketService();
        this.entityService = new EntityService();
        this.schemaService = window.SchemaService || null;
        
        // State
        this.currentEntityType = 'Persona';
        this.currentSchema = null;
        this.selectedEntityId = null;
        this.modules = {};
        this.atomicSlots = {};
        
        // Real-time monitoring
        this.realtimeEvents = [];
        this.activeModules = 0;
        
        this.init();
    }
    
    async init() {
        console.log('🎯 Inizializzazione Multi-Module Demo');
        
        try {
            // Initialize services
            await this.initializeServices();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check system status
            await this.checkSystemStatus();
            
            // Load initial schema and setup modules
            await this.loadCurrentSchema();
            await this.initializeAllModules();
            
            // Setup real-time monitoring
            this.setupRealtimeMonitoring();
            
            console.log('✅ Multi-Module Demo inizializzata con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione demo:', error);
            this.showError('Errore inizializzazione: ' + error.message);
        }
    }
    
    async initializeServices() {
        try {
            // Connect WebSocket
            await this.websocketService.connect();
            this.updateStatus('websocket-status', true, 'Connected');
            
            // Make services globally available
            window.EntityService = this.entityService;
            window.wsService = this.websocketService;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione servizi:', error);
            this.updateStatus('websocket-status', false, 'Error');
            throw error;
        }
    }
    
    setupEventListeners() {
        // Entity type selector
        document.getElementById('entityTypeSelector').addEventListener('change', (e) => {
            this.changeEntityType(e.target.value);
        });
        
        // Schema controls
        document.getElementById('loadSchema').addEventListener('click', () => {
            this.loadCurrentSchema();
        });
        
        document.getElementById('addAttribute').addEventListener('click', () => {
            this.addNewAttribute();
        });
        
        document.getElementById('evolveSchema').addEventListener('click', () => {
            this.evolveSchema();
        });
        
        // Module refresh buttons
        document.getElementById('refresh-table').addEventListener('click', () => {
            this.refreshModule('table');
        });
        
        document.getElementById('refresh-card').addEventListener('click', () => {
            this.refreshModule('card');
        });
        
        document.getElementById('refresh-form').addEventListener('click', () => {
            this.refreshModule('form');
        });
        
        document.getElementById('refresh-list').addEventListener('click', () => {
            this.refreshModule('list');
        });
        
        // Monitor controls
        document.getElementById('clear-monitor').addEventListener('click', () => {
            this.clearRealtimeMonitor();
        });
    }
    
    async checkSystemStatus() {
        // Test Backend
        try {
            const response = await fetch('/api/schema/entities');
            if (response.ok) {
                this.updateStatus('backend-status', true, 'Connected');
            } else {
                this.updateStatus('backend-status', false, `HTTP ${response.status}`);
            }
        } catch (error) {
            this.updateStatus('backend-status', false, 'Connection Error');
        }
    }
    
    async loadCurrentSchema() {
        try {
            console.log(`🔍 Caricamento schema per ${this.currentEntityType}`);
            
            const response = await fetch(`/api/schema/entity/${this.currentEntityType}?format=semantic-ui`);
            const result = await response.json();
            
            if (result.success) {
                this.currentSchema = result.data;
                console.log('✅ Schema caricato:', this.currentSchema);
                
                // Update UI to show schema loaded
                this.addRealtimeEvent({
                    type: 'schema-loaded',
                    data: { entityType: this.currentEntityType, attributes: Object.keys(this.currentSchema.attributes || {}).length },
                    timestamp: new Date().toISOString()
                });
                
            } else {
                throw new Error(result.error || 'Schema non trovato');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento schema:', error);
            this.addRealtimeEvent({
                type: 'error',
                data: { message: `Errore caricamento schema: ${error.message}` },
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async initializeAllModules() {
        console.log('🧩 Inizializzazione tutti i moduli');
        
        try {
            // Initialize atomic slots
            await this.initializeAtomicSlots();
            
            // Initialize main modules
            await this.initializeTableModule();
            await this.initializeCardModule();
            await this.initializeFormModule();
            await this.initializeListModule();
            
            this.updateActiveModulesCount();
            
        } catch (error) {
            console.error('❌ Errore inizializzazione moduli:', error);
        }
    }
    
    async initializeAtomicSlots() {
        const slotAttributes = ['nome', 'email', 'telefono'];
        
        for (const attr of slotAttributes) {
            const container = document.getElementById(`${attr}-slot-container`);
            if (container) {
                try {
                    this.atomicSlots[attr] = new AtomicSlot(
                        container, 
                        attr, 
                        this.currentEntityType,
                        this.selectedEntityId
                    );
                    
                    console.log(`✅ AtomicSlot ${attr} inizializzato`);
                } catch (error) {
                    console.error(`❌ Errore AtomicSlot ${attr}:`, error);
                }
            }
        }
    }
    
    async initializeTableModule() {
        const container = document.getElementById('table-module-container');
        if (container) {
            try {
                this.modules.table = new SimpleTableModule(container);
                this.modules.table.setEntityType(this.currentEntityType);
                this.setSyncIndicator('sync-table', true);
                
                console.log('✅ SimpleTableModule inizializzato');
            } catch (error) {
                console.error('❌ Errore SimpleTableModule:', error);
                container.innerHTML = `<div class="alert alert-danger">Errore: ${error.message}</div>`;
            }
        }
    }
    
    async initializeCardModule() {
        const container = document.getElementById('card-module-container');
        if (container) {
            try {
                this.modules.card = new CardModule(container, this.currentEntityType);
                this.setSyncIndicator('sync-card', true);
                
                console.log('✅ CardModule inizializzato');
            } catch (error) {
                console.error('❌ Errore CardModule:', error);
                container.innerHTML = `<div class="alert alert-danger">Errore: ${error.message}</div>`;
            }
        }
    }
    
    async initializeFormModule() {
        const container = document.getElementById('form-module-container');
        if (container) {
            try {
                this.modules.form = new FormModule(container, this.currentEntityType);
                this.setSyncIndicator('sync-form', true);
                
                console.log('✅ FormModule inizializzato');
            } catch (error) {
                console.error('❌ Errore FormModule:', error);
                container.innerHTML = `<div class="alert alert-danger">Errore: ${error.message}</div>`;
            }
        }
    }
    
    async initializeListModule() {
        const container = document.getElementById('list-module-container');
        if (container) {
            try {
                this.modules.list = new ListModule(container, this.currentEntityType);
                this.setSyncIndicator('sync-list', true);
                
                console.log('✅ ListModule inizializzato');
            } catch (error) {
                console.error('❌ Errore ListModule:', error);
                container.innerHTML = `<div class="alert alert-danger">Errore: ${error.message}</div>`;
            }
        }
    }
    
    async changeEntityType(newEntityType) {
        if (newEntityType === this.currentEntityType) return;
        
        console.log(`🔄 Cambio tipo entità: ${this.currentEntityType} → ${newEntityType}`);
        
        this.currentEntityType = newEntityType;
        this.selectedEntityId = null;
        
        // Reload schema
        await this.loadCurrentSchema();
        
        // Update all modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.setEntityType === 'function') {
                module.setEntityType(newEntityType);
            }
        });
        
        // Update atomic slots
        Object.values(this.atomicSlots).forEach(slot => {
            if (slot && typeof slot.refresh === 'function') {
                slot.entityType = newEntityType;
                slot.refresh();
            }
        });
        
        this.addRealtimeEvent({
            type: 'entity-type-changed',
            data: { newEntityType, oldEntityType: this.currentEntityType },
            timestamp: new Date().toISOString()
        });
    }
    
    async addNewAttribute() {
        const attributeName = prompt('Nome del nuovo attributo:');
        if (!attributeName) return;
        
        const attributeType = prompt('Tipo attributo (string, email, number, date, boolean):', 'string');
        if (!attributeType) return;
        
        try {
            const evolution = {
                attributes: {
                    [attributeName]: {
                        type: attributeType,
                        description: `Attributo ${attributeName} aggiunto via demo`,
                        uiMetadata: {
                            label: attributeName.charAt(0).toUpperCase() + attributeName.slice(1),
                            component: this.getComponentForType(attributeType),
                            group: 'demo',
                            priority: 'medium'
                        }
                    }
                }
            };
            
            const response = await fetch(`/api/schema/entity/${this.currentEntityType}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evolution })
            });
            
            const result = await response.json();
            if (result.success) {
                await this.loadCurrentSchema();
                this.refreshAllModules();
                
                this.addRealtimeEvent({
                    type: 'attribute-added',
                    data: { entityType: this.currentEntityType, attributeName, attributeType },
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ Attributo ${attributeName} aggiunto con successo`);
            } else {
                throw new Error(result.error || 'Errore aggiunta attributo');
            }
            
        } catch (error) {
            console.error('❌ Errore aggiunta attributo:', error);
            alert(`Errore aggiunta attributo: ${error.message}`);
        }
    }
    
    async evolveSchema() {
        try {
            const timestamp = Date.now();
            const evolution = {
                attributes: {
                    [`campo_${timestamp}`]: {
                        type: 'string',
                        description: 'Campo di test evoluzione schema',
                        uiMetadata: {
                            label: `Campo Test ${timestamp}`,
                            component: 'TextInput',
                            group: 'test',
                            priority: 'low'
                        }
                    }
                }
            };
            
            const response = await fetch(`/api/schema/entity/${this.currentEntityType}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evolution })
            });
            
            const result = await response.json();
            if (result.success) {
                await this.loadCurrentSchema();
                this.refreshAllModules();
                
                this.addRealtimeEvent({
                    type: 'schema-evolved',
                    data: { entityType: this.currentEntityType, newField: `campo_${timestamp}` },
                    timestamp: new Date().toISOString()
                });
                
                console.log('✅ Schema evoluto con successo');
            } else {
                throw new Error(result.error || 'Errore evoluzione schema');
            }
            
        } catch (error) {
            console.error('❌ Errore evoluzione schema:', error);
            alert(`Errore evoluzione schema: ${error.message}`);
        }
    }
    
    refreshModule(moduleKey) {
        const module = this.modules[moduleKey];
        if (module && typeof module.refresh === 'function') {
            module.refresh();
            this.setSyncIndicator(`sync-${moduleKey}`, true);
            
            setTimeout(() => {
                this.setSyncIndicator(`sync-${moduleKey}`, false);
            }, 1000);
        }
    }
    
    refreshAllModules() {
        Object.keys(this.modules).forEach(key => {
            this.refreshModule(key);
        });
        
        // Refresh atomic slots
        Object.values(this.atomicSlots).forEach(slot => {
            if (slot && typeof slot.refresh === 'function') {
                slot.refresh();
            }
        });
    }
    
    setupRealtimeMonitoring() {
        // WebSocket events
        this.websocketService.subscribe('*', (message) => {
            this.addRealtimeEvent({
                type: 'websocket',
                data: message,
                timestamp: new Date().toISOString()
            });
            
            // Show sync indicators for all modules
            Object.keys(this.modules).forEach(key => {
                this.setSyncIndicator(`sync-${key}`, true);
                setTimeout(() => {
                    this.setSyncIndicator(`sync-${key}`, false);
                }, 800);
            });
        });
        
        // Add initial event
        this.addRealtimeEvent({
            type: 'system',
            data: { message: 'Real-time monitoring attivato' },
            timestamp: new Date().toISOString()
        });
    }
    
    addRealtimeEvent(event) {
        this.realtimeEvents.unshift(event);
        
        // Keep only last 50 events
        if (this.realtimeEvents.length > 50) {
            this.realtimeEvents = this.realtimeEvents.slice(0, 50);
        }
        
        this.updateRealtimeMonitor();
    }
    
    updateRealtimeMonitor() {
        const container = document.getElementById('realtime-events');
        if (!container) return;
        
        const eventsHtml = this.realtimeEvents.map(event => {
            const timestamp = new Date(event.timestamp).toLocaleTimeString();
            const icon = this.getEventIcon(event.type);
            const color = this.getEventColor(event.type);
            
            let description = '';
            if (event.data) {
                if (typeof event.data === 'string') {
                    description = event.data;
                } else if (event.data.message) {
                    description = event.data.message;
                } else if (event.data.entityType) {
                    description = `Entity: ${event.data.entityType}`;
                } else {
                    description = JSON.stringify(event.data).substring(0, 100) + '...';
                }
            }
            
            return `
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <div>
                        <span class="text-${color}">
                            <i class="bi bi-${icon} me-2"></i>
                            <strong>${event.type}</strong>
                        </span>
                        <small class="ms-2">${description}</small>
                    </div>
                    <small class="text-muted">${timestamp}</small>
                </div>
            `;
        }).join('');
        
        container.innerHTML = eventsHtml || '<div class="text-muted">Nessun evento registrato</div>';
    }
    
    clearRealtimeMonitor() {
        this.realtimeEvents = [];
        this.updateRealtimeMonitor();
    }
    
    setSyncIndicator(indicatorId, active) {
        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            if (active) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    }
    
    updateActiveModulesCount() {
        this.activeModules = Object.keys(this.modules).length + Object.keys(this.atomicSlots).length;
        
        const element = document.getElementById('active-modules');
        if (element) {
            element.textContent = this.activeModules;
        }
    }
    
    updateStatus(elementId, isConnected, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = `status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'} ms-2`;
            element.innerHTML = `<i class="bi bi-circle-fill me-1"></i>${text}`;
        }
    }
    
    getComponentForType(type) {
        const componentMap = {
            'string': 'TextInput',
            'email': 'EmailInput',
            'phone': 'PhoneInput',
            'number': 'NumberInput',
            'date': 'DateInput',
            'boolean': 'BooleanInput'
        };
        return componentMap[type] || 'TextInput';
    }
    
    getEventIcon(type) {
        const iconMap = {
            'websocket': 'wifi',
            'entity-type-changed': 'arrow-repeat',
            'schema-loaded': 'download',
            'schema-evolved': 'diagram-3',
            'attribute-added': 'plus-circle',
            'system': 'gear',
            'error': 'exclamation-triangle'
        };
        return iconMap[type] || 'circle';
    }
    
    getEventColor(type) {
        const colorMap = {
            'websocket': 'info',
            'entity-type-changed': 'warning',
            'schema-loaded': 'success',
            'schema-evolved': 'primary',
            'attribute-added': 'success',
            'system': 'secondary',
            'error': 'danger'
        };
        return colorMap[type] || 'muted';
    }
    
    showError(message) {
        console.error('❌ Demo Error:', message);
        
        // Could show toast or modal here
        this.addRealtimeEvent({
            type: 'error',
            data: { message },
            timestamp: new Date().toISOString()
        });
    }
    
    // Public methods for external testing
    selectEntity(entityId) {
        this.selectedEntityId = entityId;
        
        // Update atomic slots
        Object.values(this.atomicSlots).forEach(slot => {
            if (slot && typeof slot.setEntityId === 'function') {
                slot.setEntityId(entityId);
            }
        });
        
        console.log(`📌 Entità selezionata: ${entityId}`);
    }
    
    getModules() {
        return this.modules;
    }
    
    getAtomicSlots() {
        return this.atomicSlots;
    }
    
    getCurrentSchema() {
        return this.currentSchema;
    }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.multiModuleDemo = new MultiModuleDemo();
});

// Export for global access
window.MultiModuleDemo = MultiModuleDemo;