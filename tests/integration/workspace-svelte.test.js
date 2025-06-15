const { TestRunner, Assert, TestData } = require('../test-utils');
const fetch = require('node-fetch');
const WebSocket = require('ws');

// Imposta fetch globale per i test
global.fetch = fetch;

// Test per SSOT-4000 Fase 2 - Svelte Workspace
const WorkspaceSvelteTests = {
    baseUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000',
    testDocumentId: null,
    testModuleIds: [],
    
    async beforeAll() {
        // Verifica che il server sia in esecuzione
        try {
            console.log('🔄 Verifica connessione server...');
            const response = await fetch(`${this.baseUrl}/api/documents`);
            console.log('📡 Response status:', response.status);
            if (!response.ok) {
                throw new Error('Server non raggiungibile. Assicurati che sia in esecuzione.');
            }
            console.log('✅ Server connesso correttamente');
        } catch (error) {
            console.error('❌ Server non disponibile:', error.message);
            throw error; // Non fare exit, permetti al test di continuare
        }
    },
    
    async afterAll() {
        // Cleanup finale dopo tutti i test
        if (this.testDocumentId) {
            try {
                await fetch(`${this.baseUrl}/api/documents/${this.testDocumentId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                // Ignora errori di cleanup
            }
            this.testDocumentId = null;
        }
        
        // Cleanup ModuleInstance creati
        for (const moduleId of this.testModuleIds) {
            try {
                await fetch(`${this.baseUrl}/api/module-instances/${moduleId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                // Ignora errori di cleanup
            }
        }
        this.testModuleIds = [];
    },
    
    // Test 1: Creazione CompositeDocument
    async testCreateCompositeDocument() {
        const documentData = {
            name: 'Test Workspace Document',
            description: 'Documento di test per workspace Svelte',
            ownerId: 'test-user-123',
            status: 'draft',
            metadata: {
                testRun: true,
                timestamp: new Date().toISOString()
            }
        };
        
        const response = await fetch(`${this.baseUrl}/api/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(documentData)
        });
        
        Assert.equals(response.ok, true, 'La creazione del documento deve avere successo');
        
        const result = await response.json();
        Assert.equals(result.success, true, 'La risposta deve indicare successo');
        Assert.exists(result.data, 'Deve essere restituito il documento creato');
        Assert.exists(result.data.id, 'Il documento deve avere un ID');
        Assert.equals(result.data.name, documentData.name, 'Il nome deve corrispondere');
        
        this.testDocumentId = result.data.id;
        return result.data;
    },
    
    // Test 2: Recupero documento con moduli  
    async testGetDocumentWithModules(documentId = null) {
        // Usa l'ID fornito o quello corrente
        const idToUse = documentId || this.testDocumentId;
        if (!idToUse) {
            throw new Error('Nessun documento di test disponibile');
        }
        
        const response = await fetch(`${this.baseUrl}/api/documents/${idToUse}`);
        Assert.equals(response.ok, true, 'Il recupero del documento deve avere successo');
        
        const result = await response.json();
        Assert.equals(result.success, true, 'La risposta deve indicare successo');
        Assert.exists(result.data, 'Deve essere restituito il documento');
        Assert.equals(result.data.id, idToUse, 'L\'ID deve corrispondere');
        Assert.isArray(result.data.modules, 'Il documento deve avere un array di moduli');
        
        return result.data;
    },
    
    // Test 3: Aggiunta modulo al documento
    async testAddModuleToDocument() {
        // Riutilizza il documento già creato o ne crea uno nuovo
        if (!this.testDocumentId) {
            await this.testCreateCompositeDocument();
        }
        const doc = { id: this.testDocumentId };
        
        // Prima crea un ModuleInstance
        const moduleInstanceData = {
            instanceName: 'Test Contact Card',
            templateModuleId: 'contact-card',
            targetEntityType: 'Contact',
            targetEntityId: 'test-entity-123',
            description: 'Modulo di test per contatti'
        };
        
        const moduleResponse = await fetch(`${this.baseUrl}/api/module-instances`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(moduleInstanceData)
        });
        
        Assert.equals(moduleResponse.ok, true, 'La creazione del ModuleInstance deve avere successo');
        
        const moduleResult = await moduleResponse.json();
        Assert.exists(moduleResult, 'Deve essere restituito il ModuleInstance creato');
        Assert.exists(moduleResult.id, 'Il ModuleInstance deve avere un ID');
        
        const moduleId = moduleResult.id;
        this.testModuleIds.push(moduleId);
        
        // Ora aggiungi il modulo al documento
        const moduleData = {
            action: 'add',
            moduleId: moduleId,
            layoutConfig: {
                position: { x: 0, y: 0 },
                size: { width: 4, height: 3 },
                type: 'contact-card',
                config: {
                    entityId: 'test-entity-123'
                }
            }
        };
        
        const response = await fetch(`${this.baseUrl}/api/documents/${doc.id}/modules`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(moduleData)
        });
        
        Assert.equals(response.ok, true, 'L\'aggiunta del modulo deve avere successo');
        
        const result = await response.json();
        Assert.equals(result.success, true, 'La risposta deve indicare successo');
        
        // Verifica che il modulo sia stato aggiunto recuperando il documento
        const response2 = await fetch(`${this.baseUrl}/api/documents/${doc.id}`);
        Assert.equals(response2.ok, true, 'Il recupero del documento aggiornato deve avere successo');
        
        const updatedDocResult = await response2.json();
        Assert.equals(updatedDocResult.success, true, 'La risposta deve indicare successo');
        const updatedDoc = updatedDocResult.data;
        
        Assert.isArray(updatedDoc.modules, 'Il documento deve avere un array di moduli');
        Assert.equals(updatedDoc.modules.length, 1, 'Deve esserci un modulo');
        Assert.equals(updatedDoc.modules[0].moduleId, moduleId, 'L\'ID del modulo deve corrispondere');
        
        return updatedDoc;
    },
    
    // Test 4: Aggiornamento layout modulo  
    async testUpdateModuleLayout() {
        // Riutilizza il documento e modulo del test precedente
        if (!this.testDocumentId || this.testModuleIds.length === 0) {
            await this.testAddModuleToDocument();
        }
        
        const doc = { id: this.testDocumentId };
        const moduleId = this.testModuleIds[0];
        
        const updateData = {
            action: 'update',
            moduleId: moduleId,
            layoutConfig: {
                position: { x: 2, y: 1 },
                size: { width: 6, height: 4 },
                config: {
                    entityId: 'test-entity-123',
                    theme: 'dark'
                }
            }
        };
        
        const response = await fetch(`${this.baseUrl}/api/documents/${doc.id}/modules`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        Assert.equals(response.ok, true, 'L\'aggiornamento del layout deve avere successo');
        
        // Verifica l'aggiornamento
        const updatedDoc = await this.testGetDocumentWithModules(doc.id);
        const updatedModule = updatedDoc.modules.find(m => m.moduleId === moduleId);
        
        Assert.exists(updatedModule, 'Il modulo aggiornato deve esistere');
        Assert.equals(updatedModule.position.x, 2, 'La posizione X deve essere aggiornata');
        Assert.equals(updatedModule.position.y, 1, 'La posizione Y deve essere aggiornata');
        Assert.equals(updatedModule.size.width, 6, 'La larghezza deve essere aggiornata');
        Assert.equals(updatedModule.config.theme, 'dark', 'La configurazione deve essere aggiornata');
    },
    
    // Test 5: Rimozione modulo
    async testRemoveModule() {
        // Riutilizza il documento e modulo esistente
        if (!this.testDocumentId || this.testModuleIds.length === 0) {
            await this.testAddModuleToDocument();
        }
        
        const doc = { id: this.testDocumentId };
        const moduleId = this.testModuleIds[0];
        
        const removeData = {
            action: 'remove',
            moduleId: moduleId
        };
        
        const response = await fetch(`${this.baseUrl}/api/documents/${doc.id}/modules`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(removeData)
        });
        
        Assert.equals(response.ok, true, 'La rimozione del modulo deve avere successo');
        
        // Verifica la rimozione
        const updatedDoc = await this.testGetDocumentWithModules(doc.id);
        Assert.equals(updatedDoc.modules.length, 0, 'Non ci devono essere più moduli');
    },
    
    // Test 6: WebSocket real-time sync
    async testWebSocketSync() {
        return new Promise(async (resolve, reject) => {
            const doc = await this.testCreateCompositeDocument();
            const ws = new WebSocket(this.wsUrl);
            let messageReceived = false;
            
            ws.on('open', () => {
                // Sottoscrivi agli eventi CompositeDocument
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    pattern: {
                        entityType: 'CompositeDocument'
                    }
                }));
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    
                    // Verifica vari formati di messaggio per compatibilità
                    const isTargetMessage = (
                        // Nuovo formato standardizzato
                        (message.type === 'change' && 
                         message.entityType === 'CompositeDocument' &&
                         message.entityId === doc.id) ||
                        // Formato AttributeSpace
                        (message.type === 'attributeChange' && 
                         message.data?.entityType === 'CompositeDocument' &&
                         message.data?.entityId === doc.id) ||
                        // Formato documento specifico
                        (message.type === 'document-updated' && 
                         message.data?.documentId === doc.id)
                    );
                    
                    if (isTargetMessage) {
                        messageReceived = true;
                        ws.close();
                        Assert.equals(messageReceived, true, 'Deve ricevere notifica WebSocket');
                        resolve();
                    }
                } catch (error) {
                    // Ignora messaggi non validi
                }
            });
            
            ws.on('error', (error) => {
                ws.close();
                reject(error);
            });
            
            // Dopo la connessione, aggiorna il documento per triggerare evento
            setTimeout(async () => {
                await fetch(`${this.baseUrl}/api/documents/${doc.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        description: 'Descrizione aggiornata via WebSocket test'
                    })
                });
                
                // Timeout per evitare attesa infinita
                setTimeout(() => {
                    if (!messageReceived) {
                        ws.close();
                        reject(new Error('Timeout waiting for WebSocket message'));
                    }
                }, 5000);
            }, 500);
        });
    },
    
    // Test 7: Layout persistence
    async testLayoutPersistence() {
        const doc = await this.testCreateCompositeDocument();
        
        // Aggiungi layout personalizzato
        const layoutData = {
            layout: {
                gridSize: 16,
                cellHeight: 80,
                margin: [15, 15],
                modules: {
                    'test-module-1': {
                        x: 0,
                        y: 0,
                        w: 4,
                        h: 3,
                        lastModified: Date.now()
                    }
                }
            }
        };
        
        const response = await fetch(`${this.baseUrl}/api/documents/${doc.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(layoutData)
        });
        
        Assert.equals(response.ok, true, 'L\'aggiornamento del layout deve avere successo');
        
        // Recupera e verifica
        const updatedDoc = await this.testGetDocumentWithModules(doc.id);
        Assert.exists(updatedDoc.layout, 'Il documento deve avere un layout');
        Assert.equals(updatedDoc.layout.gridSize, 16, 'Grid size deve essere salvato');
        Assert.equals(updatedDoc.layout.cellHeight, 80, 'Cell height deve essere salvato');
        Assert.exists(updatedDoc.layout.modules, 'I moduli layout devono essere salvati');
    },
    
    // Test 8: Multiple modules management
    async testMultipleModules() {
        const doc = await this.testCreateCompositeDocument();
        
        // Definisci i moduli da creare
        const moduleConfigs = [
            { templateModuleId: 'contact-card', name: 'Contact Card 1', x: 0, y: 0 },
            { templateModuleId: 'data-table', name: 'Data Table 1', x: 4, y: 0 },
            { templateModuleId: 'notes-board', name: 'Notes Board 1', x: 0, y: 3 }
        ];
        
        const createdModuleIds = [];
        
        // Crea ModuleInstance per ogni modulo
        for (const config of moduleConfigs) {
            const moduleInstanceData = {
                instanceName: config.name,
                templateModuleId: config.templateModuleId,
                targetEntityType: 'Contact',
                targetEntityId: 'test-entity-123',
                description: `Modulo di test ${config.name}`
            };
            
            const moduleResponse = await fetch(`${this.baseUrl}/api/module-instances`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleInstanceData)
            });
            
            Assert.equals(moduleResponse.ok, true, `Creazione ModuleInstance ${config.name} deve avere successo`);
            
            const moduleResult = await moduleResponse.json();
            Assert.exists(moduleResult, 'Deve essere restituito il ModuleInstance creato');
            Assert.exists(moduleResult.id, 'Il ModuleInstance deve avere un ID');
            
            const moduleId = moduleResult.id;
            createdModuleIds.push(moduleId);
            this.testModuleIds.push(moduleId);
            
            // Aggiungi modulo al documento
            const response = await fetch(`${this.baseUrl}/api/documents/${doc.id}/modules`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'add',
                    moduleId: moduleId,
                    layoutConfig: {
                        position: { x: config.x, y: config.y },
                        size: { width: 4, height: 3 },
                        type: config.templateModuleId
                    }
                })
            });
            
            Assert.equals(response.ok, true, `Aggiunta modulo ${config.name} deve avere successo`);
        }
        
        // Verifica tutti i moduli
        const updatedDoc = await this.testGetDocumentWithModules(doc.id);
        Assert.equals(updatedDoc.modules.length, 3, 'Devono esserci 3 moduli');
        
        // Verifica che tutti i moduli creati siano presenti
        for (const moduleId of createdModuleIds) {
            const foundModule = updatedDoc.modules.find(m => m.moduleId === moduleId);
            Assert.exists(foundModule, `Modulo ${moduleId} deve esistere`);
        }
    },
    
    // Test 9: Error handling
    async testErrorHandling() {
        // Test documento non esistente
        const response1 = await fetch(`${this.baseUrl}/api/documents/non-existent-id`);
        Assert.equals(response1.ok, false, 'Il recupero di documento non esistente deve fallire');
        
        // Test creazione senza dati richiesti
        const response2 = await fetch(`${this.baseUrl}/api/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        Assert.equals(response2.ok, false, 'La creazione senza nome deve fallire');
        
        // Test modulo action non valida
        const doc = await this.testCreateCompositeDocument();
        const response3 = await fetch(`${this.baseUrl}/api/documents/${doc.id}/modules`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'invalid-action',
                moduleId: 'test'
            })
        });
        Assert.equals(response3.ok, false, 'Action non valida deve fallire');
    },
    
    // Test 10: Document status management
    async testDocumentStatus() {
        const doc = await this.testCreateCompositeDocument();
        
        // Test aggiornamento status
        const statuses = ['draft', 'published', 'archived'];
        
        for (const status of statuses) {
            const response = await fetch(`${this.baseUrl}/api/documents/${doc.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            
            Assert.equals(response.ok, true, `Aggiornamento status a ${status} deve avere successo`);
            
            const updatedDoc = await this.testGetDocumentWithModules(doc.id);
            Assert.equals(updatedDoc.status, status, `Status deve essere ${status}`);
        }
    }
};

// Esegui i test
async function run() {
    const runner = new TestRunner('🧪 SSOT-4000 Workspace Svelte Tests');
    
    // Setup
    await WorkspaceSvelteTests.beforeAll();
    
    // Aggiungi tutti i test
    runner.test('Create CompositeDocument', 
        () => WorkspaceSvelteTests.testCreateCompositeDocument());
    
    runner.test('Get document with modules', 
        () => WorkspaceSvelteTests.testGetDocumentWithModules());
    
    runner.test('Add module to document', 
        () => WorkspaceSvelteTests.testAddModuleToDocument());
    
    runner.test('Update module layout', 
        () => WorkspaceSvelteTests.testUpdateModuleLayout());
    
    runner.test('Remove module', 
        () => WorkspaceSvelteTests.testRemoveModule());
    
    runner.test('WebSocket real-time sync', 
        () => WorkspaceSvelteTests.testWebSocketSync());
    
    runner.test('Layout persistence', 
        () => WorkspaceSvelteTests.testLayoutPersistence());
    
    runner.test('Multiple modules management', 
        () => WorkspaceSvelteTests.testMultipleModules());
    
    runner.test('Error handling', 
        () => WorkspaceSvelteTests.testErrorHandling());
    
    runner.test('Document status management', 
        () => WorkspaceSvelteTests.testDocumentStatus());
    
    // Esegui tutti i test
    const success = await runner.run();
    
    // Cleanup finale
    await WorkspaceSvelteTests.afterAll();
    
    return success;
}

module.exports = { run };

// Esegui automaticamente se chiamato direttamente
if (require.main === module) {
    run().catch(console.error);
}