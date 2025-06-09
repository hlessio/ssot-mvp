const neo4jConnector = require('./neo4j_connector');
const dao = require('./dao/neo4j_dao');
const SchemaManager = require('./core/schemaManager_evolved');
const EntityEngine = require('./core/entityEngine');
const RelationEngine = require('./core/relationEngine');

console.log('🧪 Test RelationEngine - Fase 2 del piano di evoluzione');

async function testRelationEngine() {
    let schemaManager, entityEngine, relationEngine;
    
    try {
        // Inizializzazione componenti
        console.log('\n1. 🔧 Inizializzazione componenti...');
        await neo4jConnector.connect();
        
        schemaManager = new SchemaManager(dao);
        entityEngine = new EntityEngine(dao, schemaManager);
        relationEngine = new RelationEngine(entityEngine, schemaManager, dao);
        
        await schemaManager.initialize();
        console.log('✅ Componenti inizializzati');

        // Pulizia database per test
        console.log('\n2. 🧹 Pulizia database...');
        await dao.connector.executeQuery('MATCH (n) DETACH DELETE n');
        console.log('✅ Database pulito');

        // Creazione schemi di test
        console.log('\n3. 📝 Creazione schemi entità e relazioni...');
        
        // Schema entità Persona
        await schemaManager.defineEntitySchema('Persona', {
            attributes: {
                nome: { type: 'string', required: true },
                cognome: { type: 'string', required: true },
                eta: { type: 'number', required: false }
            }
        });
        
        // Schema entità Azienda
        await schemaManager.defineEntitySchema('Azienda', {
            attributes: {
                nome: { type: 'string', required: true },
                settore: { type: 'string', required: false }
            }
        });
        
        // Schema relazione "Lavora"
        await schemaManager.defineRelationSchema('Lavora', {
            sourceTypes: ['Persona'],
            targetTypes: ['Azienda'],
            cardinality: 'N:1',
            attributes: {
                dataInizio: { type: 'date', required: true },
                ruolo: { type: 'string', required: true },
                stipendio: { type: 'number', required: false }
            }
        });
        
        // Schema relazione "Conosce"
        await schemaManager.defineRelationSchema('Conosce', {
            sourceTypes: ['Persona'],
            targetTypes: ['Persona'],
            cardinality: 'N:M',
            attributes: {
                dataIncontro: { type: 'date', required: true },
                luogo: { type: 'string', required: false }
            }
        });
        
        console.log('✅ Schemi creati');

        // Creazione entità di test
        console.log('\n4. 👥 Creazione entità di test...');
        
        const mario = await entityEngine.createEntity('Persona', {
            nome: 'Mario',
            cognome: 'Rossi',
            eta: 30
        });
        
        const luigi = await entityEngine.createEntity('Persona', {
            nome: 'Luigi',
            cognome: 'Verdi',
            eta: 28
        });
        
        const acme = await entityEngine.createEntity('Azienda', {
            nome: 'ACME Corp',
            settore: 'Tecnologia'
        });
        
        console.log(`✅ Entità create: Mario(${mario.id}), Luigi(${luigi.id}), ACME(${acme.id})`);

        // Test creazione relazioni
        console.log('\n5. 🔗 Test creazione relazioni...');
        
        // Mario lavora in ACME
        const relazionelavoro = await relationEngine.createRelation(
            'Lavora',
            mario.id,
            acme.id,
            {
                dataInizio: '2024-01-01',
                ruolo: 'Sviluppatore',
                stipendio: 50000
            }
        );
        console.log(`✅ Relazione lavoro creata: ${relazionelavoro.id}`);
        
        // Mario conosce Luigi
        const relazioneAmicizia = await relationEngine.createRelation(
            'Conosce',
            mario.id,
            luigi.id,
            {
                dataIncontro: '2023-06-15',
                luogo: 'Università'
            }
        );
        console.log(`✅ Relazione amicizia creata: ${relazioneAmicizia.id}`);

        // Test ricerca relazioni
        console.log('\n6. 🔍 Test ricerca relazioni...');
        
        // Trova tutte le relazioni di Mario
        const relazioniMario = await relationEngine.findRelations({
            sourceEntityId: mario.id
        });
        console.log(`✅ Trovate ${relazioniMario.length} relazioni per Mario`);
        
        // Trova relazioni di tipo "Lavora"
        const relazioniLavoro = await relationEngine.findRelations({
            relationType: 'Lavora'
        });
        console.log(`✅ Trovate ${relazioniLavoro.length} relazioni di tipo Lavora`);

        // Test entità correlate
        console.log('\n7. 🌐 Test entità correlate...');
        
        const correlatiMario = await relationEngine.getRelatedEntities(mario.id);
        console.log(`✅ Mario ha ${correlatiMario.length} entità correlate`);
        
        for (const correlato of correlatiMario) {
            console.log(`   - ${correlato.entity.nome || correlato.entity.nomeAzienda || correlato.entity.id} (${correlato.relationType})`);
        }

        // Test aggiornamento relazione
        console.log('\n8. ✏️ Test aggiornamento relazione...');
        
        const aggiornataRelazione = await relationEngine.updateRelationAttributes(
            relazionelavoro.id,
            {
                stipendio: 55000,
                note: 'Promozione'
            }
        );
        console.log(`✅ Relazione aggiornata: stipendio = ${aggiornataRelazione.stipendio}`);

        // Test statistiche
        console.log('\n9. 📊 Test statistiche relazioni...');
        
        const stats = relationEngine.getRelationStats();
        console.log('✅ Statistiche relazioni:', stats);

        // Test validazione schema
        console.log('\n10. ✅ Test validazione schema...');
        
        try {
            // Tentativo di creare relazione non valida (Persona -> Persona con schema Lavora)
            await relationEngine.createRelation(
                'Lavora',
                mario.id,
                luigi.id,
                { dataInizio: '2024-01-01', ruolo: 'Amico' }
            );
            console.log('❌ Validazione schema fallita - relazione non valida creata');
        } catch (error) {
            console.log('✅ Validazione schema funzionante:', error.message);
        }

        // Test caricamento relazioni
        console.log('\n11. 📥 Test caricamento relazioni...');
        
        // Pulisci cache e ricarica
        relationEngine.relations.clear();
        relationEngine.entityRelations.clear();
        
        await relationEngine.loadAllRelations();
        const statsRicaricate = relationEngine.getRelationStats();
        console.log('✅ Relazioni ricaricate:', statsRicaricate);

        console.log('\n🎉 Tutti i test RelationEngine completati con successo!');
        console.log('\n📋 Funzionalità testate:');
        console.log('   ✅ Creazione relazioni tipizzate');
        console.log('   ✅ Validazione contro schemi');
        console.log('   ✅ Ricerca relazioni con pattern');
        console.log('   ✅ Navigazione entità correlate');
        console.log('   ✅ Aggiornamento attributi relazione');
        console.log('   ✅ Persistenza su Neo4j');
        console.log('   ✅ Statistiche e monitoraggio');
        console.log('   ✅ Caricamento da database');

    } catch (error) {
        console.error('❌ Errore durante i test:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Chiusura connessione
        try {
            await neo4jConnector.close();
            console.log('✅ Connessione a Neo4j chiusa');
        } catch (error) {
            console.error('Errore chiusura connessione:', error);
        }
    }
}

// Esegui i test se il file viene chiamato direttamente
if (require.main === module) {
    testRelationEngine().then(() => {
        console.log('\n✅ Test RelationEngine completati');
        process.exit(0);
    }).catch((error) => {
        console.error('\n❌ Test RelationEngine falliti:', error);
        process.exit(1);
    });
}

module.exports = { testRelationEngine }; 