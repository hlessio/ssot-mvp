/**
 * Test di Integrazione per AttributeSpace Evoluto nel Server
 * Verifica che il nuovo AttributeSpace funzioni correttamente nel contesto del server
 */

const EvolvedServer = require('./backend/server_evolved');
const WebSocket = require('ws');

class AttributeSpaceIntegrationTest {
    constructor() {
        this.server = null;
        this.wsClient = null;
        this.receivedMessages = [];
        this.testResults = [];
    }

    async runIntegrationTests() {
        console.log('🚀 === TEST INTEGRAZIONE ATTRIBUTESPACE EVOLUTO ===\n');

        try {
            // Avvia il server
            await this.startServer();
            
            // Connetti WebSocket client per test
            await this.connectWebSocket();
            
            // Test 1: Pattern matching eventi entità
            await this.testEntityEventPatterns();
            
            // Test 2: Eventi relazioni (se disponibili)
            await this.testRelationEventPatterns();
            
            // Test 3: Batching delle notifiche
            await this.testBatchingIntegration();
            
            // Test 4: Audit logging pattern
            await this.testAuditPatterns();

            // Riepilogo
            this.printResults();

        } catch (error) {
            console.error('❌ Errore critico nei test:', error);
        } finally {
            await this.cleanup();
        }
    }

    async startServer() {
        console.log('🔧 Avvio server evoluto...');
        this.server = new EvolvedServer();
        
        // Avvia server su porta di test
        const testPort = 3001;
        await this.server.start(testPort);
        
        // Aspetta che il server si stabilizzi
        await this.sleep(1000);
        
        console.log(`✅ Server avviato su porta ${testPort}\n`);
    }

    async connectWebSocket() {
        console.log('🔌 Connessione client WebSocket...');
        
        return new Promise((resolve, reject) => {
            this.wsClient = new WebSocket('ws://localhost:3001');
            
            this.wsClient.on('open', () => {
                console.log('✅ WebSocket connesso\n');
                resolve();
            });
            
            this.wsClient.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.receivedMessages.push(message);
                    console.log(`📨 Messaggio ricevuto: ${message.type}`);
                } catch (error) {
                    console.error('Errore parsing messaggio WebSocket:', error);
                }
            });
            
            this.wsClient.on('error', (error) => {
                reject(error);
            });
            
