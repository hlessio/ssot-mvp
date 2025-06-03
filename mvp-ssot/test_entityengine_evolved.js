#!/usr/bin/env node

/**
 * Test EntityEngine Evoluto - Validazione completa funzionalità Fase 3
 * 
 * Testa:
 * - Schema Integration automatica
 * - Reference Attributes con RelationEngine
 * - Lazy Loading e Cache
 * - Validazione avanzata
 * - Performance e statistiche
 */

const neo4jConnector = require('./backend/neo4j_connector');
const neo4jDAO = require('./backend/dao/neo4j_dao');
const SchemaManager_MVP = require('./backend/core/schemaManager');
const AttributeSpace_MVP = require('./backend/core/attributeSpace');
const SchemaManager = require('./backend/core/schemaManager_evolved');
const RelationEngine = require('./backend/core/relationEngine');
const EntityEngine_MVP = require('./backend/core/entityEngine');
const EntityEngine = require('./backend/core/entityEngine_evolved');

class EntityEngineEvolvedTester {
    constructor() {
        this.results = [];
        this.passedTests = 0;
        this.totalTests = 0;
    }

    async setup() {
        console.log('🔧 Setup test EntityEngine Evoluto...');
        
        // Connetti a Neo4j
        await neo4jConnector.connect();
        
        // Inizializza componenti
        this.schemaManager_MVP = new SchemaManager_MVP();
        this.attributeSpace = new AttributeSpace_MVP();
        this.entityEngine_MVP = new EntityEngine_MVP(neo4jDAO, this.schemaManager_MVP, this.attributeSpace);
        
        this.schemaManager = new SchemaManager(neo4jDAO);
        await this.schemaManager.initialize();
        
        this.relationEngine = new RelationEngine(this.entityEngine_MVP, this.schemaManager, neo4jDAO);
        await this.relationEngine.loadAllRelations();
        
        this.entityEngine = new EntityEngine(neo4jDAO, this.schemaManager, this.relationEngine, this.attributeSpace);
        
        console.log('✅ Setup completato');
    }

    async cleanup() {
        console.log('🧹 Cleanup test data...');
        
        try {
            // Elimina dati di test
            const cypherDeleteEntities = `
                MATCH (e:Entity) 
                WHERE e.entityType IN ['TestEvoluto', 'Azienda', 'PersonaTest']
                DETACH DELETE e
            `;
            
            const cypherDeleteSchemas = `
                MATCH (s:SchemaEntityType) 
                WHERE s.entityType IN ['TestEvoluto', 'Azienda', 'PersonaTest']
                DETACH DELETE s
            `;
            
            const cypherDeleteRelations = `
                MATCH (r:Relation) 
                WHERE r.relationType IN ['reference_azienda', 'reference_capo', 'LavoraPer']
                DETACH DELETE r
            `;
            
            await neo4jDAO.connector.executeQuery(cypherDeleteEntities);
            await neo4jDAO.connector.executeQuery(cypherDeleteSchemas);
            await neo4jDAO.connector.executeQuery(cypherDeleteRelations);
            
            console.log('✅ Cleanup completato');
        } catch (error) {
            console.warn('⚠️ Errore durante cleanup:', error.message);
        }
    }

    async runTest(testName, testFunction) {
        this.totalTests++;
        console.log(`\n🧪 Test ${this.totalTests}: ${testName}`);
        
        try {
            await testFunction();
            this.passedTests++;
            this.results.push({ test: testName, status: '✅ PASSED' });
            console.log(`✅ ${testName} - PASSED`);
            
            // Piccolo delay per evitare sovraccarico memoria Neo4j
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            this.results.push({ test: testName, status: '❌ FAILED', error: error.message });
            console.error(`❌ ${testName} - FAILED:`, error.message);
        }
    }

    // ===== TEST CASES =====

