/**
 * @jest-environment jsdom
 */

// Mock global fetch
global.fetch = jest.fn();

// Require the service, which attaches an instance to window.SchemaService
require('../../../frontend/services/SchemaService');

describe('SchemaService', () => {
    let schemaService; // This will hold the instance from window.SchemaService

    beforeEach(() => {
        // Reset mocks before each test
        fetch.mockClear();

        // To get a "fresh" instance of the singleton for each test,
        // delete from require cache and re-require the module.
        // This re-runs the script, creating a new instance and attaching it to window.
        delete require.cache[require.resolve('../../../frontend/services/SchemaService')];
        require('../../../frontend/services/SchemaService');
        schemaService = window.SchemaService; // Get the new instance

        // Clear caches manually for each test for full isolation
        schemaService.clearCache();
    });

    describe('getAttributes', () => {
        it('should fetch attributes from evolved API first', async () => {
            const mockAttributes = [{ name: 'attr1' }, { name: 'attr2' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: { attributes: mockAttributes } }),
            });

            const attributes = await schemaService.getAttributes('TestEntity');
            expect(fetch).toHaveBeenCalledWith('/api/schema/entity/TestEntity');
            expect(attributes).toEqual(['attr1', 'attr2']);
        });

        it('should fallback to MVP API if evolved API fails', async () => {
            fetch.mockImplementationOnce(() => Promise.reject(new Error("Evolved API failed"))) // Evolved API fails
                 .mockResolvedValueOnce({ // MVP API success
                     ok: true,
                     json: async () => (['mvp_attr1', 'mvp_attr2']),
                 });

            const attributes = await schemaService.getAttributes('TestEntity');
            expect(fetch).toHaveBeenCalledWith('/api/schema/entity/TestEntity'); // Called evolved
            expect(fetch).toHaveBeenCalledWith('/api/schema/TestEntity/attributes'); // Called MVP
            expect(attributes).toEqual(['mvp_attr1', 'mvp_attr2']);
        });

        it('should return default attributes if all APIs fail', async () => {
            fetch.mockImplementation(() => Promise.reject(new Error("API failed"))); // All fetch calls fail

            const attributes = await schemaService.getAttributes('TestEntity');
            expect(attributes).toEqual(['id', 'nome', 'email']);
        });

        it('should use cache for attributes', async () => {
            const mockAttributes = [{ name: 'cached_attr' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: { attributes: mockAttributes } }),
            });

            await schemaService.getAttributes('TestEntityCached'); // First call - populates cache
            fetch.mockClear(); // Clear fetch mocks for the second call
            const attributes = await schemaService.getAttributes('TestEntityCached'); // Second call - should hit cache

            expect(fetch).not.toHaveBeenCalled();
            expect(attributes).toEqual(['cached_attr']);
        });
    });

    describe('getEntitySchema', () => {
        it('should fetch full entity schema', async () => {
            const mockSchema = { entityType: 'TestSchema', attributes: [{name: 'prop1'}] };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockSchema }),
            });

            const schema = await schemaService.getEntitySchema('TestSchema');
            expect(fetch).toHaveBeenCalledWith('/api/schema/entity/TestSchema');
            expect(schema).toEqual(mockSchema);
        });

        it('should throw error if schema fetch is not ok', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 404 });
            await expect(schemaService.getEntitySchema('NotFoundSchema')).rejects.toThrow('Schema non trovato per NotFoundSchema (Status: 404)');
        });

        it('should use cache for entity schemas', async () => {
            const mockSchema = { entityType: 'TestSchemaCached', attributes: [{name: 'prop_cached'}] };
             fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockSchema }),
            });
            await schemaService.getEntitySchema('TestSchemaCached'); // Populate cache
            fetch.mockClear();
            const schema = await schemaService.getEntitySchema('TestSchemaCached'); // Should hit cache
            expect(fetch).not.toHaveBeenCalled();
            expect(schema).toEqual(mockSchema);
        });
    });

    describe('normalizeEntityType', () => {
        it('should return default for null/undefined input', () => {
            expect(schemaService.normalizeEntityType(null)).toBe('Contact');
            expect(schemaService.normalizeEntityType(undefined)).toBe('Contact');
        });
        it('should return first element for array input', () => {
            expect(schemaService.normalizeEntityType(['TypeA', 'TypeB'])).toBe('TypeA');
            expect(schemaService.normalizeEntityType([''])).toBe('Contact'); // Empty string in array results in 'Contact'
        });
        it('should return first element for comma-separated string', () => {
            expect(schemaService.normalizeEntityType('TypeA, TypeB')).toBe('TypeA');
        });
        it('should return string as is if no comma', () => {
            expect(schemaService.normalizeEntityType('SingleType')).toBe('SingleType');
        });
    });

    describe('getAttributeInfo', () => {
        it('should get attribute info from a cached schema', async () => {
            const mockSchema = {
                entityType: 'User',
                attributes: [
                    { name: 'username', type: 'string', required: true },
                    { name: 'email', type: 'email' }
                ]
            };
            // Pre-populate cache for getEntitySchema
            schemaService.cacheSchema('schema_User', mockSchema);

            const attrInfo = await schemaService.getAttributeInfo('User', 'username');
            expect(attrInfo).toEqual({ name: 'username', type: 'string', required: true });
        });

        it('should return basic info if attribute not in schema', async () => {
            const mockSchema = { entityType: 'User', attributes: [] };
            schemaService.cacheSchema('schema_User', mockSchema);
            const attrInfo = await schemaService.getAttributeInfo('User', 'nonexistent');
            expect(attrInfo.name).toBe('nonexistent');
            expect(attrInfo.type).toBe('string');
        });
    });

    describe('getAvailableEntityTypes', () => {
        it('should fetch available entity types from evolved API', async () => {
            const mockTypes = [{ entityType: 'TypeA' }, { entityType: 'TypeB' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockTypes }),
            });
            const types = await schemaService.getAvailableEntityTypes();
            expect(fetch).toHaveBeenCalledWith('/api/schema/entities');
            expect(types).toEqual(['TypeA', 'TypeB']);
        });

        it('should return default types if API fails', async () => {
            fetch.mockRejectedValueOnce(new Error('API unavailable'));
            const types = await schemaService.getAvailableEntityTypes();
            expect(types).toEqual(['Contact', 'Contatto', 'Cliente', 'Persona', 'TestEvoluzione']);
        });
    });

    describe('validateAttributeValue', () => {
        beforeEach(async () => {
            // Mock getAttributeInfo to control attribute details for validation tests
            schemaService.getAttributeInfo = jest.fn();
        });

        it('should validate required attribute', async () => {
            schemaService.getAttributeInfo.mockResolvedValue({ name: 'name', type: 'string', required: true });
            let result = await schemaService.validateAttributeValue('Test', 'name', '');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('name è richiesto');

            result = await schemaService.validateAttributeValue('Test', 'name', 'John');
            expect(result.isValid).toBe(true);
        });

        it('should validate email type', async () => {
            schemaService.getAttributeInfo.mockResolvedValue({ name: 'email', type: 'email', required: false });
            let result = await schemaService.validateAttributeValue('Test', 'email', 'invalid');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('email deve essere un email valido');

            result = await schemaService.validateAttributeValue('Test', 'email', 'valid@example.com');
            expect(result.isValid).toBe(true);
        });

        it('should validate number type', async () => {
            schemaService.getAttributeInfo.mockResolvedValue({ name: 'age', type: 'number', required: false });
            let result = await schemaService.validateAttributeValue('Test', 'age', 'not a number');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('age deve essere un numero');

            result = await schemaService.validateAttributeValue('Test', 'age', '25');
            expect(result.isValid).toBe(true);
        });
    });

    describe('Cache Management', () => {
        it('should clear caches', () => {
            schemaService.cacheSchema('schema_Test', {data: 'test'});
            schemaService.cacheAttributes('attributes_Test', ['attr']);
            expect(schemaService.getStats().schemaCacheSize).toBe(1);
            expect(schemaService.getStats().attributeCacheSize).toBe(1);

            schemaService.clearCache();
            expect(schemaService.getStats().schemaCacheSize).toBe(0);
            expect(schemaService.getStats().attributeCacheSize).toBe(0);
        });
    });
});
