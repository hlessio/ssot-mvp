/**
 * Unit Tests for EntityEngine (Evolved)
 * Tests entity CRUD operations, validation, and reference resolution
 */

const { TestRunner, Assert, TestData } = require('../test-utils');

// Mock dependencies
const mockDAO = {
    entities: new Map(),
    
    async createEntity(entityType, data) {
        const id = TestData.randomString(8);
        const entity = { id, entityType, ...data, createdAt: new Date().toISOString() };
        this.entities.set(id, entity);
        return entity;
    },
    
    async getEntityById(id) {
        return this.entities.get(id) || null;
    },
    
    async updateEntityAttribute(id, attributeName, value) {
        const entity = this.entities.get(id);
        if (entity) {
            entity[attributeName] = value;
            entity.updatedAt = new Date().toISOString();
        }
        return entity;
    },
    
    async getAllEntities(entityType) {
        return Array.from(this.entities.values()).filter(e => e.entityType === entityType);
    },
    
    async deleteEntity(id) {
        return this.entities.delete(id);
    }
};

const mockSchemaManager = {
    schemas: new Map(),
    
    getEntitySchema(entityType) {
        return this.schemas.get(entityType) || null;
    },
    
    async defineEntitySchema(entityType, schemaDefinition) {
        // Create a mock EntitySchema with attributes as Map
        const schema = {
            entityType,
            mode: schemaDefinition.mode || 'flexible',
            attributes: new Map(),
            version: 1,
            created: Date.now(),
            modified: Date.now()
        };
        
        // Convert attributes object to Map
        if (schemaDefinition.attributes) {
            for (const [attrName, attrDef] of Object.entries(schemaDefinition.attributes)) {
                schema.attributes.set(attrName, attrDef);
            }
        }
        
        this.schemas.set(entityType, schema);
        return schema;
    },
    
    validateEntityData(entityType, data) {
        const schema = this.schemas.get(entityType);
        if (!schema) return { valid: true, errors: [] };
        
        const errors = [];
        for (const [attrName, attrDef] of schema.attributes) {
            if (attrDef.required && !data[attrName]) {
                errors.push(`Required attribute '${attrName}' is missing`);
            }
        }
        return { valid: errors.length === 0, errors };
    },
    
    addAttributeToType(entityType, attributeName) {
        // Mock implementation
    },
    
    notifyAttributeDiscovery(entityType, attributeName, detectedType) {
        // Mock implementation
    },
    
    determineAttributeType(value) {
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        return 'string';
    }
};

const mockRelationEngine = {
    async resolveReferences() {
        return {};
    },
    
    async findRelations(query) {
        // Mock implementation - return empty relations for tests
        return [];
    }
};

const mockAttributeSpace = {
    async notifyChange(change) {
        // Mock implementation
    }
};

// Setup test schema
const testSchema = {
    entityType: 'TestEntity',
    mode: 'flexible',
    attributes: new Map([
        ['nome', { type: 'string', required: true }],
        ['email', { type: 'email', required: false }],
        ['age', { type: 'number', required: false }]
    ]),
    version: 1,
    created: Date.now(),
    modified: Date.now(),
    validateAttribute(attributeName, value) {
        const attrDef = this.attributes.get(attributeName);
        if (!attrDef) {
            if (this.mode === "flexible") {
                return { valid: true, warning: `Attributo ${attributeName} non definito nello schema (modalità flessibile)` };
            }
            return { valid: false, error: `Attributo ${attributeName} non definito nello schema per ${this.entityType}` };
        }
        return { valid: true };
    }
};
mockSchemaManager.schemas.set('TestEntity', testSchema);

const EntityEngine = require('../../src/backend/core/entityEngine_evolved');

