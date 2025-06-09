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

// Import dei nuovi moduli evoluti
const SchemaManager = require('./core/schemaManager_evolved');
const RelationEngine = require('./core/relationEngine');
const EntityEngine = require('./core/entityEngine_evolved');
const AttributeSpace = require('./core/attributeSpace_evolved');

// ✨ SISTEMA ORGANICO: Import nuovi moduli
const AttributeDiscoveryManager = require('./core/attributeDiscovery');
const ImplicitRelationManager = require('./core/implicitRelationManager');
const SoftValidationEngine = require('./core/softValidationEngine');

class EvolvedServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.clients = new Set(); // Set di client WebSocket connessi
        
        // Inizializzazione dei moduli core
        // Manteniamo i moduli MVP esistenti per compatibilità
        this.schemaManager_MVP = new SchemaManager_MVP();
        
        // ✨ NUOVO: AttributeSpace evoluto con configurazione ottimizzata per server
        this.attributeSpace = new AttributeSpace({
            enableBatching: true,
            batchDelay: 30, // Ridotto per UI più responsiva
            maxLoopDetection: 5,
            enableLogging: true
        });
        
        this.entityEngine_MVP = new EntityEngine_MVP(neo4jDAO, this.schemaManager_MVP, this.attributeSpace);
        
        // ✨ SISTEMA ORGANICO: Inizializzazione moduli organici
        this.attributeDiscovery = new AttributeDiscoveryManager(neo4jDAO);
        this.implicitRelationManager = new ImplicitRelationManager(neo4jDAO, this.attributeDiscovery);
        this.softValidationEngine = new SoftValidationEngine(this.attributeDiscovery);
        
        // ✨ Inizializzazione dei moduli evoluti (Fase 4 - AttributeSpace Evoluto)
        this.schemaManager = new SchemaManager(neo4jDAO);
        this.relationEngine = new RelationEngine(this.entityEngine_MVP, this.schemaManager, neo4jDAO);
        this.entityEngine = new EntityEngine(neo4jDAO, this.schemaManager, this.relationEngine, this.attributeSpace);
        
        // Flag per modalità evoluta e organica
        this.enableEvolvedFeatures = true;
        this.enableOrganicMode = process.env.ENABLE_ORGANIC_MODE !== 'false'; // Default: true
        this.enableRelationSchemaValidation = process.env.ENABLE_RELATION_SCHEMA !== 'true'; // Default: false per memory
        
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
        // ✨ NUOVO: Integrazione AttributeSpace Evoluto con pattern matching avanzato
        
        // Sottoscrizione 1: Tutte le modifiche entità per WebSocket (compatibilità MVP)
        this.attributeSpace.subscribe({
            type: 'entity', // Solo eventi entità
            changeType: '*' // Tutti i tipi di cambiamento
        }, (changeNotification) => {
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
            
            console.log('🔄 Notifica entità propagata a', this.clients.size, 'client:', {
                entityId: changeNotification.entityId,
                attributeName: changeNotification.attributeName,
                changeType: changeNotification.changeType
            });
        });

        // Sottoscrizione 2: Eventi relazioni per WebSocket
        this.attributeSpace.subscribe({
            type: 'relation', // Solo eventi relazioni
            changeType: '*'
        }, (changeNotification) => {
            const message = JSON.stringify({
                type: 'relationChange',
                data: changeNotification,
                timestamp: new Date().toISOString()
            });
            
            this.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
            
            console.log('🔗 Notifica relazione propagata a', this.clients.size, 'client:', {
                relationType: changeNotification.relationType,
                sourceEntityId: changeNotification.sourceEntityId,
                targetEntityId: changeNotification.targetEntityId,
                changeType: changeNotification.changeType
            });
        });

        // Sottoscrizione 3: Eventi schema per sincronizzazione struttura
        this.attributeSpace.subscribe({
            type: 'schema',
            changeType: '*'
        }, (changeNotification) => {
            const message = JSON.stringify({
                type: 'schemaChange',
                data: changeNotification,
                timestamp: new Date().toISOString()
            });
            
            this.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
            
            console.log('📋 Notifica schema propagata a', this.clients.size, 'client:', {
                entityType: changeNotification.entityType,
                schemaChange: changeNotification.attributeName,
                changeType: changeNotification.changeType
            });
        });

        // Sottoscrizione 4: Audit log per attributi critici (esempio di pattern avanzato)
        this.attributeSpace.subscribe({
            attributeNamePattern: '*password*', // Tutti gli attributi con "password" nel nome
            changeType: '*'
        }, (changeNotification) => {
            console.log('🔒 AUDIT: Modifica campo sensibile rilevata:', {
                entityId: changeNotification.entityId,
                attributeName: changeNotification.attributeName,
                changeType: changeNotification.changeType,
                timestamp: changeNotification.timestamp
            });
            // Qui si potrebbe integrare con sistema di audit/logging esterno
        });

        // Sottoscrizione 5: Monitoraggio performance (pattern custom)
        this.attributeSpace.subscribe({
            custom: (details) => {
                // Monitora solo modifiche che potrebbero impattare performance
                return details.batchCount > 5 || 
                       (details.attributeName && details.attributeName.startsWith('computed_'));
            }
        }, (changeNotification) => {
            console.log('⚡ PERFORMANCE: Batch elevato o campo computato modificato:', {
                entityId: changeNotification.entityId,
                attributeName: changeNotification.attributeName,
                batchCount: changeNotification.batchCount || 1,
                timestamp: changeNotification.timestamp
            });
        });

        console.log('✅ AttributeSpace Evoluto configurato con 5 sottoscrizioni pattern-based');
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
        // ✨ ENDPOINT MODULE INSTANCE (Fase 2 Frontend)
        // ============================================

        // POST /api/module-instances - Crea una nuova istanza di modulo
        this.app.post('/api/module-instances', async (req, res) => {
            try {
                const instanceData = req.body;
                
                // Validazione dati richiesti
                const requiredFields = ['instanceName', 'templateModuleId', 'targetEntityType'];
                const missingFields = requiredFields.filter(field => !instanceData[field]);
                
                if (missingFields.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Campi richiesti mancanti: ${missingFields.join(', ')}`
                    });
                }

                // Aggiunge metadati di sistema
                const instanceToCreate = {
                    ...instanceData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1
                };

                // Serializza instanceConfigOverrides se è un oggetto
                if (instanceToCreate.instanceConfigOverrides && typeof instanceToCreate.instanceConfigOverrides === 'object') {
                    instanceToCreate.instanceConfigOverrides = JSON.stringify(instanceToCreate.instanceConfigOverrides);
                }

                console.log('📝 [ModuleInstance] Creando istanza:', instanceToCreate);

                // Crea entità ModuleInstance tramite EntityEngine
                const createdInstance = await this.entityEngine.createEntity('ModuleInstance', instanceToCreate);
                
                // Notifica via WebSocket
                this.broadcastMessage({
                    type: 'module-instance-created',
                    data: {
                        instance: createdInstance
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json(createdInstance);
            } catch (error) {
                console.error('❌ Errore creazione istanza modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/module-instances/:instanceId - Recupera istanza specifica
        this.app.get('/api/module-instances/:instanceId', async (req, res) => {
            try {
                const { instanceId } = req.params;
                
                console.log(`🔍 [ModuleInstance] Recuperando istanza: ${instanceId}`);
                
                const instance = await this.entityEngine.getEntity(instanceId);
                
                if (!instance) {
                    return res.status(404).json({
                        success: false,
                        error: 'Istanza modulo non trovata'
                    });
                }
                
                res.json(instance);
            } catch (error) {
                console.error('❌ Errore recupero istanza modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/module-instances/:instanceId - Aggiorna istanza
        this.app.put('/api/module-instances/:instanceId', async (req, res) => {
            try {
                const { instanceId } = req.params;
                const updateData = req.body;
                
                console.log(`📝 [ModuleInstance] Aggiornando istanza: ${instanceId}`, updateData);
                
                // Verifica esistenza istanza
                const existingInstance = await this.entityEngine.getEntity(instanceId);
                if (!existingInstance) {
                    return res.status(404).json({
                        success: false,
                        error: 'Istanza modulo non trovata'
                    });
                }
                
                // Aggiorna metadati
                const updatedData = {
                    ...updateData,
                    updatedAt: new Date().toISOString(),
                    version: (existingInstance.version || 1) + 1
                };

                // Serializza instanceConfigOverrides se è un oggetto
                if (updatedData.instanceConfigOverrides && typeof updatedData.instanceConfigOverrides === 'object') {
                    updatedData.instanceConfigOverrides = JSON.stringify(updatedData.instanceConfigOverrides);
                }
                
                // Aggiorna attributi singolarmente per preservare validazioni
                for (const [attributeName, value] of Object.entries(updatedData)) {
                    await this.entityEngine.setEntityAttribute(instanceId, attributeName, value);
                }
                
                // Recupera istanza aggiornata
                const updatedInstance = await this.entityEngine.getEntity(instanceId);
                
                // Notifica via WebSocket
                this.broadcastMessage({
                    type: 'module-instance-updated',
                    data: {
                        instanceId,
                        instance: updatedInstance,
                        changes: updateData
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json(updatedInstance);
            } catch (error) {
                console.error('❌ Errore aggiornamento istanza modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // DELETE /api/module-instances/:instanceId - Elimina istanza
        this.app.delete('/api/module-instances/:instanceId', async (req, res) => {
            try {
                const { instanceId } = req.params;
                
                console.log(`🗑️ [ModuleInstance] Eliminando istanza: ${instanceId}`);
                
                // Verifica esistenza istanza
                const existingInstance = await this.entityEngine.getEntity(instanceId);
                if (!existingInstance) {
                    return res.status(404).json({
                        success: false,
                        error: 'Istanza modulo non trovata'
                    });
                }
                
                // Elimina istanza tramite EntityEngine evoluto
                // Nota: Il DAO non ha deleteEntity, usiamo EntityEngine
                const deleteQuery = `
                    MATCH (e:Entity {id: $entityId})
                    DELETE e
                `;
                
                await neo4jConnector.executeQuery(deleteQuery, { entityId: instanceId });
                
                // Notifica via WebSocket
                this.broadcastMessage({
                    type: 'module-instance-deleted',
                    data: {
                        instanceId,
                        deletedInstance: existingInstance
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    message: 'Istanza modulo eliminata con successo'
                });
            } catch (error) {
                console.error('❌ Errore eliminazione istanza modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/module-instances - Lista istanze con filtri
        this.app.get('/api/module-instances', async (req, res) => {
            try {
                const {
                    templateModuleId,
                    targetEntityType,
                    ownerUserId,
                    limit = 50,
                    offset = 0
                } = req.query;
                
                console.log('📋 [ModuleInstance] Listando istanze con filtri:', req.query);
                
                // Costruisce filtri per la query
                const filters = {};
                if (templateModuleId) filters.templateModuleId = templateModuleId;
                if (targetEntityType) filters.targetEntityType = targetEntityType;
                if (ownerUserId) filters.ownerUserId = ownerUserId;
                
                // Recupera tutte le istanze ModuleInstance
                const allInstances = await this.entityEngine.getAllEntities('ModuleInstance');
                
                // Applica filtri manualmente (in futuro si può migliorare con query Neo4j)
                let filteredInstances = allInstances.filter(instance => {
                    return Object.entries(filters).every(([key, value]) => {
                        return instance[key] === value;
                    });
                });
                
                // Applica paginazione
                const totalCount = filteredInstances.length;
                const startIndex = parseInt(offset);
                const limitCount = parseInt(limit);
                filteredInstances = filteredInstances.slice(startIndex, startIndex + limitCount);
                
                res.json({
                    success: true,
                    instances: filteredInstances,
                    pagination: {
                        total: totalCount,
                        limit: limitCount,
                        offset: startIndex,
                        hasMore: startIndex + limitCount < totalCount
                    }
                });
            } catch (error) {
                console.error('❌ Errore lista istanze modulo:', error);
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
                    id: entity.id, // Explicit ID field for client compatibility
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

        // POST /api/entities - Crea una nuova entità (ORGANICO con soft validation)
        this.app.post('/api/entities', async (req, res) => {
            try {
                // ✅ CORREZIONE: Estrae i dati sia da initialData che direttamente dal body
                const { entityType, initialData, ...directData } = req.body;
                
                // Determina i dati da usare: se c'è initialData lo usa, altrimenti usa i dati diretti
                const entityData = initialData || directData;
                
                console.log(`🔧 Creazione entità tipo ${entityType}`, entityData);
                
                if (!entityType) {
                    return res.status(400).json({
                        success: false,
                        error: 'entityType è richiesto'
                    });
                }
                
                // ✨ MODALITÀ ORGANICA: Usa soft validation per ogni attributo
                if (this.enableOrganicMode && entityData) {
                    for (const [attributeName, value] of Object.entries(entityData)) {
                        if (attributeName !== 'entityType' && attributeName !== 'id') {
                            await this.softValidationEngine.validateGently(
                                entityType,
                                attributeName,
                                value,
                                { context: 'entity_creation' }
                            );
                        }
                    }
                }
                
                // Usa EntityEngine evoluto se abilitato
                let newEntity;
                if (this.enableEvolvedFeatures) {
                    newEntity = await this.entityEngine.createEntity(entityType, entityData);
                } else {
                    newEntity = await this.entityEngine_MVP.createEntity(entityType, entityData);
                }
                
                res.status(201).json({
                    success: true,
                    data: newEntity,
                    id: newEntity.id, // Explicit ID field for client compatibility
                    engine: this.enableEvolvedFeatures ? 'evolved' : 'mvp',
                    organic: this.enableOrganicMode
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
                const schemaDefinition = req.body.schemaDefinition || req.body; // Support both formats
                
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
                const evolution = req.body.evolution || req.body || {}; // Support both formats with fallback
                
                if (!evolution || Object.keys(evolution).length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Evolution data is required'
                    });
                }
                
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

        // GET /api/schema/entities - Lista tutti gli schemi entità (ORGANICO)
        this.app.get('/api/schema/entities', async (req, res) => {
            try {
                if (this.enableOrganicMode) {
                    // ✨ MODALITÀ ORGANICA: Schemi emergenti dall'uso
                    const organicSchemas = await this.generateOrganicSchemas();
                    
                    res.json({
                        success: true,
                        data: organicSchemas,
                        count: organicSchemas.length,
                        mode: 'organic',
                        message: 'Schemi emergenti dall\'uso'
                    });
                } else {
                    // Modalità tradizionale
                    const entityTypes = this.schemaManager.getAllEntityTypes() || [];
                    const schemas = entityTypes.map(entityType => {
                        const schema = this.schemaManager.getEntitySchema(entityType);
                        return {
                            ...schema,
                            entityType: entityType
                        };
                    }).filter(schema => schema.entityType);
                    
                    res.json({
                        success: true,
                        data: schemas,
                        count: schemas.length,
                        mode: 'traditional'
                    });
                }
            } catch (error) {
                console.error('❌ Errore lista schemi entità:', error);
                res.status(500).json({
                    success: false,
                    data: [],
                    error: error.message
                });
            }
        });

        // ✨ NUOVO: Endpoint per propagazione attributi modulo (ORGANICO)
        this.app.post('/api/organic/module/:moduleId/propagate-attribute', async (req, res) => {
            try {
                if (!this.enableOrganicMode) {
                    return res.status(400).json({
                        success: false,
                        error: 'Modalità organica non abilitata'
                    });
                }

                const { moduleId } = req.params;
                const { attributeName, defaultValue } = req.body;

                if (!attributeName) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributeName è richiesto'
                    });
                }

                const result = await this.attributeDiscovery.propagateAttributeToModule(
                    moduleId,
                    attributeName,
                    defaultValue || ''
                );

                res.json({
                    success: true,
                    data: result,
                    message: `Attributo ${attributeName} propagato a ${result.entitiesUpdated} entità`
                });

            } catch (error) {
                console.error('❌ Errore propagazione attributo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ✨ NUOVO: Endpoint per relazioni implicite (ORGANICO)
        this.app.get('/api/organic/entity/:entityId/related', async (req, res) => {
            try {
                if (!this.enableOrganicMode) {
                    return res.status(400).json({
                        success: false,
                        error: 'Modalità organica non abilitata'
                    });
                }

                const { entityId } = req.params;
                const { limit = 20 } = req.query;

                const relatedEntities = await this.implicitRelationManager.getRelatedEntities(
                    entityId,
                    { limit: parseInt(limit) }
                );

                res.json({
                    success: true,
                    data: relatedEntities,
                    count: relatedEntities.length,
                    message: 'Relazioni implicite via contesto condiviso'
                });

            } catch (error) {
                console.error('❌ Errore recupero relazioni implicite:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ✨ NUOVO: Endpoint per validazione gentile (ORGANICO)
        this.app.post('/api/organic/validate', async (req, res) => {
            try {
                if (!this.enableOrganicMode) {
                    return res.status(400).json({
                        success: false,
                        error: 'Modalità organica non abilitata'
                    });
                }

                const { entityType, attributeName, value, context } = req.body;

                if (!entityType || !attributeName) {
                    return res.status(400).json({
                        success: false,
                        error: 'entityType e attributeName sono richiesti'
                    });
                }

                const validation = await this.softValidationEngine.validateGently(
                    entityType,
                    attributeName,
                    value,
                    context || {}
                );

                res.json({
                    success: true,
                    data: validation,
                    message: 'Validazione gentile completata'
                });

            } catch (error) {
                console.error('❌ Errore validazione gentile:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ============================================
        // ENDPOINT SCHEMA RELAZIONI
        // ============================================

        // POST /api/schema/relation/:relationType - Crea nuovo schema relazione (CONDIZIONALE)
        this.app.post('/api/schema/relation/:relationType', async (req, res) => {
            try {
                if (!this.enableRelationSchemaValidation) {
                    // ✨ MODALITÀ ORGANICA: Skip schema relazione per evitare memory issues
                    res.json({
                        success: true,
                        data: {
                            relationType: req.params.relationType,
                            mode: 'organic_implicit',
                            message: 'Relazioni gestite implicitamente via moduli',
                            validation: 'disabled_for_memory_optimization'
                        }
                    });
                    return;
                }
                
                const { relationType } = req.params;
                const schemaDefinition = req.body.schemaDefinition || req.body;
                
                const schema = await this.schemaManager.defineRelationSchema(relationType, schemaDefinition);
                
                this.broadcastMessage({
                    type: 'relation-schema-created',
                    data: { relationType, schema }
                });
                
                res.json({
                    success: true,
                    data: schema
                });
            } catch (error) {
                console.error('❌ Errore creazione schema relazione:', error);
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
                    data: schema
                });
            } catch (error) {
                console.error('❌ Errore recupero schema relazione:', error);
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
                const schemas = relationTypes.map(relationType => ({
                    relationType,
                    schema: this.schemaManager.getRelationSchema(relationType)
                }));
                
                res.json({
                    success: true,
                    data: schemas,
                    count: schemas.length
                });
            } catch (error) {
                console.error('❌ Errore lista schemi relazione:', error);
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
                const { relationType, sourceEntityId, targetEntityId, attributes = {}, ...otherFields } = req.body;
                
                if (!relationType || !sourceEntityId || !targetEntityId) {
                    return res.status(400).json({
                        success: false,
                        error: 'relationType, sourceEntityId e targetEntityId sono richiesti'
                    });
                }
                
                // Merge attributes with other fields (for backward compatibility)
                const relationAttributes = { ...attributes, ...otherFields };
                
                // Remove system fields from attributes
                delete relationAttributes.relationType;
                delete relationAttributes.sourceEntityId;
                delete relationAttributes.targetEntityId;
                delete relationAttributes.attributes;
                
                const relation = await this.relationEngine.createRelation(
                    relationType, 
                    sourceEntityId, 
                    targetEntityId, 
                    relationAttributes
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

        // POST /api/relations/find - Trova relazioni con pattern nel body
        this.app.post('/api/relations/find', async (req, res) => {
            try {
                const pattern = req.body || {};
                
                const relations = await this.relationEngine.findRelations(pattern);
                
                res.json({
                    success: true,
                    data: relations,
                    count: relations.length,
                    pattern: pattern
                });
            } catch (error) {
                console.error('❌ Errore ricerca relazioni POST:', error);
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
     * ✨ NUOVO: Genera schemi organici dall'uso effettivo del sistema
     */
    async generateOrganicSchemas() {
        try {
            console.log('🌱 Generando schemi organici dall\'uso...');
            
            // 1. Recupera tutti i tipi di entità dal database
            const cypher = `
                MATCH (e:Entity)
                WHERE e.entityType IS NOT NULL
                RETURN DISTINCT e.entityType as entityType, COUNT(e) as count
                ORDER BY count DESC
            `;
            
            const result = await neo4jConnector.executeQuery(cypher);
            const entityTypes = result.records.map(record => {
                const count = record.get('count');
                return {
                    entityType: record.get('entityType'),
                    instanceCount: typeof count === 'object' && count.toNumber ? count.toNumber() : parseInt(count)
                };
            });
            
            // 2. Per ogni tipo di entità, genera schema dall'AttributeDiscovery
            const organicSchemas = [];
            
            for (const { entityType, instanceCount } of entityTypes) {
                try {
                    // Ottieni documentazione vivente dall'AttributeDiscovery
                    const livingDoc = await this.attributeDiscovery.generateLivingDocumentation(entityType);
                    
                    // Converti in formato schema compatibile
                    const organicSchema = {
                        entityType,
                        mode: 'organic',
                        instanceCount,
                        attributes: livingDoc.attributes.map(attr => ({
                            name: attr.name,
                            type: attr.type,
                            confidence: attr.confidence,
                            usageCount: attr.usage,
                            examples: attr.examples,
                            status: attr.status,
                            required: false, // Schema organico: tutto opzionale
                            organic: true
                        })),
                        emergence: livingDoc.emergence,
                        version: 1,
                        organic: true,
                        lastAnalyzed: livingDoc.generatedAt
                    };
                    
                    organicSchemas.push(organicSchema);
                    
                } catch (error) {
                    console.warn(`⚠️ Errore generazione schema organico per ${entityType}:`, error.message);
                    
                    // Fallback schema vuoto ma valido
                    organicSchemas.push({
                        entityType,
                        mode: 'organic',
                        instanceCount,
                        attributes: [],
                        emergence: { totalAttributes: 0, highConfidence: 0, emergingPatterns: 0 },
                        version: 1,
                        organic: true,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            console.log(`✅ Generati ${organicSchemas.length} schemi organici`);
            return organicSchemas;
            
        } catch (error) {
            console.error('❌ Errore generazione schemi organici:', error);
            return []; // Fallback vuoto
        }
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
            // 🔧 Prima connetti Neo4j
            console.log('🔌 Connessione a Neo4j...');
            await neo4jConnector.connect();
            
            // Poi inizializza i componenti evoluti
            await this.initializeEvolvedComponents();
            
            // Infine avvia il server HTTP
            return new Promise((resolve, reject) => {
                this.server.listen(port, (err) => {
                    if (err) {
                        console.error('❌ Errore avvio server:', err);
                        reject(err);
                    } else {
                        console.log(`🚀 Server SSOT Dinamico Evoluto (Fase 4 - AttributeSpace) avviato su porta ${port}`);
                        console.log(`📱 Dashboard: http://localhost:${port}/`);
                        console.log(`🔌 WebSocket: ws://localhost:${port}/`);
                        console.log(`🧠 Componenti attivi: AttributeSpace Evoluto, EntityEngine Evoluto, RelationEngine, SchemaManager Evoluto`);
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
        try {
            // Chiudi connessioni WebSocket
            this.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.close();
                }
            });
            
            // Ferma il server HTTP
            await new Promise((resolve) => {
                this.server.close(() => {
                    console.log('🛑 Server HTTP arrestato');
                    resolve();
                });
            });
            
            // 🔧 Disconnetti Neo4j
            console.log('🔌 Disconnessione da Neo4j...');
            await neo4jConnector.close();
            
            console.log('✅ Server completamente arrestato');
            
        } catch (error) {
            console.error('❌ Errore durante arresto server:', error);
            throw error;
        }
    }
}

