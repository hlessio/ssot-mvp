#!/usr/bin/env node

/**
 * Script di test manuale per DocumentService
 * Dimostra l'uso completo della Fase 1 di SSOT-4000
 * 
 * Esegui con: node tests/manual/test-document-service.js
 */

const neo4jConnector = require('../../src/backend/neo4j_connector');
const neo4jDAO = require('../../src/backend/dao/neo4j_dao');
const SchemaManager = require('../../src/backend/core/schemaManager_evolved');
const EntityEngine = require('../../src/backend/core/entityEngine_evolved');
const RelationEngine = require('../../src/backend/core/relationEngine');
const AttributeSpace = require('../../src/backend/core/attributeSpace_evolved');
const DocumentService = require('../../src/backend/services/DocumentService');

async function main() {
    console.log('🚀 Test Manuale DocumentService - SSOT-4000 Fase 1\n');
    
    try {
        // 1. Setup
        console.log('1️⃣ Inizializzazione servizi...');
        await neo4jConnector.connect();
        
        const attributeSpace = new AttributeSpace({ enableLogging: true });
        const schemaManager = new SchemaManager(neo4jDAO);
        const entityEngine = new EntityEngine(neo4jDAO, schemaManager, null, attributeSpace);
        const relationEngine = new RelationEngine(entityEngine, schemaManager, neo4jDAO);
        entityEngine.relationEngine = relationEngine;
        const documentService = new DocumentService(neo4jDAO, entityEngine, schemaManager, attributeSpace);
        
        await schemaManager.initialize();
        console.log('✅ Servizi inizializzati\n');
        
        // 2. Crea un progetto di esempio
        console.log('2️⃣ Creazione progetto di esempio...');
        const project = await entityEngine.createEntity('Project', {
            name: 'Progetto Film Inception',
            description: 'Produzione del film Inception',
            status: 'active',
            budget: 160000000,
            startDate: '2025-07-01',
            endDate: '2025-12-31'
        });
        console.log(`✅ Progetto creato: ${project.id}\n`);
        
        // 3. Crea alcuni ModuleInstance di esempio
        console.log('3️⃣ Creazione moduli di esempio...');
        const modules = [];
        
        const castModule = await entityEngine.createEntity('ModuleInstance', {
            templateId: 'CastList',
            name: 'Lista Cast Principale',
            configuration: { showPhotos: true, sortBy: 'role' }
        });
        modules.push(castModule);
        
        const scheduleModule = await entityEngine.createEntity('ModuleInstance', {
            templateId: 'ShootingSchedule',
            name: 'Calendario Riprese',
            configuration: { viewMode: 'calendar', showWeekends: true }
        });
        modules.push(scheduleModule);
        
        const budgetModule = await entityEngine.createEntity('ModuleInstance', {
            templateId: 'BudgetTracker',
            name: 'Tracker Budget',
            configuration: { currency: 'USD', showCharts: true }
        });
        modules.push(budgetModule);
        
        console.log(`✅ Creati ${modules.length} moduli\n`);
        
        // 4. Crea un CompositeDocument
        console.log('4️⃣ Creazione CompositeDocument...');
        const document = await documentService.createDocument({
            name: 'Callsheet Giorno 1 - Inception',
            description: 'Documento di produzione per il primo giorno di riprese',
            projectId: project.id,
            ownerId: 'producer-001',
            metadata: {
                shootingDay: 1,
                location: 'Los Angeles Studio',
                callTime: '06:00',
                weather: 'Sunny'
            },
            status: 'published'
        });
        console.log(`✅ Documento creato: ${document.id}\n`);
        
        // 5. Aggiungi moduli al documento con layout specifico
        console.log('5️⃣ Aggiunta moduli al documento...');
        
        await documentService.addModuleToDocument(document.id, castModule.id, {
            position: { x: 0, y: 0 },
            size: { width: 6, height: 8 },
            collapsed: false,
            config: { 
                title: 'Cast del Giorno',
                filter: { available: true }
            }
        });
        
        await documentService.addModuleToDocument(document.id, scheduleModule.id, {
            position: { x: 6, y: 0 },
            size: { width: 6, height: 4 },
            collapsed: false,
            config: {
                title: 'Programma Giornata',
                highlightCurrent: true
            }
        });
        
        await documentService.addModuleToDocument(document.id, budgetModule.id, {
            position: { x: 6, y: 4 },
            size: { width: 6, height: 4 },
            collapsed: false,
            config: {
                title: 'Budget Giornaliero',
                showDailyLimit: 500000
            }
        });
        
        console.log('✅ Moduli aggiunti al documento\n');
        
        // 6. Recupera il documento completo
        console.log('6️⃣ Recupero documento con moduli...');
        const fullDocument = await documentService.getDocument(document.id, {
            includeModules: true,
            includeProject: true
        });
        
        console.log('📄 Documento:', {
            id: fullDocument.document.id,
            name: fullDocument.document.name,
            status: fullDocument.document.status,
            projectName: fullDocument.project?.name,
            moduleCount: fullDocument.modules.length
        });
        
        console.log('\n📦 Moduli nel documento:');
        fullDocument.modules.forEach(m => {
            console.log(`  - ${m.module.name} (${m.module.templateId})`);
            console.log(`    Posizione: x=${m.position.x}, y=${m.position.y}`);
            console.log(`    Dimensione: ${m.size.width}x${m.size.height}`);
            console.log(`    Config:`, m.config);
        });
        
        // 7. Test contesto ereditabile
        console.log('\n7️⃣ Test contesto ereditabile...');
        const context = await documentService.getDocumentContext(document.id);
        console.log('🔗 Contesto documento:', {
            documentId: context.documentId,
            documentName: context.documentName,
            projectId: context.projectId,
            projectName: context.projectName,
            inheritedAttributes: context.inheritedAttributes
        });
        
        // 8. Aggiorna layout di un modulo
        console.log('\n8️⃣ Aggiornamento layout moduli...');
        await documentService.updateDocumentLayout(document.id, [
            {
                moduleId: castModule.id,
                order: 1,
                position: { x: 0, y: 0 },
                size: { width: 12, height: 6 }, // Espandi a tutta larghezza
                collapsed: false,
                config: { 
                    title: 'Cast del Giorno - Aggiornato',
                    filter: { available: true, mainRoles: true }
                }
            },
            {
                moduleId: scheduleModule.id,
                order: 2,
                position: { x: 0, y: 6 },
                size: { width: 6, height: 4 },
                collapsed: false,
                config: { title: 'Programma Giornata' }
            },
            {
                moduleId: budgetModule.id,
                order: 3,
                position: { x: 6, y: 6 },
                size: { width: 6, height: 4 },
                collapsed: true, // Collassa questo modulo
                config: { title: 'Budget Giornaliero' }
            }
        ]);
        console.log('✅ Layout aggiornato\n');
        
        // 9. Lista documenti con filtri
        console.log('9️⃣ Lista documenti del progetto...');
        const projectDocuments = await documentService.listDocuments(
            { projectId: project.id },
            { orderBy: 'modifiedAt', orderDirection: 'DESC' }
        );
        
        console.log(`📑 Trovati ${projectDocuments.length} documenti nel progetto:`);
        projectDocuments.forEach(doc => {
            console.log(`  - ${doc.name} (${doc.status}) - ${doc.moduleCount} moduli`);
        });
        
        // 10. Clone del documento
        console.log('\n🔟 Clonazione documento...');
        const clonedDoc = await documentService.cloneDocument(document.id, {
            name: 'Callsheet Giorno 2 - Inception',
            metadata: {
                shootingDay: 2,
                location: 'Paris Studio',
                callTime: '07:00',
                weather: 'Cloudy'
            }
        });
        console.log(`✅ Documento clonato: ${clonedDoc.document.id}`);
        console.log(`   Nome: ${clonedDoc.document.name}`);
        console.log(`   Moduli copiati: ${clonedDoc.modules.length}`);
        
        // 11. Test WebSocket events
        console.log('\n1️⃣1️⃣ Sottoscrizione eventi WebSocket...');
        let eventCount = 0;
        const unsubscribe = attributeSpace.subscribe(
            { entityType: 'CompositeDocument' },
            (change) => {
                eventCount++;
                console.log(`📡 Evento #${eventCount}:`, {
                    type: change.changeType,
                    entityId: change.entityId,
                    entityName: change.data?.name
                });
            }
        );
        
        // Trigger un evento
        await documentService.updateDocument(document.id, {
            name: 'Callsheet Giorno 1 - Inception (UPDATED)',
            metadata: {
                ...document.metadata,
                lastReviewedBy: 'director-001',
                lastReviewedAt: new Date().toISOString()
            }
        });
        
        // Attendi un po' per vedere gli eventi
        await new Promise(resolve => setTimeout(resolve, 1000));
        unsubscribe();
        
        // 12. Statistiche finali
        console.log('\n📊 Statistiche finali:');
        const allDocuments = await documentService.listDocuments();
        console.log(`  - Totale documenti: ${allDocuments.length}`);
        console.log(`  - Eventi WebSocket ricevuti: ${eventCount}`);
        
        // Query Neo4j diretta per verificare
        const cypherQuery = `
            MATCH (d:CompositeDocument)
            OPTIONAL MATCH (d)-[r:CONTAINS_MODULE]->(m)
            WITH d, count(r) as moduleCount
            RETURN count(d) as docCount, sum(moduleCount) as totalModules
        `;
        const neo4jStats = await neo4jDAO.connector.executeQuery(cypherQuery);
        if (neo4jStats.records.length > 0) {
            const stats = neo4jStats.records[0];
            console.log(`  - Documenti in Neo4j: ${stats.get('docCount')}`);
            console.log(`  - Relazioni CONTAINS_MODULE totali: ${stats.get('totalModules')}`);
        }
        
        console.log('\n✅ Test completato con successo!');
        console.log('🎯 La Fase 1 di SSOT-4000 è pienamente operativa.');
        console.log('📝 Prossimo passo: Implementare UI Svelte per visualizzare questi documenti.\n');
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        await neo4jConnector.close();
        console.log('🔌 Connessione chiusa.');
    }
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main();
}

module.exports = main;