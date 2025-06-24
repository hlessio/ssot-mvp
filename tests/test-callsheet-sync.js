#!/usr/bin/env node

/**
 * Test Script per Callsheet + Contact Card Real-time Sync
 * 
 * Questo script testa che:
 * 1. ModuleRelationService API funzioni
 * 2. EntityService API funzioni  
 * 3. WebSocket invii messaggi correttamente
 * 4. I messaggi abbiano il formato corretto
 */

const http = require('http');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

class CallsheetSyncTester {
    constructor() {
        this.websocket = null;
        this.testResults = [];
        this.moduleId = '00482728-3590-4d2a-8dea-af949107e980';
    }

    async runAllTests() {
        console.log('🧪 Starting Callsheet + Contact Card Sync Tests\n');
        
        try {
            // Test 1: Backend API
            await this.testBackendAPI();
            
            // Test 2: WebSocket Connection
            await this.testWebSocketConnection();
            
            // Test 3: Real-time Sync
            await this.testRealtimeSync();
            
            // Print results
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            if (this.websocket) {
                this.websocket.close();
            }
        }
    }

    async testBackendAPI() {
        console.log('📡 Testing Backend API...');
        
        // Test ModuleRelationService
        try {
            const moduleData = await this.httpRequest(`/api/modules/${this.moduleId}/members`);
            this.addResult('✅ ModuleRelationService API', `Found ${moduleData.count} members`);
        } catch (error) {
            this.addResult('❌ ModuleRelationService API', error.message);
        }
        
        // Test EntityService
        try {
            const entitiesData = await this.httpRequest('/api/entities?entityType=Persona');
            this.addResult('✅ EntityService API', `Found ${entitiesData.length} Persona entities`);
        } catch (error) {
            this.addResult('❌ EntityService API', error.message);
        }
    }

    async testWebSocketConnection() {
        console.log('🔌 Testing WebSocket Connection...');
        
        return new Promise((resolve, reject) => {
            this.websocket = new WebSocket(WS_URL);
            
            const timeout = setTimeout(() => {
                this.addResult('❌ WebSocket Connection', 'Connection timeout');
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
            
            this.websocket.onopen = () => {
                clearTimeout(timeout);
                this.addResult('✅ WebSocket Connection', 'Connected successfully');
                resolve();
            };
            
            this.websocket.onerror = (error) => {
                clearTimeout(timeout);
                this.addResult('❌ WebSocket Connection', `Error: ${error.message}`);
                reject(error);
            };
        });
    }

    async testRealtimeSync() {
        console.log('🔄 Testing Real-time Sync...');
        
        return new Promise(async (resolve) => {
            let messageReceived = false;
            
            // Listen for WebSocket messages
            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', message);
                    
                    if (message.type === 'change' && message.data && message.data.newValue) {
                        messageReceived = true;
                        this.addResult('✅ Real-time Sync', `Received change: ${message.attributeName}=${message.data.newValue}`);
                    }
                } catch (error) {
                    this.addResult('❌ Real-time Sync', `Message parse error: ${error.message}`);
                }
            };
            
            // Create a test entity and update it
            try {
                const testEntity = await this.httpRequest('/api/entities', 'POST', {
                    entityType: 'TestSync',
                    nome: 'Sync Test Entity',
                    value: 'initial'
                });
                
                console.log('📝 Created test entity:', testEntity.id);
                
                // Update the entity to trigger WebSocket message
                setTimeout(async () => {
                    try {
                        await this.httpRequest(`/api/entity/${testEntity.id}/attribute`, 'PUT', {
                            attributeName: 'value',
                            value: 'updated-for-sync-test'
                        });
                        
                        console.log('📝 Updated test entity attribute');
                        
                        // Wait for WebSocket message
                        setTimeout(() => {
                            if (!messageReceived) {
                                this.addResult('❌ Real-time Sync', 'No WebSocket message received within timeout');
                            }
                            resolve();
                        }, 2000);
                        
                    } catch (error) {
                        this.addResult('❌ Real-time Sync', `Update failed: ${error.message}`);
                        resolve();
                    }
                }, 1000);
                
            } catch (error) {
                this.addResult('❌ Real-time Sync', `Entity creation failed: ${error.message}`);
                resolve();
            }
        });
    }

    async httpRequest(path, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (jsonData.success) {
                            resolve(jsonData.data || jsonData);
                        } else {
                            reject(new Error(jsonData.error || 'API call failed'));
                        }
                    } catch (error) {
                        reject(new Error(`Parse error: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request error: ${error.message}`));
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            
            req.end();
        });
    }

    addResult(test, result) {
        this.testResults.push({ test, result });
        console.log(`  ${test}: ${result}`);
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('=' .repeat(50));
        
        const passed = this.testResults.filter(r => r.test.startsWith('✅')).length;
        const failed = this.testResults.filter(r => r.test.startsWith('❌')).length;
        
        this.testResults.forEach(({ test, result }) => {
            console.log(`${test}: ${result}`);
        });
        
        console.log('=' .repeat(50));
        console.log(`Total: ${this.testResults.length} tests, ${passed} passed, ${failed} failed`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed! Callsheet sync should work correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the issues above.');
        }
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new CallsheetSyncTester();
    tester.runAllTests().catch(console.error);
}

module.exports = CallsheetSyncTester;