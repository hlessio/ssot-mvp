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

// ✨ FASE 1 UI DINAMICA: Import ModuleRelationService
const ModuleRelationService = require('./services/ModuleRelationService');

// ✨ SSOT-4000: Import DocumentService
const DocumentService = require('./services/DocumentService');

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
        
        // ✨ FASE 1 UI DINAMICA: Inizializzazione ModuleRelationService
        this.moduleRelationService = new ModuleRelationService(neo4jDAO, this.attributeSpace);
        
        // ✨ SSOT-4000: Inizializzazione DocumentService
        this.documentService = new DocumentService(neo4jDAO, this.entityEngine, this.schemaManager, this.attributeSpace);
        
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
            
            // Inizializza schemi base del sistema
            await this.initializeBaseSchemas();
            console.log('✅ Schemi base del sistema inizializzati');
            
            // Carica relazioni esistenti nel RelationEngine
            await this.relationEngine.loadAllRelations();
            console.log('✅ RelationEngine caricato con relazioni esistenti');
            
            console.log('🎯 Tutti i componenti evoluti inizializzati con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione componenti evoluti:', error);
            throw error;
        }
    }

    /**
     * Inizializza gli schemi base del sistema (Project, ModuleInstance, CompositeDocument)
     */
    async initializeBaseSchemas() {
        try {
            console.log('📋 Inizializzazione schemi base del sistema...');

            // Schema per Project (se non esiste già)
            if (!this.schemaManager.getEntitySchema('Project')) {
                const projectSchema = {
                    mode: 'strict',
                    attributes: {
                        name: { 
                            type: 'string', 
                            required: true,
                            description: 'Nome del progetto'
                        },
                        description: { 
                            type: 'text',
                            description: 'Descrizione del progetto'
                        },
                        status: {
                            type: 'select',
                            options: ['active', 'completed', 'archived', 'draft'],
                            defaultValue: 'active',
                            description: 'Stato del progetto'
                        },
                        startDate: {
                            type: 'date',
                            description: 'Data di inizio del progetto'
                        },
                        endDate: {
                            type: 'date',
                            description: 'Data di fine del progetto'
                        },
                        budget: {
                            type: 'number',
                            min: 0,
                            description: 'Budget del progetto'
                        }
                    }
                };
                await this.schemaManager.defineEntitySchema('Project', projectSchema);
                console.log('✅ Schema Project definito');
            }

            // Schema per ModuleInstance (se non esiste già)
            if (!this.schemaManager.getEntitySchema('ModuleInstance')) {
                const moduleInstanceSchema = {
                    mode: 'strict',
                    attributes: {
                        templateId: {
                            type: 'string',
                            required: true,
                            description: 'ID del template del modulo'
                        },
                        name: {
                            type: 'string',
                            required: true,
                            description: 'Nome dell\'istanza del modulo'
                        },
                        configuration: {
                            type: 'json',
                            defaultValue: {},
                            description: 'Configurazione specifica del modulo'
                        },
                        projectId: {
                            type: 'reference',
                            referencesEntityType: 'Project',
                            relationTypeForReference: 'BELONGS_TO',
                            displayAttributeFromReferencedEntity: 'name',
                            description: 'Progetto di appartenenza'
                        }
                    }
                };
                await this.schemaManager.defineEntitySchema('ModuleInstance', moduleInstanceSchema);
                console.log('✅ Schema ModuleInstance definito');
            }

            // Schema per CompositeDocument (NUOVO per SSOT-4000)
            if (!this.schemaManager.getEntitySchema('CompositeDocument')) {
                const compositeDocumentSchema = {
                    mode: 'strict',
                    attributes: {
                        name: {
                            type: 'string',
                            required: true,
                            description: 'Nome del documento composito'
                        },
                        description: {
                            type: 'text',
                            description: 'Descrizione del documento'
                        },
                        projectId: {
                            type: 'reference',
                            referencesEntityType: 'Project',
                            relationTypeForReference: 'BELONGS_TO',
                            displayAttributeFromReferencedEntity: 'name',
                            description: 'Progetto di appartenenza del documento'
                        },
                        layout: {
                            type: 'json',
                            defaultValue: {
                                type: 'grid',
                                columns: 2,
                                modules: []
                            },
                            description: 'Layout e configurazione dei moduli nel documento'
                        },
                        ownerId: {
                            type: 'string',
                            required: true,
                            description: 'ID del proprietario del documento'
                        },
                        metadata: {
                            type: 'json',
                            defaultValue: {},
                            description: 'Metadati aggiuntivi del documento'
                        },
                        status: {
                            type: 'select',
                            options: ['draft', 'published', 'archived'],
                            defaultValue: 'draft',
                            description: 'Stato del documento'
                        },
                        createdAt: {
                            type: 'string',
                            description: 'Data di creazione del documento'
                        },
                        modifiedAt: {
                            type: 'string',
                            description: 'Data di ultima modifica del documento'
                        }
                    }
                };
                await this.schemaManager.defineEntitySchema('CompositeDocument', compositeDocumentSchema);
                console.log('✅ Schema CompositeDocument definito per SSOT-4000');
            }

            // Schema per la relazione CONTAINS_MODULE (CompositeDocument -> ModuleInstance)
            if (!this.schemaManager.getRelationSchema('CONTAINS_MODULE')) {
                const containsModuleSchema = {
                    cardinality: '1:N', // Un documento può contenere molti moduli
                    sourceTypes: ['CompositeDocument'],
                    targetTypes: ['ModuleInstance'],
                    attributes: {
                        order: {
                            type: 'number',
                            required: true,
                            description: 'Ordine del modulo nel documento'
                        },
                        position: {
                            type: 'json',
                            defaultValue: { x: 0, y: 0 },
                            description: 'Posizione del modulo nel layout'
                        },
                        size: {
                            type: 'json',
                            defaultValue: { width: 1, height: 1 },
                            description: 'Dimensione del modulo nel layout'
                        },
                        collapsed: {
                            type: 'boolean',
                            defaultValue: false,
                            description: 'Stato di collasso del modulo'
                        },
                        config: {
                            type: 'json',
                            defaultValue: {},
                            description: 'Configurazione specifica per questo modulo nel documento'
                        }
                    }
                };
                await this.schemaManager.defineRelationSchema('CONTAINS_MODULE', containsModuleSchema);
                console.log('✅ Schema relazione CONTAINS_MODULE definito');
            }

            console.log('📋 Tutti gli schemi base inizializzati con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione schemi base:', error);
            // Non blocchiamo l'avvio se alcuni schemi esistono già
            if (error.message && !error.message.includes('già esiste')) {
                throw error;
            }
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
            
            // Inizializza le sottoscrizioni del client
            ws.subscriptions = new Set();
            this.clients.add(ws);
            
            // Messaggio di benvenuto
            ws.send(JSON.stringify({
                type: 'connection',
                message: 'Connesso al server SSOT Dinamico Evoluto (SSOT-4000)',
                timestamp: new Date().toISOString()
            }));
            
            // Gestione messaggi dal client
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(ws, data);
                } catch (error) {
                    console.error('❌ Errore parsing messaggio WebSocket:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Formato messaggio non valido',
                        timestamp: new Date().toISOString()
                    }));
                }
            });
            
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

    /**
     * Gestisce i messaggi ricevuti dai client WebSocket
     */
    handleClientMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                this.handleSubscription(ws, data.pattern);
                break;
            case 'unsubscribe':
                this.handleUnsubscription(ws, data.pattern);
                break;
            case 'ping':
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
                break;
            default:
                console.warn('⚠️ Tipo messaggio WebSocket non supportato:', data.type);
        }
    }

    /**
     * Gestisce le sottoscrizioni client
     */
    handleSubscription(ws, pattern) {
        const subscription = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            pattern: pattern
        };
        
        ws.subscriptions.add(subscription);
        
        console.log('📡 Nuova sottoscrizione WebSocket:', subscription);
        
        ws.send(JSON.stringify({
            type: 'subscription-confirmed',
            subscriptionId: subscription.id,
            pattern: pattern,
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * Gestisce la rimozione delle sottoscrizioni
     */
    handleUnsubscription(ws, pattern) {
        const toRemove = Array.from(ws.subscriptions).filter(sub => 
            JSON.stringify(sub.pattern) === JSON.stringify(pattern)
        );
        
        toRemove.forEach(sub => ws.subscriptions.delete(sub));
        
        ws.send(JSON.stringify({
            type: 'unsubscription-confirmed',
            pattern: pattern,
            timestamp: new Date().toISOString()
        }));
    }

    setupAttributeSpaceNotifications() {
        console.log('🔗🔗🔗 SETTING UP ATTRIBUTESPACE NOTIFICATIONS');
        // ✨ NUOVO: Integrazione AttributeSpace Evoluto con pattern matching avanzato
        
        // Sottoscrizione 1: Tutte le modifiche entità con filtri intelligenti
        this.attributeSpace.subscribe({
            type: 'entity',
            changeType: '*'
        }, (changeNotification) => {
            // Crea messaggio standardizzato
            const message = {
                type: 'change',
                entityType: changeNotification.entityType,
                entityId: changeNotification.entityId,
                changeType: changeNotification.changeType,
                attributeName: changeNotification.attributeName,
                data: {
                    newValue: changeNotification.newValue,
                    oldValue: changeNotification.oldValue
                },
                timestamp: new Date().toISOString()
            };
            
            // Invia solo ai client con sottoscrizioni matching
            this.broadcastToSubscribedClients(message);
            
            console.log('🔄🔄🔄 WEBSOCKET BROADCASTING:', {
                entityType: changeNotification.entityType,
                entityId: changeNotification.entityId,
                attributeName: changeNotification.attributeName,
                newValue: changeNotification.newValue,
                changeType: changeNotification.changeType,
                clients: this.clients.size,
                message: message
            });
        });

        // Sottoscrizione 2: Eventi relazioni
        this.attributeSpace.subscribe({
            type: 'relation',
            changeType: '*'
        }, (changeNotification) => {
            const message = {
                type: 'relation-change',
                relationType: changeNotification.relationType,
                sourceEntityId: changeNotification.sourceEntityId,
                targetEntityId: changeNotification.targetEntityId,
                changeType: changeNotification.changeType,
                data: changeNotification.data,
                timestamp: new Date().toISOString()
            };
            
            this.broadcastToSubscribedClients(message);
            
            console.log('🔗 Notifica relazione propagata:', {
                relationType: changeNotification.relationType,
                changeType: changeNotification.changeType,
                clients: this.clients.size
            });
        });

        // Sottoscrizione 3: Eventi schema
        this.attributeSpace.subscribe({
            type: 'schema',
            changeType: '*'
        }, (changeNotification) => {
            const message = {
                type: 'schema-change',
                entityType: changeNotification.entityType,
                changeType: changeNotification.changeType,
                data: changeNotification.data,
                timestamp: new Date().toISOString()
            };
            
            this.broadcastToSubscribedClients(message);
            
            console.log('📋 Notifica schema propagata:', {
                entityType: changeNotification.entityType,
                changeType: changeNotification.changeType,
                clients: this.clients.size
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

        // ============================================
        // ENDPOINT MODULE RELATION SERVICE (Fase 1 UI Dinamica)
        // ============================================

        // POST /api/modules/:moduleId/members - Aggiunge un membro al modulo con attributi
        this.app.post('/api/modules/:moduleId/members', async (req, res) => {
            try {
                const { moduleId } = req.params;
                const { entityId, relationAttributes } = req.body;
                
                if (!entityId) {
                    return res.status(400).json({
                        success: false,
                        error: 'entityId è richiesto'
                    });
                }
                
                const result = await this.moduleRelationService.addEntityToModule(
                    entityId, 
                    moduleId, 
                    relationAttributes || {}
                );
                
                res.status(201).json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error('❌ Errore aggiunta membro al modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/modules/:moduleId/members/:entityId/attributes - Aggiorna attributi relazione
        this.app.put('/api/modules/:moduleId/members/:entityId/attributes', async (req, res) => {
            try {
                const { moduleId, entityId } = req.params;
                const { attributes } = req.body;
                
                if (!attributes || typeof attributes !== 'object') {
                    return res.status(400).json({
                        success: false,
                        error: 'attributes è richiesto e deve essere un oggetto'
                    });
                }
                
                const result = await this.moduleRelationService.updateMembershipAttributes(
                    entityId, 
                    moduleId, 
                    attributes
                );
                
                res.json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento attributi membro:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/modules/:moduleId/members - Recupera membri del modulo con attributi
        this.app.get('/api/modules/:moduleId/members', async (req, res) => {
            try {
                const { moduleId } = req.params;
                const options = {
                    limit: parseInt(req.query.limit) || 100,
                    offset: parseInt(req.query.offset) || 0,
                    orderBy: req.query.orderBy || 'addedAt'
                };
                
                const members = await this.moduleRelationService.getModuleMembers(moduleId, options);
                
                res.json({
                    success: true,
                    data: members,
                    count: members.length,
                    moduleId: moduleId
                });
            } catch (error) {
                console.error('❌ Errore recupero membri modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // DELETE /api/modules/:moduleId/members/:entityId - Rimuove membro dal modulo
        this.app.delete('/api/modules/:moduleId/members/:entityId', async (req, res) => {
            try {
                const { moduleId, entityId } = req.params;
                
                await this.moduleRelationService.removeEntityFromModule(entityId, moduleId);
                
                res.json({
                    success: true,
                    message: `Entità ${entityId} rimossa dal modulo ${moduleId}`
                });
            } catch (error) {
                console.error('❌ Errore rimozione membro dal modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/entities/:entityId/projects - Recupera progetti di un'entità
        this.app.get('/api/entities/:entityId/projects', async (req, res) => {
            try {
                const { entityId } = req.params;
                const options = {
                    includeModuleDetails: req.query.includeModuleDetails !== 'false'
                };
                
                const projects = await this.moduleRelationService.getEntityProjects(entityId, options);
                
                res.json({
                    success: true,
                    data: projects,
                    count: projects.length,
                    entityId: entityId
                });
            } catch (error) {
                console.error('❌ Errore recupero progetti entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/modules/:moduleId/aggregates - Calcola aggregati del modulo
        this.app.get('/api/modules/:moduleId/aggregates', async (req, res) => {
            try {
                const { moduleId } = req.params;
                const aggregateField = req.query.field || 'fee';
                
                const aggregates = await this.moduleRelationService.getModuleAggregates(
                    moduleId, 
                    aggregateField
                );
                
                res.json({
                    success: true,
                    data: aggregates,
                    moduleId: moduleId,
                    field: aggregateField
                });
            } catch (error) {
                console.error('❌ Errore calcolo aggregati modulo:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // POST /api/projects/:projectId/modules/:moduleId/link - Collega modulo a progetto
        this.app.post('/api/projects/:projectId/modules/:moduleId/link', async (req, res) => {
            try {
                const { projectId, moduleId } = req.params;
                
                const result = await this.moduleRelationService.linkModuleToProject(projectId, moduleId);
                
                res.status(201).json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error('❌ Errore collegamento modulo a progetto:', error);
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

        // ============================================
        // SSOT-4000: ENDPOINTS COMPOSITE DOCUMENTS
        // ============================================

        // POST /api/documents - Crea un nuovo CompositeDocument
        this.app.post('/api/documents', async (req, res) => {
            try {
                const documentData = req.body;
                
                console.log('📄 [Document] Creazione nuovo CompositeDocument:', documentData);
                
                const newDocument = await this.documentService.createDocument(documentData);
                
                // Notifica creazione documento via WebSocket
                this.broadcastMessage({
                    type: 'document-created',
                    data: newDocument,
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json({
                    success: true,
                    data: newDocument
                });
            } catch (error) {
                console.error('❌ Errore creazione documento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/documents/:id - Recupera un documento con i suoi moduli
        this.app.get('/api/documents/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const options = {
                    includeModules: req.query.includeModules !== 'false',
                    includeProject: req.query.includeProject === 'true'
                };
                
                const documentData = await this.documentService.getDocument(id, options);
                
                res.json({
                    success: true,
                    data: documentData
                });
            } catch (error) {
                console.error('❌ Errore recupero documento:', error);
                res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/documents/:id - Aggiorna un documento
        this.app.put('/api/documents/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updates = req.body;
                
                const updatedDocument = await this.documentService.updateDocument(id, updates);
                
                // Notifica aggiornamento documento via WebSocket
                this.broadcastMessage({
                    type: 'document-updated',
                    data: {
                        documentId: id,
                        updates: updates,
                        document: updatedDocument
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    data: updatedDocument
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento documento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // DELETE /api/documents/:id - Elimina un documento
        this.app.delete('/api/documents/:id', async (req, res) => {
            try {
                const { id } = req.params;
                
                await this.documentService.deleteDocument(id);
                
                // Notifica eliminazione documento via WebSocket
                this.broadcastMessage({
                    type: 'document-deleted',
                    data: { documentId: id },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    message: `Documento ${id} eliminato con successo`
                });
            } catch (error) {
                console.error('❌ Errore eliminazione documento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/documents/:id/modules - Gestione moduli nel documento
        this.app.put('/api/documents/:id/modules', async (req, res) => {
            try {
                const { id } = req.params;
                const { action, moduleId, layoutConfig } = req.body;
                
                let result;
                
                switch (action) {
                    case 'add':
                        result = await this.documentService.addModuleToDocument(id, moduleId, layoutConfig);
                        break;
                    case 'update':
                        result = await this.documentService.updateModuleInDocument(id, moduleId, layoutConfig);
                        break;
                    case 'remove':
                        result = await this.documentService.removeModuleFromDocument(id, moduleId);
                        break;
                    default:
                        return res.status(400).json({
                            success: false,
                            error: 'Azione non valida. Usa "add", "update" o "remove"'
                        });
                }
                
                // Notifica modifica moduli via WebSocket
                this.broadcastMessage({
                    type: 'document-modules-updated',
                    data: {
                        documentId: id,
                        action: action,
                        moduleId: moduleId,
                        result: result
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error('❌ Errore gestione moduli documento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // PUT /api/documents/:id/layout - Aggiorna il layout dei moduli
        this.app.put('/api/documents/:id/layout', async (req, res) => {
            try {
                const { id } = req.params;
                const { moduleLayouts } = req.body;
                
                if (!Array.isArray(moduleLayouts)) {
                    return res.status(400).json({
                        success: false,
                        error: 'moduleLayouts deve essere un array'
                    });
                }
                
                const updatedDocument = await this.documentService.updateDocumentLayout(id, moduleLayouts);
                
                // Notifica aggiornamento layout via WebSocket
                this.broadcastMessage({
                    type: 'document-layout-updated',
                    data: {
                        documentId: id,
                        layout: updatedDocument.document.layout
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    success: true,
                    data: updatedDocument
                });
            } catch (error) {
                console.error('❌ Errore aggiornamento layout documento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/documents - Lista documenti con filtri
        this.app.get('/api/documents', async (req, res) => {
            try {
                const filters = {
                    projectId: req.query.projectId,
                    ownerId: req.query.ownerId,
                    status: req.query.status
                };
                
                const options = {
                    limit: parseInt(req.query.limit) || 50,
                    offset: parseInt(req.query.offset) || 0,
                    orderBy: req.query.orderBy || 'modifiedAt',
                    orderDirection: req.query.orderDirection || 'DESC'
                };
                
                const documents = await this.documentService.listDocuments(filters, options);
                
                res.json({
                    success: true,
                    data: documents,
                    count: documents.length,
                    filters: filters,
                    pagination: options
                });
            } catch (error) {
                console.error('❌ Errore lista documenti:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // POST /api/documents/:id/clone - Clona un documento
        this.app.post('/api/documents/:id/clone', async (req, res) => {
            try {
                const { id } = req.params;
                const overrides = req.body;
                
                const clonedDocument = await this.documentService.cloneDocument(id, overrides);
                
                // Notifica creazione clone via WebSocket
                this.broadcastMessage({
                    type: 'document-cloned',
                    data: {
                        originalId: id,
                        clonedDocument: clonedDocument
                    },
                    timestamp: new Date().toISOString()
                });
                
                res.status(201).json({
                    success: true,
                    data: clonedDocument
                });
            } catch (error) {
                console.error('❌ Errore clonazione documento:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/documents/:id/context - Recupera il contesto ereditabile del documento
        this.app.get('/api/documents/:id/context', async (req, res) => {
            try {
                const { id } = req.params;
                
                const context = await this.documentService.getDocumentContext(id);
                
                res.json({
                    success: true,
                    data: context
                });
            } catch (error) {
                console.error('❌ Errore recupero contesto documento:', error);
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
     * Invia messaggi solo ai client con sottoscrizioni matching
     */
    broadcastToSubscribedClients(message) {
        const messageString = JSON.stringify(message);
        
        console.log(`📡 Broadcasting to ${this.clients.size} clients:`, message.type);
        
        this.clients.forEach((client, index) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageString);
                    console.log(`📡 Sent message to client ${index + 1}/${this.clients.size}`);
                } catch (error) {
                    console.error(`❌ Error sending to client ${index + 1}:`, error);
                }
            } else {
                console.log(`⚠️ Client ${index + 1} not ready (state: ${client.readyState})`);
            }
        });
    }

    /**
     * Verifica se un messaggio corrisponde a una sottoscrizione pattern
     */
    messageMatchesSubscription(message, pattern) {
        // Pattern vuoto o non definito = match tutto
        if (!pattern) return true;
        
        // Verifica tipo di entità
        if (pattern.entityType && pattern.entityType !== '*' && 
            message.entityType !== pattern.entityType) {
            return false;
        }
        
        // Verifica ID entità specifico
        if (pattern.entityId && pattern.entityId !== '*' && 
            message.entityId !== pattern.entityId) {
            return false;
        }
        
        // Verifica tipo di cambiamento
        if (pattern.changeType && pattern.changeType !== '*' && 
            message.changeType !== pattern.changeType) {
            return false;
        }
        
        // Verifica nome attributo
        if (pattern.attributeName && pattern.attributeName !== '*' && 
            message.attributeName !== pattern.attributeName) {
            return false;
        }
        
        // Verifica tipo di relazione (per messaggi di relazione)
        if (pattern.relationType && pattern.relationType !== '*' && 
            message.relationType !== pattern.relationType) {
            return false;
        }
        
        return true;
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
