<!-- Questo file serve come diario di bordo per lo sviluppo dell'MVP del SSOT Dinamico. 
L'obiettivo è tracciare:
- Task completati
- Task in corso
- Decisioni prese
- Problemi riscontrati e loro risoluzione
- Prossimi passi
Questo mi aiuterà a mantenere il focus sugli obiettivi dell'MVP e a documentare il processo di sviluppo. -->

# Diario di Bordo - MVP SSOT Dinamico

## Obiettivo Corrente: ✅ CORE ENGINE EVOLUTO IN PROGRESSIONE

**Data:** $(date +%Y-%m-%d)

### Task Completati:

*   [x] Comprensione approfondita dei requisiti dell'MVP forniti dall'utente.
*   [x] Creazione del documento `manuale_sviluppo_mvp.md` contenente la guida dettagliata per lo sviluppo.
*   [x] Preparazione del file `context.md` come diario di bordo.
*   [x] Fase 0.1: Installazione di Node.js e npm.
*   [x] Fase 0.2: Installazione di Neo4j Desktop.
*   [x] Fase 0.3: Creazione progetto Node.js e installazione dipendenze.
*   [x] **Fase 0 COMPLETATA**: Setup Ambiente e Fondamenta.
*   [x] Fase 1.1: Configurazione connessione Neo4j (neo4j_connector.js) e test.
*   [x] Fase 1.2: Implementazione DAO (neo4j_dao.js) e test.
*   [x] **Fase 1 COMPLETATA**: Modello Dati Neo4j e DAO Iniziale.
*   [x] Fase 2.1: Implementazione SchemaManager_MVP (backend/core/schemaManager.js).
*   [x] Fase 2.2: Implementazione EntityEngine_MVP (backend/core/entityEngine.js).
*   [x] Fase 2.3: Implementazione AttributeSpace_MVP (backend/core/attributeSpace.js).
*   [x] Fase 2.4: Test di integrazione moduli core - test_core_engine.js completato con successo.
*   [x] **Fase 2 COMPLETATA**: Core Engine (Versioni MVP).
*   [x] Fase 3.1: Implementazione server Express con WebSocket (backend/server.js).
*   [x] **Fase 3 COMPLETATA**: Backend Server (Minimale per Comunicazione).
*   [x] Fase 4.1: Implementazione Modulo Tabellare (frontend/modules/TabularModule.js).
*   [x] **Fase 4 COMPLETATA**: Frontend - Modulo Tabellare.
*   [x] Fase 5.1: Implementazione Modulo Scheda Contatto (frontend/modules/ContactCardModule.js).
*   [x] **Fase 5 COMPLETATA**: Frontend - Modulo Scheda Contatto.
*   [x] Fase 6.1: Implementazione Dashboard principale (frontend/index.html).
*   [x] Fase 6.2: Implementazione coordinatore principale (frontend/app.js).
*   [x] Fase 6.3: Implementazione stili CSS (frontend/style.css).
*   [x] **Fase 6 COMPLETATA**: Frontend - Dashboard e Integrazione.
*   [x] Fase 7.1: Test completi del sistema con scenari del manuale.
*   [x] Fase 7.2: Verifica reattività bidirezionale tra moduli.
*   [x] **Fase 7 COMPLETATA**: Test e Dimostrazione del PoC.
*   [x] Aggiornamento `manuale_sviluppo_mvp.md` per includere la sincronizzazione cross-window.
*   [x] Fase 8.1: Modifica `frontend/index.html` per aggiungere opzioni "Apri in nuova finestra".
*   [x] Fase 8.2: Creazione `frontend/module_loader.html` e script associato (`app_module.js`) per caricare moduli in finestre figlie.
*   [x] Fase 8.3: Implementazione logica di apertura di nuove finestre in `frontend/app.js`.
*   [x] Fase 8.4: Implementazione meccanismo di comunicazione cross-window (BroadcastChannel/localStorage) in moduli esistenti.
*   [x] **Fase 8 COMPLETATA**: Implementazione Sincronizzazione Moduli in Finestre Separate.
*   [x] Implementazione stile grafico "Web 1.0 primitivo" per finestre figlie.
*   [x] **Decisione Architetturale Chiave**: Adozione della "Nota Evolutiva del Progetto SSOT Dinamico" per guidare l'evoluzione del backend verso una gestione della conoscenza più intelligente, organica e semanticamente ricca. Questo include granularità semantica profonda (value-entities), SchemaManager evoluto (con supporto per attributi di tipo "reference" e crescita organica), RelationEngine potenziato, e moduli UI dinamici e schema-aware.
*   [x] Aggiornamento di `doc_tecnico_evoluzione_core_v1.md` per riflettere la nuova direzione architetturale, dettagliando le modifiche a SchemaManager, EntityEngine, RelationEngine, DAO, e API, inclusa l'integrazione con il frontend per moduli schema-aware.
*   [x] Aggiornamento di `full-ssot.md` per integrare la filosofia della "Nota Evolutiva" (granularità semantica, crescita organica della conoscenza, moduli UI come interfacce di modellazione contestuale).
*   [x] Aggiornamento di `architettura_mvp.md` e `manuale_sviluppo_mvp.md` per contestualizzarli come documenti storici dell'MVP iniziale e indirizzare alla documentazione evoluta.

