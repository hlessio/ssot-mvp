/**
 * @jest-environment jsdom
 */

// Mock global fetch
global.fetch = jest.fn();

// Require the service, which attaches an instance to window.EntityService
require('../../../frontend/services/EntityService');

describe('EntityService', () => {
    let entityService; // This will hold the instance from window.EntityService
    let originalConsoleError;
    let originalConsoleWarn;

    beforeAll(() => {
        originalConsoleError = console.error;
        originalConsoleWarn = console.warn;
    });

    afterAll(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    });

    beforeEach(() => {
        // Reset mocks before each test
        fetch.mockClear();
        console.error = jest.fn(); // Suppress console.error for specific tests
        console.warn = jest.fn();  // Suppress console.warn for specific tests

        // To get a "fresh" instance of the singleton for each test
        delete require.cache[require.resolve('../../../frontend/services/EntityService')];
        require('../../../frontend/services/EntityService');
        entityService = window.EntityService;

        entityService.clearAllCache(); // Clear caches for test isolation
    });

    describe('getEntity', () => {
        it('should fetch an entity from the evolved API if options are provided', async () => {
            const mockEntity = { id: 'ent1', name: 'Test Evolved' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockEntity }),
            });

            const entity = await entityService.getEntity('ent1', { includeReferences: true });
            expect(fetch).toHaveBeenCalledWith('/api/entity/ent1?includeReferences=true');
            expect(entity).toEqual(mockEntity);
        });

        it('should fallback to MVP API for getEntity if evolved API fails', async () => {
            fetch.mockImplementationOnce(() => Promise.reject(new Error("Evolved API failed")))
                 .mockResolvedValueOnce({ // MVP API
                    ok: true,
                    json: async () => ({ success: true, data: { id: 'ent1', name: 'Test MVP' } }),
                 });

            const entity = await entityService.getEntity('ent1', { includeReferences: true }); // Option triggers evolved attempt
            expect(fetch).toHaveBeenCalledWith('/api/entity/ent1?includeReferences=true'); // Evolved attempt
            expect(fetch).toHaveBeenCalledWith('/api/entity/ent1'); // MVP fallback
            expect(entity.name).toBe('Test MVP');
        });

        it('should fetch an entity from MVP API if no special options', async () => {
            const mockEntity = { id: 'ent1', name: 'Test MVP Basic' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockEntity }),
            });

            const entity = await entityService.getEntity('ent1');
            expect(fetch).toHaveBeenCalledWith('/api/entity/ent1');
            expect(entity).toEqual(mockEntity);
        });


        it('should use cache for getEntity', async () => {
            const mockEntity = { id: 'entCached', name: 'Cached Entity' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockEntity }),
            });
            await entityService.getEntity('entCached'); // Populate cache
            fetch.mockClear();
            const entity = await entityService.getEntity('entCached'); // Should hit cache
            expect(fetch).not.toHaveBeenCalled();
            expect(entity).toEqual(mockEntity);
        });

        it('should throw error if entity not found', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 404 });
            await expect(entityService.getEntity('notFoundId')).rejects.toThrow('Entità non trovata: notFoundId (Status: 404)');
        });
    });

    describe('getEntities', () => {
        it('should fetch entities of a specific type', async () => {
            const mockEntities = [{ id: 'e1', type: 'MyType' }, { id: 'e2', type: 'MyType' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockEntities }),
            });
            const entities = await entityService.getEntities('MyType');
            expect(fetch).toHaveBeenCalledWith('/api/entities/MyType');
            expect(entities).toEqual(mockEntities);
            // Check if individual entities are cached
            expect(entityService.entityCache.has('entity_e1')).toBe(true);
        });

        it('should use cache for getEntities list', async () => {
            const mockEntities = [{ id: 'eCacheList', type: 'CacheListType' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockEntities }),
            });
            await entityService.getEntities('CacheListType'); // Populate cache
            fetch.mockClear();
            const entities = await entityService.getEntities('CacheListType'); // Should hit cache
            expect(fetch).not.toHaveBeenCalled();
            expect(entities).toEqual(mockEntities);
        });
    });

    describe('createEntity', () => {
        it('should make a POST request and return created entity', async () => {
            const entityData = { name: 'New Entity', value: 'SomeValue' };
            const mockCreatedEntity = { id: 'newEnt1', ...entityData };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockCreatedEntity }),
            });

            const newEntity = await entityService.createEntity('NewType', entityData);
            expect(fetch).toHaveBeenCalledWith('/api/entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityType: 'NewType', ...entityData }),
            });
            expect(newEntity).toEqual(mockCreatedEntity);
            expect(entityService.entityCache.has(`entity_${newEntity.id}`)).toBe(true);
        });

        it('should throw error on createEntity API failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "Server Error Text" // Use text for more generic error body
            });
            await expect(entityService.createEntity('FailType', {}))
                .rejects.toThrow('Errore nella creazione entità (Status: 500)');
        });
    });

    describe('updateEntityAttribute', () => {
        it('should make a PUT request to update an attribute', async () => {
            const mockResponse = { success: true, message: "Attribute updated" };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            // Prime the cache
            entityService.cacheEntity('entity_entToUpdate', {id: 'entToUpdate', name: 'Old Name'});
            expect(entityService.entityCache.has('entity_entToUpdate')).toBe(true);

            const result = await entityService.updateEntityAttribute('entToUpdate', 'name', 'New Name');
            expect(fetch).toHaveBeenCalledWith('/api/entity/entToUpdate/attribute', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attributeName: 'name', value: 'New Name' }),
            });
            expect(result).toEqual(mockResponse);
            // Check cache invalidation
            expect(entityService.entityCache.has('entity_entToUpdate')).toBe(false);
        });
    });

    describe('deleteEntity', () => {
        it('should make a DELETE request and invalidate cache', async () => {
            fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // Assuming result isn't used from delete

            // Prime the cache
            entityService.cacheEntity('entity_entToDelete', {id: 'entToDelete', name: 'Old Name'});

            await entityService.deleteEntity('entToDelete');
            expect(fetch).toHaveBeenCalledWith('/api/entity/entToDelete', { method: 'DELETE' });
            expect(entityService.entityCache.has('entity_entToDelete')).toBe(false);
        });
    });

    describe('resolveEntityReferences', () => {
        it('should fetch resolved references for an entity', async () => {
            const mockReferences = { friend: { id: 'friend1', name: 'Friend Name'} };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockReferences }),
            });
            const references = await entityService.resolveEntityReferences('entWithRefs', ['friend']);
            expect(fetch).toHaveBeenCalledWith('/api/entity/entWithRefs/references?attributes=friend');
            expect(references).toEqual(mockReferences);
        });
    });

    describe('Cache Management', () => {
        it('clearTypeCache should remove specific entity list from cache', () => {
            entityService.entitiesListCache.set('entities_TypeToClear', { data: [], timestamp: Date.now() });
            expect(entityService.entitiesListCache.has('entities_TypeToClear')).toBe(true);
            entityService.clearTypeCache('TypeToClear');
            expect(entityService.entitiesListCache.has('entities_TypeToClear')).toBe(false);
        });

        it('clearAllCache should clear all caches', () => {
            entityService.entityCache.set('entity_e1', {data: {}, timestamp: Date.now()});
            entityService.entitiesListCache.set('entities_T1', {data: [], timestamp: Date.now()});
            entityService.clearAllCache();
            expect(entityService.entityCache.size).toBe(0);
            expect(entityService.entitiesListCache.size).toBe(0);
        });
    });
});
