/**
 * Test del SchemaManager evoluto
 * Questo file testa le nuove funzionalità del sistema di gestione schemi
 */

const neo4jConnector = require('./neo4j_connector');
const neo4jDAO = require('./dao/neo4j_dao');
const SchemaManager = require('./core/schemaManager_evolved');

async function testSchemaManager() {
    try {
        console.log('🧪 === Test SchemaManager Evoluto ===\n');
        
        // Inizializzazione
        await neo4jConnector.connect();
        console.log('✅ Connesso a Neo4j\n');
        
        const schemaManager = new SchemaManager(neo4jDAO);
        
        // Inizializza lo SchemaManager
        await schemaManager.initialize();
        console.log('✅ SchemaManager inizializzato\n');
        
        // Test 1: Definizione schema entità semplice
        console.log('📝 Test 1: Definizione schema entità Cliente');
        const clienteSchemaDefinition = {
            mode: 'flexible',
            attributes: {
                nome: {
                    type: 'string',
                    required: true,
                    description: 'Nome del cliente'
                },
                email: {
                    type: 'email',
                    required: true,
                    description: 'Email del cliente'
                },
                telefono: {
                    type: 'string',
                    required: false,
                    description: 'Numero di telefono'
                },
                età: {
                    type: 'number',
                    required: false,
                    min: 0,
                    max: 120,
                    description: 'Età del cliente'
                }
            }
        };
        
        const clienteSchema = await schemaManager.defineEntitySchema('Cliente', clienteSchemaDefinition);
        console.log('✅ Schema Cliente definito:', clienteSchema.entityType);
        console.log('   Attributi:', clienteSchema.getAttributeNames());
        console.log('   Modalità:', clienteSchema.mode);
        console.log();
        
        // Test 2: Definizione schema entità con attributi di riferimento
        console.log('📝 Test 2: Definizione schema entità Ordine (con riferimenti)');
        const ordineSchemaDefinition = {
            mode: 'strict',
            attributes: {
                numero: {
                    type: 'string',
                    required: true,
                    description: 'Numero ordine'
                },
                cliente: {
                    type: 'reference',
                    required: true,
                    referencesEntityType: 'Cliente',
                    relationTypeForReference: 'HaCliente',
                    displayAttributeFromReferencedEntity: 'nome',
                    cardinalityForReference: 'N:1',
                    description: 'Cliente che ha effettuato l\'ordine'
                },
                importo: {
                    type: 'number',
                    required: true,
                    min: 0,
                    description: 'Importo totale dell\'ordine'
                },
                stato: {
                    type: 'select',
                    required: true,
                    options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
                    defaultValue: 'Pending',
                    description: 'Stato dell\'ordine'
                }
            }
        };
        
        const ordineSchema = await schemaManager.defineEntitySchema('Ordine', ordineSchemaDefinition);
        console.log('✅ Schema Ordine definito:', ordineSchema.entityType);
        console.log('   Attributi:', ordineSchema.getAttributeNames());
        console.log('   Modalità:', ordineSchema.mode);
        console.log('   Ha attributi reference:', ordineSchema.hasReferenceAttributes());
        console.log();
        
        // Test 3: Definizione schema relazione
        console.log('📝 Test 3: Definizione schema relazione HaCliente');
        const haClienteSchemaDefinition = {
            cardinality: 'N:1',
            sourceTypes: ['Ordine'],
            targetTypes: ['Cliente'],
            attributes: {
                dataCreazione: {
                    type: 'date',
                    required: true,
                    description: 'Data di creazione della relazione'
                },
                note: {
                    type: 'string',
                    required: false,
                    description: 'Note aggiuntive'
                }
            }
        };
        
        const haClienteSchema = await schemaManager.defineRelationSchema('HaCliente', haClienteSchemaDefinition);
        console.log('✅ Schema relazione HaCliente definito:', haClienteSchema.relationType);
        console.log('   Cardinalità:', haClienteSchema.cardinality);
        console.log('   Tipi sorgente:', haClienteSchema.sourceTypes);
        console.log('   Tipi target:', haClienteSchema.targetTypes);
        console.log('   Attributi:', haClienteSchema.getAttributeNames());
        console.log();
        
        // Test 4: Recupero schemi
        console.log('📝 Test 4: Recupero schemi definiti');
        const recuperatoCliente = schemaManager.getEntitySchema('Cliente');
        const recuperatoOrdine = schemaManager.getEntitySchema('Ordine');
        const recuperatoRelazione = schemaManager.getRelationSchema('HaCliente');
        
        console.log('✅ Schema Cliente recuperato:', recuperatoCliente ? '✓' : '✗');
        console.log('✅ Schema Ordine recuperato:', recuperatoOrdine ? '✓' : '✗');
        console.log('✅ Schema relazione HaCliente recuperato:', recuperatoRelazione ? '✓' : '✗');
        console.log();
        
        // Test 5: Validazione attributi
        console.log('📝 Test 5: Validazione attributi');
        
        // Validazione corretta
        const validazioneNome = schemaManager.validateAttributeValue('Cliente', 'nome', 'Mario Rossi');
        console.log('   Nome valido:', validazioneNome.valid ? '✅' : '❌', validazioneNome.error || '');
        
        // Validazione email
        const validazioneEmail = schemaManager.validateAttributeValue('Cliente', 'email', 'mario@example.com');
        console.log('   Email valida:', validazioneEmail.valid ? '✅' : '❌', validazioneEmail.error || '');
        
        // Validazione email non valida
        const validazioneEmailErrata = schemaManager.validateAttributeValue('Cliente', 'email', 'email-non-valida');
        console.log('   Email non valida:', !validazioneEmailErrata.valid ? '✅' : '❌', validazioneEmailErrata.error || '');
        
        // Validazione numero età
        const validazioneEtà = schemaManager.validateAttributeValue('Cliente', 'età', 25);
        console.log('   Età valida:', validazioneEtà.valid ? '✅' : '❌', validazioneEtà.error || '');
        
        // Validazione numero età fuori range
        const validazioneEtàFuoriRange = schemaManager.validateAttributeValue('Cliente', 'età', 150);
        console.log('   Età fuori range:', !validazioneEtàFuoriRange.valid ? '✅' : '❌', validazioneEtàFuoriRange.error || '');
        
        // Validazione attributo sconosciuto in modalità flessibile
        const validazioneAttributoSconosciuto = schemaManager.validateAttributeValue('Cliente', 'attributoSconosciuto', 'valore');
        console.log('   Attributo sconosciuto (modalità flessibile):', validazioneAttributoSconosciuto.valid ? '✅' : '❌', validazioneAttributoSconosciuto.warning || '');
        
        // Validazione attributo sconosciuto in modalità strict
        const validazioneAttributoSconosciutoStrict = schemaManager.validateAttributeValue('Ordine', 'attributoSconosciuto', 'valore');
        console.log('   Attributo sconosciuto (modalità strict):', !validazioneAttributoSconosciutoStrict.valid ? '✅' : '❌', validazioneAttributoSconosciutoStrict.error || '');
        console.log();
        
        // Test 6: Validazione relazioni
        console.log('📝 Test 6: Validazione relazioni');
        
        // Validazione relazione corretta
        const validazioneRelazione = schemaManager.validateRelation('HaCliente', 'Ordine', 'Cliente', {
            dataCreazione: new Date().toISOString(),
            note: 'Test note'
        });
        console.log('   Relazione valida:', validazioneRelazione.valid ? '✅' : '❌', validazioneRelazione.error || '');
        
        // Validazione relazione con tipo sorgente errato
        const validazioneRelazioneTipoErrato = schemaManager.validateRelation('HaCliente', 'TipoErrato', 'Cliente', {});
        console.log('   Relazione tipo errato:', !validazioneRelazioneTipoErrato.valid ? '✅' : '❌', validazioneRelazioneTipoErrato.error || '');
        console.log();
        
        // Test 7: Lista di tutti gli schemi
        console.log('📝 Test 7: Lista di tutti gli schemi');
        const tuttiEntityTypes = schemaManager.getAllEntityTypes();
        const tuttiRelationTypes = schemaManager.getAllRelationTypes();
        
        console.log('   Tipi di entità definiti:', tuttiEntityTypes);
        console.log('   Tipi di relazione definiti:', tuttiRelationTypes);
        console.log();
        
        // Test 8: Evoluzione schema (aggiunta attributo)
        console.log('📝 Test 8: Evoluzione schema - aggiunta attributo');
        const evoluzione = {
            addAttributes: {
                dataRegistrazione: {
                    type: 'date',
                    required: false,
                    defaultValue: new Date().toISOString(),
                    description: 'Data di registrazione del cliente'
                }
            }
        };
        
        const schemaEvoluto = await schemaManager.evolveSchema('Cliente', evoluzione);
        console.log('✅ Schema Cliente evoluto. Nuova versione:', schemaEvoluto.version);
        console.log('   Nuovi attributi:', schemaEvoluto.getAttributeNames());
        console.log();
        
        console.log('🎉 === Tutti i test completati con successo! ===');
        
    } catch (error) {
        console.error('❌ Errore durante i test:', error);
        throw error;
    } finally {
        await neo4jConnector.close();
        console.log('🔌 Connessione a Neo4j chiusa');
    }
}

// Esegui i test se questo file viene eseguito direttamente
if (require.main === module) {
    testSchemaManager()
        .then(() => {
            console.log('\n✅ Test completati con successo!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test falliti:', error);
            process.exit(1);
        });
}

module.exports = testSchemaManager; 