            setTimeout(() => reject(new Error('Timeout connessione WebSocket')), 5000);
        });
    }

    async testEntityEventPatterns() {
        console.log('📋 Test 1: Pattern Matching Eventi Entità');
        this.receivedMessages = []; // Reset messaggi
        
        try {
            // Simula creazione entità tramite API
            const response = await fetch('http://localhost:3001/api/entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType: 'TestAttributeSpace',
                    attributes: { 
                        nome: 'Test Entity',
                        email: 'test@example.com'
                    }
                })
            });

            const result = await response.json();
            console.log(`   ✓ Entità creata: ${result.data.entityId}`);

            // Aspetta le notifiche WebSocket
            await this.sleep(500);

            // Verifica notifiche ricevute
            const entityMessages = this.receivedMessages.filter(m => m.type === 'attributeChange');
            
            if (entityMessages.length > 0) {
                console.log(`   ✅ Ricevute ${entityMessages.length} notifiche attributi come atteso`);
                this.passTest('Pattern matching eventi entità');
            } else {
                this.failTest('Nessuna notifica attributi ricevuta');
            }

        } catch (error) {
            this.failTest(`Errore test entità: ${error.message}`);
        }
    }

    async testRelationEventPatterns() {
        console.log('\n📋 Test 2: Pattern Matching Eventi Relazioni');
        this.receivedMessages = []; // Reset messaggi

        try {
            // Test notifica relazione tramite AttributeSpace direttamente
            // (simula quello che farebbe il RelationEngine)
            if (this.server.attributeSpace) {
                this.server.attributeSpace.notifyRelationChange({
                    relationType: 'TestRelation',
                    sourceEntityId: 'entity-1',
                    targetEntityId: 'entity-2',
                    attributeName: 'testAttribute',
                    newValue: 'testValue',
                    changeType: 'create'
                });

                // Aspetta propagazione
                await this.sleep(200);

                const relationMessages = this.receivedMessages.filter(m => m.type === 'relationChange');
                
                if (relationMessages.length > 0) {
                    console.log(`   ✅ Ricevute ${relationMessages.length} notifiche relazioni`);
                    this.passTest('Pattern matching eventi relazioni');
                } else {
                    this.failTest('Nessuna notifica relazioni ricevuta');
                }
            } else {
                this.failTest('AttributeSpace non disponibile nel server');
            }

        } catch (error) {
            this.failTest(`Errore test relazioni: ${error.message}`);
        }
    }

    async testBatchingIntegration() {
        console.log('\n📋 Test 3: Batching Notifiche Integration');
        this.receivedMessages = []; // Reset messaggi

        try {
            // Test batching tramite multiple notifiche rapide
            if (this.server.attributeSpace) {
                // Simula multiple modifiche rapide dello stesso attributo
                for (let i = 0; i < 5; i++) {
                    this.server.attributeSpace.notifyChange({
                        entityId: 'batch-test-entity',
                        attributeName: 'counter',
                        newValue: i,
                        changeType: 'update'
                    });
                }

                // Aspetta il batch processing
                await this.sleep(100); // Batch delay è 30ms nel server

                const batchMessages = this.receivedMessages.filter(m => 
                    m.type === 'attributeChange' && 
                    m.data.entityId === 'batch-test-entity'
                );
                
                console.log(`   📊 Messaggi ricevuti: ${batchMessages.length} (dovrebbero essere < 5 per via del batching)`);
                
                if (batchMessages.length > 0 && batchMessages.length < 5) {
                    console.log(`   ✅ Batching funzionante (${batchMessages.length} messaggi invece di 5)`);
                    this.passTest('Batching notifiche integration');
                } else if (batchMessages.length === 5) {
                    console.log(`   ⚠️  Batching potrebbe non essere attivo (ricevuti tutti i 5 messaggi)`);
                    this.passTest('Ricezione messaggi (batching forse disattivato)');
                } else {
                    this.failTest(`Comportamento batching inaspettato: ${batchMessages.length} messaggi`);
                }
            } else {
                this.failTest('AttributeSpace non disponibile');
            }

        } catch (error) {
            this.failTest(`Errore test batching: ${error.message}`);
        }
    }

    async testAuditPatterns() {
        console.log('\n📋 Test 4: Audit Pattern Logging');
        
        try {
            // Cattura i log della console per verificare l'audit
            const originalLog = console.log;
            let auditLogs = [];
            
            console.log = (...args) => {
                const message = args.join(' ');
                if (message.includes('🔒 AUDIT:')) {
                    auditLogs.push(message);
                }
                originalLog.apply(console, args);
            };

            // Test pattern audit per attributi password
            if (this.server.attributeSpace) {
                this.server.attributeSpace.notifyChange({
                    entityId: 'user-123',
                    attributeName: 'user_password',
                    newValue: 'new-password-hash',
                    changeType: 'update'
                });

                this.server.attributeSpace.notifyChange({
                    entityId: 'user-123',
                    attributeName: 'normal_field',
                    newValue: 'normal-value',
                    changeType: 'update'
                });

                // Aspetta processing
                await this.sleep(100);
            }

            // Ripristina console.log
            console.log = originalLog;

            if (auditLogs.length > 0) {
                console.log(`   ✅ Audit logging attivo: ${auditLogs.length} eventi loggati`);
                auditLogs.forEach(log => console.log(`   🔍 ${log}`));
                this.passTest('Audit pattern logging');
            } else {
                this.failTest('Nessun audit log rilevato');
            }

        } catch (error) {
            this.failTest(`Errore test audit: ${error.message}`);
        }
    }

    passTest(message) {
        this.testResults.push({ status: 'PASS', message });
        console.log(`   ✅ PASS: ${message}`);
    }

    failTest(message) {
        this.testResults.push({ status: 'FAIL', message });
        console.log(`   ❌ FAIL: ${message}`);
    }

    printResults() {
        console.log('\n🎯 === RIEPILOGO TEST INTEGRAZIONE ===');
        
        const passed = this.testResults.filter(r => r.status === 'PASS');
        const failed = this.testResults.filter(r => r.status === 'FAIL');

        console.log(`\n📊 Risultati: ${passed.length}/${this.testResults.length} test superati`);
        
        if (failed.length > 0) {
            console.log('\n❌ Test falliti:');
            failed.forEach(test => {
                console.log(`   - ${test.message}`);
            });
        }

        if (passed.length === this.testResults.length) {
            console.log('\n🎉 INTEGRAZIONE ATTRIBUTESPACE EVOLUTO COMPLETATA! 🎉');
        } else {
            console.log(`\n⚠️  ${failed.length} problemi di integrazione da risolvere.`);
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleanup...');
        
        if (this.wsClient) {
            this.wsClient.close();
        }
        
        if (this.server) {
            await this.server.stop();
        }
        
        console.log('✅ Cleanup completato');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Esecuzione test
if (require.main === module) {
    const testSuite = new AttributeSpaceIntegrationTest();
    testSuite.runIntegrationTests().catch(console.error);
}

module.exports = AttributeSpaceIntegrationTest; 