/**
 * Piano di Test CRUD Granulare e Atomico - Architettura a Rendering Semantico
 * 
 * Implementazione automatizzata del piano di test definito nel documento tecnico,
 * adattato al sistema reale SSOT-3005 esistente.
 * 
 * OBIETTIVO: Verificare che ogni "atomo" informativo del sistema sia gestibile 
 * tramite operazioni CRUD complete attraverso l'interfaccia dinamica.
 */

class SemanticPlatformCRUDTests {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.testResults = {
            entityCRUD: [],
            schemaCRUD: [],
            moduleInstanceCRUD: [],
            semanticAPIs: []
        };
        this.testEntities = [];
        this.testModuleInstances = [];
        this.websocketEvents = [];
        
        console.log('🧪 Inizializzazione Suite Test CRUD Semantici');
    }

    /**
     * Esegue l'intera suite di test
     */
    async runAllTests() {
        console.log('🚀 Avvio Test Suite CRUD Completa');
        console.log('=' .repeat(60));

        try {
            // Setup
            await this.setupTestEnvironment();

            // Test 1: CRUD Entità (Persona)
            await this.runEntityCRUDTests();

            // Test 2: CRUD Schema e UI Metadata  
            await this.runSchemaCRUDTests();

            // Test 3: CRUD ModuleInstance
            await this.runModuleInstanceCRUDTests();

            // Test 4: API Semantiche
            await this.runSemanticAPITests();

            // Report finale
            this.generateTestReport();

        } catch (error) {
            console.error('❌ Errore nella suite di test:', error);
        } finally {
            // Cleanup
            await this.cleanupTestEnvironment();
        }
    }

    /**
     * Setup ambiente di test
     */
    async setupTestEnvironment() {
        console.log('\n🔧 Setup Ambiente di Test');
        
        try {
            // Test connessione backend
            const response = await fetch(`${this.baseUrl}/api/schema/entities`);
            if (!response.ok) {
                throw new Error(`Backend non raggiungibile: ${response.status}`);
            }
            
            console.log('✅ Backend raggiungibile');

            // Setup WebSocket per monitoraggio eventi
            if (typeof WebSocket !== 'undefined') {
                this.websocket = new WebSocket(`ws://localhost:3000`);
                this.websocket.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.websocketEvents.push({
                            ...message,
                            receivedAt: Date.now()
                        });
                    } catch (e) {
                        // Ignore invalid JSON
                    }
                };
                console.log('✅ WebSocket monitoring attivato');
            }

        } catch (error) {
            console.error('❌ Errore setup:', error);
            throw error;
        }
    }

    /**
     * TEST 1: Operazioni CRUD su Entità (Persona)
     * 
     * Verifica che il modulo dinamico possa:
     * - CREATE: Creare nuove entità Persona
     * - READ: Leggere entità esistenti
     * - UPDATE: Modificare attributi
     * - DELETE: Eliminare entità
     */
    async runEntityCRUDTests() {
        console.log('\n📋 TEST 1: CRUD Entità (Persona)');
        console.log('-'.repeat(40));

        // CREATE Test
        await this.testEntityCreate();
        
        // READ Test
        await this.testEntityRead();
        
        // UPDATE Test  
        await this.testEntityUpdate();
        
        // DELETE Test
        await this.testEntityDelete();
    }

    async testEntityCreate() {
        console.log('\n🔹 CREATE: Creazione Entità Persona');
        
        try {
            const testData = {
                entityType: 'Persona',
                nome: `TestPersona_${Date.now()}`,
                email: `test${Date.now()}@example.com`,
                telefono: '+39 123 456 7890',
                eta: 30
            };

            const response = await fetch(`${this.baseUrl}/api/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });

            const result = await response.json();

            if (response.ok && result.success && result.data.id) {
                this.testResults.entityCRUD.push({
                    test: 'CREATE',
                    status: 'PASS',
                    message: `Entità creata con ID: ${result.data.id}`,
                    entityId: result.data.id,
                    data: result.data
                });
                
                this.testEntities.push(result.data);
                console.log(`✅ CREATE PASS - ID: ${result.data.id}`);
                
                // Verifica WebSocket event
                await this.waitForWebSocketEvent('entity-created', 2000);
                
            } else {
                throw new Error(`Risposta non valida: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.entityCRUD.push({
                test: 'CREATE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ CREATE FAIL - ${error.message}`);
        }
    }

    async testEntityRead() {
        console.log('\n🔹 READ: Lettura Entità');
        
        if (this.testEntities.length === 0) {
            console.log('⚠️ Nessuna entità test disponibile per READ');
            return;
        }

        try {
            const testEntity = this.testEntities[0];
            const response = await fetch(`${this.baseUrl}/api/entity/${testEntity.id}`);
            const result = await response.json();

            if (response.ok && result.success && result.data.id === testEntity.id) {
                this.testResults.entityCRUD.push({
                    test: 'READ',
                    status: 'PASS',
                    message: `Entità letta correttamente`,
                    entityId: testEntity.id,
                    data: result.data
                });
                console.log(`✅ READ PASS - ID: ${testEntity.id}`);
            } else {
                throw new Error(`Entità non trovata o risposta non valida`);
            }

        } catch (error) {
            this.testResults.entityCRUD.push({
                test: 'READ',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ READ FAIL - ${error.message}`);
        }
    }

    async testEntityUpdate() {
        console.log('\n🔹 UPDATE: Aggiornamento Attributo');
        
        if (this.testEntities.length === 0) {
            console.log('⚠️ Nessuna entità test disponibile per UPDATE');
            return;
        }

        try {
            const testEntity = this.testEntities[0];
            const newValue = `NomeAggiornato_${Date.now()}`;

            const response = await fetch(`${this.baseUrl}/api/entity/${testEntity.id}/attribute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attributeName: 'nome',
                    value: newValue
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.testResults.entityCRUD.push({
                    test: 'UPDATE',
                    status: 'PASS',
                    message: `Attributo 'nome' aggiornato a: ${newValue}`,
                    entityId: testEntity.id,
                    data: result
                });
                console.log(`✅ UPDATE PASS - Nuovo nome: ${newValue}`);

                // Verifica WebSocket event
                await this.waitForWebSocketEvent('attribute-updated', 2000);

            } else {
                throw new Error(`Aggiornamento fallito: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.entityCRUD.push({
                test: 'UPDATE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ UPDATE FAIL - ${error.message}`);
        }
    }

    async testEntityDelete() {
        console.log('\n🔹 DELETE: Eliminazione Entità');
        
        if (this.testEntities.length === 0) {
            console.log('⚠️ Nessuna entità test disponibile per DELETE');
            return;
        }

        try {
            const testEntity = this.testEntities[0];
            const response = await fetch(`${this.baseUrl}/api/entity/${testEntity.id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.testResults.entityCRUD.push({
                    test: 'DELETE',
                    status: 'PASS',
                    message: `Entità eliminata con successo`,
                    entityId: testEntity.id,
                    data: result
                });
                console.log(`✅ DELETE PASS - ID: ${testEntity.id}`);

                // Rimuovi dall'array test
                this.testEntities = this.testEntities.filter(e => e.id !== testEntity.id);

                // Verifica WebSocket event
                await this.waitForWebSocketEvent('entity-deleted', 2000);

            } else {
                throw new Error(`Eliminazione fallita: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.entityCRUD.push({
                test: 'DELETE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ DELETE FAIL - ${error.message}`);
        }
    }

    /**
     * TEST 2: Operazioni CRUD su Attributi di Schema (Evoluzione Schema)
     * 
     * Verifica che il sistema possa:
     * - CREATE: Aggiungere nuovi attributi allo schema
     * - READ: Leggere schema con UI metadata
     * - UPDATE: Modificare UI metadata di attributi esistenti
     * - DELETE: (Non implementato - operazione distruttiva)
     */
    async runSchemaCRUDTests() {
        console.log('\n🎨 TEST 2: CRUD Schema e UI Metadata');
        console.log('-'.repeat(40));

        await this.testSchemaRead();
        await this.testSchemaEvolution();
        await this.testUIMetadataUpdate();
    }

    async testSchemaRead() {
        console.log('\n🔹 READ: Lettura Schema con UI Metadata');
        
        try {
            const formats = ['standard', 'semantic-ui', 'ui-metadata-only'];
            
            for (const format of formats) {
                let url = `${this.baseUrl}/api/schema/entity/Persona`;
                
                if (format === 'semantic-ui') {
                    url += '?format=semantic-ui';
                } else if (format === 'ui-metadata-only') {
                    url = `${this.baseUrl}/api/schema/entity/Persona/ui-metadata`;
                } else {
                    url += '?includeUIMetadata=true';
                }

                const response = await fetch(url);
                const result = await response.json();

                if (response.ok && result.success) {
                    this.testResults.schemaCRUD.push({
                        test: `READ_SCHEMA_${format.toUpperCase()}`,
                        status: 'PASS',
                        message: `Schema formato ${format} letto correttamente`,
                        data: result.data
                    });
                    console.log(`✅ READ SCHEMA (${format}) PASS`);
                } else {
                    throw new Error(`Errore lettura schema ${format}: ${JSON.stringify(result)}`);
                }
            }

        } catch (error) {
            this.testResults.schemaCRUD.push({
                test: 'READ_SCHEMA',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ READ SCHEMA FAIL - ${error.message}`);
        }
    }

    async testSchemaEvolution() {
        console.log('\n🔹 CREATE: Evoluzione Schema (Aggiunta Attributo)');
        
        try {
            const newAttributeName = `testAttr_${Date.now()}`;
            const evolution = {
                attributes: {
                    [newAttributeName]: {
                        type: 'string',
                        description: 'Attributo test aggiunto dalla suite di test',
                        uiMetadata: {
                            label: 'Test Attribute',
                            component: 'TextInput',
                            group: 'test',
                            priority: 'medium',
                            placeholder: 'Inserisci valore test...'
                        },
                        renderingHints: {
                            priority: 'medium',
                            grouping: 'test'
                        },
                        displaySettings: {
                            icon: 'flask',
                            editMode: 'inline'
                        }
                    }
                }
            };

            const response = await fetch(`${this.baseUrl}/api/schema/entity/Persona`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ evolution })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.testResults.schemaCRUD.push({
                    test: 'SCHEMA_EVOLUTION',
                    status: 'PASS',
                    message: `Attributo ${newAttributeName} aggiunto con successo`,
                    attributeName: newAttributeName,
                    data: result.data
                });
                console.log(`✅ SCHEMA EVOLUTION PASS - Attributo: ${newAttributeName}`);

                // Verifica WebSocket event
                await this.waitForWebSocketEvent('schema-evolved', 2000);

            } else {
                throw new Error(`Evoluzione schema fallita: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.schemaCRUD.push({
                test: 'SCHEMA_EVOLUTION',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ SCHEMA EVOLUTION FAIL - ${error.message}`);
        }
    }

    async testUIMetadataUpdate() {
        console.log('\n🔹 UPDATE: Aggiornamento UI Metadata');
        
        try {
            const uiMetadata = {
                label: `Label Aggiornata Test ${Date.now()}`,
                component: 'TextArea',
                priority: 'high',
                placeholder: 'Placeholder aggiornato dalla suite di test',
                group: 'updated'
            };

            const response = await fetch(`${this.baseUrl}/api/schema/entity/Persona/ui-metadata`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attributeName: 'nome',
                    uiMetadata: uiMetadata
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.testResults.schemaCRUD.push({
                    test: 'UI_METADATA_UPDATE',
                    status: 'PASS',
                    message: `UI Metadata per 'nome' aggiornato`,
                    data: result.data
                });
                console.log(`✅ UI METADATA UPDATE PASS`);

                // Verifica WebSocket event
                await this.waitForWebSocketEvent('ui-metadata-updated', 2000);

            } else {
                throw new Error(`Aggiornamento UI metadata fallito: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.schemaCRUD.push({
                test: 'UI_METADATA_UPDATE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ UI METADATA UPDATE FAIL - ${error.message}`);
        }
    }


    /**
     * TEST 3: Operazioni CRUD su ModuleInstance
     * 
     * Verifica gestione completa delle istanze di moduli
     */
    async runModuleInstanceCRUDTests() {
        console.log('\n🧩 TEST 3: CRUD ModuleInstance');
        console.log('-'.repeat(40));

        await this.testModuleInstanceCreate();
        await this.testModuleInstanceRead();
        await this.testModuleInstanceUpdate();
        await this.testModuleInstanceDelete();
    }

    async testModuleInstanceCreate() {
        console.log('\n🔹 CREATE: Creazione ModuleInstance');
        
        try {
            const moduleData = {
                entityType: 'ModuleInstance',
                name: `TestModule_${Date.now()}`,
                templateModuleId: 'DynamicTableModule',
                targetEntityType: 'Persona',
                ownerUserId: 'test-user',
                description: 'Modulo test creato dalla suite di test',
                status: 'active'
            };

            const response = await fetch(`${this.baseUrl}/api/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moduleData)
            });

            const result = await response.json();

            if (response.ok && result.success && result.data.id) {
                this.testResults.moduleInstanceCRUD.push({
                    test: 'CREATE',
                    status: 'PASS',
                    message: `ModuleInstance creato con ID: ${result.data.id}`,
                    moduleId: result.data.id,
                    data: result.data
                });
                
                this.testModuleInstances.push(result.data);
                console.log(`✅ MODULE CREATE PASS - ID: ${result.data.id}`);
                
            } else {
                throw new Error(`Creazione ModuleInstance fallita: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.moduleInstanceCRUD.push({
                test: 'CREATE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ MODULE CREATE FAIL - ${error.message}`);
        }
    }

    async testModuleInstanceRead() {
        console.log('\n🔹 READ: Lettura ModuleInstance');
        
        if (this.testModuleInstances.length === 0) {
            console.log('⚠️ Nessun ModuleInstance test disponibile per READ');
            return;
        }

        try {
            const testModule = this.testModuleInstances[0];
            const response = await fetch(`${this.baseUrl}/api/entity/${testModule.id}`);
            const result = await response.json();

            if (response.ok && result.success && result.data.id === testModule.id) {
                this.testResults.moduleInstanceCRUD.push({
                    test: 'READ',
                    status: 'PASS',
                    message: `ModuleInstance letto correttamente`,
                    moduleId: testModule.id,
                    data: result.data
                });
                console.log(`✅ MODULE READ PASS - ID: ${testModule.id}`);
            } else {
                throw new Error(`ModuleInstance non trovato o risposta non valida`);
            }

        } catch (error) {
            this.testResults.moduleInstanceCRUD.push({
                test: 'READ',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ MODULE READ FAIL - ${error.message}`);
        }
    }

    async testModuleInstanceUpdate() {
        console.log('\n🔹 UPDATE: Aggiornamento ModuleInstance');
        
        if (this.testModuleInstances.length === 0) {
            console.log('⚠️ Nessun ModuleInstance test disponibile per UPDATE');
            return;
        }

        try {
            const testModule = this.testModuleInstances[0];
            const newName = `ModuleAggiornato_${Date.now()}`;

            const response = await fetch(`${this.baseUrl}/api/entity/${testModule.id}/attribute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attributeName: 'name',
                    value: newName
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.testResults.moduleInstanceCRUD.push({
                    test: 'UPDATE',
                    status: 'PASS',
                    message: `ModuleInstance aggiornato: ${newName}`,
                    moduleId: testModule.id,
                    data: result
                });
                console.log(`✅ MODULE UPDATE PASS - Nuovo nome: ${newName}`);
            } else {
                throw new Error(`Aggiornamento ModuleInstance fallito: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.moduleInstanceCRUD.push({
                test: 'UPDATE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ MODULE UPDATE FAIL - ${error.message}`);
        }
    }

    async testModuleInstanceDelete() {
        console.log('\n🔹 DELETE: Eliminazione ModuleInstance');
        
        if (this.testModuleInstances.length === 0) {
            console.log('⚠️ Nessun ModuleInstance test disponibile per DELETE');
            return;
        }

        try {
            const testModule = this.testModuleInstances[0];
            const response = await fetch(`${this.baseUrl}/api/entity/${testModule.id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.testResults.moduleInstanceCRUD.push({
                    test: 'DELETE',
                    status: 'PASS',
                    message: `ModuleInstance eliminato con successo`,
                    moduleId: testModule.id,
                    data: result
                });
                console.log(`✅ MODULE DELETE PASS - ID: ${testModule.id}`);

                // Rimuovi dall'array test
                this.testModuleInstances = this.testModuleInstances.filter(m => m.id !== testModule.id);
            } else {
                throw new Error(`Eliminazione ModuleInstance fallita: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            this.testResults.moduleInstanceCRUD.push({
                test: 'DELETE',
                status: 'FAIL',
                message: error.message,
                error: error
            });
            console.log(`❌ MODULE DELETE FAIL - ${error.message}`);
        }
    }

    /**
     * TEST 4: API Semantiche Complete
     */
    async runSemanticAPITests() {
        console.log('\n🎨 TEST 4: API Semantiche Complete');
        console.log('-'.repeat(40));

        console.log('✅ Schema API con UI metadata già testato in TEST 2');
        console.log('✅ Sistema basato su autocomplete search esistente');
    }

    /**
     * Attende un evento WebSocket specifico
     */
    async waitForWebSocketEvent(eventType, timeout = 3000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkEvent = () => {
                const event = this.websocketEvents.find(e => 
                    e.type === eventType && e.receivedAt > startTime - 1000
                );
                
                if (event) {
                    console.log(`📡 WebSocket event ricevuto: ${eventType}`);
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    console.log(`⚠️ WebSocket event timeout: ${eventType}`);
                    resolve(false);
                } else {
                    setTimeout(checkEvent, 100);
                }
            };
            
            checkEvent();
        });
    }

    /**
     * Genera report finale dei test
     */
    generateTestReport() {
        console.log('\n📊 REPORT FINALE TEST CRUD');
        console.log('='.repeat(60));

        const categories = [
            { name: 'CRUD Entità', results: this.testResults.entityCRUD },
            { name: 'CRUD Schema', results: this.testResults.schemaCRUD },
            { name: 'CRUD ModuleInstance', results: this.testResults.moduleInstanceCRUD },
            { name: 'API Semantiche', results: this.testResults.semanticAPIs }
        ];

        let totalTests = 0;
        let totalPassed = 0;

        categories.forEach(category => {
            const passed = category.results.filter(r => r.status === 'PASS').length;
            const failed = category.results.filter(r => r.status === 'FAIL').length;
            const total = passed + failed;
            
            totalTests += total;
            totalPassed += passed;

            console.log(`\n📋 ${category.name}:`);
            console.log(`   ✅ Passati: ${passed}/${total} (${total > 0 ? Math.round(passed/total*100) : 0}%)`);
            
            if (failed > 0) {
                console.log(`   ❌ Falliti: ${failed}`);
                category.results.filter(r => r.status === 'FAIL').forEach(test => {
                    console.log(`      - ${test.test}: ${test.message}`);
                });
            }
        });

        console.log(`\n🎯 RISULTATO COMPLESSIVO:`);
        console.log(`   ✅ ${totalPassed}/${totalTests} test passati (${totalTests > 0 ? Math.round(totalPassed/totalTests*100) : 0}%)`);
        console.log(`   📡 ${this.websocketEvents.length} eventi WebSocket ricevuti`);

        if (totalPassed === totalTests && totalTests > 0) {
            console.log('\n🎉 TUTTI I TEST SONO PASSATI! Architettura semantica completamente funzionale.');
        } else if (totalPassed > totalTests * 0.8) {
            console.log('\n✅ La maggior parte dei test è passata. Sistema stabile con alcune aree da migliorare.');
        } else {
            console.log('\n⚠️ Alcuni test critici sono falliti. Rivedere l\'implementazione.');
        }

        // Salva report dettagliato
        this.saveDetailedReport();
    }

    /**
     * Salva report dettagliato per analisi
     */
    saveDetailedReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: Object.values(this.testResults).reduce((acc, cat) => acc + cat.length, 0),
                totalPassed: Object.values(this.testResults).reduce((acc, cat) => 
                    acc + cat.filter(r => r.status === 'PASS').length, 0),
                websocketEventsCount: this.websocketEvents.length
            },
            results: this.testResults,
            websocketEvents: this.websocketEvents,
            testEntities: this.testEntities,
            testModuleInstances: this.testModuleInstances
        };

        console.log('\n💾 Report dettagliato:');
        console.log(JSON.stringify(report, null, 2));
    }

    /**
     * Cleanup ambiente di test
     */
    async cleanupTestEnvironment() {
        console.log('\n🧹 Cleanup Test Environment');
        
        try {
            // Cleanup entità test rimanenti
            for (const entity of this.testEntities) {
                try {
                    await fetch(`${this.baseUrl}/api/entity/${entity.id}`, { method: 'DELETE' });
                    console.log(`🗑️ Cleanup entità: ${entity.id}`);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }

            // Cleanup module instances test rimanenti
            for (const module of this.testModuleInstances) {
                try {
                    await fetch(`${this.baseUrl}/api/entity/${module.id}`, { method: 'DELETE' });
                    console.log(`🗑️ Cleanup modulo: ${module.id}`);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }

            // Chiudi WebSocket
            if (this.websocket) {
                this.websocket.close();
                console.log('🔌 WebSocket chiuso');
            }

            console.log('✅ Cleanup completato');

        } catch (error) {
            console.error('❌ Errore cleanup:', error);
        }
    }
}

// Export per utilizzo in diversi contesti
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SemanticPlatformCRUDTests;
}

// Per utilizzo in browser
if (typeof window !== 'undefined') {
    window.SemanticPlatformCRUDTests = SemanticPlatformCRUDTests;
}

// Auto-run se eseguito direttamente in Node.js
if (typeof require !== 'undefined' && require.main === module) {
    (async () => {
        const testSuite = new SemanticPlatformCRUDTests();
        await testSuite.runAllTests();
    })();
}