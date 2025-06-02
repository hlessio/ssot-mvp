<!-- Questo file serve come diario di bordo per lo sviluppo dell'MVP del SSOT Dinamico. 
L'obiettivo è tracciare:
- Task completati
- Task in corso
- Decisioni prese
- Problemi riscontrati e loro risoluzione
- Prossimi passi
Questo mi aiuterà a mantenere il focus sugli obiettivi dell'MVP e a documentare il processo di sviluppo. -->

# Diario di Bordo - MVP SSOT Dinamico

## Obiettivo Corrente: Estensione MVP - Sincronizzazione Moduli in Finestre Separate

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

### Task in Corso:

*   [ ] **Fase 9: Potenziamento Core Engine e Gestione Schemi (secondo `doc_tecnico_evoluzione_core_v1.md` aggiornato)**: Inizio implementazione delle specifiche evolute.

### Decisioni Prese:

*   Usare Neo4j Desktop invece di Docker per semplicità di setup.
*   Installate dipendenze: neo4j-driver, uuid, express, ws, cors.
*   Struttura progetto creata: `/mvp-ssot` con cartelle backend/{core,dao,services} e frontend/modules.
*   Connessione Neo4j: bolt://localhost:7687, user: neo4j, password: windows97!
*   DAO implementato e testato con tutte le funzioni: createEntity, getEntityById, updateEntityAttribute, getAllEntities, getAllAttributeKeysForEntityType.
*   Core Engine implementato con pattern di dipendenze: SchemaManager_MVP -> EntityEngine_MVP -> AttributeSpace_MVP.
*   AttributeSpace_MVP implementa pattern Observer per la reattività in tempo reale.
*   Server Express con WebSocket completamente implementato con endpoint CRUD e propagazione in tempo reale.
*   Frontend implementato con due moduli completi: Tabellare e Scheda Contatto.
*   Dashboard responsiva con debug panel e indicatori di stato WebSocket.
*   Auto-discovery degli attributi per popolare lo schema dinamicamente.
*   **Estensione MVP**: Si utilizzerà `window.open()` per lanciare moduli in nuove finestre. La comunicazione cross-window primaria avverrà tramite `localStorage` (per semplicità MVP, con `BroadcastChannel` come alternativa più robusta) per notifiche rapide, mantenendo WebSocket per la sincronizzazione con il backend e tra sessioni diverse.
*   **Fase 8 - Architettura Cross-Window Implementata**: 
    *   Nuovi bottoni nell'interfaccia principale per aprire moduli in finestre separate
    *   `module_loader.html`: pagina dedicata per caricare moduli specifici in finestre figlie (ora con stile Web 1.0 primitivo)
    *   `app_module.js`: script per gestire moduli in finestre separate con pieno supporto WebSocket (ora carica moduli con HTML e stili primitivi)
    *   Comunicazione cross-window bidirezionale tramite `BroadcastChannel` (con fallback `localStorage`)
    *   Estensione dei moduli esistenti (`TabularModule` e `ContactCardModule`) con metodi `handleExternalUpdate()` e `notifyEntityUpdate()`
    *   Meccanismo di sovrascrittura dinamica dei metodi di notifica per propagazione cross-window
    *   Script `start` aggiunto al `package.json` per avvio semplificato del server
*   **Avvio Fase di Evoluzione Backend**: Creato il documento tecnico `doc_tecnico_evoluzione_core_v1.md` per dettagliare il potenziamento del core engine e del sistema di gestione degli schemi, come prossimo macro passo evolutivo.
*   **Adozione "Nota Evolutiva"**: La "Nota Evolutiva del Progetto SSOT Dinamico" è stata integrata nei documenti `doc_tecnico_evoluzione_core_v1.md` e `full-ssot.md` per guidare lo sviluppo futuro verso una gestione della conoscenza più semantica e organica. I documenti `architettura_mvp.md` e `manuale_sviluppo_mvp.md` sono stati aggiornati per riflettere il loro status di documentazione della fase MVP iniziale.

### Problemi Riscontrati (e Risolti):

