import { writable } from 'svelte/store';

/**
 * Store per gestione Workspace Layout - Fase 2 SSOT-4000
 * 
 * Gestisce configurazione layout, grid system, e stato UI del workspace.
 */

// Store principale per workspace
export const workspaceStore = writable({
    documentId: null,
    layout: {
        gridSize: 12,
        cellHeight: 60,
        margin: [10, 10],
        containerPadding: [20, 20],
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 }
    },
    modules: new Map(), // Map<moduleId, layoutState>
    selection: null,
    isDragging: false,
    isResizing: false,
    viewMode: 'edit', // 'edit' | 'preview' | 'present'
    zoom: 1.0,
    autoSave: true,
    lastSaved: null
});

// Workspace actions
export const workspaceActions = {
    /**
     * Inizializza workspace per un documento
     */
    initializeForDocument(documentId, documentData = null) {
        workspaceStore.update(state => ({
            ...state,
            documentId,
            modules: new Map(),
            selection: null,
            isDragging: false,
            isResizing: false,
            lastSaved: null
        }));
        
        // Se abbiamo dati del documento, usa il layout esistente
        if (documentData?.layout) {
            workspaceStore.update(state => ({
                ...state,
                layout: { ...state.layout, ...documentData.layout }
            }));
        }
        
        console.log('🏗️ Workspace inizializzato per documento:', documentId);
    },
    
    /**
     * Aggiorna posizione e dimensioni di un modulo
     */
    updateModuleLayout(moduleId, layoutUpdate) {
        workspaceStore.update(state => {
            const newModules = new Map(state.modules);
            const currentLayout = newModules.get(moduleId) || {};
            
            newModules.set(moduleId, {
                ...currentLayout,
                ...layoutUpdate,
                lastModified: Date.now()
            });
            
            return {
                ...state,
                modules: newModules,
                lastSaved: null // Indica che ci sono modifiche non salvate
            };
        });
        
        // Auto-save se abilitato
        const currentState = get(workspaceStore);
        if (currentState.autoSave && currentState.documentId) {
            this.debouncedSave(currentState.documentId);
        }
    },
    
    /**
     * Seleziona un modulo
     */
    selectModule(moduleId) {
        workspaceStore.update(state => ({
            ...state,
            selection: moduleId
        }));
    },
    
    /**
     * Deseleziona moduli
     */
    clearSelection() {
        workspaceStore.update(state => ({
            ...state,
            selection: null
        }));
    },
    
    /**
     * Imposta stato drag
     */
    setDragging(isDragging, moduleId = null) {
        workspaceStore.update(state => ({
            ...state,
            isDragging,
            selection: isDragging ? moduleId : state.selection
        }));
    },
    
    /**
     * Imposta stato resize
     */
    setResizing(isResizing, moduleId = null) {
        workspaceStore.update(state => ({
            ...state,
            isResizing,
            selection: isResizing ? moduleId : state.selection
        }));
    },
    
    /**
     * Cambia modalità visualizzazione
     */
    setViewMode(viewMode) {
        workspaceStore.update(state => ({
            ...state,
            viewMode,
            selection: viewMode === 'edit' ? state.selection : null
        }));
    },
    
    /**
     * Aggiorna zoom
     */
    setZoom(zoom) {
        const clampedZoom = Math.max(0.25, Math.min(2.0, zoom));
        workspaceStore.update(state => ({
            ...state,
            zoom: clampedZoom
        }));
    },
    
    /**
     * Salva layout nel backend
     */
    async saveLayout(documentId) {
        const state = get(workspaceStore);
        
        try {
            // Converti Map a Object per serializzazione
            const modulesLayout = {};
            state.modules.forEach((layout, moduleId) => {
                modulesLayout[moduleId] = layout;
            });
            
            const layoutData = {
                layout: {
                    ...state.layout,
                    modules: modulesLayout
                }
            };
            
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(layoutData)
            });
            
            if (!response.ok) {
                throw new Error(`Errore salvataggio layout: ${response.statusText}`);
            }
            
            workspaceStore.update(state => ({
                ...state,
                lastSaved: Date.now()
            }));
            
            console.log('💾 Layout salvato per documento:', documentId);
            return true;
        } catch (error) {
            console.error('Errore salvataggio layout:', error);
            throw error;
        }
    },
    
    /**
     * Salvataggio con debounce per auto-save
     */
    debouncedSave: (() => {
        let timeout;
        return (documentId) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.saveLayout(documentId).catch(console.error);
            }, 2000); // Salva dopo 2 secondi di inattività
        };
    })(),
    
    /**
     * Reset workspace
     */
    reset() {
        workspaceStore.set({
            documentId: null,
            layout: {
                gridSize: 12,
                cellHeight: 60,
                margin: [10, 10],
                containerPadding: [20, 20],
                breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 }
            },
            modules: new Map(),
            selection: null,
            isDragging: false,
            isResizing: false,
            viewMode: 'edit',
            zoom: 1.0,
            autoSave: true,
            lastSaved: null
        });
    },
    
    /**
     * Ottieni layout per griglia responsiva
     */
    getResponsiveLayout(breakpoint) {
        const state = get(workspaceStore);
        const layout = [];
        
        state.modules.forEach((moduleLayout, moduleId) => {
            layout.push({
                i: moduleId,
                x: moduleLayout.x || 0,
                y: moduleLayout.y || 0,
                w: moduleLayout.w || 4,
                h: moduleLayout.h || 3,
                minW: moduleLayout.minW || 2,
                minH: moduleLayout.minH || 2,
                maxW: moduleLayout.maxW || 12,
                maxH: moduleLayout.maxH || 10
            });
        });
        
        return layout;
    }
};

// Helper per ottenere stato corrente (simula Svelte's get)
function get(store) {
    let value;
    store.subscribe(v => value = v)();
    return value;
}

// Estendi store con actions
workspaceStore.initializeForDocument = workspaceActions.initializeForDocument;
workspaceStore.updateModuleLayout = workspaceActions.updateModuleLayout;
workspaceStore.selectModule = workspaceActions.selectModule;
workspaceStore.clearSelection = workspaceActions.clearSelection;
workspaceStore.setDragging = workspaceActions.setDragging;
workspaceStore.setResizing = workspaceActions.setResizing;
workspaceStore.setViewMode = workspaceActions.setViewMode;
workspaceStore.setZoom = workspaceActions.setZoom;
workspaceStore.saveLayout = workspaceActions.saveLayout;
workspaceStore.reset = workspaceActions.reset;
workspaceStore.getResponsiveLayout = workspaceActions.getResponsiveLayout;

export default workspaceStore;