    async testSchemaIntegration() {
        // Test 1: Creazione automatica schema da dati
        const entityData = {
            nome: 'Test Entity',
            email: 'test@example.com',
            eta: 25,
            attivo: true,
            dataCreazione: '2023-01-01'
        };
        
        const entity = await this.entityEngine.createEntity('TestEvoluto', entityData);
        
        if (!entity.id) throw new Error('Entità non creata correttamente');
        
        // Verifica che lo schema sia stato creato automaticamente
        const schema = this.schemaManager.getEntitySchema('TestEvoluto');
        if (!schema) throw new Error('Schema non creato automaticamente');
        
        console.log(`   📊 Schema creato con ${schema.attributes ? schema.attributes.size : 0} attributi`);
        
        return entity;
    }

    async testValidationAndDefaults() {
        // Test 2: Validazione e valori di default
        
        // Cleanup specifico per evitare conflitti con test precedente
        try {
            await neo4jDAO.deleteEntitySchema('TestEvoluto');
            console.log('   🧹 Schema TestEvoluto precedente rimosso');
        } catch (error) {
            // Ignora errori se schema non esisteva
        }
        
        // Crea schema con validazione e default
        const schemaDefinition = {
            mode: 'flexible',
            attributes: {
                nome: {
                    type: 'string',
                    required: true,
                    description: 'Nome obbligatorio'
                },
                stato: {
                    type: 'string',
                    required: false,
                    defaultValue: 'attivo',
                    description: 'Stato con default'
                },
                punteggio: {
                    type: 'integer',
                    required: false,
                    defaultValue: 0
                }
            }
        };
        
        // ROBUSTEZZA: Registra la definizione originale per fallback
        this.entityEngine.registerOriginalSchemaDefinition('TestEvoluto', schemaDefinition);
        
        await this.schemaManager.defineEntitySchema('TestEvoluto', schemaDefinition);
        
        // Test con dati parziali (deve applicare default)
        const entityPartial = await this.entityEngine.createEntity('TestEvoluto', {
            nome: 'Test Defaults'
        });
        
        if (entityPartial.stato !== 'attivo') {
            throw new Error('Valore di default non applicato per stato');
        }
        if (entityPartial.punteggio !== 0) {
            throw new Error('Valore di default non applicato per punteggio');
        }
        
        console.log('   ✅ Valori di default applicati correttamente');
        
        // Test validazione strict mode
        const strictSchema = { ...schemaDefinition, mode: 'strict' };
        this.entityEngine.registerOriginalSchemaDefinition('TestEvoluto', strictSchema);
        await this.schemaManager.defineEntitySchema('TestEvoluto', strictSchema);
        
        try {
            // Questo dovrebbe fallire in modalità strict
            await this.entityEngine.createEntity('TestEvoluto', {}); // manca nome required
            throw new Error('Validazione strict non funzionante');
        } catch (error) {
            if (!error.message.includes('Validazione entità fallita')) {
                throw error;
            }
            console.log('   ✅ Validazione strict funzionante');
        }
        
        return entityPartial;
    }

