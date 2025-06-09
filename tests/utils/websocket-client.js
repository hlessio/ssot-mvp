/**
 * WebSocket Client Helper per Test Pratici
 * Gestisce connessioni WebSocket per eventi real-time
 */

const WebSocket = require('ws');

class WebSocketClient {
    constructor(url = 'ws://localhost:3000') {
        this.url = url;
        this.ws = null;
        this.events = [];
        this.isConnected = false;
        this.listeners = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                
                this.ws.on('open', () => {
                    this.isConnected = true;
                    console.log(`🌐 WebSocket connesso a ${this.url}`);
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const event = JSON.parse(data.toString());
                        this.events.push({
                            ...event,
                            timestamp: Date.now()
                        });
                        
                        // Trigger listeners
                        this.listeners.forEach((callback, eventType) => {
                            if (eventType === 'all' || event.type === eventType) {
                                callback(event);
                            }
                        });
                        
                    } catch (error) {
                        console.warn('⚠️ Errore parsing WebSocket message:', error.message);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('❌ WebSocket error:', error.message);
                    reject(error);
                });

                this.ws.on('close', () => {
                    this.isConnected = false;
                    console.log('🔌 WebSocket disconnesso');
                });

                // Timeout connection after 5 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    // Listen for specific event types
    on(eventType, callback) {
        this.listeners.set(eventType, callback);
    }

    // Listen for all events
    onAll(callback) {
        this.listeners.set('all', callback);
    }

    // Remove listener
    off(eventType) {
        this.listeners.delete(eventType);
    }

    // Get all received events
    getEvents() {
        return [...this.events];
    }

    // Get events by type
    getEventsByType(eventType) {
        return this.events.filter(event => event.type === eventType);
    }

    // Clear events history
    clearEvents() {
        this.events = [];
    }

    // Wait for specific event
    async waitForEvent(eventType, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off('temp_listener');
                reject(new Error(`Timeout waiting for event: ${eventType}`));
            }, timeout);

            this.on('temp_listener', (event) => {
                if (event.type === eventType) {
                    clearTimeout(timeoutId);
                    this.off('temp_listener');
                    resolve(event);
                }
            });
        });
    }

    // Send message to server
    send(data) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(data));
        } else {
            throw new Error('WebSocket not connected');
        }
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            eventsReceived: this.events.length,
            url: this.url
        };
    }
}

module.exports = WebSocketClient;