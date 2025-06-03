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
const EntityEngine = require('./core/entityEngine_evolved');

class EvolvedServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.clients = new Set(); // Set di client WebSocket connessi
        
        // Inizializzazione dei moduli core
        // Manteniamo i moduli MVP esistenti per compatibilità
        this.schemaManager_MVP = new SchemaManager_MVP();
        this.attributeSpace = new AttributeSpace_MVP();
        this.entityEngine_MVP = new EntityEngine_MVP(neo4jDAO, this.schemaManager_MVP, this.attributeSpace);
        
        // ✨ Inizializzazione dei moduli evoluti (Fase 3)
        this.schemaManager = new SchemaManager(neo4jDAO);
        this.relationEngine = new RelationEngine(this.entityEngine_MVP, this.schemaManager, neo4jDAO);
        this.entityEngine = new EntityEngine(neo4jDAO, this.schemaManager, this.relationEngine, this.attributeSpace);
        
        // Flag per modalità evoluta (gradualmente attiveremo le nuove funzionalità)
        this.enableEvolvedFeatures = true;
        
        this.setupMiddleware();
        this.setupWebSocket();
        this.setupRoutes();
        this.setupAttributeSpaceNotifications();
    }

    /**
     * Inizializza i componenti evoluti
     */
    async initializeEvolvedComponents() {
        try {
            console.log('🚀 Inizializzazione componenti evoluti...');
            
            // Inizializza SchemaManager evoluto
            await this.schemaManager.initialize();
            console.log('✅ SchemaManager evoluto inizializzato');
            
            // Carica relazioni esistenti nel RelationEngine
            await this.relationEngine.loadAllRelations();
            console.log('✅ RelationEngine caricato con relazioni esistenti');
            
            console.log('🎯 Tutti i componenti evoluti inizializzati con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione componenti evoluti:', error);
            throw error;
        }
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
                message: 'Connesso al server SSOT Dinamico Evoluto (Fase 3 - EntityEngine)',
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
        // ✨ ENDPOINT ENTITYENGINE EVOLUTO (Fase 3)
        // ============================================

        // GET /api/evolved/entities/:entityType - Recupera entità con features evolute
        this.app.get('/api/evolved/entities/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { includeReferences, referenceAttributes } = req.query;
                
                const options = {
                    includeReferences: includeReferences === 'true',
                    referenceAttributes: referenceAttributes ? referenceAttributes.split(',') : []
                };
                
                const entities = await this.entityEngine.getAllEntities(entityType, options);
                
                res.json({
                    success: true,
                    data: entities,
                    count: entities.length,
                    engine: 'evolved'
                });
            } catch (error) {
                console.error('❌ Errore recupero entità evoluto:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/evolved/entity/:entityId - Recupera entità singola con lazy loading
        this.app.get('/api/evolved/entity/:entityId', async (req, res) => {
            try {
                const { entityId } = req.params;
                const { includeReferences, referenceAttributes } = req.query;
                
                const options = {
                    includeReferences: includeReferences === 'true',
                    referenceAttributes: referenceAttributes ? referenceAttributes.split(',') : []
                };
                
                const entity = await this.entityEngine.getEntity(entityId, options);
                
                if (!entity) {
                    return res.status(404).json({
                        success: false,
                        error: 'Entità non trovata'
                    });
                }
                
                res.json({
                    success: true,
                    data: entity,
                    engine: 'evolved'
                });
            } catch (error) {
                console.error('❌ Errore recupero entità singola evoluto:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // POST /api/evolved/entities - Crea entità con validazione schema avanzata
        this.app.post('/api/evolved/entities', async (req, res) => {
            try {
                const { entityType, initialData = {}, options = {} } = req.body;
                
                if (!entityType) {
                    return res.status(400).json({
                        success: false,
                        error: 'entityType è richiesto'
                    });
                }
                
                const newEntity = await this.entityEngine.createEntity(entityType, initialData, options);
                
                // Notifica via WebSocket per sincronizzazione real-time
                this.broadcastMessage({
                    type: 'entity-created',
                    data: {
                        entity: newEntity,
                        entityType: entityType
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json({
                    success: true,
                    data: newEntity,
                    engine: 'evolved'
                });
            } catch (error) {
                console.error('❌ Errore creazione entità evoluto:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/evolved/entity/:entityId/attribute - Aggiorna attributo con validazione avanzata
        this.app.put('/api/evolved/entity/:entityId/attribute', async (req, res) => {
            try {
                const { entityId } = req.params;
                const { attributeName, value, options = {} } = req.body;
                
                if (!attributeName) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributeName è richiesto'
                    });
                }
                
                await this.entityEngine.setEntityAttribute(entityId, attributeName, value, options);
                
                // Notifica via WebSocket
                this.broadcastMessage({
                    type: 'attribute-updated',
                    data: {
                        entityId,
                        attributeName,
                        newValue: value
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    message: `Attributo ${attributeName} aggiornato`,
                    engine: 'evolved'
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento attributo evoluto:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/evolved/entity/:entityId/references - Risolve reference attributes
        this.app.get('/api/evolved/entity/:entityId/references', async (req, res) => {
            try {
                const { entityId } = req.params;
                const { attributes } = req.query;
                
                const attributeNames = attributes ? attributes.split(',') : [];
                const resolvedReferences = await this.entityEngine.resolveEntityReferences(entityId, attributeNames);
                
                res.json({
                    success: true,
                    data: resolvedReferences,
                    entityId: entityId,
                    engine: 'evolved'
                });
            } catch (error) {
                console.error('❌ Errore risoluzione reference:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/evolved/stats - Statistiche EntityEngine evoluto
        this.app.get('/api/evolved/stats', async (req, res) => {
            try {
                const stats = {
                    entityEngine: this.entityEngine.getStats(),
                    relationEngine: this.relationEngine.getRelationStats(),
                    schemaManager: this.schemaManager.getSchemaStats()
                };
                
                res.json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Errore recupero statistiche:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ============================================
        // ENDPOINT ESISTENTI MVP (per compatibilità)
        // ============================================

        // GET /api/entities/:entityType - Ottiene tutte le entità di un tipo
        this.app.get('/api/entities/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                
                // Usa EntityEngine evoluto se abilitato, altrimenti MVP
                let entities;
                if (this.enableEvolvedFeatures) {
                    entities = await this.entityEngine.getAllEntities(entityType);
                } else {
                    entities = await this.entityEngine_MVP.getAllEntities(entityType);
                }
                
                res.json({
                    success: true,
                    data: entities,
                    count: entities.length,
                    engine: this.enableEvolvedFeatures ? 'evolved' : 'mvp'
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
                
                // Usa EntityEngine evoluto se abilitato
                let entity;
                if (this.enableEvolvedFeatures) {
                    entity = await this.entityEngine.getEntity(entityId);
                } else {
                    entity = await this.entityEngine_MVP.getEntity(entityId);
                }
                
                if (!entity) {
                    return res.status(404).json({
                        success: false,
                        error: 'Entità non trovata'
                    });
                }
                
                res.json({
                    success: true,
                    data: entity,
                    engine: this.enableEvolvedFeatures ? 'evolved' : 'mvp'
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
                
                // Usa EntityEngine evoluto se abilitato
                let newEntity;
                if (this.enableEvolvedFeatures) {
                    newEntity = await this.entityEngine.createEntity(entityType, initialData);
                } else {
                    newEntity = await this.entityEngine_MVP.createEntity(entityType, initialData);
                }
                
                res.status(201).json({
                    success: true,
                    data: newEntity,
                    engine: this.enableEvolvedFeatures ? 'evolved' : 'mvp'
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
                
                // Usa EntityEngine evoluto se abilitato
                if (this.enableEvolvedFeatures) {
                    await this.entityEngine.setEntityAttribute(entityId, attributeName, value);
                } else {
                    await this.entityEngine_MVP.setEntityAttribute(entityId, attributeName, value);
                }
                
                res.json({
                    success: true,
                    message: `Attributo ${attributeName} aggiornato`,
                    engine: this.enableEvolvedFeatures ? 'evolved' : 'mvp'
                });
            } catch (error) {
                console.error('Errore nell\'aggiornamento attributo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/:entityType/attributes - Recupera attributi di un tipo (MVP)
        this.app.get('/api/schema/:entityType/attributes', async (req, res) => {
            try {
                const { entityType } = req.params;
                const attributes = this.schemaManager_MVP.getAttributesForType(entityType);
                
                res.json({
                    success: true,
                    data: attributes,
                    engine: 'mvp'
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
        // ENDPOINT SCHEMA EVOLUTI (Fase 1)
        // ============================================

        // POST /api/schema/entity/:entityType - Crea nuovo schema entità
        this.app.post('/api/schema/entity/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { schemaDefinition } = req.body;
                
                const schema = await this.schemaManager.defineEntitySchema(entityType, schemaDefinition);
                
                // Notifica evoluzione schema via WebSocket
                this.broadcastMessage({
                    type: 'schema-created',
                    data: {
                        entityType: entityType,
                        schema: schema
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json({
                    success: true,
                    data: schema
                });
            } catch (error) {
                console.error('❌ Errore creazione schema entità:', error);
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
                    data: schema
                });
            } catch (error) {
                console.error('❌ Errore recupero schema entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/schema/entity/:entityType - Evolve schema entità (additive-only)
        this.app.put('/api/schema/entity/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { evolution } = req.body;
                
                const updatedSchema = await this.schemaManager.evolveSchema(entityType, evolution);
                
                // Notifica evoluzione schema via WebSocket
                this.broadcastMessage({
                    type: 'schema-evolved',
                    data: {
                        entityType: entityType,
                        evolution: evolution,
                        schema: updatedSchema
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    data: updatedSchema
                });
            } catch (error) {
                console.error('❌ Errore evoluzione schema:', error);
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
                const schemas = entityTypes.map(entityType => ({
                    entityType,
                    schema: this.schemaManager.getEntitySchema(entityType)
                }));
                
                res.json({
                    success: true,
                    data: schemas,
                    count: schemas.length
                });
            } catch (error) {
                console.error('❌ Errore lista schemi entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ============================================
        // ENDPOINT RELAZIONI (Fase 2)
        // ============================================

        // POST /api/relations - Crea una nuova relazione tipizzata
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
                
                // Notifica creazione relazione via WebSocket
                this.broadcastMessage({
                    type: 'relation-created',
                    data: relation,
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json({
                    success: true,
                    data: relation
                });
            } catch (error) {
                console.error('❌ Errore creazione relazione:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/relations - Trova relazioni basate su pattern
        this.app.get('/api/relations', async (req, res) => {
            try {
                const pattern = {};
                
                // Costruisci pattern dai query parameters
                if (req.query.sourceEntityId) pattern.sourceEntityId = req.query.sourceEntityId;
                if (req.query.targetEntityId) pattern.targetEntityId = req.query.targetEntityId;
                if (req.query.relationType) pattern.relationType = req.query.relationType;
                if (req.query.sourceEntityType) pattern.sourceEntityType = req.query.sourceEntityType;
                if (req.query.targetEntityType) pattern.targetEntityType = req.query.targetEntityType;
                
                const relations = await this.relationEngine.findRelations(pattern);
                
                res.json({
                    success: true,
                    data: relations,
                    count: relations.length,
                    pattern: pattern
                });
            } catch (error) {
                console.error('❌ Errore ricerca relazioni:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/relations/stats - Recupera statistiche sulle relazioni
        this.app.get('/api/relations/stats', async (req, res) => {
            try {
                const stats = this.relationEngine.getRelationStats();
                
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                console.error('❌ Errore statistiche relazioni:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/relations/:relationId - Recupera una relazione specifica
        this.app.get('/api/relations/:relationId', async (req, res) => {
            try {
                const { relationId } = req.params;
                
                const relations = await this.relationEngine.findRelations({});
                const relation = relations.find(r => r.id === relationId);
                
                if (!relation) {
                    return res.status(404).json({
                        success: false,
                        error: 'Relazione non trovata'
                    });
                }
                
                res.json({
                    success: true,
                    data: relation
                });
            } catch (error) {
                console.error('❌ Errore recupero relazione:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/relations/:relationId - Aggiorna attributi di una relazione
        this.app.put('/api/relations/:relationId', async (req, res) => {
            try {
                const { relationId } = req.params;
                const { attributes } = req.body;
                
                await this.relationEngine.updateRelationAttributes(relationId, attributes);
                
                // Notifica aggiornamento relazione via WebSocket
                this.broadcastMessage({
                    type: 'relation-updated',
                    data: {
                        relationId: relationId,
                        attributes: attributes
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    message: 'Relazione aggiornata con successo'
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento relazione:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // DELETE /api/relations/:relationId - Elimina una relazione
        this.app.delete('/api/relations/:relationId', async (req, res) => {
            try {
                const { relationId } = req.params;
                
                await this.relationEngine.deleteRelation(relationId);
                
                // Notifica eliminazione relazione via WebSocket
                this.broadcastMessage({
                    type: 'relation-deleted',
                    data: {
                        relationId: relationId
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    message: 'Relazione eliminata con successo'
                });
            } catch (error) {
                console.error('❌ Errore eliminazione relazione:', error);
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
                const { relationType, direction } = req.query;
                
                const relatedEntities = await this.relationEngine.getRelatedEntities(
                    entityId, 
                    relationType || null, 
                    direction || 'both'
                );
                
                res.json({
                    success: true,
                    data: relatedEntities,
                    count: relatedEntities.length,
                    entityId: entityId
                });
            } catch (error) {
                console.error('❌ Errore recupero entità correlate:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * Invia un messaggio a tutti i client WebSocket connessi
     */
    broadcastMessage(message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }

    /**
     * Avvia il server
     */
    async start(port = 3000) {
        try {
            // Prima inizializza i componenti evoluti
            await this.initializeEvolvedComponents();
            
            // Poi avvia il server
            return new Promise((resolve, reject) => {
                this.server.listen(port, (err) => {
                    if (err) {
                        console.error('❌ Errore avvio server:', err);
                        reject(err);
                    } else {
                        console.log(`🚀 Server SSOT Dinamico Evoluto (Fase 3) avviato su porta ${port}`);
                        console.log(`📱 Dashboard: http://localhost:${port}/`);
                        console.log(`🔌 WebSocket: ws://localhost:${port}/`);
                        console.log(`🧠 Componenti attivi: EntityEngine Evoluto, RelationEngine, SchemaManager Evoluto`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('❌ Errore durante avvio server:', error);
            throw error;
        }
    }

    /**
     * Ferma il server
     */
    async stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                console.log('🛑 Server arrestato');
                resolve();
            });
        });
    }
}

module.exports = EvolvedServer; 
