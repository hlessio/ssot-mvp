const { TestRunner, Assert, TestData } = require('../test-utils');
const neo4jConnector = require('../../src/backend/neo4j_connector');
const neo4jDAO = require('../../src/backend/dao/neo4j_dao');
const SchemaManager = require('../../src/backend/core/schemaManager_evolved');
const EntityEngine = require('../../src/backend/core/entityEngine_evolved');
const RelationEngine = require('../../src/backend/core/relationEngine');
const AttributeSpace = require('../../src/backend/core/attributeSpace_evolved');
const DocumentService = require('../../src/backend/services/DocumentService');

// Test runner instance
const runner = new TestRunner('DocumentService Integration Tests');

// Shared instances
let schemaManager, entityEngine, relationEngine, attributeSpace, documentService;
let testProjectId, testModuleId, testDocumentId;

// Setup function
async function setup() {
    await neo4jConnector.connect();
    
    // Initialize services
    attributeSpace = new AttributeSpace({ enableLogging: false });
    schemaManager = new SchemaManager(neo4jDAO);
    // Prima creiamo entityEngine senza relationEngine
    entityEngine = new EntityEngine(neo4jDAO, schemaManager, null, attributeSpace);
    // Poi creiamo relationEngine con entityEngine
    relationEngine = new RelationEngine(entityEngine, schemaManager, neo4jDAO);
    // Infine aggiorniamo entityEngine con relationEngine
    entityEngine.relationEngine = relationEngine;
    documentService = new DocumentService(neo4jDAO, entityEngine, schemaManager, attributeSpace);
    
    // Initialize schemas
    await schemaManager.initialize();
    
    // Define base schemas if not already defined
    if (!schemaManager.getEntitySchema('Project')) {
        await schemaManager.defineEntitySchema('Project', {
            mode: 'strict',
            attributes: {
                name: { type: 'string', required: true },
                description: { type: 'text' },
                status: { type: 'string', defaultValue: 'active' }
            }
        });
    }
    
    if (!schemaManager.getEntitySchema('ModuleInstance')) {
        await schemaManager.defineEntitySchema('ModuleInstance', {
            mode: 'strict',
            attributes: {
                templateId: { type: 'string', required: true },
                name: { type: 'string', required: true },
                configuration: { type: 'json', defaultValue: {} }
            }
        });
    }
    
    if (!schemaManager.getEntitySchema('CompositeDocument')) {
        await schemaManager.defineEntitySchema('CompositeDocument', {
            mode: 'strict',
            attributes: {
                name: { type: 'string', required: true },
                description: { type: 'text' },
                projectId: { type: 'string' }, // Semplificato come string invece di reference per i test
                layout: { type: 'json', defaultValue: { type: 'grid', columns: 2, modules: [] } },
                ownerId: { type: 'string', required: true },
                metadata: { type: 'json', defaultValue: {} },
                status: { type: 'select', options: ['draft', 'published', 'archived'], defaultValue: 'draft' },
                createdAt: { type: 'string' },
                modifiedAt: { type: 'string' }
            }
        });
    }
    
    // Create test project
    const testProject = await entityEngine.createEntity('Project', {
        name: 'Test Project SSOT-4000',
        description: 'Project for DocumentService tests',
        status: 'active'
    });
    testProjectId = testProject.id;
    
    // Create test module instance
    const testModule = await entityEngine.createEntity('ModuleInstance', {
        templateId: 'StandardContactCard',
        name: 'Test Contact Module',
        configuration: { showAvatar: true, showEmail: true }
    });
    testModuleId = testModule.id;
}

// Cleanup function
async function cleanup() {
    // Clean up test data
    if (testDocumentId) {
        try {
            await documentService.deleteDocument(testDocumentId);
        } catch (e) {
            // Document might already be deleted
        }
    }
    
    if (testProjectId) {
        await entityEngine.deleteEntity(testProjectId).catch(() => {});
    }
    
    if (testModuleId) {
        await entityEngine.deleteEntity(testModuleId).catch(() => {});
    }
    
    // Close connection
    await neo4jConnector.close();
}