### ✨ **FASE 9 COMPLETATA - MVP EVOLUTO CON SCHEMA MANAGEMENT AVANZATO**:

#### **9.1 - Backend Core Engine Evoluto** (SchemaManager Evoluto, DAO Evoluto, Server Evoluto):
*   [x] **SchemaManager Evoluto (`backend/core/schemaManager_evolved.js`)**: Persistenza, API evoluzione, additive-only, strict/flexible, versioning.
*   [x] **DAO Evoluto (`backend/dao/neo4j_dao_evolved.js`)**: Query ottimizzate, CRUD schemi, `addAttributeToSchema` sicuro.
*   [x] **Server Evoluto (`backend/server_evolved.js`)**: Endpoint API schema, backward compatibility, WebSocket per schema changes.

#### **9.2 - Frontend Schema-Aware Evoluto**:
*   [x] **TabularModule Evoluto**: `entityType` da URL, API evolute con fallback, UI evoluzione schema, notifica cross-window.
*   [x] **Cross-Window Schema Synchronization**: Eventi 'schema-update', re-rendering tabelle.
*   [x] **App Controllers Evoluti**: Gestione eventi schema, passaggio `entityType`.

#### **9.3 - Modello Dati Neo4j per Schemi**:
*   [x] **Strutture Schema Complete**: Nodi `:SchemaEntityType`, `:SchemaRelationType`, `:AttributeDefinition`.
*   [x] **Test Schemi Precaricati**: 'Cliente', 'Persona', 'TestEvoluzione', 'Conosce', 'HaCliente'.

#### **9.4 - Funzionalità End-to-End Testate (Schema Management)**:
*   [x] Schema Evolution Real-time, Multi-Entity Type Support, Backward Compatibility MVP.

### ✨ **FASE 10 (Core Engine - Fase 2) COMPLETATA - RELATIONENGINE E COMPATIBILITÀ SISTEMA**:

#### **10.1 - RelationEngine Completo (`backend/core/relationEngine.js`)**:
*   [x] **Classe RelationEngine Implementata**: Gestione relazioni come entità, validazione schemi, API complete, pattern matching, attributi relazionali, statistiche, persistenza.
*   [x] **Modello Dati Neo4j per Relazioni**: Nodi `:Relation`, relazioni `:HAS_RELATION`, `:TO_ENTITY`.

#### **10.2 - Risoluzione Problema Compatibilità Sistema**:
*   [x] **Compatibilità SchemaManager Evoluto/EntityEngine_MVP**: Metodi bridge, logging `🔄 [COMPATIBILITÀ MVP]`.

#### **10.3 - Test RelationEngine End-to-End**:
*   [x] Scenari di Test validati: Creazione schemi, relazioni tipizzate, validazione, ricerca, navigazione, aggiornamento attributi, statistiche, persistenza.

### 🚀 **FASE 3 (Core Engine - Fase 3) COMPLETATA - EntityEngine Evoluto**:

