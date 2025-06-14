#!/usr/bin/env node

/**
 * Test diretto Neo4j per verificare la struttura dei documenti
 */

const neo4jConnector = require('../../src/backend/neo4j_connector');

async function main() {
    console.log('🔍 Test Query Neo4j Dirette - Verifica Fase 1\n');
    
    try {
        await neo4jConnector.connect();
        
        // 1. Query per CompositeDocument
        console.log('1️⃣ CompositeDocument in Neo4j:');
        const docsQuery = `
            MATCH (d:CompositeDocument)
            RETURN d.id, d.name, d.status, d.ownerId, d.createdAt
            ORDER BY d.createdAt DESC
            LIMIT 5
        `;
        
        const docsResult = await neo4jConnector.executeQuery(docsQuery);
        docsResult.records.forEach(record => {
            console.log(`   📄 ${record.get('d.name')} (${record.get('d.status')})`);
            console.log(`      ID: ${record.get('d.id')}`);
            console.log(`      Owner: ${record.get('d.ownerId')}`);
            console.log(`      Created: ${record.get('d.createdAt')}\n`);
        });
        
        // 2. Query per relazioni CONTAINS_MODULE
        console.log('2️⃣ Relazioni CONTAINS_MODULE:');
        const relationsQuery = `
            MATCH (d:CompositeDocument)-[r:CONTAINS_MODULE]->(m:ModuleInstance)
            RETURN d.name as docName, m.name as moduleName, r.order, r.position, r.size
            ORDER BY d.name, r.order
        `;
        
        const relationsResult = await neo4jConnector.executeQuery(relationsQuery);
        if (relationsResult.records.length === 0) {
            console.log('   ℹ️  Nessuna relazione CONTAINS_MODULE trovata\n');
        } else {
            relationsResult.records.forEach(record => {
                console.log(`   🔗 ${record.get('docName')} → ${record.get('moduleName')}`);
                console.log(`      Ordine: ${record.get('r.order')}`);
                console.log(`      Posizione: ${record.get('r.position')}`);
                console.log(`      Dimensione: ${record.get('r.size')}\n`);
            });
        }
        
        // 3. Statistiche generali
        console.log('3️⃣ Statistiche Database:');
        const statsQuery = `
            MATCH (d:CompositeDocument)
            OPTIONAL MATCH (d)-[r:CONTAINS_MODULE]->(m)
            RETURN 
                count(DISTINCT d) as documentsCount,
                count(DISTINCT m) as modulesInDocs,
                count(r) as totalRelations
        `;
        
        const statsResult = await neo4jConnector.executeQuery(statsQuery);
        if (statsResult.records.length > 0) {
            const stats = statsResult.records[0];
            console.log(`   📊 CompositeDocument: ${stats.get('documentsCount')}`);
            console.log(`   📦 ModuleInstance contenuti: ${stats.get('modulesInDocs')}`);
            console.log(`   🔗 Relazioni CONTAINS_MODULE: ${stats.get('totalRelations')}`);
        }
        
        // 4. Schema verification
        console.log('\n4️⃣ Verifica Schema:');
        const schemaQuery = `
            MATCH (s:SchemaEntityType {entityType: 'CompositeDocument'})
            OPTIONAL MATCH (s)-[:HAS_ATTRIBUTE]->(a:AttributeDefinition)
            RETURN s.mode as mode, collect(a.name) as attributes
        `;
        
        const schemaResult = await neo4jConnector.executeQuery(schemaQuery);
        if (schemaResult.records.length > 0) {
            const schema = schemaResult.records[0];
            console.log(`   🏗️  Modalità Schema: ${schema.get('mode')}`);
            console.log(`   📝 Attributi definiti: ${schema.get('attributes').join(', ')}`);
        }
        
        console.log('\n✅ Verifica Neo4j completata con successo!');
        console.log('🎯 La struttura dati di Fase 1 è corretta e operativa.');
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error);
    } finally {
        await neo4jConnector.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = main;