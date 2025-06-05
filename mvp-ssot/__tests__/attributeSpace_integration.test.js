const EvolvedServer = require('../backend/server_evolved');
const WebSocket = require('ws');
const fetch = require('node-fetch'); // node-fetch for API calls in Node.js

// Helper function to mimic sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('AttributeSpace Evolved - Integration Test Suite', () => {
    let server;
    let wsClient;
    let receivedMessages;
    const testPort = 3002; // Use a different port for integration tests
    const serverUrl = `http://localhost:${testPort}`;
    const wsUrl = `ws://localhost:${testPort}`;

    beforeAll(async () => {
        server = new EvolvedServer();
        await server.start(testPort);
        await sleep(1000); // Allow server to stabilize
    });

    afterAll(async () => {
        if (server) {
            await server.stop();
        }
    });

    beforeEach(async () => {
        receivedMessages = [];
        wsClient = new WebSocket(wsUrl);

        await new Promise((resolve, reject) => {
            wsClient.on('open', resolve);
            wsClient.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    receivedMessages.push(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });
            wsClient.on('error', reject);
            setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });
    });

    afterEach(() => {
        if (wsClient) {
            wsClient.close();
        }
    });

    describe('Entity Event Pattern Matching', () => {
        it('should receive WebSocket notifications for entity creations', async () => {
            const response = await fetch(`${serverUrl}/api/entities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType: 'TestIntegrationEntity',
                    attributes: {
                        name: 'Integration Test Entity',
                        value: 'SomeValue'
                    }
                })
            });
            const result = await response.json();
            expect(response.status).toBe(201); // Check for successful creation
            expect(result.data.entityId).toBeDefined();

            await sleep(500); // Wait for WebSocket notifications

            const entityMessages = receivedMessages.filter(m => m.type === 'attributeChange');
            expect(entityMessages.length).toBeGreaterThan(0);
            // Add more specific assertions if needed, e.g., checking message content
            expect(entityMessages[0].data.entityType).toBe('TestIntegrationEntity');
            expect(entityMessages[0].data.attributeName).toBe('name'); // Or another attribute based on creation
        });
    });

    describe('Relation Event Pattern Matching', () => {
        it('should receive WebSocket notifications for relation changes', async () => {
            // This test assumes that RelationEngine would call attributeSpace.notifyRelationChange
            // We simulate this directly for now.
            if (server.attributeSpace) {
                server.attributeSpace.notifyRelationChange({
                    relationType: 'TestIntegrationRelation',
                    sourceEntityId: 'source-integ-entity',
                    targetEntityId: 'target-integ-entity',
                    attributeName: 'integrationAttribute',
                    newValue: 'integrationValue',
                    changeType: 'create'
                });

                await sleep(200); // Wait for propagation

                const relationMessages = receivedMessages.filter(m => m.type === 'relationChange');
                expect(relationMessages.length).toBeGreaterThan(0);
                expect(relationMessages[0].data.relationType).toBe('TestIntegrationRelation');
            } else {
                throw new Error('AttributeSpace not available in server for relation test');
            }
        });
    });

    describe('Notification Batching Integration', () => {
        it('should batch multiple rapid notifications', async () => {
            if (server.attributeSpace) {
                // Default batchDelay in server_evolved is 30ms
                // Override for testing if necessary, or use server's default.
                // For this test, we assume server.attributeSpace.config.batchDelay is suitable.

                for (let i = 0; i < 5; i++) {
                    server.attributeSpace.notifyChange({
                        entityId: 'batch-integ-test-entity',
                        attributeName: 'counter',
                        newValue: i,
                        changeType: 'update'
                    });
                }

                await sleep(server.attributeSpace.config.batchDelay + 70); // Wait for batch processing + buffer

                const batchMessages = receivedMessages.filter(m =>
                    m.type === 'attributeChange' &&
                    m.data.entityId === 'batch-integ-test-entity'
                );

                // Expecting 1 message if all updates to 'counter' are batched
                expect(batchMessages.length).toBeLessThan(5);
                expect(batchMessages.length).toBeGreaterThanOrEqual(1); // Should receive at least one
                if(batchMessages.length > 0) {
                    expect(batchMessages[0].data.newValue).toBe(4); // Last value should be present
                    expect(batchMessages[0].data.batchCount).toBeGreaterThanOrEqual(1); // batchCount might be 1 if values are different
                }

            } else {
                throw new Error('AttributeSpace not available for batching test');
            }
        });
    });

    describe('Audit Pattern Logging', () => {
        it('should log audit messages for specific attribute changes', async () => {
            const originalLog = console.log;
            let auditLogs = [];
            console.log = (...args) => {
                const message = args.join(' ');
                if (message.includes('🔒 AUDIT:')) {
                    auditLogs.push(message);
                }
                originalLog.apply(console, args); // Still log to console for visibility
            };

            if (server.attributeSpace) {
                server.attributeSpace.notifyChange({
                    entityId: 'audit-user-123',
                    attributeName: 'user_password', // This should trigger audit log
                    newValue: 'new-secure-password',
                    changeType: 'update'
                });
                server.attributeSpace.notifyChange({
                    entityId: 'audit-user-123',
                    attributeName: 'email', // This should not
                    newValue: 'user@example.com',
                    changeType: 'update'
                });

                await sleep(100); // Wait for processing
            }

            console.log = originalLog; // Restore original console.log

            expect(auditLogs.length).toBeGreaterThan(0);
            expect(auditLogs[0]).toContain('user_password');
            expect(auditLogs.some(log => log.includes('email'))).toBe(false); // email should not be audited by this pattern
        });
    });
});