#### **3.1 - EntityEngine Evoluto (`backend/core/entityEngine_evolved.js`)**:
*   [x] **Refactoring Completo**: EntityEngine_MVP evoluto in EntityEngine.
*   [x] **Integrazione Schema Avanzata**: Caricamento dinamico e caching degli schemi da SchemaManager evoluto.
*   [x] **Lazy Loading**: Implementato per attributi normali e reference, con opzioni per `includeReferences`.
*   [x] **Gestione Attributi Reference**: Integrazione completa con RelationEngine per creare, aggiornare e risolvere relazioni per attributi di tipo 'reference'.
*   [x] **Validazione Avanzata**: Validazione entità basata su schema (modalità 'strict' e 'flexible') e validazione attributi singoli.
*   [x] **Applicazione Default**: Applicazione automatica dei valori di default definiti nello schema, con fallback a definizioni originali registrate per robustezza.
*   [x] **Caching Intelligente**: Cache per entità, schemi e reference risolte per ottimizzare performance.
*   [x] **Invalidazione Cache**: Meccanismi per invalidare cache per singola entità o globalmente.
*   [x] **API Complete**: Metodi `createEntity`, `getEntity`, `setEntityAttribute`, `getAllEntities`, `resolveEntityReferences`, `getOrCreateSchema`, `validateEntity`, `extractReferenceAttributes`.
*   [x] **Statistiche e Monitoring**: Esposizione statistiche su cache e configurazione.
*   [x] **Notifiche AttributeSpace**: Corretta integrazione con AttributeSpace_MVP per notificare cambiamenti.

#### **3.2 - Test e Validazione (`test_entityengine_evolved.js`)**:
*   [x] **Script di Test Completo**: Creato `test_entityengine_evolved.js` per validare tutte le funzionalità dell'EntityEngine evoluto.
*   [x] **Scenari di Test**: Copertura di integrazione schema, validazione, defaults, reference attributes, cache, schema evolution, invalidazione cache.
*   [x] **Successo dei Test**: Tutti i test (6/6) superati, confermando la corretta implementazione e risoluzione dei problemi di memoria.

#### **3.3 - DAO e SchemaManager (Impatto e Supporto)**:
*   [x] **`neo4j_dao.js`**: Ottimizzazioni `saveAttributeDefinitionSeparateTransaction` e `saveEntitySchema`.
*   [x] **`schemaManager_evolved.js`**: Mantenimento metodi di compatibilità MVP.

### ✨ **FASE 4 (Core Engine - Fase 4) COMPLETATA - AttributeSpace Evoluto**:

#### **4.1 - AttributeSpace Evoluto (`backend/core/attributeSpace_evolved.js`)**:
*   [x] **Pattern Matching Avanzato**: Sottoscrizioni granulari con pattern `entityType`, `attributeNamePattern`, `custom functions`.
*   [x] **Gestione Eventi Multi-Tipo**: Eventi entità, relazioni, schema con propagazione differenziata.
*   [x] **Batching Intelligente**: Raggruppamento notifiche per performance, configurabile `batchDelay`.
*   [x] **Loop Detection**: Protezione da loop infiniti con `maxLoopDetection`.
*   [x] **Configurazione Server-Optimized**: Impostazioni ottimizzate per ambiente server (batching enabled, logging).

#### **4.2 - Server Evoluto Integrazione AttributeSpace**:
*   [x] **WebSocket Pattern-Based**: Sottoscrizioni avanzate per client WebSocket (attributeChange, relationChange, schemaChange).
*   [x] **Audit Logging**: Pattern matching per attributi sensibili (es. `*password*`).
*   [x] **Performance Monitoring**: Sottoscrizioni custom per batch elevati e campi computati.

#### **4.3 - Test AttributeSpace End-to-End**:
*   [x] Scenari di Test validati: Pattern matching, batching, loop detection, performance monitoring, propagazione WebSocket.

### 🚀 **FASE 1 FRONTEND EVOLUTO COMPLETATA - Webmodules Template-Driven Schema-Aware**:

#### **1.1 - Servizi Frontend Core (4 servizi)**:
*   [x] **ModuleDefinitionService.js**: Gestione template JSON, cache, validazione, compatibilità multi-entityType, fallback graceful.
*   [x] **SchemaService.js**: Interazione backend schemi, API evolute con fallback MVP, cache 30s, validazione attributi, info dettagliate.
*   [x] **EntityService.js**: CRUD entità, cache intelligente, gestione reference, integrazione EntityEngine evoluto, deduplicazione richieste.
*   [x] **WebSocketService.js**: Connessione evoluta con reconnect esponenziale, sottoscrizioni granulari, pattern matching, queue messaggi offline.

#### **1.2 - Web Components Base (3 componenti)**:
*   [x] **ssot-input.js**: Input validazione integrata SchemaService, eventi personalizzati, stili consistenti, debounce validation, focus management.
*   [x] **attribute-display.js**: Visualizzazione schema-aware, formattazione tipo-specifica (email clickable, telefono, date), tooltip, responsive.
*   [x] **template-module-renderer.js**: **Componente centrale** - renderizza moduli da template JSON + entity ID, integrazione tutti servizi, WebSocket subscriptions, viste multiple (StandardCard, CompactCard), gestione azioni.

#### **1.3 - Template JSON Sistema (3 template)**:
*   [x] **SimpleContactCard.json**: Template base con attributi semplici `["nome", "cognome", "email", "telefono"]`.
*   [x] **StandardContactCard.json**: Template avanzato con layout strutturato, sezioni ("Informazioni Principali", "Dettagli Contatto"), viste multiple, azioni.
*   [x] **CompactContactCard.json**: Template universale per qualsiasi entità (`targetEntityType: "*"`).

#### **1.4 - Pagina Test Completa (1 test interface)**:
*   [x] **views/template-test.html**: Interface testing completa per servizi, template-module-renderer, componenti individuali, logging real-time, responsive design.

#### **1.5 - Integrazione Backend-Frontend End-to-End**:
*   [x] **Server Backend Operativo**: server_evolved.js serve file statici frontend, API MVP + evolute, WebSocket real-time.
*   [x] **Schema Contact Creato**: Attributi `nome`, `cognome`, `email`, `telefono`, `indirizzo`, `citta` con tipo appropriato.
*   [x] **Entità Test**: 2 entità Contact (Mario Rossi, Anna Verdi) con dati completi per testing.
*   [x] **Funzionalità Validate**: Template rendering, schema-awareness, WebSocket updates, fallback API, validazione, focus management.

#### **1.6 - Funzionalità Chiave Implementate**:
*   [x] **Template-Driven Rendering**: Moduli renderizzati dinamicamente da definizioni JSON, layout strutturato con sezioni, viste multiple per stesso template, azioni configurabili.
*   [x] **Schema-Awareness**: Componenti che si adattano ai tipi attributo (email, telefono, date), validazione automatica basata su schema, formattazione tipo-specifica, fallback graceful.
*   [x] **Real-time Integration**: WebSocket subscriptions per aggiornamenti live, pattern matching avanzato per eventi, propagazione cross-window, cache invalidation automatica.
*   [x] **Performance Optimization**: Caching intelligente (30s timeout), debounce validation (300ms), lazy loading attribute info, deduplicazione richieste parallele.
*   [x] **User Experience**: Focus management corretto in Web Components, validazione real-time senza perdita focus, indicatori visivi stato validazione, responsive design.

### Task in Corso:

*   [ ] **Documentazione Completa**: Aggiornamento finale documenti per riflettere MVP Evoluto + RelationEngine + EntityEngine Evoluto.

### Decisioni Prese Recenti:

#### **Schema Evolution - Implementazione Additive-Only**:
*   **Decisione**: Implementare solo operazioni additive (MERGE, ON CREATE SET).
*   **Motivazione**: Sicurezza dati e robustezza.

#### **API Strategy - Dual Track**:
*   **Decisione**: Mantenere API MVP originali e aggiungere API evolute.
*   **Motivazione**: Backward compatibility e migrazione graduale.

#### **Frontend URL Parameters**:
*   **Decisione**: Utilizzare URL parameters per passare `entityType`.
*   **Motivazione**: Finestre separate con tipi entità diversi.

#### **Cross-Window Schema Sync**:
*   **Decisione**: Estendere BroadcastChannel per notifiche schema.
*   **Motivazione**: Sincronizzazione immediata modifiche struttura.

