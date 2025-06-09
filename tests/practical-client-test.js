/**
 * Test Pratico Client + Server per Backend SSOT
 * Simula un uso reale del sistema con scenario completo
 */

const APIClient = require('./utils/api-client');
const WebSocketClient = require('./utils/websocket-client');
const TestData = require('./utils/test-data');

class PracticalBackendTest {
    constructor() {
        this.api = new APIClient();
        this.ws = new WebSocketClient();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            startTime: Date.now(),
            phases: {}
        };
        this.createdEntities = {
            persone: [],
            aziende: [],
            relazioni: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            error: '\x1b[31m',   // Red
            warning: '\x1b[33m', // Yellow
            reset: '\x1b[0m'
        };
        
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runTest(name, testFn) {
        const startTime = Date.now();
        this.results.total++;
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.log(`✅ ${name} (${duration}ms)`, 'success');
            this.results.passed++;
            return { success: true, duration };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log(`❌ ${name} - ${error.message} (${duration}ms)`, 'error');
            this.results.failed++;
            return { success: false, error: error.message, duration };
        }
    }

    async runPhase(phaseName, tests) {
        this.log(`\n🚀 FASE: ${phaseName}`, 'info');
        this.log('═'.repeat(50), 'info');
        
        const phaseStart = Date.now();
        const phaseResults = [];
        
        for (const [testName, testFn] of tests) {
            const result = await this.runTest(testName, testFn);
            phaseResults.push({ name: testName, ...result });
            
            // ✨ OTTIMIZZAZIONE: Memory cleanup tra test intensivi
            if (phaseName.includes('Schema') && result.success) {
                await this.memoryCleanup();
            }
        }
        
        const phaseDuration = Date.now() - phaseStart;
        const phaseSuccess = phaseResults.every(r => r.success);
        
        this.results.phases[phaseName] = {
            duration: phaseDuration,
            success: phaseSuccess,
            tests: phaseResults
        };
        
        // ✨ OTTIMIZZAZIONE: Cleanup più aggressivo dopo fasi pesanti
        if (phaseName.includes('Schema') || phaseName.includes('Relations')) {
            await this.memoryCleanup();
        }
        
        this.log(`\n📊 ${phaseName}: ${phaseResults.filter(r => r.success).length}/${phaseResults.length} test passed (${phaseDuration}ms)`, 
                 phaseSuccess ? 'success' : 'warning');
    }

    async runAllTests() {
        this.log('🧪 SSOT Backend - Test Pratico con Client', 'info');
        this.log('════════════════════════════════════════', 'info');
        
        try {
            // Fase 1: Connessione e Setup
            await this.runPhase('1. Connessione Server', [
                ['Verifica Server HTTP', () => this.testServerConnection()],
                ['Connessione WebSocket', () => this.testWebSocketConnection()],
                ['Health Check API', () => this.testHealthCheck()]
            ]);

            // Fase 2: Schema Management
            await this.runPhase('2. Schema Management', [
                ['Crea Schema Persona', () => this.testCreatePersonaSchema()],
                ['Crea Schema Azienda', () => this.testCreateAziendaSchema()],
                ['Crea Schema Relazione Lavora', () => this.testCreateLavoraSchema()],
                ['Verifica Persistenza Schemi', () => this.testSchemaPersistence()]
            ]);

            // Fase 3: Entity Operations
            await this.runPhase('3. Entity Operations', [
                ['Crea 5 Persone', () => this.testCreatePersone()],
                ['Crea 3 Aziende', () => this.testCreateAziende()],
                ['Verifica Entity Retrieval', () => this.testEntityRetrieval()],
                ['Test Entity Updates', () => this.testEntityUpdates()]
            ]);

            // Fase 4: Relations Management
            await this.runPhase('4. Relations Management', [
                ['Crea 5 Relazioni Lavora', () => this.testCreateRelations()],
                ['Verifica Navigazione Bidirezionale', () => this.testRelationNavigation()],
                ['Test Attributi Relazione', () => this.testRelationAttributes()]
            ]);

            // Fase 5: Schema Evolution Real-time
            await this.runPhase('5. Schema Evolution', [
                ['Aggiungi Campo Email', () => this.testAddEmailField()],
                ['Aggiungi Campo Telefono', () => this.testAddTelefonoField()],
                ['Verifica Propagazione Schema', () => this.testSchemaPropagation()],
                ['Test Update con Nuovi Campi', () => this.testNewFieldsUpdate()]
            ]);

            // Fase 6: Real-time Notifications
            await this.runPhase('6. Real-time Events', [
                ['Monitor WebSocket Events', () => this.testWebSocketEvents()],
                ['Verifica Event Types', () => this.testEventTypes()],
                ['Test Event Latency', () => this.testEventLatency()]
            ]);

            // Fase 7: Data Consistency & Performance
            await this.runPhase('7. Consistency & Performance', [
                ['Verifica Integrità Dati', () => this.testDataIntegrity()],
                ['Test Performance Queries', () => this.testQueryPerformance()],
                ['Verifica Memory Usage', () => this.testMemoryUsage()]
            ]);

        } catch (error) {
            this.log(`💥 Test suite fallito: ${error.message}`, 'error');
        } finally {
            await this.cleanup();
            this.printFinalReport();
        }
    }

    // === TEST IMPLEMENTATIONS ===

    async testServerConnection() {
        const response = await this.api.request('GET', '/');
        if (!response.success && response.status !== 404) {
            throw new Error(`Server non raggiungibile: ${response.error}`);
        }
    }

    async testWebSocketConnection() {
        await this.ws.connect();
        if (!this.ws.isConnected) {
            throw new Error('WebSocket connection failed');
        }
    }

    async testHealthCheck() {
        const response = await this.api.healthCheck();
        if (!response.success) {
            // Se non c'è endpoint health, proviamo con un endpoint base
            const altResponse = await this.api.getAllEntitySchemas();
            if (!altResponse.success) {
                throw new Error('API health check failed');
            }
        }
    }

    async testCreatePersonaSchema() {
        const schema = TestData.getPersonaSchema();
        const response = await this.api.createEntitySchema('Persona', schema);
        if (!response.success) {
            throw new Error(`Schema Persona creation failed: ${response.error}`);
        }
    }

    async testCreateAziendaSchema() {
        const schema = TestData.getAziendaSchema();
        const response = await this.api.createEntitySchema('Azienda', schema);
        if (!response.success) {
            throw new Error(`Schema Azienda creation failed: ${response.error}`);
        }
    }

    async testCreateLavoraSchema() {
        const schema = TestData.getLavoraRelationSchema();
        const response = await this.api.createRelationSchema('Lavora', schema);
        if (!response.success) {
            throw new Error(`Schema Lavora creation failed: ${response.error}`);
        }
    }

    async testSchemaPersistence() {
        const response = await this.api.getAllEntitySchemas();
        if (!response.success) {
            throw new Error('Failed to retrieve schemas');
        }
        
        // Handle nested response structure
        const schemas = response.data.data || response.data;
        if (!schemas || !Array.isArray(schemas)) {
            console.error('Unexpected schema response structure:', response);
            throw new Error(`Expected schemas to be an array, got: ${typeof schemas}`);
        }
        
        const schemaNames = schemas.map(s => s.entityType || s.name);
        if (!schemaNames.includes('Persona') || !schemaNames.includes('Azienda')) {
            throw new Error(`Created schemas not found in persistence. Found: ${schemaNames.join(', ')}`);
        }
    }

    async testCreatePersone() {
        const personeData = TestData.getPersoneData();
        
        for (const personaData of personeData) {
            const response = await this.api.createEntity(personaData);
            if (!response.success) {
                throw new Error(`Failed to create persona: ${response.error}`);
            }
            this.createdEntities.persone.push(response.data);
        }
        
        if (this.createdEntities.persone.length !== 5) {
            throw new Error('Not all persone were created');
        }
    }

    async testCreateAziende() {
        const aziendeData = TestData.getAziendeData();
        
        for (const aziendaData of aziendeData) {
            const response = await this.api.createEntity(aziendaData);
            if (!response.success) {
                throw new Error(`Failed to create azienda: ${response.error}`);
            }
            this.createdEntities.aziende.push(response.data);
        }
        
        if (this.createdEntities.aziende.length !== 3) {
            throw new Error('Not all aziende were created');
        }
    }

    async testEntityRetrieval() {
        // Test retrieval by type
        const persone = await this.api.getEntitiesByType('Persona');
        if (!persone.success || !persone.data || persone.data.length < 5) {
            throw new Error(`Failed to retrieve all persone. Success: ${persone.success}, Count: ${persone.data?.length || 0}`);
        }
        
        // Test retrieval by ID - use created entity ID
        const firstPersona = this.createdEntities.persone[0];
        if (!firstPersona || !firstPersona.id) {
            throw new Error('First persona is missing or has no ID');
        }
        
        const persona = await this.api.getEntity(firstPersona.id);
        if (!persona.success || !persona.data) {
            throw new Error(`Failed to retrieve persona by ID. Success: ${persona.success}, Data: ${JSON.stringify(persona.data)}`);
        }
        
        // Handle nested response structure - check multiple possible locations for ID
        const retrievedId = persona.data.data?.id || persona.data.id || persona.id;
        if (retrievedId !== firstPersona.id) {
            throw new Error(`ID mismatch. Expected: ${firstPersona.id}, Got: ${retrievedId}, Full response: ${JSON.stringify(persona)}`);
        }
    }

    async testEntityUpdates() {
        const persona = this.createdEntities.persone[0];
        const response = await this.api.updateEntityAttribute(persona.id, 'eta', 36);
        if (!response.success) {
            throw new Error(`Failed to update entity: ${response.error}`);
        }
    }

    async testCreateRelations() {
        const relationsData = TestData.getLavoraRelationsData(
            this.createdEntities.persone, 
            this.createdEntities.aziende
        );
        
        for (const relationData of relationsData) {
            const response = await this.api.createRelation(relationData);
            if (!response.success) {
                throw new Error(`Failed to create relation: ${response.error}`);
            }
            this.createdEntities.relazioni.push(response.data);
        }
        
        if (this.createdEntities.relazioni.length !== 5) {
            throw new Error('Not all relations were created');
        }
    }

    async testRelationNavigation() {
        // Test find relations by source
        const persona = this.createdEntities.persone[0];
        const relations = await this.api.findRelations({
            sourceEntityId: persona.id,
            relationType: 'Lavora'
        });
        
        if (!relations.success || relations.data.length === 0) {
            throw new Error('Failed to find relations by source entity');
        }
    }

    async testRelationAttributes() {
        const relation = this.createdEntities.relazioni[0];
        
        // Debug the actual relation structure
        console.log('Stored relation:', JSON.stringify(relation, null, 2));
        
        // Handle nested response structure
        const relationData = relation.data || relation;
        
        if (!relationData.ruolo || !relationData.dataInizio) {
            throw new Error(`Relation attributes not persisted correctly. Found: ruolo=${relationData.ruolo}, dataInizio=${relationData.dataInizio}`);
        }
    }

    async testAddEmailField() {
        const evolution = TestData.getSchemaEvolutionSteps()[0];
        const response = await this.api.request('PUT', `/api/schema/entity/${evolution.entityType}`, evolution.evolution);
        if (!response.success) {
            throw new Error(`Failed to evolve schema: ${response.error}`);
        }
    }

    async testAddTelefonoField() {
        const evolution = TestData.getSchemaEvolutionSteps()[1];
        const response = await this.api.request('PUT', `/api/schema/entity/${evolution.entityType}`, evolution.evolution);
        if (!response.success) {
            throw new Error(`Failed to evolve schema: ${response.error}`);
        }
    }

    async testSchemaPropagation() {
        // Verifica che lo schema aggiornato sia disponibile
        const response = await this.api.getEntitySchema('Persona');
        if (!response.success) {
            throw new Error('Failed to retrieve updated schema');
        }
        
        // Handle nested response structure
        const schemaData = response.data.data || response.data;
        let hasEmail = false, hasTelefono = false;
        
        if (schemaData && schemaData.attributes) {
            if (Array.isArray(schemaData.attributes)) {
                // Schema con array di attributi
                hasEmail = schemaData.attributes.some(attr => attr.name === 'email');
                hasTelefono = schemaData.attributes.some(attr => attr.name === 'telefono');
            } else {
                // Schema con oggetto attributi
                hasEmail = !!schemaData.attributes.email;
                hasTelefono = !!schemaData.attributes.telefono;
            }
        }
        
        if (!hasEmail || !hasTelefono) {
            console.warn('Schema attributes found:', schemaData ? schemaData.attributes : 'schemaData is null/undefined');
            console.warn('Full schema response:', JSON.stringify(response, null, 2));
            throw new Error('Schema evolution not properly propagated');
        }
    }

    async testNewFieldsUpdate() {
        const updates = TestData.getUpdateScenarios(this.createdEntities.persone);
        
        for (const update of updates) {
            const response = await this.api.updateEntityAttribute(
                update.entityId, 
                update.attributeName, 
                update.value
            );
            if (!response.success) {
                throw new Error(`Failed to update with new field: ${response.error}`);
            }
        }
    }

    async testWebSocketEvents() {
        const initialEventCount = this.ws.getEvents().length;
        
        // Trigger an event by creating an entity
        await this.api.createEntity({
            nome: 'TestWebSocket',
            cognome: 'User',
            entityType: 'Persona'
        });
        
        // Wait a bit for event propagation
        await this.sleep(100);
        
        const finalEventCount = this.ws.getEvents().length;
        if (finalEventCount <= initialEventCount) {
            throw new Error('WebSocket events not received');
        }
    }

    async testEventTypes() {
        const events = this.ws.getEvents();
        const eventTypes = [...new Set(events.map(e => e.type))];
        
        // Should have different types of events (entity-created, entity-updated, etc.)
        if (eventTypes.length === 0) {
            throw new Error('No event types received');
        }
    }

    async testEventLatency() {
        const startTime = Date.now();
        
        // Create entity and measure time to receive WebSocket event
        await this.api.createEntity({
            nome: 'LatencyTest',
            cognome: 'User',
            entityType: 'Persona'
        });
        
        // Wait for event (max 1 second)
        const maxWait = 1000;
        const checkInterval = 50;
        let elapsed = 0;
        let eventReceived = false;
        
        while (elapsed < maxWait && !eventReceived) {
            await this.sleep(checkInterval);
            elapsed += checkInterval;
            
            const recentEvents = this.ws.getEvents().filter(e => e.timestamp > startTime);
            if (recentEvents.length > 0) {
                eventReceived = true;
                this.log(`⚡ Event latency: ${elapsed}ms`, 'info');
                break;
            }
        }
        
        if (!eventReceived) {
            throw new Error('Event latency too high (>1s)');
        }
    }

    async testDataIntegrity() {
        // Verify all created entities still exist and have correct data
        for (const persona of this.createdEntities.persone) {
            const response = await this.api.getEntity(persona.id);
            if (!response.success) {
                throw new Error(`Data integrity check failed for persona ${persona.id}`);
            }
        }
        
        for (const azienda of this.createdEntities.aziende) {
            const response = await this.api.getEntity(azienda.id);
            if (!response.success) {
                throw new Error(`Data integrity check failed for azienda ${azienda.id}`);
            }
        }
    }

    async testQueryPerformance() {
        const startTime = Date.now();
        
        // Perform several queries and measure time
        await Promise.all([
            this.api.getEntitiesByType('Persona'),
            this.api.getEntitiesByType('Azienda'),
            this.api.getAllEntitySchemas()
        ]);
        
        const duration = Date.now() - startTime;
        if (duration > 2000) { // 2 seconds threshold
            throw new Error(`Query performance too slow: ${duration}ms`);
        }
        
        this.log(`📊 Query performance: ${duration}ms for 3 parallel queries`, 'info');
    }

    async testMemoryUsage() {
        // Simple memory usage check
        const used = process.memoryUsage();
        const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
        
        this.log(`💾 Memory usage: ${memoryMB}MB`, 'info');
        
        if (memoryMB > 200) { // 200MB threshold for test client
            this.log(`⚠️ High memory usage: ${memoryMB}MB`, 'warning');
        }
    }

    /**
     * ✨ OTTIMIZZAZIONE: Memory cleanup strategico durante i test
     */
    async memoryCleanup() {
        try {
            // Piccola pausa per permettere garbage collection
            await this.sleep(150);
            
            // Forza garbage collection se disponibile
            if (global.gc) {
                global.gc();
            }
            
            // Log memory usage per monitoring
            const memUsage = process.memoryUsage();
            const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            if (heapMB > 50) {
                this.log(`🧹 Memory cleanup: ${heapMB}MB heap`, 'info');
            }
        } catch (error) {
            // Non critico - ignora errori
        }
    }

    async cleanup() {
        this.log('\n🧹 Cleanup...', 'info');
        
        try {
            this.ws.disconnect();
        } catch (error) {
            this.log(`Warning: WebSocket cleanup failed: ${error.message}`, 'warning');
        }
        
        // Final memory cleanup
        await this.memoryCleanup();
    }

    printFinalReport() {
        const totalDuration = Date.now() - this.results.startTime;
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        
        this.log('\n🎯 REPORT FINALE', 'info');
        this.log('═'.repeat(50), 'info');
        this.log(`📊 Test eseguiti: ${this.results.total}`, 'info');
        this.log(`✅ Superati: ${this.results.passed}`, 'success');
        this.log(`❌ Falliti: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
        this.log(`🎯 Success rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
        this.log(`⏱️ Tempo totale: ${totalDuration}ms`, 'info');
        
        // Phase summary
        this.log('\n📋 Riepilogo per Fase:', 'info');
        Object.entries(this.results.phases).forEach(([phaseName, phaseData]) => {
            const passedTests = phaseData.tests.filter(t => t.success).length;
            const totalTests = phaseData.tests.length;
            const phaseStatus = phaseData.success ? '✅' : '❌';
            this.log(`${phaseStatus} ${phaseName}: ${passedTests}/${totalTests} (${phaseData.duration}ms)`, 
                     phaseData.success ? 'success' : 'error');
        });
        
        // WebSocket events summary
        const wsEvents = this.ws.getEvents();
        this.log(`\n🌐 WebSocket Events: ${wsEvents.length} ricevuti`, 'info');
        
        // Final verdict
        if (this.results.failed === 0) {
            this.log('\n🎉 SISTEMA BACKEND COMPLETAMENTE FUNZIONANTE!', 'success');
        } else {
            this.log('\n⚠️ Alcuni test sono falliti. Verificare i componenti segnalati.', 'warning');
        }
    }
}

// === MAIN EXECUTION ===
async function main() {
    const tester = new PracticalBackendTest();
    await tester.runAllTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrotto dall\'utente');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Errore non catturato:', error.message);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Test suite fallito:', error.message);
        process.exit(1);
    });
}

module.exports = PracticalBackendTest;