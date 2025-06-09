/**
 * Integration Tests for Full SSOT System
 * Tests end-to-end workflows involving all components
 */

const { TestRunner, Assert, TestData, TestCleanup } = require('../test-utils');

// Import real components for integration testing
const neo4jConnector = require('../../src/backend/neo4j_connector');
const neo4jDAO = require('../../src/backend/dao/neo4j_dao');
const SchemaManager = require('../../src/backend/core/schemaManager_evolved');
const EntityEngine = require('../../src/backend/core/entityEngine_evolved');
const RelationEngine = require('../../src/backend/core/relationEngine');
const AttributeSpace = require('../../src/backend/core/attributeSpace_evolved');

async function run() {
    const runner = new TestRunner('Full System Integration Tests');
    
    let schemaManager, entityEngine, relationEngine, attributeSpace;
    let testEntityId, testEntity2Id, testRelationId;

    // System Setup
    runner.test('Initialize Neo4j connection', async () => {
        try {
            await neo4jConnector.connect();
            Assert.isTrue(true, 'Neo4j connection should succeed');
        } catch (error) {
            // Skip integration tests if Neo4j is not available
            console.log('⚠️  Neo4j not available, skipping integration tests');
            return { success: true, stats: { total: 0, passed: 0, failed: 0 }, failures: [] };
        }
    });

    runner.test('Initialize core components', async () => {
        // Initialize AttributeSpace
        attributeSpace = new AttributeSpace({
            enableBatching: false, // Disable for testing
            enableLogging: false
        });

        // Initialize SchemaManager
        schemaManager = new SchemaManager(neo4jDAO);
        await schemaManager.initialize();

        // Initialize EntityEngine with MVP fallback
        const EntityEngine_MVP = require('../../src/backend/core/entityEngine');
        const SchemaManager_MVP = require('../../src/backend/core/schemaManager');
        
        const schemaManager_MVP = new SchemaManager_MVP();
        const entityEngine_MVP = new EntityEngine_MVP(neo4jDAO, schemaManager_MVP, attributeSpace);

        // Initialize RelationEngine
        relationEngine = new RelationEngine(entityEngine_MVP, schemaManager, neo4jDAO);

        // Initialize evolved EntityEngine
        entityEngine = new EntityEngine(neo4jDAO, schemaManager, relationEngine, attributeSpace);

        Assert.exists(schemaManager, 'SchemaManager should be initialized');
        Assert.exists(entityEngine, 'EntityEngine should be initialized');
        Assert.exists(relationEngine, 'RelationEngine should be initialized');
        Assert.exists(attributeSpace, 'AttributeSpace should be initialized');
    });

    // Schema Definition Workflow
    runner.test('Define entity schema for Contact', async () => {
        const contactSchema = {
            mode: 'flexible',
            attributes: {
                nome: {
                    type: 'string',
                    required: true,
                    description: 'Contact name'
                },
                email: {
                    type: 'email',
                    required: false,
                    description: 'Email address'
                },
                telefono: {
                    type: 'string',
                    required: false,
                    description: 'Phone number'
                }
            }
        };

        const result = await schemaManager.defineEntitySchema('Contact', contactSchema);
        Assert.isTrue(result.success, 'Contact schema should be defined successfully');
        
        const schema = schemaManager.getEntitySchema('Contact');
        Assert.exists(schema, 'Contact schema should be retrievable');
        Assert.hasProperty(schema.attributes, 'nome', 'Schema should have nome attribute');
    });

    runner.test('Define relation schema for Knows relationship', async () => {
        const knowsSchema = {
            sourceTypes: ['Contact'],
            targetTypes: ['Contact'],
            attributes: {
                since: {
                    type: 'date',
                    required: false,
                    description: 'Since when they know each other'
                },
                strength: {
                    type: 'number',
                    required: false,
                    description: 'Relationship strength (1-10)'
                }
            }
        };

        const result = await schemaManager.defineRelationSchema('Knows', knowsSchema);
        Assert.isTrue(result.success, 'Knows relation schema should be defined successfully');
    });

    // Entity Creation Workflow
    runner.test('Create first contact entity', async () => {
        const contactData = {
            nome: 'Mario Rossi',
            email: 'mario.rossi@example.com',
            telefono: '+39 123 456 7890'
        };

        const entity = await entityEngine.createEntity('Contact', contactData);
        Assert.exists(entity, 'Contact should be created');
        Assert.exists(entity.id, 'Contact should have an ID');
        Assert.equals(entity.nome, 'Mario Rossi', 'Contact should have correct name');
        
        testEntityId = entity.id;
        TestCleanup.trackEntity(testEntityId);
    });

    runner.test('Create second contact entity', async () => {
        const contactData = {
            nome: 'Luigi Verdi',
            email: 'luigi.verdi@example.com'
        };

        const entity = await entityEngine.createEntity('Contact', contactData);
        Assert.exists(entity, 'Second contact should be created');
        Assert.exists(entity.id, 'Second contact should have an ID');
        
        testEntity2Id = entity.id;
        TestCleanup.trackEntity(testEntity2Id);
    });

    // Entity Retrieval and Validation
    runner.test('Retrieve created entities', async () => {
        const entity1 = await entityEngine.getEntity(testEntityId);
        const entity2 = await entityEngine.getEntity(testEntity2Id);

        Assert.exists(entity1, 'First entity should be retrievable');
        Assert.exists(entity2, 'Second entity should be retrievable');
        Assert.equals(entity1.nome, 'Mario Rossi', 'First entity should have correct data');
        Assert.equals(entity2.nome, 'Luigi Verdi', 'Second entity should have correct data');
    });

    runner.test('Get all contacts', async () => {
        const contacts = await entityEngine.getAllEntities('Contact');
        Assert.isTrue(Array.isArray(contacts), 'Should return array of contacts');
        Assert.isTrue(contacts.length >= 2, 'Should have at least 2 contacts');
        
        const ourContacts = contacts.filter(c => 
            c.id === testEntityId || c.id === testEntity2Id
        );
        Assert.arrayLength(ourContacts, 2, 'Should find both our test contacts');
    });

    // Entity Update Workflow
    runner.test('Update entity attribute', async () => {
        await entityEngine.setEntityAttribute(testEntityId, 'telefono', '+39 987 654 3210');
        
        const updatedEntity = await entityEngine.getEntity(testEntityId);
        Assert.equals(updatedEntity.telefono, '+39 987 654 3210', 'Phone should be updated');
    });

    runner.test('Add new attribute dynamically', async () => {
        await entityEngine.setEntityAttribute(testEntityId, 'citta', 'Roma');
        
        const updatedEntity = await entityEngine.getEntity(testEntityId);
        Assert.equals(updatedEntity.citta, 'Roma', 'City should be added');
    });

    // Relation Creation Workflow
    runner.test('Create relationship between contacts', async () => {
        const relationData = {
            since: '2020-01-01',
            strength: 8
        };

        const relation = await relationEngine.createRelation(
            'Knows',
            testEntityId,
            testEntity2Id,
            relationData
        );

        Assert.exists(relation, 'Relation should be created');
        Assert.exists(relation.id, 'Relation should have an ID');
        Assert.equals(relation.relationType, 'Knows', 'Relation should have correct type');
        
        testRelationId = relation.id;
        TestCleanup.trackRelation(testRelationId);
    });

    runner.test('Query relations for entity', async () => {
        const relations = await relationEngine.findRelations({
            sourceEntityId: testEntityId,
            relationType: 'Knows'
        });

        Assert.isTrue(Array.isArray(relations), 'Should return array of relations');
        Assert.isTrue(relations.length >= 1, 'Should have at least 1 relation');
        
        const ourRelation = relations.find(r => r.id === testRelationId);
        Assert.exists(ourRelation, 'Should find our test relation');
        Assert.equals(ourRelation.strength, 8, 'Relation should have correct strength');
    });

    runner.test('Get related entities', async () => {
        const relatedEntities = await relationEngine.getRelatedEntities(testEntityId, 'Knows');
        
        Assert.isTrue(Array.isArray(relatedEntities), 'Should return array of related entities');
        Assert.isTrue(relatedEntities.length >= 1, 'Should have at least 1 related entity');
        
        const relatedEntity = relatedEntities.find(e => e.id === testEntity2Id);
        Assert.exists(relatedEntity, 'Should find the related contact');
        Assert.equals(relatedEntity.nome, 'Luigi Verdi', 'Related entity should have correct data');
    });

    // Schema Evolution Workflow
    runner.test('Evolve contact schema - add company field', async () => {
        const evolution = {
            addAttributes: {
                'azienda': {
                    type: 'string',
                    required: false,
                    description: 'Company name'
                }
            }
        };

        const result = await schemaManager.evolveEntitySchema('Contact', evolution);
        Assert.isTrue(result.success, 'Schema evolution should succeed');
        
        const schema = schemaManager.getEntitySchema('Contact');
        Assert.hasProperty(schema.attributes, 'azienda', 'Schema should have new company field');
    });

    runner.test('Use evolved schema for new entities', async () => {
        const contactData = {
            nome: 'Anna Bianchi',
            email: 'anna@example.com',
            azienda: 'Tech Corp'
        };

        const entity = await entityEngine.createEntity('Contact', contactData);
        Assert.exists(entity, 'Entity with new field should be created');
        Assert.equals(entity.azienda, 'Tech Corp', 'Entity should have company field');
        
        TestCleanup.trackEntity(entity.id);
    });

    // AttributeSpace Notification Tests
    runner.test('AttributeSpace change notifications', async () => {
        let notificationReceived = false;
        let notificationData = null;

        // Subscribe to changes
        const unsubscribe = attributeSpace.subscribe((change) => {
            notificationReceived = true;
            notificationData = change;
        });

        // Make a change
        await entityEngine.setEntityAttribute(testEntityId, 'nome', 'Mario Updated');

        // Give some time for notification to propagate
        await new Promise(resolve => setTimeout(resolve, 100));

        unsubscribe();

        Assert.isTrue(notificationReceived, 'Should receive notification for entity change');
        Assert.exists(notificationData, 'Notification should contain change data');
        Assert.equals(notificationData.entityId, testEntityId, 'Notification should reference correct entity');
        Assert.equals(notificationData.attributeName, 'nome', 'Notification should reference correct attribute');
    });

    // Data Consistency Tests
    runner.test('Verify data consistency across components', async () => {
        // Get entity from EntityEngine
        const entityFromEngine = await entityEngine.getEntity(testEntityId);
        
        // Get same entity directly from DAO
        const entityFromDAO = await neo4jDAO.getEntityById(testEntityId);
        
        Assert.exists(entityFromEngine, 'EntityEngine should return entity');
        Assert.exists(entityFromDAO, 'DAO should return entity');
        Assert.equals(entityFromEngine.id, entityFromDAO.id, 'Both should return same entity ID');
        Assert.equals(entityFromEngine.nome, entityFromDAO.nome, 'Both should have same name');
    });

    // Cleanup
    runner.test('Cleanup test data', async () => {
        await TestCleanup.cleanup(neo4jDAO);
        Assert.isTrue(true, 'Cleanup should complete without errors');
    });

    const result = await runner.run();
    
    // Close Neo4j connection
    try {
        await neo4jConnector.close();
    } catch (error) {
        // Ignore cleanup errors
    }

    return {
        success: result,
        stats: runner.results,
        failures: runner.results.failures
    };
}

module.exports = { run };