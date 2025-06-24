// Test di integrazione per i moduli core dell'MVP SSOT Dinamico
// Questo file verifica che SchemaManager_MVP, EntityEngine_MVP, AttributeSpace_MVP e DAO lavorino insieme

const dao = require('./dao/neo4j_dao'); // Importo l'istanza, non la classe
const neo4jConnector = require('./neo4j_connector'); // Per inizializzare la connessione
const SchemaManager_MVP = require('./core/schemaManager');
const EntityEngine_MVP = require('./core/entityEngine');
const AttributeSpace_MVP = require('./core/attributeSpace');

async function testCoreEngineIntegration() {
    console.log('=== INIZIO TEST INTEGRAZIONE CORE ENGINE ===\n');

    try {
        // 1. Inizializzazione connessione Neo4j
        console.log('1. Inizializzazione connessione Neo4j...');
        await neo4jConnector.connect();
        console.log('   ✓ Connessione a Neo4j stabilita\n');

        // 2. Inizializzazione moduli core
        console.log('2. Inizializzazione moduli core...');
        const schemaManager = new SchemaManager_MVP();
        const attributeSpace = new AttributeSpace_MVP();
        const entityEngine = new EntityEngine_MVP(dao, schemaManager);
        
        // Collegamento AttributeSpace all'EntityEngine
        entityEngine.setAttributeSpace(attributeSpace);
        console.log('   ✓ Moduli core inizializzati e collegati\n');

        // 3. Registrazione listener di test
        console.log('3. Registrazione listener di test...');
        const testListener = (changeDetails) => {
            console.log(`   📢 NOTIFICA RICEVUTA: Entità ${changeDetails.entityId}, Attributo "${changeDetails.attributeName}" = "${changeDetails.newValue}"`);
        };
        attributeSpace.subscribe(testListener);
        console.log(`   ✓ Listener registrato. Listeners attivi: ${attributeSpace.getListenerCount()}\n`);

        // 4. Test creazione entità
        console.log('4. Test creazione entità...');
        const newEntity = await entityEngine.createEntity('TestContact', {
            nome: 'Mario',
            cognome: 'Rossi',
            email: 'mario.rossi@email.com'
        });
        console.log(`   ✓ Entità creata con ID: ${newEntity.id}`);
        
        // Verifica SchemaManager
        const attributesForTestContact = schemaManager.getAttributesForType('TestContact');
        console.log(`   ✓ SchemaManager aggiornato. Attributi per TestContact: [${attributesForTestContact.join(', ')}]\n`);

        // 5. Test modifica attributo (dovrebbe attivare la notifica)
        console.log('5. Test modifica attributo...');
        await entityEngine.setEntityAttribute(newEntity.id, 'email', 'mario.rossi.nuovo@email.com');
        console.log('   ✓ Attributo modificato\n');

        // 6. Test aggiunta nuovo attributo
        console.log('6. Test aggiunta nuovo attributo...');
        await entityEngine.setEntityAttribute(newEntity.id, 'telefono', '+39 123 456 7890');
        
        // Aggiorna manualmente lo schema (l'EntityEngine lo fa solo durante createEntity)
        schemaManager.addAttributeToType('TestContact', 'telefono');
        const updatedAttributes = schemaManager.getAttributesForType('TestContact');
        console.log(`   ✓ Nuovo attributo aggiunto. Attributi aggiornati: [${updatedAttributes.join(', ')}]\n`);

        // 7. Test recupero entità
        console.log('7. Test recupero entità...');
        const retrievedEntity = await entityEngine.getEntity(newEntity.id);
        console.log(`   ✓ Entità recuperata:`, retrievedEntity);
        console.log(`     - Nome: ${retrievedEntity.nome}`);
        console.log(`     - Cognome: ${retrievedEntity.cognome}`);
        console.log(`     - Email: ${retrievedEntity.email}`);
        console.log(`     - Telefono: ${retrievedEntity.telefono}\n`);

        // 8. Test recupero tutte le entità del tipo
        console.log('8. Test recupero tutte le entità del tipo...');
        const allTestContacts = await entityEngine.getAllEntities('TestContact');
        console.log(`   ✓ Trovate ${allTestContacts.length} entità di tipo TestContact\n`);

        // 9. Cleanup
        console.log('9. Cleanup...');
        attributeSpace.unsubscribe(testListener);
        console.log(`   ✓ Listener rimosso. Listeners rimanenti: ${attributeSpace.getListenerCount()}`);
        
        await neo4jConnector.close();
        console.log('   ✓ Connessione Neo4j chiusa\n');

        console.log('=== TEST INTEGRAZIONE COMPLETATO CON SUCCESSO ===');

    } catch (error) {
        console.error('❌ ERRORE DURANTE IL TEST:', error);
        console.error('Stack trace:', error.stack);
        
        // Chiudi la connessione anche in caso di errore
        try {
            await neo4jConnector.close();
        } catch (closeError) {
            console.error('Errore durante la chiusura della connessione:', closeError);
        }
    }
}

// Esegui il test se questo file viene chiamato direttamente
if (require.main === module) {
    testCoreEngineIntegration();
}

module.exports = { testCoreEngineIntegration }; 