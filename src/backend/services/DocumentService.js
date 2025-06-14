const { v4: uuidv4 } = require('uuid');

/**
 * DocumentService - Gestione dei CompositeDocument per SSOT-4000
 * 
 * Implementa la logica di business per la gestione dei documenti compositi,
 * che orchestrano multipli moduli in un workspace unificato con contesto condiviso.
 * 
 * Un CompositeDocument è una meta-meta-entità che:
 * - Contiene multipli ModuleInstance tramite relazioni CONTAINS_MODULE
 * - Eredita e propaga contesto a tutti i moduli contenuti
 * - Gestisce layout e configurazione del workspace
 * - Appartiene a un Project per contesto globale
 */
class DocumentService {
    constructor(dao, entityEngine, schemaManager, attributeSpace) {
        this.dao = dao;
        this.entityEngine = entityEngine;
        this.schemaManager = schemaManager;
        this.attributeSpace = attributeSpace;
        
        console.log('📄 DocumentService inizializzato per SSOT-4000');
    }

    /**
     * Crea un nuovo CompositeDocument
     * @param {object} documentData - Dati del documento
     * @param {string} documentData.name - Nome del documento
     * @param {string} documentData.description - Descrizione
     * @param {string} documentData.projectId - ID del progetto di appartenenza
     * @param {string} documentData.ownerId - ID del proprietario
     * @param {object} documentData.layout - Configurazione layout
     * @param {object} documentData.metadata - Metadati aggiuntivi
     * @returns {Promise<object>} Il documento creato
     */
    async createDocument(documentData) {
        try {
            // Valida i dati in ingresso
            if (!documentData.name) {
                throw new Error('Il nome del documento è obbligatorio');
            }
            
            if (!documentData.ownerId) {
                throw new Error('Il proprietario del documento è obbligatorio');
            }

            // Prepara i dati del documento come entità
            // Non includere entityType, createdAt e modifiedAt qui perché vengono gestiti da EntityEngine
            const documentEntity = {
                name: documentData.name,
                description: documentData.description || '',
                projectId: documentData.projectId || null,
                ownerId: documentData.ownerId,
                layout: documentData.layout || { type: 'grid', columns: 2, modules: [] },
                metadata: documentData.metadata || {},
                status: documentData.status || 'draft'
            };

            // Crea il documento usando l'EntityEngine evoluto
            // EntityEngine.createEntity si aspetta (entityType, data, options)
            const createdDocument = await this.entityEngine.createEntity('CompositeDocument', documentEntity);
            
            // Notifica la creazione via AttributeSpace
            this.attributeSpace.notifyChange({
                type: 'entity',
                entityType: 'CompositeDocument',
                entityId: createdDocument.id,
                changeType: 'created',
                data: createdDocument,
                metadata: {
                    projectId: createdDocument.projectId,
                    ownerId: createdDocument.ownerId
                }
            });
            
            console.log(`✅ CompositeDocument creato: ${createdDocument.id} - ${createdDocument.name}`);
            
            return createdDocument;
            
        } catch (error) {
            console.error('❌ Errore creazione CompositeDocument:', error.message);
            throw error;
        }
    }

