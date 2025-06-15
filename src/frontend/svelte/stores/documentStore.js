import { writable } from 'svelte/store';
import { documentService } from '../services/DocumentService.js';

/**
 * Store per gestione CompositeDocument - Fase 2 SSOT-4000
 * 
 * Gestisce lo stato dei documenti compositi e i loro moduli associati,
 * fornendo API reattive per il workspace Svelte.
 */

// Store principale per documento corrente
export const documentStore = writable({
    document: null,
    modules: [],
    loading: false,
    error: null
});

// Setup WebSocket listener per real-time updates
documentService.addListener((event) => {
    if (event.type === 'change' && event.entityType === 'CompositeDocument') {
        console.log('📡 Documento aggiornato via WebSocket:', event.entityId);
        
        // Aggiorna store se il documento corrente è stato modificato
        documentStore.update(state => {
            if (state.document && state.document.id === event.entityId) {
                // Ricarica documento per ottenere dati aggiornati
                documentActions.loadDocument(event.entityId).catch(console.error);
            }
            return state;
        });
    }
});

// Store actions
export const documentActions = {
    /**
     * Carica un documento con i suoi moduli
     */
    async loadDocument(documentId) {
        documentStore.update(state => ({
            ...state,
            loading: true,
            error: null
        }));
        
        try {
            const document = await documentService.getDocument(documentId);
            
            documentStore.update(state => ({
                ...state,
                document,
                modules: document.modules || [],
                loading: false,
                error: null
            }));
            
            console.log('📄 Documento caricato:', document.name);
            return document;
        } catch (error) {
            console.error('Errore caricamento documento:', error);
            documentStore.update(state => ({
                ...state,
                loading: false,
                error: error.message
            }));
            throw error;
        }
    },
    
    /**
     * Crea un nuovo documento
     */
    async createDocument(documentData) {
        try {
            const document = await documentService.createDocument(documentData);
            
            documentStore.update(state => ({
                ...state,
                document,
                modules: [],
                error: null
            }));
            
            console.log('📄 Documento creato:', document.name);
            return document;
        } catch (error) {
            console.error('Errore creazione documento:', error);
            documentStore.update(state => ({
                ...state,
                error: error.message
            }));
            throw error;
        }
    },
    
    /**
     * Aggiunge un modulo al documento
     */
    async addModule(documentId, moduleType, position = {}) {
        try {
            const result = await documentService.addModule(documentId, moduleType, position);
            
            // Ricarica documento per ottenere stato aggiornato
            await documentActions.loadDocument(documentId);
            
            console.log('🧩 Modulo aggiunto:', moduleType);
            return result;
        } catch (error) {
            console.error('Errore aggiunta modulo:', error);
            throw error;
        }
    },
    
    /**
     * Rimuove un modulo dal documento
     */
    async removeModule(documentId, moduleId) {
        try {
            await documentService.removeModule(documentId, moduleId);
            
            // Ricarica documento per ottenere stato aggiornato
            await documentActions.loadDocument(documentId);
            
            console.log('🗑️ Modulo rimosso:', moduleId);
        } catch (error) {
            console.error('Errore rimozione modulo:', error);
            throw error;
        }
    },
    
    /**
     * Aggiorna il layout di un modulo
     */
    async updateModuleLayout(documentId, moduleId, layoutConfig) {
        try {
            await documentService.updateModuleLayout(documentId, moduleId, layoutConfig);
            
            // Aggiorna store locale per feedback immediato
            documentStore.update(state => ({
                ...state,
                modules: state.modules.map(m => 
                    m.id === moduleId 
                        ? { ...m, layoutConfig: { ...m.layoutConfig, ...layoutConfig } }
                        : m
                )
            }));
            
            console.log('📐 Layout modulo aggiornato:', moduleId);
        } catch (error) {
            console.error('Errore aggiornamento layout:', error);
            throw error;
        }
    },
    
    /**
     * Pulisce lo store
     */
    clear() {
        documentStore.set({
            document: null,
            modules: [],
            loading: false,
            error: null
        });
    }
};

// Estendi lo store con le actions
documentStore.loadDocument = documentActions.loadDocument;
documentStore.createDocument = documentActions.createDocument;
documentStore.addModule = documentActions.addModule;
documentStore.removeModule = documentActions.removeModule;
documentStore.updateModuleLayout = documentActions.updateModuleLayout;
documentStore.clear = documentActions.clear;

export default documentStore;