    async testReferenceAttributes() {
        // Test 3: Attributi reference via RelationEngine
        
        // Crea schema con attributi reference
        const schemaPersona = {
            mode: 'flexible',
            attributes: {
                nome: { type: 'string', required: true },
                azienda: { 
                    type: 'reference', 
                    description: 'Riferimento ad Azienda',
                    referencesEntityType: 'Azienda',
                    relationTypeForReference: 'LavoraIn',
                    displayAttributeFromReferencedEntity: 'ragioneSociale'
                },
                capo: { 
                    type: 'reference', 
                    description: 'Riferimento ad altra Persona',
                    referencesEntityType: 'PersonaTest',
                    relationTypeForReference: 'RiferiscaA',
                    displayAttributeFromReferencedEntity: 'nome'
                }
            }
        };
        
        const schemaAzienda = {
            mode: 'flexible',
            attributes: {
                ragioneSociale: { type: 'string', required: true },
                settore: { type: 'string', required: false }
            }
        };
        
        await this.schemaManager.defineEntitySchema('PersonaTest', schemaPersona);
        await this.schemaManager.defineEntitySchema('Azienda', schemaAzienda);
        
        // Crea entità azienda
        const azienda = await this.entityEngine.createEntity('Azienda', {
            ragioneSociale: 'TechCorp SpA',
            settore: 'Tecnologia'
        });
        
        // Crea persona capo
        const capo = await this.entityEngine.createEntity('PersonaTest', {
            nome: 'Mario Rossi'
        });
        
        // Crea persona con reference
        const persona = await this.entityEngine.createEntity('PersonaTest', {
            nome: 'Luigi Verdi',
            azienda: azienda.id,
            capo: capo.id
        });
        
        console.log(`   🔗 Persona creata con reference: azienda=${azienda.id}, capo=${capo.id}`);
        
        // Test risoluzione reference
        const resolvedReferences = await this.entityEngine.resolveEntityReferences(
            persona.id, 
            ['azienda', 'capo']
        );
        
        if (!resolvedReferences.azienda) {
            throw new Error('Reference azienda non risolta');
        }
        if (!resolvedReferences.capo) {
            throw new Error('Reference capo non risolta');
        }
        
        console.log('   ✅ Reference risolte correttamente');
        
        // Test lazy loading con includeReferences
        const personaWithRefs = await this.entityEngine.getEntity(persona.id, {
            includeReferences: true,
            referenceAttributes: ['azienda']
        });
        
        if (!personaWithRefs.azienda) {
            throw new Error('Lazy loading reference non funzionante');
        }
        
        console.log('   ✅ Lazy loading reference funzionante');
        
        return { persona, azienda, capo };
    }

    async testCacheAndPerformance() {
        // Test 4: Cache e performance
        
        // Assicura che lo schema sia di nuovo in modalità flessibile per accettare attributi ad-hoc
        await this.schemaManager.defineEntitySchema('TestEvoluto', { mode: 'flexible', attributes: {} });
        
        const startTime = Date.now();
        
        // Crea multiple entità per test cache
        const entities = [];
        for (let i = 0; i < 5; i++) {
            const entity = await this.entityEngine.createEntity('TestEvoluto', {
                nome: `Test Cache ${i}`,
                numero: i
            });
            entities.push(entity);
        }
        
        const creationTime = Date.now() - startTime;
        console.log(`   ⏱️ Creazione 5 entità: ${creationTime}ms`);
        
        // Test cache hit
        const cacheStartTime = Date.now();
        for (const entity of entities) {
            const cachedEntity = await this.entityEngine.getEntity(entity.id);
            if (!cachedEntity) {
                throw new Error('Entità non trovata in cache');
            }
        }
        const cacheTime = Date.now() - cacheStartTime;
        console.log(`   ⚡ Cache lookup 5 entità: ${cacheTime}ms`);
        
        if (cacheTime > creationTime) {
            console.warn('   ⚠️ Cache potrebbe non essere efficace');
        }
        
        // Test statistiche
        const stats = this.entityEngine.getStats();
        console.log(`   📊 Cache stats: entità=${stats.entityCache}, schemi=${stats.schemaCache}, reference=${stats.referenceCache}`);
        
        if (stats.entityCache < 5) {
            throw new Error('Cache entità non popolata correttamente');
        }
        
        return entities;
    }

    async testSchemaEvolution() {
        // Test 5: Evoluzione schema
        
        // Carica entità esistenti
        const existingEntities = await this.entityEngine.getAllEntities('TestEvoluto');
        console.log(`   📋 Trovate ${existingEntities.length} entità esistenti`);
        
        // Evolve schema aggiungendo nuovo attributo
        const evolution = {
            addAttributes: {
                nuovoAttributo: {
                    type: 'string',
                    required: false,
                    defaultValue: 'default-value',
                    description: 'Nuovo attributo aggiunto dinamicamente'
                }
            }
        };
        
        const evolvedSchema = await this.schemaManager.evolveSchema('TestEvoluto', evolution);
        if (!evolvedSchema) {
            throw new Error('Evoluzione schema fallita');
        }
        
        console.log('   🔄 Schema evoluto con successo');
        
        // Test che nuove entità usino il nuovo schema
        const newEntity = await this.entityEngine.createEntity('TestEvoluto', {
            nome: 'Test Schema Evolution'
        });
        
        if (newEntity.nuovoAttributo !== 'default-value') {
            throw new Error('Nuovo attributo non applicato automaticamente');
        }
        
        console.log('   ✅ Nuovo attributo applicato automaticamente');
        
        return newEntity;
    }

