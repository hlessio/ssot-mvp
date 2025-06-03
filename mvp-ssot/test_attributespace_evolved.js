/**
 * Test Script per AttributeSpace Evoluto
 * Verifica tutte le funzionalità avanzate:
 * - Pattern matching con wildcard
 * - Batching delle notifiche
 * - Gestione eventi relazioni
 * - Prevenzione loop infiniti
 * - Compatibilità backward
 */

const AttributeSpace = require('./backend/core/attributeSpace_evolved');

class AttributeSpaceTestSuite {
    constructor() {
        this.testResults = [];
        this.currentTest = '';
    }

    async runAllTests() {
        console.log('🚀 === ATTRIBUTESPACE EVOLUTO - SUITE DI TEST COMPLETA ===\n');

        try {
            // Test 1: Inizializzazione e configurazione
            await this.testInitialization();
            
            // Test 2: Pattern matching avanzato
            await this.testPatternMatching();
            
            // Test 3: Wildcard pattern matching
            await this.testWildcardMatching();
            
            // Test 4: Batching delle notifiche
            await this.testBatching();
            
            // Test 5: Gestione eventi relazioni
            await this.testRelationEvents();
            
            // Test 6: Custom pattern matching
            await this.testCustomPatterns();
            
            // Test 7: Prevenzione loop infiniti
            await this.testLoopPrevention();
            
            // Test 8: Compatibilità backward MVP
            await this.testBackwardCompatibility();
            
            // Test 9: Performance e statistiche
            await this.testPerformanceAndStats();

            // Riepilogo finale
            this.printFinalSummary();

        } catch (error) {
            console.error('❌ Errore critico durante i test:', error);
        }
    }