*   Query Cypher per getAllAttributeKeysForEntityType aveva sintassi errata. Risolto con `WHERE NOT key IN [...]`.
*   Errore import DAO nel test: neo4j_dao.js esporta un'istanza, non la classe. Risolto aggiornando import.
*   Neo4jConnector non inizializzato nei test. Risolto chiamando `neo4jConnector.connect()` prima dell'uso.
*   Server non si avviava dalla directory sbagliata. Risolto eseguendo dalla cartella mvp-ssot.
*   Errore frontend `forEach of undefined` dovuto alla gestione iniziale degli attributi dallo schema. Risolto assicurando che l'endpoint `/api/schema/:entityType/attributes` restituisca sempre un array e che lo schema venga popolato tramite auto-discovery all'avvio e durante le operazioni.
*   ✅ Auto-discovery attributi per schema dinamico

### Architettura Implementata (Pre-Estensione):

**Backend:**
*   Server Express (porta 3000) con middleware CORS e serving file statici
*   WebSocket Server per comunicazione real-time
*   API REST completa per CRUD entità e gestione schema
*   Integrazione AttributeSpace->WebSocket per propagazione notifiche
*   Pattern Observer per reattività (AttributeSpace_MVP)

**Frontend (Pre-Estensione):**
*   Dashboard HTML con navigazione tra moduli
*   ModuloTabellare: visualizzazione entità come tabella editabile
*   ModuloScheda: visualizzazione singola entità con campi editabili
*   App.js coordinatore con gestione WebSocket e sincronizzazione moduli
*   CSS responsive con debug panel integrato

**Funzionalità Chiave Implementate (Pre-Estensione):**
*   ✅ Creazione dinamica entità con attributi personalizzabili
*   ✅ Editing in-place con validazione e feedback visivo
*   ✅ Propagazione bidirezionale real-time via WebSocket
*   ✅ Sincronizzazione automatica tra moduli Tabellare e Scheda
*   ✅ Gestione errori e riconnessione automatica WebSocket
*   ✅ Debug panel per monitoraggio operazioni
*   ✅ Persistenza dati su Neo4j
*   ✅ Auto-discovery attributi per schema dinamico

### Prossimi Passi (Focus Estensione MVP):

*   [ ] Inizio implementazione **Fase 9: Potenziamento Core Engine e Gestione Schemi** secondo `doc_tecnico_evoluzione_core_v1.md`.
*   [ ] Ulteriori rifiniture e test.

**Status MVP (Post Completamento Iniziale)**: ✅🚀 **MVP COMPLETATO E DIMOSTRATO CON SUCCESSO!** 🚀✅
**Status Estensione MVP (Fase 8)**: ✅🎯 **ESTENSIONE CROSS-WINDOW COMPLETATA!** 🎯✅ 
**Status Stile Finestre Figlie**: ✅🎨 **STILE WEB 1.0 PRIMITIVO IMPLEMENTATO!** 🎨✅
**Status Definizione Architetturale Evoluta**: ✅🏛️ **ARCHITETTURA EVOLUTA DEFINITA E DOCUMENTI AGGIORNATI!** 🏛️✅
**Status Complessivo**: 🚀 **FASE DI EVOLUZIONE CORE ENGINE (SECONDO NUOVA ARCHITETTURA) PRONTA PER L'AVVIO** 🚀

### 🌟 Funzionalità Chiave Implementate nell'Estensione (Fase 8):

**Cross-Window Synchronization:**
*   ✅ Apertura moduli in finestre browser separate
*   ✅ Sincronizzazione bidirezionale in tempo reale tra finestre
*   ✅ Comunicazione robusta tramite BroadcastChannel + fallback localStorage
*   ✅ Gestione automatica della chiusura finestre e cleanup risorse
*   ✅ Indicatori visivi di sincronizzazione nelle finestre figlie
*   ✅ Propagazione istantanea delle modifiche tra tutte le finestre aperte
*   ✅ Prevenzione loop di aggiornamento tra finestre
*   ✅ Supporto completo WebSocket per persistenza backend

**Interface Enhancements:**
*   ✅ Nuovi controlli UI per apertura finestre separate
*   ✅ Header dedicato per finestre figlie con indicatori di stato
*   ✅ Gestione errori e fallback per browser con popup bloccati
*   ✅ Stili CSS ottimizzati per finestre separate 