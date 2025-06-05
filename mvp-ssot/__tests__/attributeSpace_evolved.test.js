const AttributeSpace = require('../backend/core/attributeSpace_evolved');

// Helper function to mimic sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('AttributeSpace Evolved - Full Test Suite', () => {
    describe('Initialization and Configuration', () => {
        it('should initialize with default configuration', () => {
            const attributeSpace = new AttributeSpace();
            expect(attributeSpace.config.enableBatching).toBe(true);
            expect(attributeSpace.config.batchDelay).toBe(50);
        });

        it('should initialize with custom configuration', () => {
            const attributeSpace = new AttributeSpace({
                enableBatching: false,
                batchDelay: 100,
                maxLoopDetection: 5,
                enableLogging: false
            });
            expect(attributeSpace.config.enableBatching).toBe(false);
            expect(attributeSpace.config.batchDelay).toBe(100);
            expect(attributeSpace.config.maxLoopDetection).toBe(5);
        });
    });

    describe('Advanced Pattern Matching', () => {
        let attributeSpace;
        let notifications;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({ enableBatching: false });
            notifications = [];
        });

        it('should match patterns for entityType, attributeName, and changeType', () => {
            attributeSpace.subscribe({
                entityType: 'Cliente',
                attributeName: 'email'
            }, (details) => {
                notifications.push({ sub: 'cliente-email', details });
            });

            attributeSpace.subscribe({
                attributeName: 'nome'
            }, (details) => {
                notifications.push({ sub: 'any-nome', details });
            });

            attributeSpace.subscribe({
                changeType: 'create'
            }, (details) => {
                notifications.push({ sub: 'create-only', details });
            });

            attributeSpace.notifyChange({
                entityType: 'Cliente',
                entityId: 'cliente-123',
                attributeName: 'email',
                newValue: 'test@email.com',
                changeType: 'update'
            });

            attributeSpace.notifyChange({
                entityType: 'Persona',
                entityId: 'persona-456',
                attributeName: 'nome',
                newValue: 'Mario Rossi',
                changeType: 'create'
            });

            const clienteEmailNotifications = notifications.filter(n => n.sub === 'cliente-email');
            const anyNomeNotifications = notifications.filter(n => n.sub === 'any-nome');
            const createOnlyNotifications = notifications.filter(n => n.sub === 'create-only');

            expect(clienteEmailNotifications.length).toBe(1);
            expect(anyNomeNotifications.length).toBe(1);
            expect(createOnlyNotifications.length).toBe(1);
        });
    });

    describe('Wildcard Pattern Matching', () => {
        let attributeSpace;
        let notifications;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({ enableBatching: false });
            notifications = [];
        });

        it('should correctly match wildcard patterns', () => {
            attributeSpace.subscribe({
                attributeNamePattern: 'indirizzo_*'
            }, (details) => {
                notifications.push({ type: 'indirizzo', attributeName: details.attributeName });
            });

            attributeSpace.subscribe({
                attributeNamePattern: 'contatto_*'
            }, (details) => {
                notifications.push({ type: 'contatto', attributeName: details.attributeName });
            });

            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'indirizzo_via',
                newValue: 'Via Roma 1'
            });
            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'indirizzo_citta',
                newValue: 'Milano'
            });
            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'contatto_email',
                newValue: 'test@test.com'
            });
            attributeSpace.notifyChange({
                entityId: 'entity-1',
                attributeName: 'altro_campo',
                newValue: 'valore'
            });

            const indirizzoNotifications = notifications.filter(n => n.type === 'indirizzo');
            const contattoNotifications = notifications.filter(n => n.type === 'contatto');

            expect(indirizzoNotifications.length).toBe(2);
            expect(contattoNotifications.length).toBe(1);
            expect(notifications.length).toBe(3);
        });
    });

    describe('Notification Batching', () => {
        let attributeSpace;
        let notifications;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({
                enableBatching: true,
                batchDelay: 100
            });
            notifications = [];
        });

        it('should batch notifications correctly', async () => {
            attributeSpace.subscribe({
                entityId: 'batch-test'
            }, (details) => {
                notifications.push({
                    attributeName: details.attributeName,
                    newValue: details.newValue,
                    batchCount: details.batchCount
                });
            });

            attributeSpace.notifyChange({
                entityId: 'batch-test',
                attributeName: 'campo1',
                newValue: 'valore1'
            });
            attributeSpace.notifyChange({
                entityId: 'batch-test',
                attributeName: 'campo1',
                newValue: 'valore1-updated'
            });
            attributeSpace.notifyChange({
                entityId: 'batch-test',
                attributeName: 'campo2',
                newValue: 'valore2'
            });

            await sleep(150); // Wait for batch processing

            expect(notifications.length).toBeGreaterThan(0);

            const campo1Notifications = notifications.filter(n => n.attributeName === 'campo1');
            const campo2Notifications = notifications.filter(n => n.attributeName === 'campo2');

            expect(campo1Notifications.length).toBe(1);
            expect(campo1Notifications[0].batchCount).toBeGreaterThanOrEqual(2);
            expect(campo1Notifications[0].newValue).toBe('valore1-updated');
            expect(campo2Notifications.length).toBe(1); // campo2 should also be there
        });
    });

    describe('Relation Event Management', () => {
        let attributeSpace;
        let notifications;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({ enableBatching: false });
            notifications = [];
        });

        it('should handle relation events correctly', () => {
            attributeSpace.subscribe({
                type: 'relation',
                relationType: 'Conosce'
            }, (details) => {
                notifications.push({ type: 'relation-conosce', details });
            });

            attributeSpace.subscribe({
                type: 'relation'
            }, (details) => {
                notifications.push({ type: 'all-relations', details });
            });

            attributeSpace.notifyRelationChange({
                relationType: 'Conosce',
                sourceEntityId: 'persona-1',
                targetEntityId: 'persona-2',
                attributeName: 'dataIncontro',
                newValue: '2024-01-15',
                changeType: 'create'
            });

            attributeSpace.notifyRelationChange({
                relationType: 'Lavora',
                sourceEntityId: 'persona-1',
                targetEntityId: 'azienda-1',
                attributeName: 'ruolo',
                newValue: 'Sviluppatore',
                changeType: 'update'
            });

            const conosceNotifications = notifications.filter(n => n.type === 'relation-conosce');
            const allRelationNotifications = notifications.filter(n => n.type === 'all-relations');

            expect(conosceNotifications.length).toBe(1);
            expect(allRelationNotifications.length).toBe(2);
        });
    });

    describe('Custom Pattern Matching', () => {
        let attributeSpace;
        let notifications;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({ enableBatching: false });
            notifications = [];
        });

        it('should work with custom pattern functions', () => {
            attributeSpace.subscribe({
                custom: (details) => typeof details.newValue === 'number' && details.newValue > 100
            }, (details) => {
                notifications.push({ type: 'big-numbers', value: details.newValue });
            });

            attributeSpace.subscribe({
                custom: (details) => typeof details.newValue === 'string' &&
                                   details.newValue.includes('@') &&
                                   details.attributeName.toLowerCase().includes('email')
            }, (details) => {
                notifications.push({ type: 'valid-emails', value: details.newValue });
            });

            attributeSpace.notifyChange({ entityId: 'test-1', attributeName: 'valore', newValue: 150 });
            attributeSpace.notifyChange({ entityId: 'test-1', attributeName: 'valore', newValue: 50 });
            attributeSpace.notifyChange({ entityId: 'test-1', attributeName: 'email', newValue: 'test@email.com' });
            attributeSpace.notifyChange({ entityId: 'test-1', attributeName: 'email', newValue: 'invalid-email' });

            const bigNumberNotifications = notifications.filter(n => n.type === 'big-numbers');
            const emailNotifications = notifications.filter(n => n.type === 'valid-emails');

            expect(bigNumberNotifications.length).toBe(1);
            expect(emailNotifications.length).toBe(1);
            expect(bigNumberNotifications[0].value).toBe(150);
            expect(emailNotifications[0].value).toBe('test@email.com');
        });
    });

    describe('Infinite Loop Prevention', () => {
        it('should prevent infinite loops and drop notifications', () => {
            const attributeSpace = new AttributeSpace({
                enableBatching: false,
                maxLoopDetection: 3
            });
            let notificationCount = 0;

            attributeSpace.subscribe({
                entityId: 'loop-test'
            }, (details) => {
                notificationCount++;
                if (notificationCount < 10) { // Safety limit for test
                    attributeSpace.notifyChange({
                        entityId: 'loop-test',
                        attributeName: `loop-${notificationCount}`,
                        newValue: `value-${notificationCount}`
                    });
                }
            });

            attributeSpace.notifyChange({
                entityId: 'loop-test',
                attributeName: 'start-loop',
                newValue: 'initial-value'
            });

            const stats = attributeSpace.getStats();
            expect(stats.droppedNotifications).toBeGreaterThan(0);
            expect(notificationCount).toBeLessThan(10);
            expect(notificationCount).toBeGreaterThanOrEqual(attributeSpace.config.maxLoopDetection);
        });
    });

    describe('Backward Compatibility MVP', () => {
        let attributeSpace;
        let notifications;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({ enableBatching: false });
            notifications = [];
        });

        it('should be backward compatible with MVP subscribeLegacy', () => {
            const subscriptionId = attributeSpace.subscribeLegacy((details) => {
                notifications.push(details);
            });

            attributeSpace.notifyChange({
                entityId: 'test-entity',
                attributeName: 'test-attr',
                newValue: 'test-value'
            });

            expect(notifications.length).toBe(1);
            expect(notifications[0].entityId).toBe('test-entity');
            expect(notifications[0].attributeName).toBe('test-attr');

            attributeSpace.unsubscribe(subscriptionId);
            attributeSpace.notifyChange({
                entityId: 'test-entity-2',
                attributeName: 'test-attr-2',
                newValue: 'test-value-2'
            });
            expect(notifications.length).toBe(1); // Should not increase
        });
    });

    describe('Performance and Statistics', () => {
        let attributeSpace;

        beforeEach(() => {
            attributeSpace = new AttributeSpace({ enableBatching: false });
        });

        it('should track statistics correctly', () => {
            for (let i = 0; i < 5; i++) {
                attributeSpace.subscribe({
                    entityType: `Type${i}`
                }, () => {});
            }

            for (let i = 0; i < 10; i++) {
                attributeSpace.notifyChange({
                    entityType: `Type${i % 3}`,
                    entityId: `entity-${i}`,
                    attributeName: `attr-${i}`,
                    newValue: `value-${i}`
                });
            }

            const stats = attributeSpace.getStats();
            expect(stats.activeSubscriptions).toBe(5);
            expect(stats.totalNotifications).toBe(10);
            expect(stats.totalSubscriptions).toBeGreaterThanOrEqual(5);

            const activeSubscriptions = attributeSpace.getActiveSubscriptions();
            expect(activeSubscriptions.length).toBe(5);
            expect(activeSubscriptions[0]).toHaveProperty('id');
            expect(activeSubscriptions[0]).toHaveProperty('matchCount');
        });
    });
});
