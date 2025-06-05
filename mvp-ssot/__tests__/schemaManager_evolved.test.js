const neo4jConnector = require('../backend/neo4j_connector');
const neo4jDAO = require('../backend/dao/neo4j_dao');
const SchemaManager = require('../backend/core/schemaManager_evolved');

describe('SchemaManager Evolved', () => {
    let schemaManager;

    beforeAll(async () => {
        // Note: These tests require a running Neo4j instance.
        try {
            await neo4jConnector.connect();
            schemaManager = new SchemaManager(neo4jDAO);
            await schemaManager.initialize();
        } catch (error) {
            // Log the error and rethrow to make it clear in test output if connection fails
            console.error("Failed to connect to Neo4j or initialize SchemaManager:", error);
            throw error;
        }
    });

    afterAll(async () => {
        if (neo4jConnector.driver) { // Check if driver exists
            await neo4jConnector.close();
        }
    });

    describe('Entity Schema Definition', () => {
        it('should define a simple entity schema (Cliente)', async () => {
            const clienteSchemaDefinition = {
                mode: 'flexible',
                attributes: {
                    nome: { type: 'string', required: true, description: 'Nome del cliente' },
                    email: { type: 'email', required: true, description: 'Email del cliente' },
                    telefono: { type: 'string', required: false, description: 'Numero di telefono' },
                    età: { type: 'number', required: false, min: 0, max: 120, description: 'Età del cliente' }
                }
            };
            const clienteSchema = await schemaManager.defineEntitySchema('Cliente', clienteSchemaDefinition);
            expect(clienteSchema).toBeDefined();
            expect(clienteSchema.entityType).toBe('Cliente');
            expect(clienteSchema.mode).toBe('flexible');
            expect(clienteSchema.getAttributeNames()).toEqual(expect.arrayContaining(['nome', 'email', 'telefono', 'età']));
        });

        it('should define an entity schema with reference attributes (Ordine)', async () => {
            const ordineSchemaDefinition = {
                mode: 'strict',
                attributes: {
                    numero: { type: 'string', required: true, description: 'Numero ordine' },
                    cliente: {
                        type: 'reference',
                        required: true,
                        referencesEntityType: 'Cliente',
                        relationTypeForReference: 'HaClienteRef', // Changed to avoid conflict with relation schema
                        displayAttributeFromReferencedEntity: 'nome',
                        cardinalityForReference: 'N:1',
                        description: 'Cliente che ha effettuato l\'ordine'
                    },
                    importo: { type: 'number', required: true, min: 0, description: 'Importo totale dell\'ordine' },
                    stato: { type: 'select', required: true, options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], defaultValue: 'Pending', description: 'Stato dell\'ordine' }
                }
            };
            const ordineSchema = await schemaManager.defineEntitySchema('Ordine', ordineSchemaDefinition);
            expect(ordineSchema).toBeDefined();
            expect(ordineSchema.entityType).toBe('Ordine');
            expect(ordineSchema.mode).toBe('strict');
            expect(ordineSchema.hasReferenceAttributes()).toBe(true);
        });
    });

    describe('Relation Schema Definition', () => {
        it('should define a relation schema (HaCliente)', async () => {
            const haClienteSchemaDefinition = {
                cardinality: 'N:1',
                sourceTypes: ['Ordine'],
                targetTypes: ['Cliente'],
                attributes: {
                    dataCreazione: { type: 'date', required: true, description: 'Data di creazione della relazione' },
                    note: { type: 'string', required: false, description: 'Note aggiuntive' }
                }
            };
            const haClienteSchema = await schemaManager.defineRelationSchema('HaCliente', haClienteSchemaDefinition);
            expect(haClienteSchema).toBeDefined();
            expect(haClienteSchema.relationType).toBe('HaCliente');
            expect(haClienteSchema.cardinality).toBe('N:1');
            expect(haClienteSchema.sourceTypes).toEqual(['Ordine']);
            expect(haClienteSchema.targetTypes).toEqual(['Cliente']);
        });
    });

    describe('Schema Retrieval', () => {
        it('should retrieve defined entity and relation schemas', () => {
            const clienteSchema = schemaManager.getEntitySchema('Cliente');
            const ordineSchema = schemaManager.getEntitySchema('Ordine');
            const haClienteSchema = schemaManager.getRelationSchema('HaCliente');

            expect(clienteSchema).toBeDefined();
            expect(ordineSchema).toBeDefined();
            expect(haClienteSchema).toBeDefined();
        });

        it('should list all defined entity and relation types', () => {
            const entityTypes = schemaManager.getAllEntityTypes();
            const relationTypes = schemaManager.getAllRelationTypes();

            expect(entityTypes).toEqual(expect.arrayContaining(['Cliente', 'Ordine']));
            expect(relationTypes).toEqual(expect.arrayContaining(['HaCliente', 'HaClienteRef']));
        });
    });

    describe('Attribute Validation', () => {
        it('should validate attribute values correctly', () => {
            expect(schemaManager.validateAttributeValue('Cliente', 'nome', 'Mario Rossi').valid).toBe(true);
            expect(schemaManager.validateAttributeValue('Cliente', 'email', 'mario@example.com').valid).toBe(true);
            expect(schemaManager.validateAttributeValue('Cliente', 'email', 'invalid-email').valid).toBe(false);
            expect(schemaManager.validateAttributeValue('Cliente', 'età', 25).valid).toBe(true);
            expect(schemaManager.validateAttributeValue('Cliente', 'età', 150).valid).toBe(false); // Out of range
        });

        it('should handle unknown attributes based on schema mode', () => {
            const flexValidation = schemaManager.validateAttributeValue('Cliente', 'unknownAttrFlex', 'value'); // Flexible mode
            expect(flexValidation.valid).toBe(true); // Should be valid but might have a warning
            expect(flexValidation.warning).toBeDefined();


            const strictValidation = schemaManager.validateAttributeValue('Ordine', 'unknownAttrStrict', 'value'); // Strict mode
            expect(strictValidation.valid).toBe(false);
            expect(strictValidation.error).toBeDefined();
        });
    });

    describe('Relation Validation', () => {
        it('should validate relations correctly', () => {
            const validRelation = schemaManager.validateRelation('HaCliente', 'Ordine', 'Cliente', {
                dataCreazione: new Date().toISOString(),
                note: 'Test note'
            });
            expect(validRelation.valid).toBe(true);

            const invalidRelationType = schemaManager.validateRelation('HaCliente', 'NonExistentType', 'Cliente', {});
            expect(invalidRelationType.valid).toBe(false);
            expect(invalidRelationType.error).toContain('Source type "NonExistentType" not allowed');
        });
    });

    describe('Schema Evolution', () => {
        it('should evolve an entity schema by adding an attribute', async () => {
            const evolution = {
                addAttributes: {
                    dataRegistrazione: {
                        type: 'date',
                        required: false,
                        defaultValue: new Date().toISOString(),
                        description: 'Data di registrazione del cliente'
                    }
                }
            };
            const originalSchema = schemaManager.getEntitySchema('Cliente');
            const originalVersion = originalSchema.version;

            const evolvedSchema = await schemaManager.evolveSchema('Cliente', evolution);
            expect(evolvedSchema).toBeDefined();
            expect(evolvedSchema.version).toBeGreaterThan(originalVersion);
            expect(evolvedSchema.getAttributeNames()).toContain('dataRegistrazione');
        });
    });
});
