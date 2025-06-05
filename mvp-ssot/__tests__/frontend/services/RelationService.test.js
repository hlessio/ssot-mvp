/**
 * @jest-environment jsdom
 */

// Mock global fetch
global.fetch = jest.fn();

// Mock WebSocketService
const mockWebSocketService = {
    subscribe: jest.fn(),
    // Add other methods if RelationService uses them
};
// Make it available on window for RelationService to pick up if it looks for it there
// This is a common pattern for singletons that depend on other singletons.
window.WebSocketService = mockWebSocketService;

// Require the service, which attaches an instance to window.RelationService
// This initial require might use the above mock if RelationService calls initialize() at module load time.
require('../../../frontend/services/RelationService');


describe('RelationService', () => {
    let relationService; // This will hold the instance from window.RelationService
    let originalConsoleError; // To spy/mute console.error for specific tests

    beforeAll(() => {
        originalConsoleError = console.error;
    });

    afterAll(() => {
        console.error = originalConsoleError; // Restore console.error
    });

    beforeEach(() => {
        // Reset mocks before each test
        fetch.mockClear();
        mockWebSocketService.subscribe.mockClear();

        // To get a "fresh" instance of the singleton for each test,
        // delete from require cache and re-require the module.
        delete require.cache[require.resolve('../../../frontend/services/RelationService')];
        // Ensure the mock WebSocketService is on window *before* re-requiring
        window.WebSocketService = mockWebSocketService;
        require('../../../frontend/services/RelationService');
        relationService = window.RelationService;

        // Initialize with the mock WebSocketService for each test instance
        relationService.initialize(mockWebSocketService);
        relationService.clearCache(); // Clear cache for test isolation
    });

    describe('Initialization', () => {
        it('should subscribe to WebSocket relation events on initialize', () => {
            // initialize is called in beforeEach
            expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('relation-created', expect.any(Function));
            expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('relation-updated', expect.any(Function));
            expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('relation-deleted', expect.any(Function));
        });
    });

    describe('CRUD Operations', () => {
        it('createRelation should make a POST request and return relation data', async () => {
            const mockRelation = { id: 'rel1', type: 'KNOWS', source: 'ent1', target: 'ent2' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockRelation }),
            });

            const newRelation = await relationService.createRelation('KNOWS', 'ent1', 'ent2', { since: '2023' });
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    relationType: 'KNOWS',
                    sourceEntityId: 'ent1',
                    targetEntityId: 'ent2',
                    attributes: { since: '2023' },
                }),
            });
            expect(newRelation).toEqual(mockRelation);
        });

        it('createRelation should throw error on API failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: "Server Error" }),
            });
            console.error = jest.fn(); // Suppress console.error for this test
            await expect(relationService.createRelation('FAILS', 'ent1', 'ent2'))
                .rejects.toThrow('Server Error');
            expect(console.error).toHaveBeenCalled(); // Check if it logged an error
        });

        it('findRelations should make a GET request and return relations', async () => {
            const mockRelations = [{ id: 'rel1' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockRelations }),
            });
            const pattern = { sourceEntityId: 'ent1' };
            const relations = await relationService.findRelations(pattern);
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations?sourceEntityId=ent1`);
            expect(relations).toEqual(mockRelations);
        });

        it('getRelatedEntities should fetch related entities', async () => {
            const mockRelated = [{ entity: {id: 'ent2'}, relationType: 'KNOWS' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockRelated }),
            });
            const related = await relationService.getRelatedEntities('ent1', 'KNOWS', 'out');
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/entities/ent1/relations?direction=out&relationType=KNOWS`);
            expect(related).toEqual(mockRelated);
        });

        it('getRelation should fetch a specific relation by ID', async () => {
            const mockRelation = { id: 'relXYZ', type: 'CONNECTED_TO' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockRelation }),
            });
            const relation = await relationService.getRelation('relXYZ');
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations/relXYZ`);
            expect(relation).toEqual(mockRelation);
        });

        it('getRelation should throw if relation not found (404)', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 404 });
            console.error = jest.fn();
            await expect(relationService.getRelation('nonExistentRel'))
                .rejects.toThrow('Relazione non trovata: nonExistentRel');
        });

        it('updateRelationAttributes should make a PUT request', async () => {
            const updatedRel = { id: 'rel1', attributes: { status: 'updated' } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: updatedRel }),
            });
            const result = await relationService.updateRelationAttributes('rel1', { status: 'updated' });
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations/rel1`, expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ attributes: { status: 'updated' } }),
            }));
            expect(result).toEqual(updatedRel);
        });

        it('deleteRelation should make a DELETE request', async () => {
            fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // API might return empty body or status
            const result = await relationService.deleteRelation('relToDelete');
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations/relToDelete`, { method: 'DELETE' });
            expect(result).toBe(true);
        });
    });

    describe('Caching', () => {
        it('should cache findRelations results', async () => {
            const mockRelations = [{ id: 'rel1' }];
            fetch.mockResolvedValueOnce({ // First call
                ok: true,
                json: async () => ({ success: true, data: mockRelations }),
            });
            const pattern = { type: 'TEST_CACHE' };
            await relationService.findRelations(pattern); // Populate cache
            fetch.mockClear(); // Clear fetch mock for cache check

            const cachedRelations = await relationService.findRelations(pattern); // Should hit cache
            expect(fetch).not.toHaveBeenCalled();
            expect(cachedRelations).toEqual(mockRelations);
        });

        it('should invalidate cache for entity on createRelation', async () => {
            fetch.mockResolvedValue({ // Mock for createRelation and subsequent findRelations
                ok: true,
                json: async () => ({ success: true, data: { id: 'newRel', sourceEntityId: 's1', targetEntityId: 't1'} }),
            });
            // Prime the cache for s1
            await relationService.findRelations({ sourceEntityId: 's1' });
            fetch.mockClear();

            await relationService.createRelation('LINKS', 's1', 't1', {});

            // Now, findRelations for s1 should hit the API again due to cache invalidation
            await relationService.findRelations({ sourceEntityId: 's1' });
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations?sourceEntityId=s1`);
        });
    });

    describe('WebSocket Event Handling', () => {
        it('should call registered callbacks on relation event', () => {
            const callback = jest.fn();
            relationService.onRelationEvent(callback);

            // Simulate receiving a WebSocket message (this part needs the mock WebSocketService setup)
            // Find the function that RelationService passed to webSocketService.subscribe
            const subscribeCall = mockWebSocketService.subscribe.mock.calls.find(call => call[0] === 'relation-created');
            const messageHandler = subscribeCall[1]; // This is the handler in RelationService

            const mockEventData = { data: { relationId: 'relSocket', type: 'FRIENDS_WITH' } };
            messageHandler(mockEventData); // Manually call it

            expect(callback).toHaveBeenCalledWith('created', mockEventData);
        });
    });

    describe('getRelationStats', () => {
        it('should fetch relation statistics', async () => {
            const mockStats = { total: 100, types: { KNOWS: 50, WORKS_FOR: 50 } };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: mockStats }),
            });
            const stats = await relationService.getRelationStats();
            expect(fetch).toHaveBeenCalledWith(`${relationService.baseUrl}/api/relations/stats`);
            expect(stats).toEqual(mockStats);
        });
    });
});
