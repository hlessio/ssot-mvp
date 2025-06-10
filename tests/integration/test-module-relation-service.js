const neo4jConnector = require('../../src/backend/neo4j_connector');
const neo4jDAO = require('../../src/backend/dao/neo4j_dao');
const AttributeSpace = require('../../src/backend/core/attributeSpace_evolved');
const ModuleRelationService = require('../../src/backend/services/ModuleRelationService');
const { v4: uuidv4 } = require('uuid');

/**
 * Test di integrazione per ModuleRelationService
 * Verifica il modello gerarchico: Progetto → ModuleInstance → Entità (con attributi relazionali)
 */

async function runTests() {
    console.log('🧪 Test ModuleRelationService - Relazioni Gerarchiche con Attributi');
    console.log('='.repeat(60));
    
    let testsPassed = 0;
    let testsFailed = 0;
    
    try {
        // Setup
        await neo4jConnector.connect();
        const attributeSpace = new AttributeSpace();
        const moduleRelationService = new ModuleRelationService(neo4jDAO, attributeSpace);
        
        // Test Data
        const projectId = uuidv4();
        const moduleId = uuidv4();
        const entityId1 = uuidv4();
        const entityId2 = uuidv4();
        
        // Crea entità e modulo di test
        console.log('\n📋 Setup dati di test...');
        
        // Crea progetto
        await neo4jDAO.connector.executeQuery(`
            CREATE (p:Progetto {
                id: $projectId,
                name: 'Film: Inception',
                type: 'Film',
                createdAt: timestamp()
            })
            RETURN p
        `, { projectId });
        
        // Crea ModuleInstance
        await neo4jDAO.connector.executeQuery(`
            CREATE (m:ModuleInstance {
                id: $moduleId,
                instanceName: 'Crew List - Inception',
                moduleType: 'CrewList',
                createdAt: timestamp()
            })
            RETURN m
        `, { moduleId });
        
        // Crea entità (persone)
        await neo4jDAO.createEntity('Persona', {
            id: entityId1,
            name: 'Christopher Nolan',
            profession: 'Director'
        });
        
        await neo4jDAO.createEntity('Persona', {
            id: entityId2,
            name: 'Leonardo DiCaprio',
            profession: 'Actor'
        });
        
        console.log('✅ Dati di test creati');
        
        // TEST 1: Aggiunta entità al modulo con attributi relazionali
        console.log('\n🧪 Test 1: Aggiunta entità al modulo con attributi relazionali');
        try {
            const result1 = await moduleRelationService.addEntityToModule(entityId1, moduleId, {
                fee: '$2000000',
                ruolo: 'Director',
                startDate: '2009-06-01'
            });
            
            if (result1.entity && result1.relation && result1.relation.fee === '$2000000') {
                console.log('✅ Test 1 passato: Entità aggiunta con attributi relazionali');
                testsPassed++;
            } else {
                throw new Error('Attributi relazionali non salvati correttamente');
            }
        } catch (error) {
            console.error('❌ Test 1 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 2: Aggiunta seconda entità con attributi diversi
        console.log('\n🧪 Test 2: Aggiunta seconda entità con attributi diversi');
        try {
            const result2 = await moduleRelationService.addEntityToModule(entityId2, moduleId, {
                fee: '$20000000',
                ruolo: 'Lead Actor',
                startDate: '2009-07-01'
            });
            
            if (result2.relation.fee === '$20000000' && result2.relation.ruolo === 'Lead Actor') {
                console.log('✅ Test 2 passato: Seconda entità con attributi diversi');
                testsPassed++;
            } else {
                throw new Error('Attributi seconda entità non corretti');
            }
        } catch (error) {
            console.error('❌ Test 2 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 3: Recupero membri del modulo
        console.log('\n🧪 Test 3: Recupero membri del modulo con attributi');
        try {
            const members = await moduleRelationService.getModuleMembers(moduleId);
            
            if (members.length === 2) {
                const nolan = members.find(m => m.entity.name === 'Christopher Nolan');
                const leo = members.find(m => m.entity.name === 'Leonardo DiCaprio');
                
                if (nolan?.relationAttributes.fee === '$2000000' && 
                    leo?.relationAttributes.fee === '$20000000') {
                    console.log('✅ Test 3 passato: Membri recuperati con attributi corretti');
                    testsPassed++;
                } else {
                    throw new Error('Attributi membri non corretti');
                }
            } else {
                throw new Error(`Numero membri non corretto: ${members.length}`);
            }
        } catch (error) {
            console.error('❌ Test 3 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 4: Aggiornamento attributi relazione
        console.log('\n🧪 Test 4: Aggiornamento attributi relazione');
        try {
            await moduleRelationService.updateMembershipAttributes(entityId1, moduleId, {
                fee: '$2500000',
                bonus: '$500000'
            });
            
            const members = await moduleRelationService.getModuleMembers(moduleId);
            const nolan = members.find(m => m.entity.name === 'Christopher Nolan');
            
            if (nolan?.relationAttributes.fee === '$2500000' && 
                nolan?.relationAttributes.bonus === '$500000') {
                console.log('✅ Test 4 passato: Attributi aggiornati correttamente');
                testsPassed++;
            } else {
                throw new Error('Aggiornamento attributi non riuscito');
            }
        } catch (error) {
            console.error('❌ Test 4 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 5: Collegamento modulo a progetto
        console.log('\n🧪 Test 5: Collegamento modulo a progetto');
        try {
            const linkResult = await moduleRelationService.linkModuleToProject(projectId, moduleId);
            
            if (linkResult.project && linkResult.module && linkResult.relation) {
                console.log('✅ Test 5 passato: Modulo collegato al progetto');
                testsPassed++;
            } else {
                throw new Error('Collegamento modulo-progetto non riuscito');
            }
        } catch (error) {
            console.error('❌ Test 5 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 6: Query progetti di un'entità
        console.log('\n🧪 Test 6: Query progetti di un\'entità');
        try {
            const projects = await moduleRelationService.getEntityProjects(entityId1);
            
            if (projects.length === 1 && projects[0].project?.name === 'Film: Inception') {
                console.log('✅ Test 6 passato: Progetti dell\'entità recuperati');
                testsPassed++;
            } else {
                throw new Error('Query progetti non corretta');
            }
        } catch (error) {
            console.error('❌ Test 6 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 7: Calcolo aggregati
        console.log('\n🧪 Test 7: Calcolo aggregati del modulo');
        try {
            const aggregates = await moduleRelationService.getModuleAggregates(moduleId, 'fee');
            
            // Verifica: totalMembers = 2, totale amount corretto (2.5M + 20M = 22.5M) e ruoli distinti
            if (aggregates.totalMembers === 2 &&
                aggregates.totalAmount === 22500000 && 
                aggregates.roles.length === 2 &&
                aggregates.roles.includes('Director') &&
                aggregates.roles.includes('Lead Actor')) {
                console.log('✅ Test 7 passato: Aggregati calcolati correttamente');
                console.log('   - Totale membri:', aggregates.totalMembers);
                console.log('   - Ruoli:', aggregates.roles);
                testsPassed++;
            } else {
                throw new Error('Aggregati non corretti');
            }
        } catch (error) {
            console.error('❌ Test 7 fallito:', error.message);
            testsFailed++;
        }
        
        // TEST 8: Rimozione membro dal modulo
        console.log('\n🧪 Test 8: Rimozione membro dal modulo');
        try {
            await moduleRelationService.removeEntityFromModule(entityId2, moduleId);
            const members = await moduleRelationService.getModuleMembers(moduleId);
            
            if (members.length === 1 && members[0].entity.name === 'Christopher Nolan') {
                console.log('✅ Test 8 passato: Membro rimosso correttamente');
                testsPassed++;
            } else {
                throw new Error('Rimozione membro non riuscita');
            }
        } catch (error) {
            console.error('❌ Test 8 fallito:', error.message);
            testsFailed++;
        }
        
        // Cleanup
        console.log('\n🧹 Pulizia dati di test...');
        await neo4jDAO.connector.executeQuery(`
            MATCH (p:Progetto {id: $projectId}) DETACH DELETE p
        `, { projectId });
        
        await neo4jDAO.connector.executeQuery(`
            MATCH (m:ModuleInstance {id: $moduleId}) DETACH DELETE m
        `, { moduleId });
        
        await neo4jDAO.connector.executeQuery(`
            MATCH (e:Entity) WHERE e.id IN [$entityId1, $entityId2] DETACH DELETE e
        `, { entityId1, entityId2 });
        
        console.log('✅ Cleanup completato');
        
    } catch (error) {
        console.error('❌ Errore generale durante i test:', error);
        testsFailed++;
    } finally {
        await neo4jConnector.close();
    }
    
    // Risultati finali
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RISULTATI TEST ModuleRelationService`);
    console.log(`✅ Test passati: ${testsPassed}`);
    console.log(`❌ Test falliti: ${testsFailed}`);
    console.log(`📈 Success rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    console.log('='.repeat(60));
    
    process.exit(testsFailed > 0 ? 1 : 0);
}

// Esegui i test
runTests().catch(error => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
});