async function run() {
    const runner = new TestRunner('EntityEngine Unit Tests');
    let entityEngine;

    // Setup
    runner.test('Initialize EntityEngine', async () => {
        entityEngine = new EntityEngine(mockDAO, mockSchemaManager, mockRelationEngine, mockAttributeSpace);
        Assert.exists(entityEngine, 'EntityEngine should be initialized');
    });

    // Entity Creation Tests
    runner.test('Create entity - valid data', async () => {
        const entityData = {
            nome: 'Mario Rossi',
            email: 'mario@example.com',
            age: 30
        };

        const entity = await entityEngine.createEntity('TestEntity', entityData);
        Assert.exists(entity, 'Should return created entity');
        Assert.exists(entity.id, 'Entity should have an ID');
        Assert.equals(entity.entityType, 'TestEntity', 'Should have correct entity type');
        Assert.equals(entity.nome, 'Mario Rossi', 'Should have correct nome');
        Assert.exists(entity.createdAt, 'Should have creation timestamp');
    });

    runner.test('Create entity - missing required field', async () => {
        const entityData = {
            email: 'mario@example.com'
            // missing required 'nome'
        };

        await Assert.throws(
            () => entityEngine.createEntity('TestEntity', entityData),
            'Should throw error for missing required field'
        );
    });

    runner.test('Create entity - unknown entity type', async () => {
        const entityData = {
            nome: 'Test'
        };

        const entity = await entityEngine.createEntity('UnknownType', entityData);
        Assert.exists(entity, 'Should create entity even for unknown type (flexible mode)');
        Assert.equals(entity.entityType, 'UnknownType', 'Should have correct entity type');
    });

    // Entity Retrieval Tests
    runner.test('Get entity by ID - existing', async () => {
        // First create an entity
        const entityData = { nome: 'Test Entity' };
        const created = await entityEngine.createEntity('TestEntity', entityData);

        // Then retrieve it
        const retrieved = await entityEngine.getEntity(created.id);
        Assert.exists(retrieved, 'Should return existing entity');
        Assert.equals(retrieved.id, created.id, 'Should return correct entity');
        Assert.equals(retrieved.nome, 'Test Entity', 'Should have correct data');
    });

    runner.test('Get entity by ID - non-existing', async () => {
        const entity = await entityEngine.getEntity('non-existent-id');
        Assert.notExists(entity, 'Should return null for non-existent entity');
    });

    runner.test('Get all entities by type', async () => {
        // Create multiple entities
        await entityEngine.createEntity('TestEntity', { nome: 'Entity 1' });
        await entityEngine.createEntity('TestEntity', { nome: 'Entity 2' });
        await entityEngine.createEntity('OtherType', { nome: 'Other Entity' });

        const entities = await entityEngine.getAllEntities('TestEntity');
        Assert.isTrue(Array.isArray(entities), 'Should return an array');
        Assert.isTrue(entities.length >= 2, 'Should have at least 2 TestEntity entities');
        Assert.isTrue(entities.every(e => e.entityType === 'TestEntity'), 'All entities should be TestEntity type');
    });

    // Entity Update Tests
    runner.test('Update entity attribute - valid', async () => {
        // Create entity
        const entity = await entityEngine.createEntity('TestEntity', { nome: 'Original Name' });
        
        // Update attribute
        await entityEngine.setEntityAttribute(entity.id, 'nome', 'Updated Name');
        
        // Verify update
        const updated = await entityEngine.getEntity(entity.id);
        Assert.equals(updated.nome, 'Updated Name', 'Attribute should be updated');
        Assert.exists(updated.updatedAt, 'Should have update timestamp');
    });

    runner.test('Update entity attribute - new attribute', async () => {
        // Create entity
        const entity = await entityEngine.createEntity('TestEntity', { nome: 'Test' });
        
        // Add new attribute
        await entityEngine.setEntityAttribute(entity.id, 'new_attribute', 'new value');
        
        // Verify addition
        const updated = await entityEngine.getEntity(entity.id);
        Assert.equals(updated.new_attribute, 'new value', 'New attribute should be added');
    });

    runner.test('Update entity attribute - non-existing entity', async () => {
        await Assert.throws(
            () => entityEngine.setEntityAttribute('non-existent-id', 'attr', 'value'),
            'Should throw error for non-existent entity'
        );
    });

    // Validation Tests
    runner.test('Validate entity data - valid', async () => {
        const entityData = {
            nome: 'Valid Name',
            email: 'valid@example.com',
            age: 25
        };

        const validation = await entityEngine.validateEntity('TestEntity', entityData);
        Assert.isTrue(validation.isValid, 'Valid data should pass validation');
        Assert.arrayLength(validation.errors, 0, 'Should have no errors');
    });

    runner.test('Validate entity data - invalid', async () => {
        const entityData = {
            email: 'test@example.com'
            // missing required 'nome'
        };

        const validation = await entityEngine.validateEntity('TestEntity', entityData);
        Assert.isFalse(validation.isValid, 'Invalid data should fail validation');
        Assert.isTrue(validation.errors.length > 0, 'Should have validation errors');
    });

    // Entity Deletion Tests
    runner.test('Delete entity - existing', async () => {
        // Create entity
        const entity = await entityEngine.createEntity('TestEntity', { nome: 'To Delete' });
        
        // Delete entity
        const result = await entityEngine.deleteEntity(entity.id);
        Assert.isTrue(result, 'Delete should return true');
        
        // Verify deletion
        const deleted = await entityEngine.getEntity(entity.id);
        Assert.notExists(deleted, 'Entity should be deleted');
    });

    runner.test('Delete entity - non-existing', async () => {
        const result = await entityEngine.deleteEntity('non-existent-id');
        Assert.isFalse(result, 'Delete should return false for non-existent entity');
    });

    // Reference Resolution Tests
    runner.test('Resolve entity references', async () => {
        // Create entities
        const entity1 = await entityEngine.createEntity('TestEntity', { nome: 'Entity 1' });
        const entity2 = await entityEngine.createEntity('TestEntity', { nome: 'Entity 2' });
        
        // Create entity with reference
        const entityWithRef = await entityEngine.createEntity('TestEntity', { 
            nome: 'With Reference',
            reference_field: entity1.id
        });

        // Mock reference resolution
        const resolved = await entityEngine.resolveEntityReferences(entityWithRef.id, ['reference_field']);
        Assert.exists(resolved, 'Should return resolved references');
    });

    // Caching Tests
    runner.test('Entity caching', async () => {
        // Create entity
        const entity = await entityEngine.createEntity('TestEntity', { nome: 'Cached Entity' });
        
        // First get (should cache)
        const firstGet = await entityEngine.getEntity(entity.id);
        
        // Second get (should use cache if implemented)
        const secondGet = await entityEngine.getEntity(entity.id);
        
        Assert.equals(firstGet.id, secondGet.id, 'Should return same entity from cache');
    });

    // Bulk Operations Tests
    runner.test('Create multiple entities', async () => {
        const entitiesData = [
            { nome: 'Bulk 1' },
            { nome: 'Bulk 2' },
            { nome: 'Bulk 3' }
        ];

        const promises = entitiesData.map(data => 
            entityEngine.createEntity('TestEntity', data)
        );
        
        const entities = await Promise.all(promises);
        Assert.arrayLength(entities, 3, 'Should create all entities');
        Assert.isTrue(entities.every(e => e.id), 'All entities should have IDs');
    });

    const result = await runner.run();
    return {
        success: result,
        stats: runner.results,
        failures: runner.results.failures
    };
}

module.exports = { run };