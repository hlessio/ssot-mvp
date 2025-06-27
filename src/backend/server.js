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
        this.entityEngine = new EntityEngine(neo4jDAO, this.schemaManager, null, this.attributeSpace);
        this.relationEngine = new RelationEngine(this.entityEngine, this.schemaManager, neo4jDAO);
        
        // Ora aggiorna EntityEngine con RelationEngine
        this.entityEngine.relationEngine = this.relationEngine;
        
        // ✨ FASE 1 UI DINAMICA: Inizializzazione ModuleRelationService
        this.moduleRelationService = new ModuleRelationService(neo4jDAO, this.attributeSpace);
        
        // ✨ SSOT-4000: Inizializzazione DocumentService
        this.documentService = new DocumentService(neo4jDAO, this.entityEngine, this.schemaManager, this.attributeSpace, this.relationEngine);
        
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
                        layout: {
                            type: 'json',
                            defaultValue: {
                                position: { x: 0, y: 0 },
                                size: { width: 300, height: 200 }
                            },
                            description: 'Layout del modulo nel canvas (posizione e dimensione)'
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
            // Forza aggiornamento schema esistente per aggiungere canvasLayout
            const existingCompositeDocSchema = this.schemaManager.getEntitySchema('CompositeDocument');
            if (!existingCompositeDocSchema || !existingCompositeDocSchema.attributes.canvasLayout) {
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
                        canvasLayout: {
                            type: 'json',
                            defaultValue: {
                                enabled: false,
                                blocks: [],
                                gridSize: 25,
                                version: '1.0',
                                metadata: {}
                            },
                            description: 'Layout canvas per moduli drag & drop con coordinate assolute'
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
        
        // Servire i file statici degli esempi
        this.app.use('/examples', express.static(path.join(__dirname, '../../examples')));
        
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
            
            // Removed verbose logging for performance - uncomment for debugging
            // console.log('🔄🔄🔄 WEBSOCKET BROADCASTING:', {
            //     entityType: changeNotification.entityType,
            //     entityId: changeNotification.entityId,
            //     attributeName: changeNotification.attributeName,
            //     newValue: changeNotification.newValue,
            //     changeType: changeNotification.changeType,
            //     clients: this.clients.size,
            //     message: message
            // });
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
                // ✅ UNIFICATO: Stessa logica dell'API standard
                const { entityType, attributes, initialData, ...directData } = req.body;
                
                if (!entityType) {
                    return res.status(400).json({
                        success: false,
                        error: 'entityType è richiesto'
                    });
                }
                
                // Determina i dati da usare (stessa logica API standard)
                delete directData.entityType;
                const entityData = attributes || initialData || directData;
                
                // ✅ UNIFICATO: Usa sempre EntityEngine MVP (stabile)
                const newEntity = await this.entityEngine_MVP.createEntity(entityType, entityData);
                
                // Notifica AttributeSpace per real-time sync
                if (this.attributeSpace && newEntity) {
                    this.attributeSpace.notifyChange({
                        type: 'entity',
                        entityType: entityType,
                        entityId: newEntity.id,
                        changeType: 'create',
                        newValue: newEntity,
                        timestamp: Date.now()
                    });
                }
                
                // Notifica via WebSocket per sincronizzazione real-time - DEPRECATED, AttributeSpace handles this now
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
                
                // Get entity type for WebSocket notification
                let entityType = null;
                try {
                    const entity = await this.entityEngine.getEntity(entityId);
                    entityType = entity?.entityType;
                } catch (error) {
                    console.warn('Could not get entity type for WebSocket notification:', error);
                }
                
                // Notifica AttributeSpace per real-time sync
                if (this.attributeSpace && entityType) {
                    this.attributeSpace.notifyChange({
                        type: 'entity',
                        entityType: entityType,
                        entityId: entityId,
                        attributeName: attributeName,
                        newValue: value,
                        changeType: 'update',
                        timestamp: Date.now()
                    });
                }
                
                // Notifica via WebSocket - DEPRECATED, AttributeSpace handles this now
                this.broadcastMessage({
                    type: 'attribute-updated',
                    data: {
                        entityId,
                        entityType,
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

        // POST /api/module-instances - Crea una nuova istanza di modulo (Schema Evoluto)
        this.app.post('/api/module-instances', async (req, res) => {
            try {
                const instanceData = req.body;
                
                // Validazione dati richiesti per schema evoluto
                const requiredFields = ['templateId', 'name'];
                const missingFields = requiredFields.filter(field => !instanceData[field]);
                
                if (missingFields.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Campi richiesti mancanti: ${missingFields.join(', ')}`
                    });
                }

                // Prepara i dati per la creazione
                const instanceToCreate = {
                    templateId: instanceData.templateId,
                    name: instanceData.name,
                    configuration: instanceData.configuration || {},
                    projectId: instanceData.projectId || null
                };

                console.log('📝 [ModuleInstance] Creando istanza (schema evoluto):', instanceToCreate);

                // Crea entità ModuleInstance tramite EntityEngine evoluto
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

        // DELETE /api/module-instances/cleanup-orphaned - Elimina tutti i ModuleInstance orfani (DEVE essere prima del path generico)
        this.app.delete('/api/module-instances/cleanup-orphaned', async (req, res) => {
            try {
                console.log('🧹 [ModuleInstance] Cleanup ModuleInstance orfani...');
                
                // Query per trovare ModuleInstance non collegati a nessun documento
                const findOrphanedQuery = `
                    MATCH (m:ModuleInstance)
                    WHERE NOT EXISTS {
                        MATCH (d:CompositeDocument)-[:CONTAINS_MODULE]->(m)
                    }
                    RETURN m.id as instanceId, m.name as instanceName
                `;
                
                const orphanedResult = await neo4jConnector.executeQuery(findOrphanedQuery);
                const orphanedIds = orphanedResult.records.map(record => ({
                    id: record.get('instanceId'),
                    name: record.get('instanceName')
                }));
                
                console.log(`🗑️ Trovati ${orphanedIds.length} ModuleInstance orfani da eliminare`);
                
                if (orphanedIds.length === 0) {
                    return res.json({
                        success: true,
                        message: 'Nessun ModuleInstance orfano trovato',
                        deletedCount: 0,
                        deletedInstances: []
                    });
                }
                
                // Elimina tutti i ModuleInstance orfani (query corretta)
                const deleteOrphanedQuery = `
                    MATCH (m:ModuleInstance)
                    WHERE NOT EXISTS {
                        MATCH (d:CompositeDocument)-[:CONTAINS_MODULE]->(m)
                    }
                    DELETE m
                `;
                
                await neo4jConnector.executeQuery(deleteOrphanedQuery);
                const deletedCount = orphanedIds.length;
                
                // Notifica via WebSocket
                this.broadcastMessage({
                    type: 'module-instances-cleanup',
                    data: {
                        deletedCount,
                        deletedInstances: orphanedIds
                    },
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ Eliminati ${deletedCount} ModuleInstance orfani`);
                
                res.json({
                    success: true,
                    message: `${deletedCount} ModuleInstance orfani eliminati con successo`,
                    deletedCount,
                    deletedInstances: orphanedIds
                });
            } catch (error) {
                console.error('❌ Errore cleanup ModuleInstance orfani:', error);
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

        // GET /api/entities/search - Ricerca generale entità (endpoint dedicato per evitare conflitti)
        this.app.get('/api/entities/search', async (req, res) => {
            try {
                const { search, entityType, limit = 50, offset = 0 } = req.query;
                
                let entities = [];
                
                if (entityType) {
                    // Ricerca per tipo specifico
                    if (this.enableEvolvedFeatures) {
                        entities = await this.entityEngine.getAllEntities(entityType);
                    } else {
                        entities = await this.entityEngine_MVP.getAllEntities(entityType);
                    }
                } else {
                    // Ricerca cross-entity type
                    const commonTypes = ['Persona', 'Contact', 'Project', 'ModuleInstance'];
                    for (const type of commonTypes) {
                        try {
                            let typeEntities;
                            if (this.enableEvolvedFeatures) {
                                typeEntities = await this.entityEngine.getAllEntities(type);
                            } else {
                                typeEntities = await this.entityEngine_MVP.getAllEntities(type);
                            }
                            entities = entities.concat(typeEntities);
                        } catch (error) {
                            // Ignora errori per tipi non esistenti
                            console.log(`Tipo ${type} non trovato, saltando...`);
                        }
                    }
                }
                
                // Applica filtro di ricerca se presente
                if (search && search.trim().length > 0) {
                    const searchTerm = search.toLowerCase().trim();
                    entities = entities.filter(entity => {
                        // Cerca nei campi comuni
                        const searchFields = [
                            entity.nome, entity.name, entity.title, entity.titolo,
                            entity.cognome, entity.surname, entity.email, 
                            entity.telefono, entity.phone, entity.ragioneSociale,
                            entity.companyName, entity.description, entity.descrizione
                        ].filter(Boolean);
                        
                        return searchFields.some(field => 
                            field && field.toString().toLowerCase().includes(searchTerm)
                        );
                    });
                }
                
                // Applica paginazione
                const startIndex = parseInt(offset);
                const limitNum = parseInt(limit);
                const paginatedEntities = entities.slice(startIndex, startIndex + limitNum);
                
                res.json({
                    success: true,
                    data: paginatedEntities,
                    count: paginatedEntities.length,
                    total: entities.length,
                    search: search || null,
                    entityType: entityType || 'all',
                    pagination: {
                        offset: startIndex,
                        limit: limitNum,
                        hasMore: startIndex + limitNum < entities.length
                    }
                });
            } catch (error) {
                console.error('Errore nella ricerca entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/entities/:entityType - Ottiene tutte le entità di un tipo (mantenuto per compatibilità)
        this.app.get('/api/entities/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { search, limit = 50, offset = 0 } = req.query;
                
                // Usa EntityEngine evoluto se abilitato, altrimenti MVP
                let entities;
                if (this.enableEvolvedFeatures) {
                    entities = await this.entityEngine.getAllEntities(entityType);
                } else {
                    entities = await this.entityEngine_MVP.getAllEntities(entityType);
                }
                
                // Applica filtro di ricerca se presente
                if (search && search.trim().length > 0) {
                    const searchTerm = search.toLowerCase().trim();
                    entities = entities.filter(entity => {
                        const searchFields = [
                            entity.nome, entity.name, entity.title, entity.titolo,
                            entity.cognome, entity.surname, entity.email, 
                            entity.telefono, entity.phone, entity.ragioneSociale,
                            entity.companyName, entity.description, entity.descrizione
                        ].filter(Boolean);
                        
                        return searchFields.some(field => 
                            field && field.toString().toLowerCase().includes(searchTerm)
                        );
                    });
                }
                
                // Applica paginazione
                const startIndex = parseInt(offset);
                const limitNum = parseInt(limit);
                const paginatedEntities = entities.slice(startIndex, startIndex + limitNum);
                
                res.json({
                    success: true,
                    data: paginatedEntities,
                    count: paginatedEntities.length,
                    total: entities.length,
                    search: search || null,
                    pagination: {
                        offset: startIndex,
                        limit: limitNum,
                        hasMore: startIndex + limitNum < entities.length
                    },
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
                
                // ✅ UNIFICATO: Usa sempre EntityEngine MVP (più stabile) 
                const entity = await this.entityEngine_MVP.getEntity(entityId);
                
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
                // ✅ CORREZIONE: Supporta sia formato {attributes: {...}} che attributi diretti
                const { entityType, attributes, initialData, ...directData } = req.body;
                
                // Determina i dati da usare:
                // 1. Se attributes è presente, usalo
                // 2. Se initialData è presente, usalo  
                // 3. Altrimenti usa attributi diretti dal body (escluso entityType)
                delete directData.entityType; // Remove entityType from attributes
                const entityData = attributes || initialData || directData;
                
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
                
                // ✅ UNIFICATO: Usa sempre EntityEngine MVP (più stabile)
                const newEntity = await this.entityEngine_MVP.createEntity(entityType, entityData);
                
                // Notifica AttributeSpace per real-time sync
                if (this.attributeSpace && newEntity) {
                    this.attributeSpace.notifyChange({
                        type: 'entity',
                        entityType: entityType,
                        entityId: newEntity.id,
                        changeType: 'create',
                        newValue: newEntity,
                        timestamp: Date.now()
                    });
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
                const { attributeName, attributeValue, value } = req.body;
                const attributeVal = attributeValue || value; // Support both field names
                
                if (!attributeName) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributeName è richiesto'
                    });
                }
                
                // ✅ UNIFICATO: Usa sempre EntityEngine MVP (più stabile)
                await this.entityEngine_MVP.setEntityAttribute(entityId, attributeName, attributeVal);
                
                // Get entity type for WebSocket notification
                let entityType = null;
                try {
                    const entity = await this.entityEngine_MVP.getEntity(entityId);
                    entityType = entity?.entityType;
                } catch (error) {
                    console.warn('Could not get entity type for WebSocket notification:', error);
                }
                
                // Notifica AttributeSpace per real-time sync
                if (this.attributeSpace && entityType) {
                    this.attributeSpace.notifyChange({
                        type: 'entity',
                        entityType: entityType,
                        entityId: entityId,
                        attributeName: attributeName,
                        newValue: value,
                        changeType: 'update',
                        timestamp: Date.now()
                    });
                }
                
                // Notifica via WebSocket (same as evolved endpoint) - DEPRECATED, AttributeSpace handles this now
                this.broadcastMessage({
                    type: 'attribute-updated',
                    data: {
                        entityId,
                        entityType,
                        attributeName,
                        newValue: value
                    },
                    timestamp: new Date().toISOString()
                });
                
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

        // DELETE /api/entity/:entityId - Elimina un'entità
        this.app.delete('/api/entity/:entityId', async (req, res) => {
            try {
                const { entityId } = req.params;
                
                console.log(`🗑️ [Server] Eliminazione entità: ${entityId}`);
                
                // Verifica che l'entità esista
                let entity;
                try {
                    if (this.enableEvolvedFeatures) {
                        entity = await this.entityEngine.getEntity(entityId);
                    } else {
                        entity = await this.entityEngine_MVP.getEntity(entityId);
                    }
                } catch (error) {
                    return res.status(404).json({
                        success: false,
                        error: 'Entità non trovata'
                    });
                }
                
                if (!entity) {
                    return res.status(404).json({
                        success: false,
                        error: 'Entità non trovata'
                    });
                }
                
                // Elimina l'entità usando il metodo appropriato
                if (this.enableEvolvedFeatures) {
                    await this.entityEngine.deleteEntity(entityId);
                } else {
                    // Per MVP, elimina direttamente dal database
                    const deleteQuery = `
                        MATCH (e:Entity {id: $entityId})
                        DETACH DELETE e
                    `;
                    await this.neo4jDao.executeQuery(deleteQuery, { entityId });
                }
                
                // Notifica eliminazione via WebSocket
                this.broadcastMessage({
                    type: 'entity-deleted',
                    data: {
                        entityId: entityId,
                        entityType: entity.entityType
                    },
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ [Server] Entità ${entityId} eliminata con successo`);
                
                res.json({
                    success: true,
                    message: 'Entità eliminata con successo',
                    entityId: entityId,
                    engine: this.enableEvolvedFeatures ? 'evolved' : 'mvp'
                });
                
            } catch (error) {
                console.error(`❌ [Server] Errore eliminazione entità ${req.params.entityId}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/schema/:entityType/attributes - Recupera attributi definiti nello schema
        this.app.get('/api/schema/:entityType/attributes', async (req, res) => {
            try {
                const { entityType } = req.params;
                
                // Usa SchemaManager semplice per attributi definiti
                const schemaAttributes = this.schemaManager_MVP.getAttributesForType(entityType) || [];
                
                // Formato standardizzato per compatibilità
                const attributeList = schemaAttributes.map(attrName => ({
                    name: attrName,
                    type: 'string', // Default type
                    required: false,
                    source: 'schema'
                }));
                
                res.json({
                    success: true,
                    data: attributeList,
                    entityType: entityType,
                    count: attributeList.length,
                    source: 'schema_defined'
                });
            } catch (error) {
                console.error('Errore recupero attributi schema:', error);
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

        // GET /api/schema/entity/:entityType - Recupera schema entità con UI metadata
        this.app.get('/api/schema/entity/:entityType', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { includeUIMetadata, format } = req.query;
                
                const schema = this.schemaManager.getEntitySchema(entityType);
                
                if (!schema) {
                    return res.status(404).json({
                        success: false,
                        error: `Schema non trovato per il tipo ${entityType}`
                    });
                }

                let responseData = schema;

                // ✨ NUOVO: Support per formato specifico UI semantica
                if (format === 'semantic-ui') {
                    responseData = this.formatSchemaForSemanticUI(schema, entityType);
                } else if (includeUIMetadata === 'true' || includeUIMetadata === '1') {
                    // Include metadati UI espliciti in formato esteso
                    responseData = this.enrichSchemaWithUIMetadata(schema, entityType);
                }
                
                res.json({
                    success: true,
                    data: responseData,
                    meta: {
                        entityType,
                        includesUIMetadata: includeUIMetadata === 'true' || format === 'semantic-ui',
                        format: format || 'standard'
                    }
                });
            } catch (error) {
                console.error('❌ Errore recupero schema entità:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ✨ NUOVO: GET /api/schema/entity/:entityType/ui-metadata - Endpoint specifico per UI metadata
        this.app.get('/api/schema/entity/:entityType/ui-metadata', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { attributes } = req.query; // Lista specifica di attributi (opzionale)
                
                const schema = this.schemaManager.getEntitySchema(entityType);
                
                if (!schema) {
                    return res.status(404).json({
                        success: false,
                        error: `Schema non trovato per il tipo ${entityType}`
                    });
                }

                const uiMetadata = {};
                const targetAttributes = attributes ? attributes.split(',') : Object.keys(schema.attributes || {});

                // Estrai metadati UI per ogni attributo richiesto
                targetAttributes.forEach(attrName => {
                    const attrDef = schema.attributes?.[attrName];
                    if (attrDef && attrDef.getUIMetadata) {
                        uiMetadata[attrName] = attrDef.getUIMetadata();
                    } else if (attrDef) {
                        // Fallback per attributi senza metodi UI metadata
                        uiMetadata[attrName] = {
                            component: attrDef.uiMetadata?.component || this.getDefaultComponentForType(attrDef.type),
                            label: attrDef.uiMetadata?.label || attrName,
                            type: attrDef.type || 'string',
                            icon: attrDef.displaySettings?.icon || this.getDefaultIconForType(attrDef.type),
                            placeholder: attrDef.uiMetadata?.placeholder || `Inserisci ${attrName}...`,
                            priority: attrDef.renderingHints?.priority || 'medium',
                            group: attrDef.uiMetadata?.group || 'default',
                            order: attrDef.uiMetadata?.order || 0
                        };
                    }
                });

                res.json({
                    success: true,
                    data: {
                        entityType,
                        attributes: uiMetadata,
                        entityDisplayConfig: {
                            displayLabel: schema.displayLabel || entityType,
                            displayField: schema.displayField || 'nome',
                            defaultComponent: 'EntityCard',
                            listComponent: 'EntityTable'
                        }
                    },
                    meta: {
                        entityType,
                        attributeCount: Object.keys(uiMetadata).length,
                        requestedAttributes: attributes ? targetAttributes : null
                    }
                });

            } catch (error) {
                console.error('❌ Errore recupero UI metadata:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    data: null
                });
            }
        });

        // ✨ NUOVO: PUT /api/schema/entity/:entityType/ui-metadata - Aggiorna UI metadata
        this.app.put('/api/schema/entity/:entityType/ui-metadata', async (req, res) => {
            try {
                const { entityType } = req.params;
                const { attributeName, uiMetadata } = req.body;

                if (!attributeName || !uiMetadata) {
                    return res.status(400).json({
                        success: false,
                        error: 'attributeName e uiMetadata sono richiesti'
                    });
                }

                const schema = this.schemaManager.getEntitySchema(entityType);
                if (!schema) {
                    return res.status(404).json({
                        success: false,
                        error: `Schema non trovato per il tipo ${entityType}`
                    });
                }

                const attrDef = schema.attributes?.[attributeName];
                if (!attrDef) {
                    return res.status(404).json({
                        success: false,
                        error: `Attributo ${attributeName} non trovato nel schema ${entityType}`
                    });
                }

                // Aggiorna i metadati UI dell'attributo
                if (attrDef.uiMetadata) {
                    Object.assign(attrDef.uiMetadata, uiMetadata);
                } else {
                    attrDef.uiMetadata = uiMetadata;
                }

                // Salva lo schema aggiornato
                await this.schemaManager.persistSchema(entityType, schema);

                // Notifica cambiamento via WebSocket
                this.broadcastMessage({
                    type: 'ui-metadata-updated',
                    data: {
                        entityType,
                        attributeName,
                        uiMetadata: attrDef.getUIMetadata ? attrDef.getUIMetadata() : uiMetadata
                    },
                    timestamp: new Date().toISOString()
                });

                res.json({
                    success: true,
                    data: {
                        entityType,
                        attributeName,
                        updatedUIMetadata: attrDef.getUIMetadata ? attrDef.getUIMetadata() : uiMetadata
                    }
                });

            } catch (error) {
                console.error('❌ Errore aggiornamento UI metadata:', error);
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

        // ❌ REMOVED: Relations API (POST/GET/POST/GET /api/relations)
        // Motivo: Sistema usa relazioni Neo4j native (CONTAINS_MODULE)
        // Alternativa: Usa DocumentService per relazioni documento-modulo

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

        // ❌ REMOVED: PUT /api/modules/:moduleId/members/:entityId/attributes - Non implementato

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

        // ❌ REMOVED: POST /api/projects/:projectId/modules/:moduleId/link - Non funziona

        // ❌ REMOVED: Relations CRUD endpoints (GET/PUT/DELETE /api/relations/:id)
        // Sistema usa relazioni native Neo4j

        // ============================================
        // ADMIN ENDPOINTS - TEMPORARY FOR CLEANUP
        // ============================================
        
        // POST /api/admin/cleanup-duplicates - Clean duplicate entities
        this.app.post('/api/admin/cleanup-duplicates', async (req, res) => {
            try {
                const { entityType } = req.body;
                console.log(`🧹 [Admin] Inizio pulizia duplicati per tipo: ${entityType}`);
                
                // Get all entities of this type using existing endpoint logic
                const query = `
                    MATCH (e:Entity {entityType: $entityType})
                    RETURN e
                    ORDER BY e.created ASC
                `;
                const result = await this.neo4jDao.executeQuery(query, { entityType });
                const entities = result.map(record => record.e.properties);
                console.log(`📊 [Admin] Trovate ${entities.length} entità di tipo ${entityType}`);
                
                // Group by name (case insensitive)
                const groups = new Map();
                entities.forEach(entity => {
                    const name = (entity.nome || entity.name || '').trim().toLowerCase();
                    if (!name) return; // Skip entities without names
                    
                    if (!groups.has(name)) {
                        groups.set(name, []);
                    }
                    groups.get(name).push(entity);
                });
                
                let deletedCount = 0;
                let keptCount = 0;
                
                // For each group, keep the first one and delete the rest
                for (const [name, group] of groups) {
                    if (group.length > 1) {
                        console.log(`🔍 [Admin] Gruppo "${name}": ${group.length} duplicati`);
                        
                        // Keep the first entity, delete the others
                        const [keep, ...toDelete] = group;
                        keptCount++;
                        
                        for (const entity of toDelete) {
                            const deleteQuery = `
                                MATCH (e:Entity {id: $entityId})
                                DETACH DELETE e
                            `;
                            await this.neo4jDao.executeQuery(deleteQuery, { entityId: entity.id });
                            deletedCount++;
                            console.log(`🗑️ [Admin] Eliminata entità duplicata: ${entity.id}`);
                        }
                    } else {
                        keptCount++;
                    }
                }
                
                console.log(`✅ [Admin] Pulizia completata: ${deletedCount} eliminati, ${keptCount} mantenuti`);
                
                res.json({
                    success: true,
                    message: `Pulizia completata per ${entityType}`,
                    data: {
                        deleted: deletedCount,
                        kept: keptCount,
                        originalCount: entities.length
                    }
                });
                
            } catch (error) {
                console.error('❌ [Admin] Errore pulizia duplicati:', error);
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
                    data: JSON.parse(JSON.stringify(updatedDocument)),
                    message: "Documento aggiornato con successo"
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

        // ❌ REMOVED: PUT /api/documents/:id/modules - Obsoleto, usa Canvas API

        // ❌ REMOVED: PUT /api/documents/:id/layout - Obsoleto, usa Canvas API

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

        // ❌ REMOVED: POST /api/documents/:id/clone - Non implementato

        // ❌ REMOVED: GET /api/documents/:id/context - Non implementato

        // ===== CANVAS DOCUMENT ENDPOINTS =====
        
        // PUT /api/documents/:id/canvas - Salva layout canvas in documento
        this.app.put('/api/documents/:id/canvas', async (req, res) => {
            try {
                const { id } = req.params;
                const { canvasLayout } = req.body;
                
                if (!canvasLayout) {
                    return res.status(400).json({
                        success: false,
                        error: 'canvasLayout è richiesto'
                    });
                }
                
                // Valida la struttura del canvas layout
                const validatedLayout = {
                    enabled: canvasLayout.enabled !== false,
                    blocks: canvasLayout.blocks || [],
                    gridSize: canvasLayout.gridSize || 25,
                    version: canvasLayout.version || '1.0',
                    metadata: canvasLayout.metadata || {},
                    updatedAt: new Date().toISOString()
                };
                
                // Aggiorna il documento con il nuovo canvas layout
                await this.entityEngine.setEntityAttribute(id, 'canvasLayout', validatedLayout);
                
                // ✨ NUOVO: Crea relazioni CONTAINS_MODULE per ogni ModuleInstance nel canvas
                if (validatedLayout.blocks && validatedLayout.blocks.length > 0) {
                    console.log(`🔗 Creando relazioni CONTAINS_MODULE per ${validatedLayout.blocks.length} blocchi canvas`);
                    
                    // Prima rimuovi tutte le relazioni esistenti per questo documento (relazioni dirette)
                    const removeRelationsQuery = `
                        MATCH (d:CompositeDocument {id: $documentId})-[r:CONTAINS_MODULE]->()
                        DELETE r
                    `;
                    await neo4jConnector.executeQuery(removeRelationsQuery, { documentId: id });
                    
                    // Poi crea le nuove relazioni per ogni blocco con instanceId
                    let relationsCreated = 0;
                    for (let i = 0; i < validatedLayout.blocks.length; i++) {
                        const block = validatedLayout.blocks[i];
                        if (block.instanceId) {
                            try {
                                await this.documentService.addModuleToDocument(id, block.instanceId, {
                                    order: i,
                                    position: { x: block.x, y: block.y },
                                    size: { width: block.width, height: block.height },
                                    collapsed: false,
                                    config: {
                                        blockId: block.id,
                                        type: block.type,
                                        title: block.title,
                                        templateId: block.templateId,
                                        entityType: block.entityType
                                    }
                                });
                                relationsCreated++;
                                console.log(`✅ Relazione CONTAINS_MODULE creata: ${id} -> ${block.instanceId}`);
                            } catch (relationError) {
                                console.warn(`⚠️ Errore creazione relazione per blocco ${block.id}:`, relationError.message);
                            }
                        }
                    }
                    console.log(`🔗 Relazioni CONTAINS_MODULE create: ${relationsCreated}/${validatedLayout.blocks.length}`);
                }
                
                // Notifica AttributeSpace per real-time sync
                if (this.attributeSpace) {
                    this.attributeSpace.notifyChange({
                        type: 'entity',
                        entityType: 'CompositeDocument',
                        entityId: id,
                        attributeName: 'canvasLayout',
                        newValue: validatedLayout,
                        changeType: 'update',
                        timestamp: Date.now()
                    });
                }
                
                res.json({
                    success: true,
                    data: validatedLayout,
                    message: 'Canvas layout salvato con successo'
                });
            } catch (error) {
                console.error('❌ Errore salvataggio canvas layout:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // GET /api/documents/:id/canvas - Recupera layout canvas da documento
        this.app.get('/api/documents/:id/canvas', async (req, res) => {
            try {
                const { id } = req.params;
                
                // Recupera il documento
                const document = await this.entityEngine.getEntity(id);
                
                if (!document) {
                    return res.status(404).json({
                        success: false,
                        error: 'Documento non trovato'
                    });
                }
                
                // Restituisce il canvas layout (con default se non esiste)
                const canvasLayout = document.canvasLayout || {
                    enabled: false,
                    blocks: [],
                    gridSize: 25,
                    version: '1.0',
                    metadata: {}
                };
                
                res.json({
                    success: true,
                    data: canvasLayout,
                    documentId: id,
                    documentName: document.name
                });
            } catch (error) {
                console.error('❌ Errore recupero canvas layout:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // POST /api/documents/:id/canvas/sync - Sincronizza canvas blocks con ModuleInstances
        this.app.post('/api/documents/:id/canvas/sync', async (req, res) => {
            try {
                const { id } = req.params;
                
                // Recupera il documento e il suo canvas layout
                const document = await this.entityEngine.getEntity(id);
                
                if (!document) {
                    return res.status(404).json({
                        success: false,
                        error: 'Documento non trovato'
                    });
                }
                
                const canvasLayout = document.canvasLayout;
                if (!canvasLayout || !canvasLayout.blocks) {
                    return res.json({
                        success: true,
                        message: 'Nessun blocco canvas da sincronizzare',
                        syncedModules: 0
                    });
                }
                
                let syncedCount = 0;
                let errorCount = 0;
                
                // Per ogni blocco canvas, crea o aggiorna un ModuleInstance
                for (const block of canvasLayout.blocks) {
                    try {
                        // Crea ModuleInstance per il blocco se non esiste
                        const moduleData = {
                            templateId: block.type || 'canvas-module',
                            name: block.title || `Canvas Module ${block.id}`,
                            configuration: {
                                canvasBlock: true,
                                blockId: block.id,
                                blockType: block.type,
                                content: block.content || []
                            },
                            projectId: document.projectId
                        };
                        
                        const moduleInstance = await this.entityEngine.createEntity('ModuleInstance', moduleData);
                        
                        // Crea relazione CONTAINS_MODULE con posizione canvas
                        await this.relationEngine.createRelation({
                            type: 'CONTAINS_MODULE',
                            sourceId: id,
                            targetId: moduleInstance.id,
                            attributes: {
                                order: syncedCount,
                                position: {
                                    x: block.x,
                                    y: block.y
                                },
                                size: {
                                    width: block.width,
                                    height: block.height
                                },
                                collapsed: false,
                                config: {
                                    canvasMode: true,
                                    blockId: block.id
                                }
                            }
                        });
                        
                        syncedCount++;
                    } catch (error) {
                        console.error(`❌ Errore sync blocco ${block.id}:`, error);
                        errorCount++;
                    }
                }
                
                res.json({
                    success: true,
                    message: `Sincronizzati ${syncedCount} blocchi canvas con ModuleInstances`,
                    syncedModules: syncedCount,
                    errors: errorCount
                });
            } catch (error) {
                console.error('❌ Errore sincronizzazione canvas:', error);
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

    /**
     * ✨ HELPER: Ottiene icona di default basata sul tipo di attributo
     * @param {string} type - Tipo dell'attributo
     * @returns {string} Nome dell'icona
     */
    getDefaultIconForType(type) {
        const iconMap = {
            'string': 'type',
            'text': 'file-text',
            'number': 'hash',
            'email': 'mail',
            'date': 'calendar',
            'boolean': 'check-square',
            'select': 'list',
            'reference': 'link',
            'percentage': 'percent',
            'json': 'code'
        };
        
        return iconMap[type] || 'edit-3';
    }


    /**
     * ✨ HELPER: Capitalizza la prima lettera di una stringa
     * @param {string} str - Stringa da capitalizzare
     * @returns {string} Stringa capitalizzata
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * ✨ HELPER: Ottiene componente UI di default per tipo (alias di getDefaultIconForType)
     * @param {string} type - Tipo dell'attributo
     * @returns {string} Nome del componente UI di default
     */
    getDefaultComponentForType(type) {
        const componentMap = {
            'string': 'TextInput',
            'text': 'TextArea',
            'number': 'NumberInput',
            'email': 'EmailInput',
            'date': 'DateInput',
            'boolean': 'Checkbox',
            'select': 'SelectInput',
            'reference': 'EntityAutocomplete',
            'percentage': 'PercentageInput',
            'json': 'JsonEditor'
        };
        
        return componentMap[type] || 'TextInput';
    }

    /**
     * ✨ HELPER: Formatta schema per UI semantica con metadati completi
     * @param {Object} schema - Schema originale
     * @param {string} entityType - Tipo di entità
     * @returns {Object} Schema formattato per UI semantica
     */
    formatSchemaForSemanticUI(schema, entityType) {
        const semanticSchema = {
            entityType: entityType,
            displayConfig: {
                displayLabel: schema.displayLabel || this.capitalizeFirst(entityType),
                displayField: schema.displayField || 'nome',
                icon: schema.icon || this.getDefaultIconForType('entity'),
                defaultView: 'table',
                supportedViews: ['table', 'cards', 'form'],
                searchable: true,
                sortable: true,
                creatable: true,
                editable: true,
                deletable: true
            },
            attributes: {},
            groups: {},
            renderingHints: {
                priority: 'high',
                defaultSort: schema.displayField || 'nome',
                defaultFilters: [],
                bulkOperations: ['edit', 'delete'],
                exportFormats: ['csv', 'json']
            }
        };

        // Processa ogni attributo
        if (schema.attributes) {
            Object.entries(schema.attributes).forEach(([attrName, attrDef]) => {
                const uiMetadata = attrDef.getUIMetadata ? attrDef.getUIMetadata() : {
                    component: this.getDefaultComponentForType(attrDef.type),
                    label: attrName,
                    icon: this.getDefaultIconForType(attrDef.type),
                    priority: 'medium',
                    group: 'default'
                };

                semanticSchema.attributes[attrName] = {
                    name: attrName,
                    type: attrDef.type || 'string',
                    required: attrDef.required || false,
                    description: attrDef.description || '',
                    ...uiMetadata,
                    validation: {
                        required: attrDef.required || false,
                        rules: attrDef.validationRules || [],
                        min: attrDef.min,
                        max: attrDef.max,
                        options: attrDef.options
                    }
                };

                // Raggruppa attributi per groups
                const groupName = uiMetadata.group || 'default';
                if (!semanticSchema.groups[groupName]) {
                    semanticSchema.groups[groupName] = {
                        label: this.capitalizeFirst(groupName),
                        order: this.getGroupOrder(groupName),
                        collapsible: groupName !== 'default',
                        attributes: []
                    };
                }
                semanticSchema.groups[groupName].attributes.push(attrName);
            });
        }

        // Ordina attributi in ogni gruppo
        Object.values(semanticSchema.groups).forEach(group => {
            group.attributes.sort((a, b) => {
                const attrA = semanticSchema.attributes[a];
                const attrB = semanticSchema.attributes[b];
                return (attrA.order || 0) - (attrB.order || 0);
            });
        });

        return semanticSchema;
    }

    /**
     * ✨ HELPER: Arricchisce schema con metadati UI estesi
     * @param {Object} schema - Schema originale
     * @param {string} entityType - Tipo di entità
     * @returns {Object} Schema arricchito
     */
    enrichSchemaWithUIMetadata(schema, entityType) {
        const enrichedSchema = JSON.parse(JSON.stringify(schema)); // Deep clone

        // Aggiungi metadati a livello di entità
        enrichedSchema.uiMetadata = {
            displayLabel: schema.displayLabel || this.capitalizeFirst(entityType),
            displayField: schema.displayField || 'nome',
            icon: schema.icon || 'database',
            color: schema.color || '#3b82f6',
            description: schema.description || `Entità di tipo ${entityType}`,
            category: schema.category || 'general'
        };

        // Arricchisci ogni attributo con metadati UI completi
        if (enrichedSchema.attributes) {
            Object.entries(enrichedSchema.attributes).forEach(([attrName, attrDef]) => {
                // Se l'attributo ha già metodi UI, usa quelli
                if (attrDef.getUIMetadata) {
                    enrichedSchema.attributes[attrName].fullUIMetadata = attrDef.getUIMetadata();
                } else {
                    // Altrimenti genera metadati UI completi
                    enrichedSchema.attributes[attrName].fullUIMetadata = {
                        component: attrDef.uiMetadata?.component || this.getDefaultComponentForType(attrDef.type),
                        label: attrDef.uiMetadata?.label || this.capitalizeFirst(attrName),
                        placeholder: attrDef.uiMetadata?.placeholder || `Inserisci ${attrName}...`,
                        icon: attrDef.displaySettings?.icon || this.getDefaultIconForType(attrDef.type),
                        tooltip: attrDef.displaySettings?.tooltip || attrDef.description,
                        priority: attrDef.renderingHints?.priority || 'medium',
                        group: attrDef.uiMetadata?.group || 'default',
                        order: attrDef.uiMetadata?.order || 0,
                        width: attrDef.uiMetadata?.width || 'auto',
                        validation: {
                            realtime: attrDef.uiMetadata?.validation?.realtime || false,
                            debounceMs: attrDef.uiMetadata?.validation?.debounceMs || 300,
                            showErrors: attrDef.uiMetadata?.validation?.showErrors !== false
                        },
                        conditional: attrDef.renderingHints?.conditional || {},
                        listConfig: attrDef.displaySettings?.listConfig || {
                            searchable: true,
                            creatable: true,
                            multiSelect: false
                        }
                    };
                }

                // Aggiungi metadati di validazione arricchiti
                enrichedSchema.attributes[attrName].validationMetadata = {
                    required: attrDef.required || false,
                    type: attrDef.type || 'string',
                    rules: attrDef.validationRules || [],
                    constraints: {
                        min: attrDef.min,
                        max: attrDef.max,
                        options: attrDef.options,
                        pattern: this.getValidationPattern(attrDef.type)
                    }
                };
            });
        }

        return enrichedSchema;
    }

    /**
     * ✨ HELPER: Ottiene ordinamento per gruppi UI
     * @param {string} groupName - Nome del gruppo
     * @returns {number} Ordinamento numerico
     */
    getGroupOrder(groupName) {
        const groupOrder = {
            'default': 0,
            'basic': 10,
            'contact': 20,
            'personal': 30,
            'professional': 40,
            'financial': 50,
            'dates': 60,
            'location': 70,
            'metadata': 80,
            'advanced': 90,
            'system': 100
        };
        
        return groupOrder[groupName] || 50;
    }

    /**
     * ✨ HELPER: Ottiene pattern di validazione per tipo
     * @param {string} type - Tipo dell'attributo
     * @returns {string|null} Pattern regex se disponibile
     */
    getValidationPattern(type) {
        const patterns = {
            'email': '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            'phone': '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$',
            'url': '^https?:\\/\\/.+',
            'number': '^\\d+(\\.\\d+)?$',
            'percentage': '^(100|[1-9]?\\d)$'
        };
        
        return patterns[type] || null;
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
            console.log(`   - File esempi da /examples/`);
            console.log(`   - WebSocket per real-time updates`);
            console.log(`   - Template test page: http://localhost:${PORT}/views/template-test.html`);
            console.log('=' .repeat(60));
        })
        .catch((error) => {
            console.error('❌ Errore avvio server:', error);
            process.exit(1);
        });
} 
