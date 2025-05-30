const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Import dei moduli core implementati nelle fasi precedenti
const neo4jConnector = require('./neo4j_connector');
const neo4jDAO = require('./dao/neo4j_dao');
const SchemaManager_MVP = require('./core/schemaManager');
const EntityEngine_MVP = require('./core/entityEngine');
const AttributeSpace_MVP = require('./core/attributeSpace');

class MVPServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.clients = new Set(); // Set di client WebSocket connessi
        
        // Inizializzazione dei moduli core
        this.schemaManager = new SchemaManager_MVP();
        this.attributeSpace = new AttributeSpace_MVP();
        this.entityEngine = new EntityEngine_MVP(neo4jDAO, this.schemaManager, this.attributeSpace);
        
        this.setupMiddleware();
        this.setupWebSocket();
        this.setupRoutes();
        this.setupAttributeSpaceNotifications();
    }

    setupMiddleware() {
        // CORS per permettere al frontend di accedere al backend
        this.app.use(cors());
        
        // Parser JSON per le richieste
        this.app.use(express.json());
        
        // Servire i file statici del frontend
        this.app.use(express.static(path.join(__dirname, '../frontend')));
        
        // Log delle richieste per debug
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('Nuovo client WebSocket connesso');
            this.clients.add(ws);
            
            // Messaggio di benvenuto
            ws.send(JSON.stringify({
                type: 'connection',
                message: 'Connesso al server MVP SSOT Dinamico',
                timestamp: new Date().toISOString()
            }));
            
            // Gestione disconnessione
            ws.on('close', () => {
                console.log('Client WebSocket disconnesso');
                this.clients.delete(ws);
            });
            
            // Gestione errori
            ws.on('error', (error) => {
                console.error('Errore WebSocket:', error);
                this.clients.delete(ws);
            });
        });
    }

    setupAttributeSpaceNotifications() {
        // Integrazione con AttributeSpace per propagare le notifiche via WebSocket
        this.attributeSpace.subscribe((changeNotification) => {
            const message = JSON.stringify({
                type: 'attributeChange',
                data: changeNotification,
                timestamp: new Date().toISOString()
            });
            
            // Invia la notifica a tutti i client connessi
            this.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
            
            console.log('Notifica propagata a', this.clients.size, 'client:', changeNotification);
        });
    }

    setupRoutes() {
        // Endpoint per la root - serve la dashboard
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/index.html'));
        });

        // CRUD Endpoints per le entità

        // GET /api/entities/:entityType - Ottiene tutte le entità di un tipo
        this.app.get('/api/entities/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const entities = await this.entityEngine.getAllEntities(entityType);
                res.json({
                    success: true,
                    data: entities,
                    count: entities.length
                });
            } catch (error) {
                console.error('Errore nel recupero entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/entity/:entityId - Ottiene una specifica entità
        this.app.get('/api/entity/:entityId', async (req, res) => {
            try {
                const { entityId } = req.params;
                const entity = await this.entityEngine.getEntity(entityId);
                
                if (!entity) {
                    return res.status(404).json({
                        success: false,
                        error: 'Entità non trovata'
                    });
                }
                
                res.json({
                    success: true,
                    data: entity
                });
            } catch (error) {
                console.error('Errore nel recupero entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // POST /api/entities - Crea una nuova entità
        this.app.post('/api/entities', async (req, res) => {
            try {
                const { entityType, initialData = {} } = req.body;
                
                if (!entityType) {
                    return res.status(400).json({
                        success: false,
                        error: 'entityType è richiesto'
                    });
                }
                
                const newEntity = await this.entityEngine.createEntity(entityType, initialData);
                
                res.status(201).json({
                    success: true,
                    data: newEntity
                });
            } catch (error) {
                console.error('Errore nella creazione entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/entity/:entityId/attribute - Aggiorna un attributo di un'entità
        this.app.put('/api/entity/:entityId/attribute', async (req, res) => {
            try {
                const { entityId } = req.params;
                const { attributeName, value } = req.body;
                
                if (!attributeName) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributeName è richiesto'
                    });
                }
                
                await this.entityEngine.setEntityAttribute(entityId, attributeName, value);
                
                res.json({
                    success: true,
                    message: 'Attributo aggiornato con successo'
                });
            } catch (error) {
                console.error('Errore nell\'aggiornamento attributo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/:entityType/attributes - Ottiene tutti gli attributi di un tipo di entità
        this.app.get('/api/schema/:entityType/attributes', async (req, res) => {
            try {
                const { entityType } = req.params;
                const attributes = this.schemaManager.getAttributesForType(entityType) || []; // Assicura sempre un array
                
                res.json({
                    success: true,
                    data: attributes
                });
            } catch (error) {
                console.error('Errore nel recupero attributi schema:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // POST /api/schema/:entityType/attributes - Aggiunge un nuovo attributo a un tipo di entità
        this.app.post('/api/schema/:entityType/attributes', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { attributeName } = req.body;
                
                if (!attributeName) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributeName è richiesto'
                    });
                }
                
                this.schemaManager.addAttributeToType(entityType, attributeName);
                
                res.json({
                    success: true,
                    message: `Attributo '${attributeName}' aggiunto al tipo '${entityType}'`
                });
            } catch (error) {
                console.error('Errore nell\'aggiunta attributo schema:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Endpoint di health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                success: true,
                message: 'Server MVP SSOT Dinamico attivo',
                timestamp: new Date().toISOString()
            });
        });
    }

    async start(port = 3000) {
        try {
            // Connetti a Neo4j prima di avviare il server
            await neo4jConnector.connect();
            console.log('Connessione a Neo4j stabilita');
            
            // Avvia il server
            this.server.listen(port, () => {
                console.log(`🚀 Server MVP SSOT Dinamico in esecuzione su http://localhost:${port}`);
                console.log(`📡 WebSocket server attivo`);
                console.log(`📊 Dashboard disponibile su http://localhost:${port}`);
            });
        } catch (error) {
            console.error('Errore nell\'avvio del server:', error);
            process.exit(1);
        }
    }

    async stop() {
        try {
            await neo4jConnector.close();
            this.server.close();
            console.log('Server fermato');
        } catch (error) {
            console.error('Errore nella chiusura del server:', error);
        }
    }
}

// Se questo file viene eseguito direttamente, avvia il server
if (require.main === module) {
    const server = new MVPServer();
    server.start(3000);
    
    // Gestione graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nRicevuto SIGINT, chiusura del server...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = MVPServer;