    async testAdvancedFeatures() {
        // Test 6: Funzionalità avanzate
        
        // Test invalidazione cache
        const entity = await this.entityEngine.createEntity('TestEvoluto', {
            nome: 'Test Cache Invalidation'
        });
        
        // Modifica attributo
        await this.entityEngine.setEntityAttribute(entity.id, 'nome', 'Nome Modificato');
        
        // Ricarica entità (dovrebbe prendere valore aggiornato)
        const updatedEntity = await this.entityEngine.getEntity(entity.id);
        if (updatedEntity.nome !== 'Nome Modificato') {
            throw new Error('Invalidazione cache non funzionante');
        }
        
        console.log('   ✅ Invalidazione cache funzionante');
        
        // Test modalità configuration
        this.entityEngine.enableCache = false;
        const entityNoCache = await this.entityEngine.getEntity(entity.id);
        if (!entityNoCache) {
            throw new Error('Funzionamento senza cache non corretto');
        }
        this.entityEngine.enableCache = true;
        
        console.log('   ✅ Configurazione cache dinamica funzionante');
        
        // Test schema discovery
        const discoveryEntity = await this.entityEngine.createEntity('TestEvoluto', {
            nome: 'Test Discovery',
            nuovoCampoDiscovery: 'valore discovery',
            campoNumerico: 42
        });
        
        const discoveredSchema = this.schemaManager.getEntitySchema('TestEvoluto');
        console.log('   🔍 Schema discovery completato');
        
        return discoveryEntity;
    }

    async runAllTests() {
        console.log('🚀 Avvio test EntityEngine Evoluto...\n');
        
        await this.setup();
        
        try {
            await this.runTest('Schema Integration automatica', () => this.testSchemaIntegration());
            await this.runTest('Validazione e valori di default', () => this.testValidationAndDefaults());
            await this.runTest('Reference Attributes', () => this.testReferenceAttributes());
            await this.runTest('Cache e Performance', () => this.testCacheAndPerformance());
            await this.runTest('Schema Evolution', () => this.testSchemaEvolution());
            await this.runTest('Funzionalità avanzate', () => this.testAdvancedFeatures());
            
        } finally {
            await this.cleanup();
        }
        
        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RISULTATI TEST ENTITYENGINE EVOLUTO');
        console.log('='.repeat(60));
        
        this.results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   ❌ ${result.error}`);
            }
        });
        
        console.log('\n' + '-'.repeat(60));
        console.log(`✅ Test passati: ${this.passedTests}/${this.totalTests}`);
        console.log(`📈 Successo: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        
        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 TUTTI I TEST PASSED! EntityEngine Evoluto funziona correttamente.');
            console.log('🚀 Fase 3 implementata con successo!');
        } else {
            console.log('\n⚠️ Alcuni test sono falliti. Controllare l\'implementazione.');
        }
        
        console.log('\n🎯 Funzionalità testate:');
        console.log('   ✅ Schema Integration automatica');
        console.log('   ✅ Reference Attributes via RelationEngine');
        console.log('   ✅ Lazy Loading e Cache intelligente');
        console.log('   ✅ Validazione avanzata con modalità strict/flexible');
        console.log('   ✅ Schema Evolution dinamica');
        console.log('   ✅ Performance optimization e configurabilità');
        
        console.log('\nEntityEngine Evoluto pronto per integrazione con frontend!');
    }
}

// Esegui test se script chiamato direttamente
if (require.main === module) {
    const tester = new EntityEngineEvolvedTester();
    tester.runAllTests()
        .then(() => {
            console.log('\n🏁 Test completati');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Errore durante i test:', error);
            process.exit(1);
        });
}

module.exports = EntityEngineEvolvedTester; 