    /**
     * Recupera un documento con tutti i suoi moduli
     * @param {string} documentId - ID del documento
     * @param {object} options - Opzioni di query
     * @returns {Promise<object>} Il documento con moduli e relazioni
     */
    async getDocument(documentId, options = {}) {
        try {
            const { includeModules = true, includeProject = false } = options;
            
            // Recupera il documento base
            const document = await this.entityEngine.getEntity(documentId);
            
            if (!document || document.entityType !== 'CompositeDocument') {
                throw new Error(`CompositeDocument ${documentId} non trovato`);
            }
            
            // Risultato da ritornare
            const result = {
                document: document,
                modules: [],
                project: null
            };
            
            // Recupera i moduli contenuti se richiesto
            if (includeModules) {
                const modulesQuery = `
                    MATCH (d:CompositeDocument {id: $documentId})-[r:CONTAINS_MODULE]->(m:ModuleInstance)
                    RETURN m, r, properties(r) as relationProps
                    ORDER BY r.order ASC
                `;
                
                const modulesResult = await this.dao.connector.executeQuery(modulesQuery, { documentId });
                
                result.modules = modulesResult.records.map(record => {
                    const relationProps = record.get('relationProps');
                    // Parse JSON fields
                    const position = typeof relationProps.position === 'string' 
                        ? JSON.parse(relationProps.position) 
                        : relationProps.position;
                    const size = typeof relationProps.size === 'string'
                        ? JSON.parse(relationProps.size)
                        : relationProps.size;
                    const config = typeof relationProps.config === 'string'
                        ? JSON.parse(relationProps.config)
                        : relationProps.config;
                    
                    return {
                        module: record.get('m').properties,
                        relation: relationProps,
                        order: relationProps.order,
                        position: position,
                        size: size,
                        collapsed: relationProps.collapsed,
                        config: config
                    };
                });
            }
            
            // Recupera il progetto se richiesto
            if (includeProject && document.projectId) {
                try {
                    const project = await this.entityEngine.getEntity(document.projectId);
                    result.project = project;
                } catch (projectError) {
                    console.warn(`⚠️ Progetto ${document.projectId} non trovato per documento ${documentId}`);
                }
            }
            
            console.log(`✅ CompositeDocument recuperato: ${documentId} con ${result.modules.length} moduli`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Errore recupero CompositeDocument:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna un documento esistente
     * @param {string} documentId - ID del documento
     * @param {object} updates - Campi da aggiornare
     * @returns {Promise<object>} Il documento aggiornato
     */
    async updateDocument(documentId, updates) {
        try {
            // Verifica che il documento esista
            const existingDoc = await this.entityEngine.getEntity(documentId);
            if (!existingDoc || existingDoc.entityType !== 'CompositeDocument') {
                throw new Error(`CompositeDocument ${documentId} non trovato`);
            }
            
            // Rimuovi campi che non devono essere aggiornati
            const { id, entityType, createdAt, ...validUpdates } = updates;
            
            // Aggiorna ogni attributo singolarmente usando EntityEngine
            for (const [key, value] of Object.entries(validUpdates)) {
                await this.entityEngine.setEntityAttribute(documentId, key, value);
            }
            
            // Aggiorna il timestamp di modifica direttamente via DAO per evitare validazione schema
            await this.dao.updateEntityAttribute(documentId, 'modifiedAt', new Date().toISOString());
            
            // Recupera il documento aggiornato
            const updatedDocument = await this.entityEngine.getEntity(documentId);
            
            // Notifica l'aggiornamento
            this.attributeSpace.notifyChange({
                type: 'entity',
                entityType: 'CompositeDocument',
                entityId: documentId,
                changeType: 'updated',
                data: updatedDocument,
                updates: validUpdates,
                metadata: {
                    projectId: updatedDocument.projectId,
                    ownerId: updatedDocument.ownerId
                }
            });
            
            console.log(`✅ CompositeDocument aggiornato: ${documentId}`);
            
            return updatedDocument;
            
        } catch (error) {
            console.error('❌ Errore aggiornamento CompositeDocument:', error.message);
            throw error;
        }
    }

    /**
     * Aggiunge un modulo al documento
     * @param {string} documentId - ID del documento
     * @param {string} moduleId - ID del ModuleInstance
     * @param {object} layoutConfig - Configurazione di layout per il modulo
     * @returns {Promise<object>} La relazione creata
     */
    async addModuleToDocument(documentId, moduleId, layoutConfig = {}) {
        try {
            // Verifica esistenza documento e modulo
            const checkQuery = `
                MATCH (d:CompositeDocument {id: $documentId})
                MATCH (m:ModuleInstance {id: $moduleId})
                RETURN d, m
            `;
            
            const checkResult = await this.dao.connector.executeQuery(checkQuery, {
                documentId,
                moduleId
            });
            
            if (checkResult.records.length === 0) {
                throw new Error(`Documento ${documentId} o ModuleInstance ${moduleId} non trovati`);
            }
            
            // Determina l'ordine del nuovo modulo
            const orderQuery = `
                MATCH (d:CompositeDocument {id: $documentId})-[r:CONTAINS_MODULE]->()
                RETURN MAX(r.order) as maxOrder
            `;
            
            const orderResult = await this.dao.connector.executeQuery(orderQuery, { documentId });
            const maxOrder = orderResult.records[0]?.get('maxOrder') || 0;
            const newOrder = (typeof maxOrder === 'object' && maxOrder.low !== undefined) 
                ? maxOrder.low + 1 
                : (maxOrder || 0) + 1;
            
            // Crea la relazione CONTAINS_MODULE
            const relationId = uuidv4();
            const createQuery = `
                MATCH (d:CompositeDocument {id: $documentId})
                MATCH (m:ModuleInstance {id: $moduleId})
                CREATE (d)-[r:CONTAINS_MODULE {
                    id: $relationId,
                    order: $order,
                    position: $position,
                    size: $size,
                    collapsed: $collapsed,
                    config: $config,
                    addedAt: $addedAt
                }]->(m)
                RETURN d, r, m
            `;
            
            const parameters = {
                documentId,
                moduleId,
                relationId,
                order: newOrder,
                position: JSON.stringify(layoutConfig.position || { x: 0, y: 0 }),
                size: JSON.stringify(layoutConfig.size || { width: 4, height: 6 }),
                collapsed: layoutConfig.collapsed || false,
                config: JSON.stringify(layoutConfig.config || {}),
                addedAt: new Date().toISOString()
            };
            
            const result = await this.dao.connector.executeQuery(createQuery, parameters);
            
            if (result.records.length === 0) {
                throw new Error('Errore nella creazione della relazione CONTAINS_MODULE');
            }
            
            const record = result.records[0];
            const relation = record.get('r').properties;
            
            // Parse JSON fields
            relation.position = JSON.parse(relation.position);
            relation.size = JSON.parse(relation.size);
            relation.config = JSON.parse(relation.config);
            
            // Notifica l'aggiunta del modulo
            this.attributeSpace.notifyChange({
                type: 'relation',
                relationType: 'CONTAINS_MODULE',
                changeType: 'created',
                sourceEntityId: documentId,
                targetEntityId: moduleId,
                relationId: relation.id,
                attributes: relation,
                metadata: {
                    documentType: 'CompositeDocument',
                    moduleType: 'ModuleInstance'
                }
            });
            
            // Aggiorna il timestamp del documento direttamente via DAO per evitare validazione schema
            await this.dao.updateEntityAttribute(documentId, 'modifiedAt', new Date().toISOString());
            
            console.log(`✅ ModuleInstance ${moduleId} aggiunto al documento ${documentId} con ordine ${newOrder}`);
            
            return {
                document: record.get('d').properties,
                module: record.get('m').properties,
                relation: relation
            };
            
        } catch (error) {
            console.error('❌ Errore addModuleToDocument:', error.message);
            throw error;
        }
    }

    /**
     * Rimuove un modulo dal documento
     * @param {string} documentId - ID del documento
     * @param {string} moduleId - ID del ModuleInstance
     * @returns {Promise<boolean>} True se rimosso con successo
     */
    async removeModuleFromDocument(documentId, moduleId) {
        try {
            const query = `
                MATCH (d:CompositeDocument {id: $documentId})-[r:CONTAINS_MODULE]->(m:ModuleInstance {id: $moduleId})
                WITH r, r.id as relationId
                DELETE r
                RETURN relationId
            `;
            
            const result = await this.dao.connector.executeQuery(query, {
                documentId,
                moduleId
            });
            
            if (result.records.length === 0) {
                throw new Error(`Relazione non trovata tra documento ${documentId} e modulo ${moduleId}`);
            }
            
            const relationId = result.records[0].get('relationId');
            
            // Notifica la rimozione
            this.attributeSpace.notifyChange({
                type: 'relation',
                relationType: 'CONTAINS_MODULE',
                changeType: 'deleted',
                sourceEntityId: documentId,
                targetEntityId: moduleId,
                relationId: relationId
            });
            
            // Aggiorna il timestamp del documento direttamente via DAO per evitare validazione schema
            await this.dao.updateEntityAttribute(documentId, 'modifiedAt', new Date().toISOString());
            
            console.log(`✅ ModuleInstance ${moduleId} rimosso dal documento ${documentId}`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Errore removeModuleFromDocument:', error.message);
            throw error;
        }
    }

    /**
     * Aggiorna il layout dei moduli in un documento
     * @param {string} documentId - ID del documento
     * @param {Array} moduleLayouts - Array di configurazioni layout per moduli
     * @returns {Promise<object>} Il documento con layout aggiornato
     */
    async updateDocumentLayout(documentId, moduleLayouts) {
        try {
            // Inizia una transazione per aggiornare tutti i layout atomicamente
            const updates = moduleLayouts.map((layout, index) => ({
                moduleId: layout.moduleId,
                order: layout.order !== undefined ? layout.order : index,
                position: layout.position,
                size: layout.size,
                collapsed: layout.collapsed,
                config: layout.config
            }));
            
            // Aggiorna ogni relazione CONTAINS_MODULE
            for (const update of updates) {
                const query = `
                    MATCH (d:CompositeDocument {id: $documentId})-[r:CONTAINS_MODULE]->(m:ModuleInstance {id: $moduleId})
                    SET r.order = $order,
                        r.position = $position,
                        r.size = $size,
                        r.collapsed = $collapsed,
                        r.config = $config,
                        r.lastModified = $lastModified
                    RETURN r
                `;
                
                const parameters = {
                    documentId,
                    moduleId: update.moduleId,
                    order: update.order,
                    position: JSON.stringify(update.position || {}),
                    size: JSON.stringify(update.size || {}),
                    collapsed: update.collapsed || false,
                    config: JSON.stringify(update.config || {}),
                    lastModified: new Date().toISOString()
                };
                
                await this.dao.connector.executeQuery(query, parameters);
            }
            
            // Aggiorna il layout nel documento stesso
            const newLayout = {
                type: 'grid',
                columns: 2,
                modules: updates,
                lastModified: new Date().toISOString()
            };
            
            await this.updateDocument(documentId, { layout: newLayout });
            
            // Notifica il cambio di layout
            this.attributeSpace.notifyChange({
                type: 'custom',
                changeType: 'layout_updated',
                entityType: 'CompositeDocument',
                entityId: documentId,
                data: {
                    layout: newLayout,
                    moduleCount: updates.length
                }
            });
            
            console.log(`✅ Layout aggiornato per documento ${documentId} con ${updates.length} moduli`);
            
            return await this.getDocument(documentId);
            
        } catch (error) {
            console.error('❌ Errore updateDocumentLayout:', error.message);
            throw error;
        }
    }

    /**
     * Elimina un documento e tutte le sue relazioni
     * @param {string} documentId - ID del documento
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    async deleteDocument(documentId) {
        try {
            // Prima rimuovi tutte le relazioni CONTAINS_MODULE
            const deleteRelationsQuery = `
                MATCH (d:CompositeDocument {id: $documentId})-[r:CONTAINS_MODULE]->()
                DELETE r
            `;
            
            await this.dao.connector.executeQuery(deleteRelationsQuery, { documentId });
            
            // Poi elimina il documento usando EntityEngine
            await this.entityEngine.deleteEntity(documentId);
            
            // Notifica l'eliminazione
            this.attributeSpace.notifyChange({
                type: 'entity',
                entityType: 'CompositeDocument',
                entityId: documentId,
                changeType: 'deleted'
            });
            
            console.log(`✅ CompositeDocument ${documentId} eliminato con tutte le relazioni`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Errore deleteDocument:', error.message);
            throw error;
        }
    }

    /**
     * Lista tutti i documenti con filtri opzionali
     * @param {object} filters - Filtri di ricerca
     * @param {object} options - Opzioni di paginazione
     * @returns {Promise<Array>} Array di documenti
     */
    async listDocuments(filters = {}, options = {}) {
        try {
            const { projectId, ownerId, status } = filters;
            const { limit = 50, offset = 0, orderBy = 'modifiedAt', orderDirection = 'DESC' } = options;
            
            // Costruisci la query con filtri dinamici
            const parameters = {};
            const conditions = ['d:CompositeDocument'];
            
            if (projectId) {
                conditions.push('d.projectId = $projectId');
                parameters.projectId = projectId;
            }
            if (ownerId) {
                conditions.push('d.ownerId = $ownerId');
                parameters.ownerId = ownerId;
            }
            if (status) {
                conditions.push('d.status = $status');
                parameters.status = status;
            }
            
            // Costruisci WHERE clause
            const whereClause = conditions.length > 1 
                ? `(d:CompositeDocument) WHERE ${conditions.slice(1).join(' AND ')}`
                : '(d:CompositeDocument)';
            
            const query = `
                MATCH ${whereClause}
                OPTIONAL MATCH (d)-[r:CONTAINS_MODULE]->()
                WITH d, COUNT(r) as moduleCount
                RETURN d, moduleCount
                ORDER BY d.${orderBy} ${orderDirection}
                SKIP ${parseInt(offset)}
                LIMIT ${parseInt(limit)}
            `;
            
            const result = await this.dao.connector.executeQuery(query, parameters);
            
            const documents = result.records.map(record => {
                const doc = record.get('d').properties;
                const count = record.get('moduleCount');
                return {
                    ...doc,
                    moduleCount: (typeof count === 'object' && count.low !== undefined) 
                        ? count.low 
                        : (count || 0)
                };
            });
            
            console.log(`✅ Trovati ${documents.length} documenti con filtri:`, filters);
            
            return documents;
            
        } catch (error) {
            console.error('❌ Errore listDocuments:', error.message);
            throw error;
        }
    }

    /**
     * Clona un documento esistente
     * @param {string} documentId - ID del documento da clonare
     * @param {object} overrides - Campi da sovrascrivere nel clone
     * @returns {Promise<object>} Il nuovo documento clonato
     */
    async cloneDocument(documentId, overrides = {}) {
        try {
            // Recupera il documento originale con moduli
            const original = await this.getDocument(documentId, { includeModules: true });
            
            // Crea il nuovo documento
            const newDocumentData = {
                ...original.document,
                ...overrides,
                name: overrides.name || `${original.document.name} (Copia)`,
                id: undefined, // Sarà generato automaticamente
                createdAt: undefined,
                modifiedAt: undefined
            };
            
            const clonedDocument = await this.createDocument(newDocumentData);
            
            // Clona tutti i moduli con le loro configurazioni
            for (const moduleConfig of original.modules) {
                await this.addModuleToDocument(
                    clonedDocument.id,
                    moduleConfig.module.id,
                    {
                        position: moduleConfig.position,
                        size: moduleConfig.size,
                        collapsed: moduleConfig.collapsed,
                        config: moduleConfig.config
                    }
                );
            }
            
            console.log(`✅ Documento ${documentId} clonato come ${clonedDocument.id}`);
            
            return await this.getDocument(clonedDocument.id, { includeModules: true });
            
        } catch (error) {
            console.error('❌ Errore cloneDocument:', error.message);
            throw error;
        }
    }

    /**
     * Recupera il contesto ereditabile di un documento
     * @param {string} documentId - ID del documento
     * @returns {Promise<object>} Il contesto ereditabile
     */
    async getDocumentContext(documentId) {
        try {
            const documentData = await this.getDocument(documentId, { includeProject: true });
            const { document, project } = documentData;
            
            // Costruisci il contesto ereditabile
            const context = {
                documentId: document.id,
                documentName: document.name,
                projectId: document.projectId,
                projectName: project?.name,
                ownerId: document.ownerId,
                metadata: {
                    ...document.metadata,
                    documentStatus: document.status
                },
                globalFilters: {},
                inheritedAttributes: {}
            };
            
            // Se c'è un progetto, eredita i suoi attributi contestuali
            if (project) {
                context.inheritedAttributes = {
                    projectBudget: project.budget,
                    projectStartDate: project.startDate,
                    projectEndDate: project.endDate,
                    projectStatus: project.status
                };
            }
            
            console.log(`✅ Contesto recuperato per documento ${documentId}`);
            
            return context;
            
        } catch (error) {
            console.error('❌ Errore getDocumentContext:', error.message);
            throw error;
        }
    }
}

module.exports = DocumentService;