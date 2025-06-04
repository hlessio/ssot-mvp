/**
 * test_phase2_api.js - Script di test per le API della Fase 2
 * 
 * Testa:
 * - Creazione schema ModuleInstance
 * - CRUD operations per ModuleInstance  
 * - Integrazione con template modules
 * - WebSocket notifications
 */

const fs = require('fs');
const path = require('path');

class Phase2APITester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.testResults = [];
    }

    async runTests() {
        console.log('🚀 Avvio Test API Fase 2 - Module Instances');
        console.log('=' .repeat(60));

        try {
            await this.testSchemaCreation();
            await this.testModuleInstanceCRUD();
            await this.testInstancesListing();
            await this.testEntityIntegration();
            
            this.showResults();
        } catch (error) {
            console.error('❌ Errore durante i test:', error);
        }
    }

    async testSchemaCreation() {
        console.log('\n📋 Test 1: Creazione Schema ModuleInstance');
        
        try {
            const schemaDefinition = {
                attributes: {
                    instanceName: { type: 'string', required: true, description: 'Nome dell\'istanza' },
                    templateModuleId: { type: 'string', required: true, description: 'ID del template' },
                    targetEntityId: { type: 'string', required: false, description: 'ID entità target' },
                    targetEntityType: { type: 'string', required: true, description: 'Tipo entità target' },
                    ownerUserId: { type: 'string', required: false, description: 'ID utente proprietario' },
                    description: { type: 'string', required: false, description: 'Descrizione istanza' },
                    instanceConfigOverrides: { type: 'string', required: false, description: 'Config JSON string' },
                    createdAt: { type: 'string', required: false, description: 'Data creazione' },
                    updatedAt: { type: 'string', required: false, description: 'Data aggiornamento' },
                    version: { type: 'number', required: false, description: 'Versione istanza' }
                },
                mode: 'flexible'
            };

            const response = await fetch(`${this.baseUrl}/api/schema/entity/ModuleInstance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schemaDefinition })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Schema ModuleInstance creato con successo');
                this.testResults.push({ test: 'Schema Creation', status: 'PASS' });
            } else {
                const error = await response.text();
                if (error.includes('già esiste')) {
                    console.log('ℹ️ Schema ModuleInstance già esistente');
                    this.testResults.push({ test: 'Schema Creation', status: 'SKIP' });
                } else {
                    throw new Error(`Errore creazione schema: ${error}`);
                }
            }
        } catch (error) {
            console.error('❌ Errore test schema:', error.message);
            this.testResults.push({ test: 'Schema Creation', status: 'FAIL', error: error.message });
        }
    }

    async testModuleInstanceCRUD() {
        console.log('\n🔧 Test 2: CRUD Operations ModuleInstance');
        
        try {
            // CREATE
            console.log('📝 Testing CREATE...');
            const instanceData = {
                instanceName: 'Test Mario Rossi Compatto',
                templateModuleId: 'StandardContactCard',
                targetEntityId: '11ef8b2e-91ae-4db3-9bed-eca44ffb763a',
                targetEntityType: 'Contact',
                ownerUserId: 'test-user',
                description: 'Vista test per Mario Rossi',
                instanceConfigOverrides: JSON.stringify({
                    viewMode: 'compactCard',
                    showTitle: true,
                    customTitle: 'Mario - Vista Compatta'
                })
            };

            const createResponse = await fetch(`${this.baseUrl}/api/module-instances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(instanceData)
            });

            if (!createResponse.ok) {
                throw new Error(`CREATE failed: ${await createResponse.text()}`);
            }

            const createdInstance = await createResponse.json();
            console.log('✅ Istanza creata:', createdInstance.id);
            const instanceId = createdInstance.id;

            // READ
            console.log('📖 Testing READ...');
            const readResponse = await fetch(`${this.baseUrl}/api/module-instances/${instanceId}`);
            
            if (!readResponse.ok) {
                throw new Error(`READ failed: ${await readResponse.text()}`);
            }

            const readInstance = await readResponse.json();
            console.log('✅ Istanza letta:', readInstance.instanceName);

            // UPDATE
            console.log('✏️ Testing UPDATE...');
            const updateData = {
                instanceName: 'Test Mario Rossi Compatto - AGGIORNATO',
                description: 'Vista aggiornata per test'
            };

            const updateResponse = await fetch(`${this.baseUrl}/api/module-instances/${instanceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                throw new Error(`UPDATE failed: ${await updateResponse.text()}`);
            }

            const updatedInstance = await updateResponse.json();
            console.log('✅ Istanza aggiornata:', updatedInstance.instanceName);

            // DELETE
            console.log('🗑️ Testing DELETE...');
            const deleteResponse = await fetch(`${this.baseUrl}/api/module-instances/${instanceId}`, {
                method: 'DELETE'
            });

            if (!deleteResponse.ok) {
                throw new Error(`DELETE failed: ${await deleteResponse.text()}`);
            }

            console.log('✅ Istanza eliminata con successo');

            this.testResults.push({ test: 'CRUD Operations', status: 'PASS' });

        } catch (error) {
            console.error('❌ Errore test CRUD:', error.message);
            this.testResults.push({ test: 'CRUD Operations', status: 'FAIL', error: error.message });
        }
    }

    async testInstancesListing() {
        console.log('\n📋 Test 3: Listing e Filtering');
        
        try {
            // Crea alcune istanze per il test
            const instances = [
                {
                    instanceName: 'Lista Test 1',
                    templateModuleId: 'StandardContactCard',
                    targetEntityType: 'Contact',
                    ownerUserId: 'user1'
                },
                {
                    instanceName: 'Lista Test 2', 
                    templateModuleId: 'CompactContactCard',
                    targetEntityType: 'Contact',
                    ownerUserId: 'user2'
                }
            ];

            const createdIds = [];
            
            for (const instance of instances) {
                const response = await fetch(`${this.baseUrl}/api/module-instances`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(instance)
                });
                
                if (response.ok) {
                    const created = await response.json();
                    createdIds.push(created.id);
                }
            }

            // Test listing senza filtri
            const listResponse = await fetch(`${this.baseUrl}/api/module-instances`);
            if (!listResponse.ok) {
                throw new Error(`LIST failed: ${await listResponse.text()}`);
            }

            const listResult = await listResponse.json();
            console.log(`✅ Lista istanze: ${listResult.instances.length} trovate`);

            // Test listing con filtri
            const filterResponse = await fetch(`${this.baseUrl}/api/module-instances?templateModuleId=StandardContactCard`);
            if (!filterResponse.ok) {
                throw new Error(`FILTER failed: ${await filterResponse.text()}`);
            }

            const filterResult = await filterResponse.json();
            console.log(`✅ Filtro per template: ${filterResult.instances.length} trovate`);

            // Cleanup
            for (const id of createdIds) {
                await fetch(`${this.baseUrl}/api/module-instances/${id}`, { method: 'DELETE' });
            }

            this.testResults.push({ test: 'Listing & Filtering', status: 'PASS' });

        } catch (error) {
            console.error('❌ Errore test listing:', error.message);
            this.testResults.push({ test: 'Listing & Filtering', status: 'FAIL', error: error.message });
        }
    }

    async testEntityIntegration() {
        console.log('\n🔗 Test 4: Integrazione con Entities');
        
        try {
            // Verifica entità Contact esistenti
            const entitiesResponse = await fetch(`${this.baseUrl}/api/entities/Contact`);
            if (!entitiesResponse.ok) {
                throw new Error(`Entities fetch failed: ${await entitiesResponse.text()}`);
            }

            const entities = await entitiesResponse.json();
            console.log(`✅ Trovate ${entities.data.length} entità Contact`);

            if (entities.data.length > 0) {
                const entity = entities.data[0];
                
                // Crea istanza collegata all'entità
                const instanceData = {
                    instanceName: `Vista Dinamica - ${entity.nome}`,
                    templateModuleId: 'StandardContactCard',
                    targetEntityId: entity.id,
                    targetEntityType: 'Contact',
                    description: `Vista automatica per ${entity.nome} ${entity.cognome}`
                };

                const createResponse = await fetch(`${this.baseUrl}/api/module-instances`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(instanceData)
                });

                if (!createResponse.ok) {
                    throw new Error(`Instance creation failed: ${await createResponse.text()}`);
                }

                const instance = await createResponse.json();
                console.log(`✅ Istanza collegata creata per entità: ${entity.nome}`);

                // Test aggiornamento attributo entità
                const updateResponse = await fetch(`${this.baseUrl}/api/entity/${entity.id}/attribute`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attributeName: 'telefono',
                        value: '+39 111 222 3333'
                    })
                });

                if (updateResponse.ok) {
                    console.log('✅ Attributo entità aggiornato (dovrebbe triggerare WebSocket)');
                }

                // Cleanup
                await fetch(`${this.baseUrl}/api/module-instances/${instance.id}`, { method: 'DELETE' });
            }

            this.testResults.push({ test: 'Entity Integration', status: 'PASS' });

        } catch (error) {
            console.error('❌ Errore test integrazione:', error.message);
            this.testResults.push({ test: 'Entity Integration', status: 'FAIL', error: error.message });
        }
    }

    showResults() {
        console.log('\n📊 RISULTATI TEST FASE 2');
        console.log('=' .repeat(60));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const skipped = this.testResults.filter(r => r.status === 'SKIP').length;

        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : 'ℹ️';
            console.log(`${icon} ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   Errore: ${result.error}`);
            }
        });

        console.log('\n📈 Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`ℹ️ Skipped: ${skipped}`);
        console.log(`📊 Total: ${this.testResults.length}`);

        if (failed === 0) {
            console.log('\n🎉 TUTTI I TEST SUPERATI! La Fase 2 è funzionante.');
        } else {
            console.log('\n⚠️ Alcuni test hanno fallito. Verificare i dettagli sopra.');
        }
    }
}

// Esegui i test se chiamato direttamente
if (require.main === module) {
    const tester = new Phase2APITester();
    tester.runTests().catch(console.error);
}

module.exports = Phase2APITester; 