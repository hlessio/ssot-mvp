const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Import dei moduli core implementati nelle fasi precedenti (MVP)
const neo4jConnector = require('./neo4j_connector');
const neo4jDAO = require('./dao/neo4j_dao');
const SchemaManager_MVP = require('./core/schemaManager');
const EntityEngine_MVP = require('./core/entityEngine');
const AttributeSpace_MVP = require('./core/attributeSpace');

// Import dei nuovi moduli evoluti
const SchemaManager = require('./core/schemaManager_evolved');
const RelationEngine = require('./core/relationEngine');

class EvolvedServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.clients = new Set(); // Set di client WebSocket connessi
        
        // Inizializzazione dei moduli core
        // Per ora manteniamo i moduli MVP esistenti per compatibilità
        this.schemaManager_MVP = new SchemaManager_MVP();
        this.attributeSpace = new AttributeSpace_MVP();
        this.entityEngine = new EntityEngine_MVP(neo4jDAO, this.schemaManager_MVP, this.attributeSpace);
        
        // Inizializzazione del nuovo SchemaManager evoluto
        this.schemaManager = new SchemaManager(neo4jDAO);
        this.relationEngine = new RelationEngine(this.entityEngine, this.schemaManager, neo4jDAO);
        
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
                message: 'Connesso al server SSOT Dinamico Evoluto',
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

        // ============================================
        // ENDPOINT ESISTENTI MVP (per compatibilità)
        // ============================================

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

        // GET /api/schema/:entityType/attributes - Ottiene tutti gli attributi di un tipo di entità (MVP)
        this.app.get('/api/schema/:entityType/attributes', async (req, res) => {
            try {
                const { entityType } = req.params;
                const attributes = this.schemaManager_MVP.getAttributesForType(entityType) || [];
                
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

        // ============================================
        // NUOVI ENDPOINT SCHEMI EVOLUTI
        // ============================================

        // Entity Schemas
        // POST /api/schema/entity/:entityType - Definisce nuovo schema entità
        this.app.post('/api/schema/entity/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const schemaDefinition = req.body;
                
                const schema = await this.schemaManager.defineEntitySchema(entityType, schemaDefinition);
                
                res.status(201).json({
                    success: true,
                    data: schema.toJSON(),
                    message: `Schema entità ${entityType} definito con successo`
                });
            } catch (error) {
                console.error(`Errore definizione schema entità ${req.params.entityType}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/entity/:entityType - Recupera schema entità
        this.app.get('/api/schema/entity/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const schema = this.schemaManager.getEntitySchema(entityType);
                
                if (!schema) {
                    return res.status(404).json({
                        success: false,
                        error: `Schema non trovato per il tipo ${entityType}`
                    });
                }
                
                res.json({
                    success: true,
                    data: schema.toJSON()
                });
            } catch (error) {
                console.error(`Errore recupero schema entità ${req.params.entityType}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/schema/entity/:entityType - Aggiorna schema entità
        this.app.put('/api/schema/entity/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const evolution = req.body;
                
                const updatedSchema = await this.schemaManager.evolveSchema(entityType, evolution);
                
                res.json({
                    success: true,
                    data: updatedSchema.toJSON(),
                    message: `Schema entità ${entityType} aggiornato con successo`
                });
            } catch (error) {
                console.error(`Errore aggiornamento schema entità ${req.params.entityType}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/entities - Lista tutti gli schemi entità
        this.app.get('/api/schema/entities', async (req, res) => {
            try {
                const entityTypes = this.schemaManager.getAllEntityTypes();
                const schemas = [];
                
                for (const entityType of entityTypes) {
                    const schema = this.schemaManager.getEntitySchema(entityType);
                    if (schema) {
                        schemas.push(schema.toJSON());
                    }
                }
                
                res.json({
                    success: true,
                    data: schemas,
                    count: schemas.length
                });
            } catch (error) {
                console.error('Errore recupero schemi entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Relation Schemas
        // POST /api/schema/relation/:relationType - Definisce nuovo schema relazione
        this.app.post('/api/schema/relation/:relationType', async (req, res) => {
            try {
                const { relationType } = req.params;
                const schemaDefinition = req.body;
                
                const schema = await this.schemaManager.defineRelationSchema(relationType, schemaDefinition);
                
                res.status(201).json({
                    success: true,
                    data: schema.toJSON(),
                    message: `Schema relazione ${relationType} definito con successo`
                });
            } catch (error) {
                console.error(`Errore definizione schema relazione ${req.params.relationType}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/relation/:relationType - Recupera schema relazione
        this.app.get('/api/schema/relation/:relationType', async (req, res) => {
            try {
                const { relationType } = req.params;
                const schema = this.schemaManager.getRelationSchema(relationType);
                
                if (!schema) {
                    return res.status(404).json({
                        success: false,
                        error: `Schema non trovato per il tipo di relazione ${relationType}`
                    });
                }
                
                res.json({
                    success: true,
                    data: schema.toJSON()
                });
            } catch (error) {
                console.error(`Errore recupero schema relazione ${req.params.relationType}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/relations - Lista tutti gli schemi relazione
        this.app.get('/api/schema/relations', async (req, res) => {
            try {
                const relationTypes = this.schemaManager.getAllRelationTypes();
                const schemas = [];
                
                for (const relationType of relationTypes) {
                    const schema = this.schemaManager.getRelationSchema(relationType);
                    if (schema) {
                        schemas.push(schema.toJSON());
                    }
                }
                
                res.json({
                    success: true,
                    data: schemas,
                    count: schemas.length
                });
            } catch (error) {
                console.error('Errore recupero schemi relazione:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ✨ NUOVI ENDPOINT RELATION ENGINE
        // POST /api/relations - Crea una nuova relazione
        this.app.post('/api/relations', async (req, res) => {
            try {
                const { relationType, sourceEntityId, targetEntityId, attributes = {} } = req.body;
                
                if (!relationType || !sourceEntityId || !targetEntityId) {
                    return res.status(400).json({
                        success: false,
                        error: 'relationType, sourceEntityId e targetEntityId sono richiesti'
                    });
                }
                
                const relation = await this.relationEngine.createRelation(
                    relationType, 
                    sourceEntityId, 
                    targetEntityId, 
                    attributes
                );
                
                // Notifica WebSocket per sincronizzazione real-time
                this.broadcastMessage({
                    type: 'relation-created',
                    data: relation,
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json({
                    success: true,
                    data: relation,
                    message: `Relazione ${relationType} creata con successo`
                });
            } catch (error) {
                console.error('Errore creazione relazione:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/relations - Trova relazioni basate su pattern
        this.app.get('/api/relations', async (req, res) => {
            try {
                const {
                    sourceEntityId,
                    targetEntityId,
                    relationType,
                    sourceEntityType,
                    targetEntityType
                } = req.query;
                
                const pattern = {};
                if (sourceEntityId) pattern.sourceEntityId = sourceEntityId;
                if (targetEntityId) pattern.targetEntityId = targetEntityId;
                if (relationType) pattern.relationType = relationType;
                if (sourceEntityType) pattern.sourceEntityType = sourceEntityType;
                if (targetEntityType) pattern.targetEntityType = targetEntityType;
                
                const relations = await this.relationEngine.findRelations(pattern);
                
                res.json({
                    success: true,
                    data: relations,
                    count: relations.length,
                    pattern: pattern
                });
            } catch (error) {
                console.error('Errore ricerca relazioni:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/relations/:relationId - Recupera relazione specifica
        this.app.get('/api/relations/:relationId', async (req, res) => {
            try {
                const { relationId } = req.params;
                
                const relations = await this.relationEngine.findRelations({});
                const relation = relations.find(r => r.id === relationId);
                
                if (!relation) {
                    return res.status(404).json({
                        success: false,
                        error: `Relazione non trovata: ${relationId}`
                    });
                }
                
                res.json({
                    success: true,
                    data: relation
                });
            } catch (error) {
                console.error(`Errore recupero relazione ${req.params.relationId}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/relations/:relationId - Aggiorna attributi relazione
        this.app.put('/api/relations/:relationId', async (req, res) => {
            try {
                const { relationId } = req.params;
                const { attributes } = req.body;
                
                if (!attributes) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributes è richiesto per aggiornamento relazione'
                    });
                }
                
                const updatedRelation = await this.relationEngine.updateRelationAttributes(relationId, attributes);
                
                // Notifica WebSocket per sincronizzazione real-time
                this.broadcastMessage({
                    type: 'relation-updated',
                    data: updatedRelation,
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    data: updatedRelation,
                    message: `Relazione ${relationId} aggiornata con successo`
                });
            } catch (error) {
                console.error(`Errore aggiornamento relazione ${req.params.relationId}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // DELETE /api/relations/:relationId - Elimina relazione
        this.app.delete('/api/relations/:relationId', async (req, res) => {
            try {
                const { relationId } = req.params;
                
                const success = await this.relationEngine.deleteRelation(relationId);
                
                if (success) {
                    // Notifica WebSocket per sincronizzazione real-time
                    this.broadcastMessage({
                        type: 'relation-deleted',
                        data: { relationId },
                        timestamp: new Date().toISOString()
                    });
                    
                    res.json({
                        success: true,
                        message: `Relazione ${relationId} eliminata con successo`
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: `Relazione non trovata: ${relationId}`
                    });
                }
            } catch (error) {
                console.error(`Errore eliminazione relazione ${req.params.relationId}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/entities/:entityId/relations - Recupera entità correlate
        this.app.get('/api/entities/:entityId/relations', async (req, res) => {
            try {
                const { entityId } = req.params;
                const { relationType, direction = 'both' } = req.query;
                
                const relatedEntities = await this.relationEngine.getRelatedEntities(
                    entityId, 
                    relationType, 
                    direction
                );
                
                res.json({
                    success: true,
                    data: relatedEntities,
                    count: relatedEntities.length,
                    entityId: entityId,
                    filters: { relationType, direction }
                });
            } catch (error) {
                console.error(`Errore recupero entità correlate per ${req.params.entityId}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/relations/stats - Statistiche relazioni
        this.app.get('/api/relations/stats', async (req, res) => {
            try {
                const stats = this.relationEngine.getRelationStats();
                
                res.json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Errore recupero statistiche relazioni:', error);
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
                message: 'Server SSOT Dinamico Evoluto attivo',
                timestamp: new Date().toISOString(),
                schemaManager: {
                    initialized: this.schemaManager.isInitialized,
                    entityTypes: this.schemaManager.getAllEntityTypes().length,
                    relationTypes: this.schemaManager.getAllRelationTypes().length
                },
                relationEngine: {
                    totalRelations: this.relationEngine.getRelationStats().totalRelations,
                    entitiesWithRelations: this.relationEngine.getRelationStats().entitiesWithRelations
                }
            });
        });
    }


    /**
     * Invia un messaggio a tutti i client WebSocket connessi
     * @param {object} message - Il messaggio da inviare
     */
    broadcastMessage(message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
        console.log(`📡 Messaggio broadcast inviato a ${this.clients.size} client:`, message.type);
    }

    async start(port = 3000) {
        try {
            // Connetti a Neo4j prima di avviare il server
            await neo4jConnector.connect();
            console.log('✅ Connessione a Neo4j stabilita');
            
            // Inizializza il SchemaManager evoluto
            await this.schemaManager.initialize();
            console.log('✅ SchemaManager evoluto inizializzato');
            
            // ✨ Inizializza il RelationEngine
            await this.relationEngine.loadAllRelations();
            console.log('✅ RelationEngine inizializzato');
            
            // Avvia il server
            this.server.listen(port, () => {
                console.log(`🚀 Server SSOT Dinamico Evoluto in esecuzione su http://localhost:${port}`);
                console.log(`📡 WebSocket server attivo`);
                console.log(`📊 Dashboard disponibile su http://localhost:${port}`);
                console.log(`🔧 Endpoint schemi disponibili su /api/schema/*`);
                console.log(`🔗 Endpoint relazioni disponibili su /api/relations/*`);
            });
        } catch (error) {
            console.error('❌ Errore nell\'avvio del server:', error);
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
    const server = new EvolvedServer();
    server.start(3000);
    
    // Gestione graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nRicevuto SIGINT, chiusura del server...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = EvolvedServer; 