    // Test 1: Inizializzazione
    async testInitialization() {
        this.currentTest = 'Inizializzazione e Configurazione';
        console.log(`📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        try {
            // Test configurazione default
            const attributeSpace1 = new AttributeSpace();
            this.assertEqual(attributeSpace1.config.enableBatching, true, 'Batching abilitato di default');
            this.assertEqual(attributeSpace1.config.batchDelay, 50, 'Batch delay default');

            // Test configurazione personalizzata
            const attributeSpace2 = new AttributeSpace({
                enableBatching: false,
                batchDelay: 100,
                maxLoopDetection: 5,
                enableLogging: false
            });
            
            this.assertEqual(attributeSpace2.config.enableBatching, false, 'Configurazione personalizzata');
            this.assertEqual(attributeSpace2.config.batchDelay, 100, 'Batch delay personalizzato');
            this.assertEqual(attributeSpace2.config.maxLoopDetection, 5, 'Loop detection personalizzato');

            this.passTest('Inizializzazione con configurazioni diverse');

        } catch (error) {
            this.failTest(`Errore in inizializzazione: ${error.message}`);
        }
    }

    // Test 2: Pattern matching avanzato
    async testPatternMatching() {
        this.currentTest = 'Pattern Matching Avanzato';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ enableBatching: false });
        let notifications = [];

        try {
            // Sottoscrizione 1: Solo entità Cliente
            const sub1 = attributeSpace.subscribe({
                entityType: 'Cliente',
                attributeName: 'email'
            }, (details) => {
                notifications.push({ sub: 'cliente-email', details });
            });

            // Sottoscrizione 2: Solo attributi nome di qualsiasi entità
            const sub2 = attributeSpace.subscribe({
                attributeName: 'nome'
            }, (details) => {
                notifications.push({ sub: 'any-nome', details });
            });

            // Sottoscrizione 3: Solo create operations
            const sub3 = attributeSpace.subscribe({
                changeType: 'create'
            }, (details) => {
                notifications.push({ sub: 'create-only', details });
            });

            // Test notifiche
            attributeSpace.notifyChange({
                entityType: 'Cliente',
                entityId: 'cliente-123',
                attributeName: 'email',
                newValue: 'test@email.com',
                changeType: 'update'
            });

            attributeSpace.notifyChange({
                entityType: 'Persona',
                entityId: 'persona-456',
                attributeName: 'nome',
                newValue: 'Mario Rossi',
                changeType: 'create'
            });

            // Verifica risultati
            const clienteEmailNotifications = notifications.filter(n => n.sub === 'cliente-email');
            const anyNomeNotifications = notifications.filter(n => n.sub === 'any-nome');
            const createOnlyNotifications = notifications.filter(n => n.sub === 'create-only');

            this.assertEqual(clienteEmailNotifications.length, 1, 'Notifica cliente-email ricevuta');
            this.assertEqual(anyNomeNotifications.length, 1, 'Notifica any-nome ricevuta');
            this.assertEqual(createOnlyNotifications.length, 1, 'Notifica create-only ricevuta');

            this.passTest('Pattern matching per entityType, attributeName e changeType');

        } catch (error) {
            this.failTest(`Errore in pattern matching: ${error.message}`);
        }
    }

    // Test 3: Wildcard pattern matching
    async testWildcardMatching() {
        this.currentTest = 'Wildcard Pattern Matching';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ enableBatching: false });
        let notifications = [];

        try {
            // Sottoscrizione con wildcard
            const sub1 = attributeSpace.subscribe({
                attributeNamePattern: 'indirizzo_*'
            }, (details) => {
                notifications.push({ type: 'indirizzo', attributeName: details.attributeName });
            });

            const sub2 = attributeSpace.subscribe({
                attributeNamePattern: 'contatto_*'
            }, (details) => {
                notifications.push({ type: 'contatto', attributeName: details.attributeName });
            });

            // Test notifiche che dovrebbero matchare
            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'indirizzo_via',
                newValue: 'Via Roma 1'
            });

            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'indirizzo_citta',
                newValue: 'Milano'
            });

            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'contatto_email',
                newValue: 'test@test.com'
            });

            // Test notifica che NON dovrebbe matchare
            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'altro_campo',
                newValue: 'valore'
            });

            // Verifica risultati
            const indirizzoNotifications = notifications.filter(n => n.type === 'indirizzo');
            const contattoNotifications = notifications.filter(n => n.type === 'contatto');

            this.assertEqual(indirizzoNotifications.length, 2, 'Due notifiche indirizzo ricevute');
            this.assertEqual(contattoNotifications.length, 1, 'Una notifica contatto ricevuta');
            this.assertEqual(notifications.length, 3, 'Totale notifiche corrette (altro_campo escluso)');

            this.passTest('Wildcard pattern matching funzionante');

        } catch (error) {
            this.failTest(`Errore in wildcard matching: ${error.message}`);
        }
    }

    // Test 4: Batching delle notifiche
    async testBatching() {
        this.currentTest = 'Batching delle Notifiche';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ 
            enableBatching: true,
            batchDelay: 100 
        });
        let notifications = [];

        try {
            // Sottoscrizione
            attributeSpace.subscribe({
                entityId: 'batch-test'
            }, (details) => {
                notifications.push({
                    attributeName: details.attributeName,
                    newValue: details.newValue,
                    batchCount: details.batchCount
                });
            });

            // Invio multiple notifiche rapidamente
            attributeSpace.notifyChange({
                entityId: 'batch-test',
                attributeName: 'campo1',
                newValue: 'valore1'
            });

            attributeSpace.notifyChange({
                entityId: 'batch-test',
                attributeName: 'campo1',
                newValue: 'valore1-updated'
            });

            attributeSpace.notifyChange({
                entityId: 'batch-test',
                attributeName: 'campo2',
                newValue: 'valore2'
            });

            // Attendi che il batch venga processato
            await this.sleep(150);

            // Verifica che il batching abbia funzionato
            this.assertTrue(notifications.length > 0, 'Notifiche ricevute dopo batching');
            
            const campo1Notifications = notifications.filter(n => n.attributeName === 'campo1');
            const campo2Notifications = notifications.filter(n => n.attributeName === 'campo2');

            // Il campo1 dovrebbe essere una sola notifica (l'ultima) con batchCount > 1
            this.assertEqual(campo1Notifications.length, 1, 'Campo1 batchato in una notifica');
            this.assertTrue(campo1Notifications[0].batchCount >= 2, 'Batch count corretto per campo1');
            this.assertEqual(campo1Notifications[0].newValue, 'valore1-updated', 'Valore più recente mantenuto');

            this.passTest('Batching delle notifiche funzionante');

        } catch (error) {
            this.failTest(`Errore in batching: ${error.message}`);
        }
    }

    // Test 5: Gestione eventi relazioni
    async testRelationEvents() {
        this.currentTest = 'Gestione Eventi Relazioni';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ enableBatching: false });
        let notifications = [];

        try {
            // Sottoscrizione per eventi relazioni
            const sub1 = attributeSpace.subscribe({
                type: 'relation',
                relationType: 'Conosce'
            }, (details) => {
                notifications.push({ type: 'relation-conosce', details });
            });

            // Sottoscrizione per tutte le relazioni
            const sub2 = attributeSpace.subscribe({
                type: 'relation'
            }, (details) => {
                notifications.push({ type: 'all-relations', details });
            });

            // Test notifica relazione
            attributeSpace.notifyRelationChange({
                relationType: 'Conosce',
                sourceEntityId: 'persona-1',
                targetEntityId: 'persona-2',
                attributeName: 'dataIncontro',
                newValue: '2024-01-15',
                changeType: 'create'
            });

            // Test altra relazione
            attributeSpace.notifyRelationChange({
                relationType: 'Lavora',
                sourceEntityId: 'persona-1',
                targetEntityId: 'azienda-1',
                attributeName: 'ruolo',
                newValue: 'Sviluppatore',
                changeType: 'update'
            });

            // Verifica risultati
            const conosceNotifications = notifications.filter(n => n.type === 'relation-conosce');
            const allRelationNotifications = notifications.filter(n => n.type === 'all-relations');

            this.assertEqual(conosceNotifications.length, 1, 'Notifica relazione Conosce ricevuta');
            this.assertEqual(allRelationNotifications.length, 2, 'Tutte le notifiche relazioni ricevute');

            this.passTest('Gestione eventi relazioni funzionante');

        } catch (error) {
            this.failTest(`Errore in eventi relazioni: ${error.message}`);
        }
    }

    // Test 6: Custom pattern matching
    async testCustomPatterns() {
        this.currentTest = 'Custom Pattern Matching';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ enableBatching: false });
        let notifications = [];

        try {
            // Custom pattern: solo valori numerici > 100
            attributeSpace.subscribe({
                custom: (details) => {
                    return typeof details.newValue === 'number' && details.newValue > 100;
                }
            }, (details) => {
                notifications.push({ type: 'big-numbers', value: details.newValue });
            });

            // Custom pattern: solo email valide
            attributeSpace.subscribe({
                custom: (details) => {
                    return typeof details.newValue === 'string' && 
                           details.newValue.includes('@') && 
                           details.attributeName.toLowerCase().includes('email');
                }
            }, (details) => {
                notifications.push({ type: 'valid-emails', value: details.newValue });
            });

            // Test notifiche
            attributeSpace.notifyChange({
                entityId: 'test-1',
                attributeName: 'valore',
                newValue: 150 // Should match big-numbers
            });

            attributeSpace.notifyChange({
                entityId: 'test-1',
                attributeName: 'valore',
                newValue: 50 // Should NOT match
            });

            attributeSpace.notifyChange({
                entityId: 'test-1',
                attributeName: 'email',
                newValue: 'test@email.com' // Should match valid-emails
            });

            attributeSpace.notifyChange({
                entityId: 'test-1',
                attributeName: 'email',
                newValue: 'invalid-email' // Should NOT match
            });

            // Verifica risultati
            const bigNumberNotifications = notifications.filter(n => n.type === 'big-numbers');
            const emailNotifications = notifications.filter(n => n.type === 'valid-emails');

            this.assertEqual(bigNumberNotifications.length, 1, 'Custom pattern big-numbers funzionante');
            this.assertEqual(emailNotifications.length, 1, 'Custom pattern valid-emails funzionante');
            this.assertEqual(bigNumberNotifications[0].value, 150, 'Valore corretto per big-numbers');
            this.assertEqual(emailNotifications[0].value, 'test@email.com', 'Email corretta ricevuta');

            this.passTest('Custom pattern matching funzionante');

        } catch (error) {
            this.failTest(`Errore in custom patterns: ${error.message}`);
        }
    }

    // Test 7: Prevenzione loop infiniti
    async testLoopPrevention() {
        this.currentTest = 'Prevenzione Loop Infiniti';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ 
            enableBatching: false,
            maxLoopDetection: 3
        });
        let notificationCount = 0;

        try {
            // Crea un loop: ogni notifica genera un'altra notifica
            attributeSpace.subscribe({
                entityId: 'loop-test'
            }, (details) => {
                notificationCount++;
                console.log(`   Notifica ${notificationCount}: ${details.attributeName}`);
                
                // Genera un'altra notifica (loop!)
                if (notificationCount < 10) { // Limite di sicurezza per il test
                    attributeSpace.notifyChange({
                        entityId: 'loop-test',
                        attributeName: `loop-${notificationCount}`,
                        newValue: `value-${notificationCount}`
                    });
                }
            });

            // Inizia il loop
            attributeSpace.notifyChange({
                entityId: 'loop-test',
                attributeName: 'start-loop',
                newValue: 'initial-value'
            });

            // Verifica che il loop sia stato fermato
            const stats = attributeSpace.getStats();
            this.assertTrue(stats.droppedNotifications > 0, 'Loop rilevato e notifiche scartate');
            // Il loop deve essere fermato prima di raggiungere 10 notifiche
            this.assertTrue(notificationCount < 10, 'Loop fermato prima del limite di sicurezza');
            // E deve essere stato fermato dopo almeno maxLoopDetection notifiche
            this.assertTrue(notificationCount >= attributeSpace.config.maxLoopDetection, 'Loop ha raggiunto la soglia di detection');

            this.passTest('Prevenzione loop infiniti funzionante');

        } catch (error) {
            this.failTest(`Errore in loop prevention: ${error.message}`);
        }
    }

    // Test 8: Compatibilità backward
    async testBackwardCompatibility() {
        this.currentTest = 'Compatibilità Backward MVP';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ enableBatching: false });
        let notifications = [];

        try {
            // Test compatibilità con API MVP: subscribe(callback)
            const subscriptionId = attributeSpace.subscribeLegacy((details) => {
                notifications.push(details);
            });

            // Test notifica in stile MVP
            attributeSpace.notifyChange({
                entityId: 'test-entity',
                attributeName: 'test-attr',
                newValue: 'test-value'
            });

            // Verifica che la notifica sia stata ricevuta
            this.assertEqual(notifications.length, 1, 'Notifica MVP ricevuta');
            this.assertEqual(notifications[0].entityId, 'test-entity', 'EntityId corretto');
            this.assertEqual(notifications[0].attributeName, 'test-attr', 'AttributeName corretto');

            // Test unsubscribe
            attributeSpace.unsubscribe(subscriptionId);
            
            // Nuova notifica non dovrebbe essere ricevuta
            attributeSpace.notifyChange({
                entityId: 'test-entity-2',
                attributeName: 'test-attr-2',
                newValue: 'test-value-2'
            });

            this.assertEqual(notifications.length, 1, 'Unsubscribe funzionante');

            this.passTest('Compatibilità backward con MVP mantenuta');

        } catch (error) {
            this.failTest(`Errore in compatibilità backward: ${error.message}`);
        }
    }

    // Test 9: Performance e statistiche
    async testPerformanceAndStats() {
        this.currentTest = 'Performance e Statistiche';
        console.log(`\n📋 Test ${this.testResults.length + 1}: ${this.currentTest}`);

        const attributeSpace = new AttributeSpace({ enableBatching: false });

        try {
            // Crea multiple sottoscrizioni
            for (let i = 0; i < 5; i++) {
                attributeSpace.subscribe({
                    entityType: `Type${i}`
                }, () => {});
            }

            // Invia multiple notifiche
            for (let i = 0; i < 10; i++) {
                attributeSpace.notifyChange({
                    entityType: `Type${i % 3}`,
                    entityId: `entity-${i}`,
                    attributeName: `attr-${i}`,
                    newValue: `value-${i}`
                });
            }

            // Verifica statistiche
            const stats = attributeSpace.getStats();
            this.assertEqual(stats.activeSubscriptions, 5, 'Numero sottoscrizioni corretto');
            this.assertEqual(stats.totalNotifications, 10, 'Numero notifiche totali corretto');
            this.assertTrue(stats.totalSubscriptions >= 5, 'Conteggio sottoscrizioni totali');

            // Test lista sottoscrizioni attive
            const activeSubscriptions = attributeSpace.getActiveSubscriptions();
            this.assertEqual(activeSubscriptions.length, 5, 'Lista sottoscrizioni attive corretta');
            this.assertTrue(activeSubscriptions[0].hasOwnProperty('id'), 'Subscription info completa');
            this.assertTrue(activeSubscriptions[0].hasOwnProperty('matchCount'), 'Match count presente');

            this.passTest('Statistiche e performance monitoring OK');

        } catch (error) {
            this.failTest(`Errore in stats: ${error.message}`);
        }
    }

    // Utility methods per i test
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: Expected ${expected}, got ${actual}`);
        }
        console.log(`   ✓ ${message}`);
    }

    assertTrue(condition, message) {
        if (!condition) {
            throw new Error(`${message}: Expected true, got ${condition}`);
        }
        console.log(`   ✓ ${message}`);
    }

    passTest(message) {
        this.testResults.push({ test: this.currentTest, status: 'PASS', message });
        console.log(`   ✅ PASS: ${message}\n`);
    }

    failTest(message) {
        this.testResults.push({ test: this.currentTest, status: 'FAIL', message });
        console.log(`   ❌ FAIL: ${message}\n`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printFinalSummary() {
        console.log('\n🎯 === RIEPILOGO FINALE TEST ATTRIBUTESPACE EVOLUTO ===');
        
        const passed = this.testResults.filter(r => r.status === 'PASS');
        const failed = this.testResults.filter(r => r.status === 'FAIL');

        console.log(`\n📊 Risultati: ${passed.length}/${this.testResults.length} test superati`);
        
        if (failed.length > 0) {
            console.log('\n❌ Test falliti:');
            failed.forEach(test => {
                console.log(`   - ${test.test}: ${test.message}`);
            });
        }

        if (passed.length === this.testResults.length) {
            console.log('\n🎉 TUTTI I TEST SUPERATI! AttributeSpace Evoluto è operativo! 🎉');
        } else {
            console.log(`\n⚠️  ${failed.length} test falliti da correggere.`);
        }
    }
}

// Esecuzione test
if (require.main === module) {
    const testSuite = new AttributeSpaceTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = AttributeSpaceTestSuite; 