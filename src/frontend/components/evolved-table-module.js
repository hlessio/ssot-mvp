/**
 * EvolvedTableModule - Entry point for the evolved table module
 * 
 * This is a thin wrapper that initializes the TableController with the container
 * and module instance. The actual logic is split between TableAPI and TableController.
 */

class EvolvedTableModule {
    constructor(container, moduleInstance) {
        this.container = container;
        this.moduleInstance = moduleInstance;
        this.controller = null;
        
        this.initialize();
    }
    
    async initialize() {
        console.log('🚀 Initializing Evolved Table Module');
        
        // Load dependencies if needed
        await this.loadDependencies();
        
        // Create the controller
        this.controller = new TableController(this.container, this.moduleInstance);
    }
    
    async loadDependencies() {
        // Check if TableAPI is available
        if (!window.TableAPI) {
            try {
                // Try to load TableAPI dynamically
                const script = document.createElement('script');
                script.src = '/core/table/TableAPI.js';
                document.head.appendChild(script);
                
                // Wait for script to load
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    setTimeout(reject, 5000); // 5 second timeout
                });
            } catch (error) {
                console.error('Failed to load TableAPI:', error);
                this.showError('Failed to load table dependencies');
                return;
            }
        }
        
        // TableController should already be loaded by the module system
        if (!window.TableController) {
            console.error('TableController not found');
            this.showError('Table controller not available');
        }
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div style="padding: 20px; background: #f8d7da; color: #721c24; border-radius: 4px;">
                <strong>Errore:</strong> ${message}
            </div>
        `;
    }
    
    // Proxy methods to controller
    
    refresh() {
        if (this.controller && this.controller.api) {
            this.controller.api.loadEntities();
        }
    }
    
    getConfiguration() {
        if (this.controller && this.controller.api) {
            return {
                entityType: this.controller.api.getEntityType(),
                columns: this.controller.api.getColumns(),
                entityCount: this.controller.api.getRows().length,
                tableName: this.controller.api.getTableName()
            };
        }
        return null;
    }
    
    setEntityType(type) {
        if (this.controller && this.controller.api) {
            this.controller.api.setEntityType(type);
        }
    }
    
    addColumn(name, options) {
        if (this.controller && this.controller.api) {
            this.controller.api.addColumn(name, options);
        }
    }
    
    destroy() {
        if (this.controller) {
            this.controller.destroy();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvolvedTableModule;
} else {
    window.EvolvedTableModule = EvolvedTableModule;
}