module.exports = EvolvedServer; 

// ============================================================================
// 🚀 AVVIO DEL SERVER
// ============================================================================

// Se questo file viene eseguito direttamente (non importato come modulo)
if (require.main === module) {
    console.log('🎯 Avvio Server SSOT Dinamico Evoluto - Fase 1 Frontend');
    console.log('=' .repeat(60));
    
    const server = new EvolvedServer();
    const PORT = process.env.PORT || 3000;
    
    // Gestione graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Ricevuto SIGINT, arresto del server...');
        try {
            await server.stop();
            process.exit(0);
        } catch (error) {
            console.error('❌ Errore durante arresto:', error);
            process.exit(1);
        }
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Ricevuto SIGTERM, arresto del server...');
        try {
            await server.stop();
            process.exit(0);
        } catch (error) {
            console.error('❌ Errore durante arresto:', error);
            process.exit(1);
        }
    });
    
    // Gestione errori non catturati
    process.on('uncaughtException', (error) => {
        console.error('❌ Errore non catturato:', error);
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Promise rejection non gestita:', reason);
        process.exit(1);
    });
    
    // Avvia il server
    server.start(PORT)
        .then(() => {
            console.log(`✅ Server pronto per frontend evoluto Fase 1`);
            console.log(`📋 Servizi disponibili:`);
            console.log(`   - API MVP compatibili per fallback`);
            console.log(`   - API evolute per SchemaService`);
            console.log(`   - File statici frontend da /frontend/`);
            console.log(`   - WebSocket per real-time updates`);
            console.log(`   - Template test page: http://localhost:${PORT}/views/template-test.html`);
            console.log('=' .repeat(60));
        })
        .catch((error) => {
            console.error('❌ Errore avvio server:', error);
            process.exit(1);
        });
} 