// Test: Create CompositeDocument
runner.test('Create CompositeDocument', async () => {
    try {
        const documentData = {
            name: 'Test Document SSOT-4000',
            description: 'A test composite document',
            projectId: testProjectId,
            ownerId: 'test-user-123',
            metadata: { category: 'test', priority: 'high' },
            status: 'draft'
        };
        
        const document = await documentService.createDocument(documentData);
        testDocumentId = document.id; // Save for cleanup
    
    Assert.exists(document.id, 'Document should have an ID');
    Assert.equals(document.entityType, 'CompositeDocument', 'Should be a CompositeDocument');
    Assert.equals(document.name, documentData.name, 'Name should match');
    Assert.equals(document.description, documentData.description, 'Description should match');
    Assert.equals(document.projectId, testProjectId, 'ProjectId should match');
    Assert.equals(document.ownerId, documentData.ownerId, 'OwnerId should match');
    Assert.equals(document.status, 'draft', 'Status should be draft');
    Assert.equals(JSON.stringify(document.metadata), JSON.stringify(documentData.metadata), 'Metadata should match');
    Assert.exists(document.createdAt, 'Should have createdAt timestamp');
    Assert.exists(document.modifiedAt, 'Should have modifiedAt timestamp');
    } catch (error) {
        // Se il test fallisce, rilanciamo l'errore per far fallire il test
        throw error;
    }
});

// Test: Get Document
runner.test('Get Document with modules', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const result = await documentService.getDocument(testDocumentId, {
        includeModules: true,
        includeProject: true
    });
    
    Assert.exists(result.document, 'Should return document');
    Assert.equals(result.document.id, testDocumentId, 'Document ID should match');
    Assert.isTrue(Array.isArray(result.modules), 'Should have modules array');
    Assert.equals(result.modules.length, 0, 'Should have no modules initially');
    Assert.equals(result.project?.id, testProjectId, 'Should include project');
});

// Test: Update Document
runner.test('Update Document', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const updates = {
        name: 'Updated Document Name',
        status: 'published',
        metadata: { category: 'updated', priority: 'low', newField: 'test' }
    };
    
    const updated = await documentService.updateDocument(testDocumentId, updates);
    
    Assert.equals(updated.name, updates.name, 'Name should be updated');
    Assert.equals(updated.status, updates.status, 'Status should be updated');
    Assert.equals(JSON.stringify(updated.metadata), JSON.stringify(updates.metadata), 'Metadata should be updated');
    Assert.notEquals(updated.modifiedAt, updated.createdAt, 'ModifiedAt should be different from createdAt');
});

// Test: Add Module to Document
runner.test('Add Module to Document', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const layoutConfig = {
        position: { x: 0, y: 0 },
        size: { width: 6, height: 4 },
        collapsed: false,
        config: { theme: 'light' }
    };
    
    const result = await documentService.addModuleToDocument(testDocumentId, testModuleId, layoutConfig);
    
    Assert.exists(result.relation, 'Should return relation');
    Assert.equals(result.relation.order, 1, 'First module should have order 1');
    Assert.equals(JSON.stringify(result.relation.position), JSON.stringify(layoutConfig.position), 'Position should match');
    Assert.equals(JSON.stringify(result.relation.size), JSON.stringify(layoutConfig.size), 'Size should match');
    Assert.equals(result.relation.collapsed, false, 'Collapsed should match');
    Assert.equals(JSON.stringify(result.relation.config), JSON.stringify(layoutConfig.config), 'Config should match');
    
    // Verify module is in document
    const docWithModules = await documentService.getDocument(testDocumentId, { includeModules: true });
    Assert.equals(docWithModules.modules.length, 1, 'Document should have 1 module');
    Assert.equals(docWithModules.modules[0].module.id, testModuleId, 'Module ID should match');
});

// Test: Update Document Layout
runner.test('Update Document Layout', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const moduleLayouts = [{
        moduleId: testModuleId,
        order: 1,
        position: { x: 2, y: 1 },
        size: { width: 8, height: 6 },
        collapsed: true,
        config: { theme: 'dark', customProp: 'value' }
    }];
    
    const updated = await documentService.updateDocumentLayout(testDocumentId, moduleLayouts);
    
    Assert.exists(updated.document.layout, 'Document should have layout');
    Assert.equals(updated.document.layout.modules.length, 1, 'Layout should have 1 module');
    
    // Verify the layout was actually updated in the relations
    const docWithModules = await documentService.getDocument(testDocumentId, { includeModules: true });
    const moduleRelation = docWithModules.modules[0];
    
    Assert.equals(JSON.stringify(moduleRelation.position), JSON.stringify({ x: 2, y: 1 }), 'Position should be updated');
    Assert.equals(JSON.stringify(moduleRelation.size), JSON.stringify({ width: 8, height: 6 }), 'Size should be updated');
    Assert.equals(moduleRelation.collapsed, true, 'Collapsed should be updated');
});

