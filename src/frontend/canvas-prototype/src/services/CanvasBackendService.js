/**
 * CanvasBackendService - Servizio per integrare Canvas con CompositeDocument backend
 * 
 * Sostituisce LayoutStorage.js per persistenza via API invece di localStorage.
 * Gestisce la sincronizzazione bidirezionale tra canvas blocks e ModuleInstances.
 */

export class CanvasBackendService {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.currentDocumentId = null;
    }

    /**
     * Imposta l'ID del documento corrente per le operazioni canvas
     * @param {string} documentId - ID del CompositeDocument
     */
    setCurrentDocument(documentId) {
        this.currentDocumentId = documentId;
        console.log('📄 Canvas collegato al documento:', documentId);
    }

    /**
     * Salva il layout canvas nel documento backend
     * @param {Object} canvasData - Dati canvas da salvare
     * @param {Array} canvasData.blocks - Array di blocchi canvas
     * @param {number} canvasData.gridSize - Dimensione griglia
     * @param {Object} canvasData.metadata - Metadati aggiuntivi
     * @returns {Promise<Object>} - Risultato del salvataggio
     */
    async saveCanvas(canvasData) {
        if (!this.currentDocumentId) {
            throw new Error('Nessun documento impostato. Usa setCurrentDocument() prima.');
        }

        try {
            const canvasLayout = {
                enabled: true,
                blocks: canvasData.blocks || [],
                gridSize: canvasData.gridSize || 25,
                version: '1.0',
                metadata: {
                    ...canvasData.metadata,
                    savedAt: new Date().toISOString(),
                    source: 'canvas-prototype'
                }
            };

            const response = await fetch(`${this.baseUrl}/api/documents/${this.currentDocumentId}/canvas`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ canvasLayout })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Errore durante il salvataggio canvas');
            }

            const result = await response.json();
            console.log('✅ Canvas salvato nel documento:', this.currentDocumentId);
            
            return {
                success: true,
                documentId: this.currentDocumentId,
                canvasLayout: result.data
            };
        } catch (error) {
            console.error('❌ Errore salvataggio canvas:', error);
            throw error;
        }
    }

    /**
     * Carica il layout canvas dal documento backend
     * @returns {Promise<Object>} - Layout canvas caricato
     */
    async loadCanvas() {
        if (!this.currentDocumentId) {
            throw new Error('Nessun documento impostato. Usa setCurrentDocument() prima.');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/documents/${this.currentDocumentId}/canvas`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Errore durante il caricamento canvas');
            }

            const result = await response.json();
            console.log('📂 Canvas caricato dal documento:', this.currentDocumentId);
            
            return {
                success: true,
                documentId: this.currentDocumentId,
                documentName: result.documentName,
                canvasLayout: result.data
            };
        } catch (error) {
            console.error('❌ Errore caricamento canvas:', error);
            throw error;
        }
    }

    /**
     * Sincronizza canvas blocks con ModuleInstances nel backend
     * @returns {Promise<Object>} - Risultato della sincronizzazione
     */
    async syncCanvasToModules() {
        if (!this.currentDocumentId) {
            throw new Error('Nessun documento impostato. Usa setCurrentDocument() prima.');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/documents/${this.currentDocumentId}/canvas/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Errore durante la sincronizzazione');
            }

            const result = await response.json();
            console.log('🔄 Canvas sincronizzato con ModuleInstances:', result.syncedModules);
            
            return result;
        } catch (error) {
            console.error('❌ Errore sincronizzazione canvas-modules:', error);
            throw error;
        }
    }

    /**
     * Crea un nuovo documento per il canvas
     * @param {Object} documentData - Dati del documento da creare
     * @param {string} documentData.name - Nome del documento
     * @param {string} documentData.description - Descrizione
     * @param {string} documentData.projectId - ID progetto (opzionale)
     * @param {string} documentData.ownerId - ID proprietario
     * @returns {Promise<Object>} - Documento creato
     */
    async createCanvasDocument(documentData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...documentData,
                    canvasLayout: {
                        enabled: true,
                        blocks: [],
                        gridSize: 25,
                        version: '1.0',
                        metadata: {
                            createdAt: new Date().toISOString(),
                            source: 'canvas-prototype'
                        }
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Errore durante la creazione documento');
            }

            const result = await response.json();
            const document = result.data;
            
            // Imposta automaticamente come documento corrente
            this.setCurrentDocument(document.id);
            
            console.log('📄 Nuovo documento canvas creato:', document.id);
            return document;
        } catch (error) {
            console.error('❌ Errore creazione documento canvas:', error);
            throw error;
        }
    }

    /**
     * Lista tutti i documenti disponibili (con canvas abilitato)
     * @returns {Promise<Array>} - Lista documenti
     */
    async listCanvasDocuments() {
        try {
            const response = await fetch(`${this.baseUrl}/api/documents`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Errore durante il recupero documenti');
            }

            const result = await response.json();
            
            // Filtra solo documenti con canvas abilitato - parse JSON se necessario
            const canvasDocuments = result.data.filter(doc => {
                if (!doc.canvasLayout) return false;
                
                let canvasLayout = doc.canvasLayout;
                // Parse se è una stringa JSON
                if (typeof canvasLayout === 'string') {
                    try {
                        canvasLayout = JSON.parse(canvasLayout);
                    } catch (e) {
                        return false;
                    }
                }
                
                return canvasLayout && canvasLayout.enabled;
            }).map(doc => {
                // Parse canvasLayout per tutti i documenti validi
                if (typeof doc.canvasLayout === 'string') {
                    try {
                        doc.canvasLayout = JSON.parse(doc.canvasLayout);
                    } catch (e) {
                        // Keep as string if parsing fails
                    }
                }
                return doc;
            });
            
            console.log('📋 Documenti canvas trovati:', canvasDocuments.length);
            return canvasDocuments;
        } catch (error) {
            console.error('❌ Errore recupero documenti canvas:', error);
            throw error;
        }
    }

    /**
     * Elimina un documento canvas
     * @param {string} documentId - ID documento da eliminare
     * @returns {Promise<boolean>} - Successo eliminazione
     */
    async deleteCanvasDocument(documentId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/documents/${documentId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Errore durante l\'eliminazione documento');
            }

            // Se era il documento corrente, resetta
            if (this.currentDocumentId === documentId) {
                this.currentDocumentId = null;
            }
            
            console.log('🗑️ Documento canvas eliminato:', documentId);
            return true;
        } catch (error) {
            console.error('❌ Errore eliminazione documento canvas:', error);
            throw error;
        }
    }

    /**
     * Conversione da formato LayoutStorage a Canvas Backend
     * Per migrare layout esistenti da localStorage
     * @param {Object} layoutStorageData - Dati da LayoutStorage.js
     * @returns {Object} - Dati compatibili con CanvasBackendService
     */
    static convertFromLayoutStorage(layoutStorageData) {
        return {
            blocks: layoutStorageData.blocks || [],
            gridSize: 25,
            metadata: {
                migratedFrom: 'localStorage',
                originalId: layoutStorageData.id,
                originalName: layoutStorageData.name,
                originalTimestamp: layoutStorageData.timestamp,
                migrationDate: new Date().toISOString()
            }
        };
    }

    /**
     * Migra layout esistenti da localStorage al backend
     * @param {string} ownerId - ID proprietario per i documenti migrati
     * @returns {Promise<Array>} - Documenti migrati
     */
    async migrateFromLocalStorage(ownerId) {
        try {
            // Importa LayoutStorage per leggere dati esistenti
            const { default: LayoutStorage } = await import('./LayoutStorage.js');
            
            const existingLayouts = LayoutStorage.getAllLayouts();
            const migratedDocuments = [];
            
            for (const [layoutId, layoutData] of Object.entries(existingLayouts)) {
                try {
                    const canvasData = CanvasBackendService.convertFromLayoutStorage(layoutData);
                    
                    const document = await this.createCanvasDocument({
                        name: `Migrato: ${layoutData.name}`,
                        description: `Layout migrato da localStorage (${new Date(layoutData.timestamp).toLocaleString()})`,
                        ownerId: ownerId
                    });
                    
                    await this.saveCanvas(canvasData);
                    migratedDocuments.push(document);
                    
                    console.log(`✅ Migrato layout "${layoutData.name}" → documento ${document.id}`);
                } catch (error) {
                    console.error(`❌ Errore migrazione layout "${layoutData.name}":`, error);
                }
            }
            
            console.log(`🔄 Migrazione completata: ${migratedDocuments.length} documenti`);
            return migratedDocuments;
        } catch (error) {
            console.error('❌ Errore migrazione da localStorage:', error);
            throw error;
        }
    }
}

export default CanvasBackendService;