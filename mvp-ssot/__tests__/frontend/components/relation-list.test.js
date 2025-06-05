/**
 * @jest-environment jsdom
 */

// Define mocks that will be set on window
const mockRelationService = {
    getRelatedEntities: jest.fn(),
    createRelation: jest.fn(),
    deleteRelation: jest.fn(),
    onRelationEvent: jest.fn(),
    offRelationEvent: jest.fn(),
};
const mockWebSocketService = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
};
const mockEntityService = { getEntity: jest.fn() };
const mockModuleDefinitionService = { getDefinition: jest.fn() };

// Set mocks on window BEFORE requiring the component
window.RelationService = mockRelationService;
window.WebSocketService = mockWebSocketService;
window.EntityService = mockEntityService;
window.ModuleDefinitionService = mockModuleDefinitionService;

// Now require the component, it will pick up the window mocks
require('../../../frontend/components/relation-list');

describe('RelationListComponent', () => {
    let relationList;
    // Mocks are defined in the outer scope and assigned to window.
    // These variables (mockRelationService, etc.) are the direct references to those mocks.
    const mockRelatedEntities = [
        {
            relation: { id: 'rel1', relationType: 'KNOWS', created: new Date().toISOString() },
            relatedEntity: { id: 'ent2', entityType: 'Person', name: 'Jane Doe' }
        },
        {
            relation: { id: 'rel2', relationType: 'WORKS_FOR', created: new Date().toISOString() },
            relatedEntity: { id: 'ent3', entityType: 'Company', name: 'Acme Corp' }
        },
    ];

    beforeEach(() => {
        // Reset mock functions' state using the correctly named global mock variables
        mockRelationService.getRelatedEntities.mockResolvedValue([...mockRelatedEntities]);
        mockRelationService.createRelation.mockResolvedValue({ id: 'newRel' });
        mockRelationService.deleteRelation.mockResolvedValue(true);
        mockRelationService.onRelationEvent.mockClear();
        mockRelationService.offRelationEvent.mockClear();
        mockWebSocketService.subscribe.mockClear();
        mockWebSocketService.unsubscribe.mockClear();
        mockEntityService.getEntity.mockClear();
        mockModuleDefinitionService.getDefinition.mockClear();

        fetch.mockClear(); // Assuming fetch is also used and mocked globally or per suite

        relationList = document.createElement('relation-list');

        // Suppress console.error for cleaner test output during expected error tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        if (relationList.parentNode) {
            relationList.parentNode.removeChild(relationList);
        }
        // Restore console
        console.error.mockRestore();
        console.warn.mockRestore();
    });

    describe('Initialization and Attribute Handling', () => {
        it('should set default properties if attributes are not provided', () => {
            expect(relationList.relationType).toBeNull();
            expect(relationList.direction).toBe('both');
            expect(relationList.maxItems).toBe(50);
            expect(relationList.showActions).toBe(true);
        });

        it('should update properties when attributes change', () => {
            relationList.setAttribute('relation-type', 'FRIENDS');
            relationList.setAttribute('direction', 'out');
            relationList.setAttribute('max-items', '10');
            relationList.setAttribute('show-actions', 'false');

            expect(relationList.relationType).toBe('FRIENDS');
            expect(relationList.direction).toBe('out');
            expect(relationList.maxItems).toBe(10);
            expect(relationList.showActions).toBe(false);
        });

        it('should call loadRelatedEntities when source-entity-id changes and component is connected', () => {
            const spy = jest.spyOn(relationList, 'loadRelatedEntities');
            document.body.appendChild(relationList); // to make it connected
            relationList.setAttribute('source-entity-id', 'ent1');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Data Loading and Rendering', () => {
        it('should render loading state initially then content', async () => {
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList); // Triggers connectedCallback -> loadRelatedEntities

            expect(relationList.shadowRoot.querySelector('.loading')).not.toBeNull();

            // Wait for loadRelatedEntities to complete
            await Promise.resolve(); // Allow microtasks to run for async load
            await Promise.resolve(); // Ensure all promises complete

            expect(mockRelationService.getRelatedEntities).toHaveBeenCalledWith('ent1', null, 'both');
            expect(relationList.shadowRoot.querySelector('.loading')).toBeNull();
            expect(relationList.shadowRoot.querySelectorAll('.entity-item').length).toBe(mockRelatedEntities.length);
        });

        it('should render error state if loading fails', async () => {
            mockRelationService.getRelatedEntities.mockRejectedValueOnce(new Error('Failed to fetch'));
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList);

            await Promise.resolve();
            await Promise.resolve();

            expect(relationList.shadowRoot.querySelector('.error')).not.toBeNull();
            expect(relationList.shadowRoot.querySelector('.error').textContent).toContain('Failed to fetch');
        });

        it('should render empty state if no related entities are found', async () => {
            mockRelationService.getRelatedEntities.mockResolvedValueOnce([]);
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList);

            await Promise.resolve();
            await Promise.resolve();
            await new Promise(resolve => queueMicrotask(resolve)); // Ensure DOM updates from final render

            expect(relationList.shadowRoot.querySelector('.empty')).not.toBeNull();
            expect(relationList.shadowRoot.querySelector('.empty').textContent).toContain('Nessuna entità correlata trovata');
        });

        it('should render entity items correctly', async () => {
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList);
            await Promise.resolve(); await Promise.resolve();

            const items = relationList.shadowRoot.querySelectorAll('.entity-item');
            expect(items.length).toBe(2);
            expect(items[0].querySelector('.entity-name').textContent).toBe('Jane Doe');
            expect(items[0].querySelector('.relation-type').textContent).toBe('KNOWS');
            expect(items[1].querySelector('.entity-name').textContent).toBe('Acme Corp');
        });
    });

    describe('Actions', () => {
        beforeEach(async () => {
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList);
            await Promise.resolve(); await Promise.resolve(); // Wait for initial load
        });

        it('should dispatch create-relation-request on create button click', () => {
            const spy = jest.spyOn(relationList, 'dispatchEvent');
            const createButton = relationList.shadowRoot.querySelector('button[data-action="create"]');
            expect(createButton).not.toBeNull();
            createButton.click();
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'create-relation-request',
                detail: { sourceEntityId: 'ent1', relationType: null }
            }));
        });

        it('should call loadRelatedEntities on refresh button click', () => {
            const spy = jest.spyOn(relationList, 'loadRelatedEntities');
            const refreshButton = relationList.shadowRoot.querySelector('button[data-action="refresh"]');
            expect(refreshButton).not.toBeNull();
            refreshButton.click();
            expect(spy).toHaveBeenCalled();
        });

        it('should call deleteRelation on delete button click after confirm', async () => {
            window.confirm = jest.fn().mockReturnValue(true); // Mock confirm
            const deleteButton = relationList.shadowRoot.querySelector('button[data-action="delete"]');
            expect(deleteButton).not.toBeNull();

            const relationId = deleteButton.getAttribute('data-relation-id');
            deleteButton.click();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockRelationService.deleteRelation).toHaveBeenCalledWith(relationId);
        });

        it('should dispatch edit-relation-request on edit button click', () => {
            const spy = jest.spyOn(relationList, 'dispatchEvent');
            const editButton = relationList.shadowRoot.querySelector('button[data-action="edit"]');
            expect(editButton).not.toBeNull();
            const relationId = editButton.getAttribute('data-relation-id');
            editButton.click();
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'edit-relation-request',
                detail: { relationId }
            }));
        });

        it('should dispatch entity-navigate on item click', () => {
            const spy = jest.spyOn(relationList, 'dispatchEvent');
            const entityItemContent = relationList.shadowRoot.querySelector('.entity-content');
            expect(entityItemContent).not.toBeNull();
            entityItemContent.click();

            const entityId = entityItemContent.closest('.entity-item').getAttribute('data-entity-id');
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'entity-navigate',
                detail: { entityId }
            }));
        });
    });

    describe('WebSocket Integration', () => {
        it('should setup WebSocket subscription on connectedCallback', () => {
            // connectedCallback is called when appended to DOM in beforeEach
            expect(mockRelationService.onRelationEvent).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should reload data if a relevant relation event occurs', () => {
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList); // Calls connectedCallback, which might call loadRelatedEntities

            const loadSpy = jest.spyOn(relationList, 'loadRelatedEntities');
            loadSpy.mockClear(); // Clear any calls made during setup/connection

            // Simulate receiving a relevant WebSocket message
            // Ensure onRelationEvent has been called to get the callback
            expect(mockRelationService.onRelationEvent).toHaveBeenCalled();
            const callback = mockRelationService.onRelationEvent.mock.calls[0][0];

            callback('created', { data: { sourceEntityId: 'ent1' } });
            expect(loadSpy).toHaveBeenCalledTimes(1); // Should be called once due to the event
        });

        it('should not reload data if event is not relevant', () => {
            const loadSpy = jest.spyOn(relationList, 'loadRelatedEntities');
            relationList.setAttribute('source-entity-id', 'ent1');
            document.body.appendChild(relationList);

            loadSpy.mockClear(); // Clear calls from initial load

            const callback = mockRelationService.onRelationEvent.mock.calls[0][0];
            callback('created', { data: { sourceEntityId: 'otherEntity' } });
            expect(loadSpy).not.toHaveBeenCalled();
        });

        it('should teardown WebSocket subscription on disconnectedCallback', () => {
            document.body.appendChild(relationList); // Call connectedCallback
            relationList.disconnectedCallback();
            expect(mockRelationService.offRelationEvent).toHaveBeenCalled();
        });
    });
});
