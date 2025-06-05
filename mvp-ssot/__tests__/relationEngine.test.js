const neo4jConnector = require('../backend/neo4j_connector');
const dao = require('../backend/dao/neo4j_dao');
const SchemaManager = require('../backend/core/schemaManager_evolved');
const EntityEngine = require('../backend/core/entityEngine'); // Assuming MVP EntityEngine for this test
const RelationEngine = require('../backend/core/relationEngine');

// Helper to avoid Neo4j overload during tests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('RelationEngine', () => {
    let schemaManager;
    let entityEngine;
    let relationEngine;
    let mario, luigi, acme; // Test entities

    beforeAll(async () => {
        // Note: These tests require a running Neo4j instance.
        try {
            await neo4jConnector.connect();

            schemaManager = new SchemaManager(dao);
            await schemaManager.initialize();

            // For RelationEngine tests, a real EntityEngine is needed to create entities
            // Using the MVP version as specified in the original test script
            entityEngine = new EntityEngine(dao, schemaManager, null /* attributeSpace not used by MVP EntityEngine directly */);

            relationEngine = new RelationEngine(entityEngine, schemaManager, dao);

            // Clean database before tests
            await dao.connector.executeQuery('MATCH (n) DETACH DELETE n');

            // Define schemas
            await schemaManager.defineEntitySchema('Persona', {
                attributes: {
                    nome: { type: 'string', required: true },
                    cognome: { type: 'string', required: true },
                    eta: { type: 'number', required: false }
                }
            });
            await schemaManager.defineEntitySchema('Azienda', {
                attributes: {
                    nome: { type: 'string', required: true },
                    settore: { type: 'string', required: false }
                }
            });
            await schemaManager.defineRelationSchema('Lavora', {
                sourceTypes: ['Persona'], targetTypes: ['Azienda'], cardinality: 'N:1',
                attributes: { dataInizio: { type: 'date', required: true }, ruolo: { type: 'string', required: true } }
            });
            await schemaManager.defineRelationSchema('Conosce', {
                sourceTypes: ['Persona'], targetTypes: ['Persona'], cardinality: 'N:M',
                attributes: { dataIncontro: { type: 'date', required: true }, luogo: { type: 'string' } }
            });

            // Create test entities
            mario = await entityEngine.createEntity('Persona', { nome: 'Mario', cognome: 'Rossi', eta: 30 });
            luigi = await entityEngine.createEntity('Persona', { nome: 'Luigi', cognome: 'Verdi', eta: 28 });
            acme = await entityEngine.createEntity('Azienda', { nome: 'ACME Corp', settore: 'Tecnologia' });

        } catch (error) {
            console.error("Failed to connect to Neo4j or initialize RelationEngine components:", error);
            throw error;
        }
    });

    afterAll(async () => {
        if (neo4jConnector.driver) { // Check if driver exists
            // Optional: Clean up specific test data if needed, though beforeAll cleans everything
            // await dao.connector.executeQuery("MATCH (n) WHERE n.nome = 'Mario' OR n.nome = 'Luigi' OR n.nome = 'ACME Corp' DETACH DELETE n");
            await neo4jConnector.close();
        }
    });

    beforeEach(async () => {
        // Clear relations before each test to ensure independence
        relationEngine.relations.clear();
        relationEngine.entityRelations.clear();
        // This might require deleting relations from DB if tests don't clean up after themselves
        // For now, assuming tests create unique relations or specific cleanup is handled.
        // Reloading all relations can be heavy, do it only if necessary or ensure tests are atomic.
        // await relationEngine.loadAllRelations();
        await delay(50); // Short delay
    });


    it('should create a new relation (Lavora)', async () => {
        const relazioneLavoro = await relationEngine.createRelation(
            'Lavora', mario.id, acme.id,
            { dataInizio: '2024-01-15', ruolo: 'Ingegnere' }
        );
        expect(relazioneLavoro).toBeDefined();
        expect(relazioneLavoro.id).toBeDefined();
        expect(relazioneLavoro.type).toBe('Lavora');
        expect(relazioneLavoro.sourceEntityId).toBe(mario.id);
        expect(relazioneLavoro.targetEntityId).toBe(acme.id);
        expect(relazioneLavoro.attributes.ruolo).toBe('Ingegnere');
    });

    it('should create another relation (Conosce)', async () => {
        const relazioneAmicizia = await relationEngine.createRelation(
            'Conosce', mario.id, luigi.id,
            { dataIncontro: '2023-05-10', luogo: 'Conferenza' }
        );
        expect(relazioneAmicizia).toBeDefined();
        expect(relazioneAmicizia.type).toBe('Conosce');
    });

    it('should find relations based on criteria', async () => {
        // Create a known relation for this test to find
        await relationEngine.createRelation('Lavora', luigi.id, acme.id, { dataInizio: '2024-02-01', ruolo: 'Designer' });

        const marioRelations = await relationEngine.findRelations({ sourceEntityId: mario.id });
        // Note: This will also find relations created in other tests if not cleaned up.
        // Consider making criteria more specific or ensuring clean state.
        expect(marioRelations.length).toBeGreaterThanOrEqual(1); // Mario should have at least 'Lavora' and 'Conosce' from previous tests if state persists

        const tutteRelazioniLavora = await relationEngine.findRelations({ relationType: 'Lavora' });
        expect(tutteRelazioniLavora.length).toBeGreaterThanOrEqual(2); // Mario and Luigi Lavora at ACME
    });

    it('should get related entities', async () => {
        // Ensure Mario has relations from previous tests or create them here
        // For robustness, let's ensure the relations exist for this specific test
        await relationEngine.createRelation('Lavora', mario.id, acme.id, { dataInizio: '2024-01-15', ruolo: 'Ingegnere' }, true /* upsert*/ );
        await relationEngine.createRelation('Conosce', mario.id, luigi.id, { dataIncontro: '2023-05-10', luogo: 'Conferenza' }, true /* upsert*/);


        const relatedToMario = await relationEngine.getRelatedEntities(mario.id);
        expect(relatedToMario.length).toBeGreaterThanOrEqual(2); // ACME and Luigi

        const relatedAcme = relatedToMario.find(r => r.entity.id === acme.id);
        expect(relatedAcme).toBeDefined();
        expect(relatedAcme.relationType).toBe('Lavora');

        const relatedLuigi = relatedToMario.find(r => r.entity.id === luigi.id);
        expect(relatedLuigi).toBeDefined();
        expect(relatedLuigi.relationType).toBe('Conosce');
    });

    it('should update relation attributes', async () => {
        const relazione = await relationEngine.createRelation(
            'Lavora', mario.id, acme.id,
            { dataInizio: '2024-03-01', ruolo: 'Senior Developer' },
            true // Upsert to avoid conflicts if already exists
        );
        const updatedRel = await relationEngine.updateRelationAttributes(relazione.id, { ruolo: 'Lead Developer', annoBonus: 2024 });
        expect(updatedRel.attributes.ruolo).toBe('Lead Developer');
        expect(updatedRel.attributes.annoBonus).toBe(2024);
    });

    it('should provide relation statistics', async () => {
        // Create some relations if none exist
        await relationEngine.createRelation('Lavora', mario.id, acme.id, { dataInizio: '2024-01-15', ruolo: 'Ingegnere' }, true);
        await relationEngine.createRelation('Conosce', mario.id, luigi.id, { dataIncontro: '2023-05-10', luogo: 'Conferenza' }, true);

        await relationEngine.loadAllRelations(); // Ensure cache is populated for stats
        const stats = relationEngine.getRelationStats();
        expect(stats.totalRelations).toBeGreaterThanOrEqual(2);
        expect(stats.relationsByType['Lavora']).toBeGreaterThanOrEqual(1);
        expect(stats.relationsByType['Conosce']).toBeGreaterThanOrEqual(1);
    });

    it('should validate against relation schema', async () => {
        // Attempt to create a 'Lavora' relation between two 'Persona' entities (invalid by schema)
        await expect(
            relationEngine.createRelation(
                'Lavora', mario.id, luigi.id,
                { dataInizio: '2024-01-01', ruolo: 'Collega' }
            )
        ).rejects.toThrow(/Target entityType 'Persona' not allowed for relation type 'Lavora'. Allowed: Azienda/);
    });

    it('should load relations from database', async () => {
        // Create a unique relation to ensure it's loaded
        const relUnique = await relationEngine.createRelation('Conosce', luigi.id, mario.id, { dataIncontro: '2022-01-01', luogo: 'Online' });

        relationEngine.relations.clear(); // Clear cache
        relationEngine.entityRelations.clear();

        await relationEngine.loadAllRelations();

        const reloadedRel = relationEngine.getRelation(relUnique.id);
        expect(reloadedRel).toBeDefined();
        expect(reloadedRel.attributes.luogo).toBe('Online');

        const stats = relationEngine.getRelationStats();
        expect(stats.totalRelations).toBeGreaterThanOrEqual(1);
    });
});