### Problemi Riscontrati (e Risolti):
*   ✅ **Neo4j Schema Evolution Error**: Risolto con operazioni additive-only.
*   ✅ **Frontend API Fallback**: Risolto con fallback graceful.
*   ✅ **Cross-Window EntityType**: Risolto con URL parameters.
*   ✅ **Schema Structure Sync**: Risolto con eventi 'schema-update'.
*   ✅ **Neo4j Memory Issues**: Risolto con transazioni separate e delay nel DAO, e correzioni nei test.
*   ✅ **EntityEngine Validation/Defaults**: Risolto con logica robusta in EntityEngine e aggiornamenti test.

### Prossimi Passi (Roadmap Evoluzione Core Engine):

*   [ ] **🚀 FASE 4: AttributeSpace Potenziato** (prossimo focus):
    *   [ ] Pattern matching avanzato per sottoscrizioni.
    *   [ ] Gestione propagazione eventi relazioni oltre entità.
    *   [ ] Batching e ottimizzazioni performance per grandi volumi.

**Status MVP Originale**: ✅🚀 **MVP COMPLETATO E DIMOSTRATO CON SUCCESSO!** 🚀✅
**Status Estensione Cross-Window**: ✅🎯 **ESTENSIONE CROSS-WINDOW COMPLETATA!** 🎯✅ 
**Status MVP Evoluto (Schema Management)**: ✅🌟 **MVP EVOLUTO CON SCHEMA MANAGEMENT COMPLETATO!** 🌟✅
**Status Fase 2 RelationEngine**: ✅🔗 **RELATIONENGINE CON API COMPLETATO E TESTATO!** 🔗✅
**Status Fase 3 EntityEngine**: ✅🧠 **ENTITYENGINE EVOLUTO COMPLETATO E TESTATO!** 🧠✅
**Status Fase 4 AttributeSpace**: ✅⚡ **ATTRIBUTESPACE EVOLUTO CON PATTERN MATCHING COMPLETATO!** ⚡✅
**Status Fase 1 Frontend Evoluto**: ✅🎨 **FRONTEND WEBMODULES TEMPLATE-DRIVEN COMPLETATO!** 🎨✅
**Status Complessivo**: 🚀 **SISTEMA SSOT DINAMICO CON CORE ENGINE EVOLUTO + FRONTEND SCHEMA-AWARE OPERATIVO** 🚀

### 🌟 Architettura Finale Core Engine Evoluto:

**🔧 Backend Core Evoluto:**
*   ✅ SchemaManager evoluto: persistenza, evoluzione, validazione + compatibilità MVP.
*   ✅ RelationEngine: gestione relazioni tipizzate come entità di prima classe.
*   ✅ EntityEngine evoluto: gestione entità con schema integration, lazy loading, reference.
*   ✅ Server API evoluto: endpoint schema, backward compatibility.
*   ✅ DAO evoluto: query ottimizzate, operazioni additive-only.
*   ✅ WebSocket evoluto: propagazione dati + schema changes.

**🎨 Frontend Schema-Aware:**
*   ✅ Moduli UI dinamici basati su schema.
*   ✅ Evoluzione schema real-time via UI.
*   ✅ Sincronizzazione cross-window dati + struttura.
*   ✅ URL parameters per entity types multipli.
*   ⏳ UI relazioni (prossima implementazione).

**💾 Database Neo4j Evoluto:**
*   ✅ Persistenza schema completa (:SchemaEntityType, :SchemaRelationType).
*   ✅ Relazioni tipizzate con nodi :Relation e attributi custom.
*   ✅ Versioning e audit trail.
*   ✅ Strutture relazionali per metadati schema.
*   ✅ Operazioni sicure additive-only.

**📋 Documentazione Aggiornata:**
*   ✅ `doc_tecnico_evoluzione_core_v1.md`: Fase 3 completata, roadmap aggiornata.
*   ✅ `context.md`: questo diario aggiornato con Fase 3 EntityEngine.
*   ✅ `architettura_mvp_evoluto.md`: architettura sistema evoluto aggiornata con EntityEngine.
*   ✅ Test end-to-end per EntityEngine validati e documentati.


</rewritten_file> 