// Test: List Documents
runner.test('List Documents with filters', async () => {
    // Create another document
    const anotherDoc = await documentService.createDocument({
        name: 'Another Test Document',
        ownerId: 'another-user',
        status: 'archived'
    });
    
    try {
        // Test listing all documents
        const allDocs = await documentService.listDocuments();
        Assert.isTrue(allDocs.length >= 2, 'Should have at least 2 documents');
        
        // Test filter by project
        const projectDocs = await documentService.listDocuments({ projectId: testProjectId });
        const hasTestDoc = projectDocs.some(d => d.id === testDocumentId);
        Assert.isTrue(hasTestDoc, 'Should find document by project filter');
        
        // Test filter by status
        const archivedDocs = await documentService.listDocuments({ status: 'archived' });
        const hasArchivedDoc = archivedDocs.some(d => d.id === anotherDoc.id);
        Assert.isTrue(hasArchivedDoc, 'Should find archived document');
        
        // Test pagination
        const paginated = await documentService.listDocuments({}, { limit: 1, offset: 0 });
        Assert.equals(paginated.length, 1, 'Should respect limit');
        
    } finally {
        // Cleanup
        await documentService.deleteDocument(anotherDoc.id);
    }
});

// Test: Clone Document
runner.test('Clone Document', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const overrides = {
        name: 'Cloned Document',
        ownerId: 'clone-owner'
    };
    
    const cloned = await documentService.cloneDocument(testDocumentId, overrides);
    
    try {
        Assert.notEquals(cloned.document.id, testDocumentId, 'Clone should have different ID');
        Assert.equals(cloned.document.name, overrides.name, 'Clone should have overridden name');
        Assert.equals(cloned.document.ownerId, overrides.ownerId, 'Clone should have overridden owner');
        Assert.equals(cloned.document.description, 'A test composite document', 'Clone should keep original description');
        Assert.equals(cloned.modules.length, 1, 'Clone should have same modules');
        Assert.equals(cloned.modules[0].module.id, testModuleId, 'Clone should reference same module');
        
    } finally {
        // Cleanup cloned document
        await documentService.deleteDocument(cloned.document.id);
    }
});

// Test: Get Document Context
runner.test('Get Document Context', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const context = await documentService.getDocumentContext(testDocumentId);
    
    Assert.equals(context.documentId, testDocumentId, 'Context should have document ID');
    Assert.equals(context.documentName, 'Updated Document Name', 'Context should have document name');
    Assert.equals(context.projectId, testProjectId, 'Context should have project ID');
    // Skip projectName check since we're using simple string projectId in tests
    Assert.equals(context.ownerId, 'test-user-123', 'Context should have owner ID');
    Assert.exists(context.metadata, 'Context should have metadata');
    Assert.exists(context.inheritedAttributes, 'Context should have inherited attributes');
});

// Test: Remove Module from Document
runner.test('Remove Module from Document', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const removed = await documentService.removeModuleFromDocument(testDocumentId, testModuleId);
    
    Assert.isTrue(removed, 'Should return true when module removed');
    
    // Verify module was removed
    const docWithModules = await documentService.getDocument(testDocumentId, { includeModules: true });
    Assert.equals(docWithModules.modules.length, 0, 'Document should have no modules');
});

// Test: Delete Document
runner.test('Delete Document', async () => {
    if (!testDocumentId) {
        throw new Error('Test skipped: testDocumentId not available from previous test');
    }
    
    const deleted = await documentService.deleteDocument(testDocumentId);
    
    Assert.isTrue(deleted, 'Should return true when document deleted');
    
    // Verify document was deleted
    try {
        await documentService.getDocument(testDocumentId);
        Assert.fail('Should throw error when getting deleted document');
    } catch (error) {
        Assert.isTrue(error.message.includes('non trovato'), 'Should indicate document not found');
    }
    
    testDocumentId = null; // Clear for cleanup
});

// Test: Error handling
runner.test('Error handling - invalid document data', async () => {
    try {
        await documentService.createDocument({
            description: 'Missing required fields'
        });
        Assert.fail('Should throw error for missing required fields');
    } catch (error) {
        Assert.isTrue(error.message.includes('obbligatorio'), 'Should indicate required field missing');
    }
});

runner.test('Error handling - non-existent document', async () => {
    try {
        await documentService.getDocument('non-existent-id');
        Assert.fail('Should throw error for non-existent document');
    } catch (error) {
        Assert.isTrue(error.message.includes('non trovato'), 'Should indicate document not found');
    }
});

// Main test execution
async function main() {
    try {
        await setup();
        console.log('✅ Test setup completed');
        
        await runner.run();
        
    } catch (error) {
        console.error('❌ Test setup failed:', error);
        process.exit(1);
    } finally {
        try {
            await cleanup();
            console.log('✅ Test cleanup completed');
        } catch (error) {
            console.error('❌ Test cleanup failed:', error);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}