<!-- Questo file serve come diario di bordo per lo sviluppo dell'MVP del SSOT Dinamico. 
L'obiettivo è tracciare:
- Task completati
- Task in corso
- Decisioni prese
- Problemi riscontrati e loro risoluzione
- Prossimi passi
Questo mi aiuterà a mantenere il focus sugli obiettivi dell'MVP e a documentare il processo di sviluppo. -->

# Diario di Bordo - MVP SSOT Dinamico

## Obiettivo Corrente: ✅ FRONTEND EVOLUTO - FASE 3 COMPLETATA + FIX AUTCOMPLETE

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
*   [x] **Fase 1 FRONTEND EVOLUTO COMPLETATA - Webmodules Template-Driven Schema-Aware**.
*   [x] **Fase 2 FRONTEND EVOLUTO COMPLETATA - Editing, Azioni e ModuleInstance Salvabili**.
*   [x] **DEMO FASE 2 COMPLETATA - Risoluzione Bug Moduli Tabellari Dinamici**.
*   [x] **FASE 3 FRONTEND EVOLUTO COMPLETATA - Relazioni, Sub-moduli e Riutilizzo Avanzato**.
*   [x] **Risoluzione Problemi Autocomplete e Creazione Entità**.

### ✅ FASE 3 FRONTEND EVOLUTO COMPLETATA - Relazioni, Sub-moduli e Riutilizzo Avanzato
**Data Completamento:** 03 Giugno 2025 (Continuazione e Finalizzazione)
**Status:** ✅ Implementato e Testato con Successo

**Componenti Implementati (Riepilogo Fase 3):**
- ✅ **RelationService.js**: Servizio completo per gestione relazioni con cache intelligente, WebSocket integration, CRUD relazioni tipizzate.
- ✅ **relation-list.js**: Web Component per visualizzazione liste entità correlate con filtri, azioni e real-time updates.
- ✅ **relation-editor.js**: Editor modale per creazione/modifica relazioni con ricerca entità, validazione e attributi personalizzati.
- ✅ **StandardContactCard v3.0.0**: Template evoluto con sezione relations, sub-moduli configurabili, azioni relazioni.
- ✅ **CompactContactCard v1.0.0**: Template compatto universale per sub-moduli in liste relazioni.
- ✅ **views/relation-test.html**: Pagina test completa per tutti i componenti di relazione con logging avanzato.
- ✅ **Soluzione Relazioni Universali**: Supporto per wildcard "*" negli schemi di relazione per permettere connessioni tra qualsiasi tipo di entità, mantenendo la validazione per schemi specifici.

**Funzionalità Validate (Riepilogo Fase 3):**
- ✅ CRUD relazioni tipizzate con RelationEngine backend integration.
- ✅ Visualizzazione liste entità correlate con filtri per tipo e direzione.
- ✅ Editor relazioni con ricerca entità target e selezione tipo relazione.
- ✅ Sub-moduli configurabili per rendering entità in liste relazioni.
- ✅ WebSocket real-time per sincronizzazione eventi relazioni.
- ✅ Template evolution con supporto `relations` section.
- ✅ Gestione flessibile degli schemi di relazione (specifici e universali).

### ✅ RISOLUZIONE PROBLEMI RECENTI - Autocomplete e Creazione Entità
**Data Completamento:** $(date +%Y-%m-%d)
**Status:** ✅ Bug Corretti e Sistema Migliorato

**Problemi Risolti e Miglioramenti:**

#### **1. Autocomplete: Visualizzazione Nomi e Non Solo ID**
- **Problema**: L'autocomplete mostrava solo l'ID dell'entità (es. `a02df10a-4b96-4966-90b8-b807197ba4d5`) invece di un nome significativo.
- **Soluzione**:
    - Migliorati i metodi `getDisplayName(entity)` e `getSecondareName(entity)` in `entity-autocomplete.js` per cercare in modo più intelligente il nome/titolo/ragione sociale da visualizzare.
    - Aggiornato il rendering dell'entità selezionata e dei risultati di ricerca per utilizzare questi metodi.
- **File Modificato**: `mvp-ssot/frontend/components/entity-autocomplete.js`.

#### **2. Creazione Entità Persona Fallita (Errore 500)**
- **Problema**: La creazione di entità di tipo `Persona` (e potenzialmente altre con schemi strict) falliva con un errore 500 dal server. Console log: `EntityService.js:204 POST http://localhost:3000/api/entities 500 (Internal Server Error)`.
- **Causa**: Il server (`server_evolved.js`) si aspettava i dati della nuova entità all'interno di un oggetto `initialData` nel corpo della richiesta (`req.body.initialData`). Tuttavia, il frontend (`EntityService.js` e la logica di creazione in `autocomplete-demo.html`) inviava i dati direttamente nel corpo della richiesta (es. `{ "entityType": "Persona", "nome": "Mario", "cognome": "Test" }`). Questo portava il server a interpretare `initialData` come `{}` (oggetto vuoto), causando fallimenti di validazione per attributi richiesti come `nome` e `cognome`.
- **Soluzione**:
    - Modificato `mvp-ssot/backend/server_evolved.js` nell'endpoint `POST /api/entities`. Ora il server estrae i dati in modo più flessibile:
      ```javascript
      const { entityType, initialData, ...directData } = req.body;
      const entityData = initialData || directData;
      ```
      Questo permette al server di usare `directData` (dati inviati direttamente nel body) se `initialData` non è presente.
- **File Modificati**: `mvp-ssot/backend/server_evolved.js`.

#### **3. Autocomplete Non Trova Entità Appena Create**
- **Problema**: Dopo aver creato una nuova entità tramite un modulo con opzione di creazione, l'autocomplete in un altro modulo (specialmente uno "senza creazione") non trovava immediatamente la nuova entità.
- **Causa**: Il componente `entity-autocomplete.js` non era in ascolto di eventi WebSocket per aggiornare la sua lista di entità o i risultati di ricerca in tempo reale dopo la creazione/aggiornamento di entità nel sistema. Ricaricava i dati solo rieseguendo una ricerca.
- **Soluzione**:
    - **WebSocket Listeners**: Aggiunto il metodo `setupWebSocketListeners()` in `entity-autocomplete.js`. Questo metodo si registra agli eventi `entity-created` e `attribute-updated` inviati dal `WebSocketService`.
    - **Auto-Refresh**: Quando viene ricevuto un evento `entity-created` per un tipo di entità rilevante, o un `attribute-updated` per un'entità nei risultati correnti, e l'autocomplete è aperto con una query, viene triggerato un auto-refresh della ricerca (con un piccolo timeout per dare tempo al server di processare).
    - **Pulsante Refresh Manuale**: Aggiunto un pulsante "🔄" (refresh) accanto al campo di input dell'autocomplete. Questo permette all'utente di forzare un aggiornamento della lista di entità.
    - **CSS e Gestione Eventi**: Aggiunti stili CSS per il pulsante e la logica nell' `setupEventListeners()` per gestire il click sul pulsante refresh.
    - **Cleanup Listeners**: Implementato `disconnectedCallback()` per rimuovere i listener WebSocket quando il componente viene distrutto, prevenendo memory leak.
- **File Modificati**: `mvp-ssot/frontend/components/entity-autocomplete.js`.

### Task in Corso:
*   Nessuno - In attesa di nuovi task.

### Decisioni Prese Recenti:
*   Confermata la strategia di aggiornamento real-time per l'autocomplete tramite WebSocket per migliorare la UX.
*   Adottata una gestione più flessibile del parsing del corpo della richiesta nel backend per la creazione di entità.

### Prossimi Passi:
*   Attendere nuove richieste o feedback dall'utente.
*   Eventuale refactoring o ottimizzazioni basate sull'uso.

**Status Complessivo**: 🚀 **SISTEMA SSOT DINAMICO COMPLETO CON RELAZIONI E AUTOCOMPLETE FUNZIONANTE E SINCRONIZZATO** 🚀

### Task in Corso:


**Componenti Implementati:**
- ✅ **RelationService.js** (376 righe): Servizio completo per gestione relazioni con cache intelligente, WebSocket integration, CRUD relazioni tipizzate
- ✅ **relation-list.js** (550 righe): Web Component per visualizzazione liste entità correlate con filtri, azioni e real-time updates
- ✅ **relation-editor.js** (763 righe): Editor modale per creazione/modifica relazioni con ricerca entità, validazione e attributi personalizzati
- ✅ **StandardContactCard v3.0.0**: Template evoluto con sezione relations, sub-moduli configurabili, azioni relazioni
- ✅ **CompactContactCard v1.0.0**: Template compatto universale per sub-moduli in liste relazioni
- ✅ **views/relation-test.html**: Pagina test completa per tutti i componenti di relazione con logging avanzato

**Funzionalità Validate:**
- ✅ CRUD relazioni tipizzate con RelationEngine backend integration
- ✅ Visualizzazione liste entità correlate con filtri per tipo e direzione
- ✅ Editor relazioni con ricerca entità target e selezione tipo relazione
- ✅ Sub-moduli configurabili per rendering entità in liste relazioni
- ✅ WebSocket real-time per sincronizzazione eventi relazioni
- ✅ Cache intelligente con invalidazione automatica per performance
- ✅ Template evolution con supporto relations section
- ✅ Interface testing completa con logging e statistiche real-time

**Architettura Implementata:**
- ✅ **RelationService**: Cache 30s, deduplicazione richieste, WebSocket events, pattern matching
- ✅ **relation-list**: Lazy loading, paginazione, azioni configurabili, sub-module rendering
- ✅ **relation-editor**: Modalità create/edit, ricerca entità, attributi personalizzati, validazione
- ✅ **Template Integration**: Relations section nei template JSON, configurazione sub-moduli
- ✅ **Cross-Component Communication**: Eventi customizzati per integrazione seamless

**Integrazione Backend-Frontend:**
- ✅ **API RelationEngine**: Utilizzo completo endpoint /api/relations/* per CRUD
- ✅ **WebSocket Events**: Sottoscrizione relation-created/updated/deleted con propagazione
- ✅ **Schema Integration**: Compatibilità con SchemaService per validazione attributi
- ✅ **EntityService Integration**: Ricerca e selezione entità per creazione relazioni

### Decisioni Prese Recenti:

#### **Fase 3 - Architettura Relazioni Frontend**:
*   **Decisione**: Web Components puri per massima interoperabilità e performance.
*   **Motivazione**: Evita dipendenze framework, integrazione seamless con sistema esistente.

#### **RelationService Caching Strategy**:
*   **Decisione**: Cache 30s con invalidazione basata su eventi WebSocket.
*   **Motivazione**: Bilanciamento performance vs. consistenza dati real-time.

#### **Template Relations Integration**:
*   **Decisione**: Estendere template JSON con sezione "relations" configurabile.
*   **Motivazione**: Flessibilità massima e retrocompatibilità template esistenti.

#### **Sub-Moduli Universali**:
*   **Decisione**: CompactContactCard con targetEntityType: "*" per riutilizzo.
*   **Motivazione**: Reduce duplicazione template e maggiore flessibilità rendering.

### Problemi Riscontrati (e Risolti):
*   ✅ **Neo4j Schema Evolution Error**: Risolto con operazioni additive-only.
*   ✅ **Frontend API Fallback**: Risolto con fallback graceful.
*   ✅ **Cross-Window EntityType**: Risolto con URL parameters.
*   ✅ **Schema Structure Sync**: Risolto con eventi 'schema-update'.
*   ✅ **Neo4j Memory Issues**: Risolto con transazioni separate e delay nel DAO, e correzioni nei test.
*   ✅ **EntityEngine Validation/Defaults**: Risolto con logica robusta in EntityEngine e aggiornamenti test.

### Prossimi Passi (Roadmap Evoluzione Core Engine):

**🔮 Fase 4 Futura - Dashboard Dinamici e Composizione Documenti:**
*   document-renderer Web Component per dashboard composte
*   DynamicDocument entity per persistenza configurazioni dashboard
*   Drag-and-drop interface per composizione moduli
*   Export/import configurazioni moduli e dashboard

**🔮 Fase 5 Futura - Funzionalità Enterprise:**
*   Sistema permessi e condivisione per ModuleInstance
*   Versionamento template e istanze con migrazione automatica
*   Integration LLM per generazione automatica template e configurazioni
*   Analytics e monitoring utilizzo moduli

**Status MVP Originale**: ✅🚀 **MVP COMPLETATO E DIMOSTRATO CON SUCCESSO!** 🚀✅
**Status Estensione Cross-Window**: ✅🎯 **ESTENSIONE CROSS-WINDOW COMPLETATA!** 🎯✅ 
**Status MVP Evoluto (Schema Management)**: ✅🌟 **MVP EVOLUTO CON SCHEMA MANAGEMENT COMPLETATO!** 🌟✅
**Status Fase 2 RelationEngine**: ✅🔗 **RELATIONENGINE CON API COMPLETATO E TESTATO!** 🔗✅
**Status Fase 3 EntityEngine**: ✅🧠 **ENTITYENGINE EVOLUTO COMPLETATO E TESTATO!** 🧠✅
**Status Fase 4 AttributeSpace**: ✅⚡ **ATTRIBUTESPACE EVOLUTO CON PATTERN MATCHING COMPLETATO!** ⚡✅
**Status Fase 1 Frontend Evoluto**: ✅🎨 **FRONTEND WEBMODULES TEMPLATE-DRIVEN COMPLETATO!** 🎨✅
**Status Fase 2 Frontend Evoluto**: ✅✏️ **FRONTEND EDITING & MODULE INSTANCES COMPLETATO!** ✏️✅
**Status Fase 3 Frontend Evoluto**: ✅🔗 **FRONTEND RELAZIONI & SUB-MODULI COMPLETATO!** 🔗✅
**Status Complessivo**: 🚀 **SISTEMA SSOT DINAMICO COMPLETO CON RELAZIONI OPERATIVO** 🚀

### 🌟 Architettura Finale Core Engine Evoluto:

**🔧 Backend Core Evoluto:**
*   ✅ SchemaManager evoluto: persistenza, evoluzione, validazione + compatibilità MVP.
*   ✅ RelationEngine: gestione relazioni tipizzate come entità di prima classe.
*   ✅ EntityEngine evoluto: gestione entità con schema integration, lazy loading, reference.
*   ✅ Server API evoluto: endpoint schema, backward compatibility.
*   ✅ DAO evoluto: query ottimizzate, operazioni additive-only.
*   ✅ WebSocket evoluto: propagazione dati + schema changes + eventi relazioni.

**🎨 Frontend Schema-Aware Evoluto:**
*   ✅ Moduli UI dinamici basati su schema.
*   ✅ Evoluzione schema real-time via UI.
*   ✅ Sincronizzazione cross-window dati + struttura.
*   ✅ URL parameters per entity types multipli.
*   ✅ **Fase 1**: Template-driven rendering con Web Components, servizi core, WebSocket real-time.
*   ✅ **Fase 2**: Editing completo con attribute-editor, ModuleInstance salvabili, azioni configurabili.
*   ✅ **Fase 3**: Relazioni complete con relation-list, relation-editor, sub-moduli, template integration.

**💾 Database Neo4j Evoluto:**
*   ✅ Persistenza schema completa (:SchemaEntityType, :SchemaRelationType).
*   ✅ Relazioni tipizzate con nodi :Relation e attributi custom.
*   ✅ Versioning e audit trail.
*   ✅ Strutture relazionali per metadati schema.
*   ✅ Operazioni sicure additive-only.

**📋 Documentazione Aggiornata:**
*   ✅ `doc_tecnico_evoluzione_core_v1.md`: Fase 3 completata, roadmap aggiornata.
*   ✅ `context.md`: questo diario aggiornato con Fase 3 Frontend Relazioni.
*   ✅ `architettura_mvp_evoluto.md`: architettura sistema evoluto aggiornata con Relazioni.
*   ✅ Test end-to-end per Relazioni validati e documentati.

### ✅ FASE 3 FRONTEND EVOLUTO COMPLETATA - Relazioni, Sub-moduli e Riutilizzo Avanzato
**Data Completamento:** 03 Gennaio 2025
**Status:** ✅ Implementato e Testato con Successo

**Componenti Implementati:**
- ✅ **RelationService.js** (376 righe): Servizio completo per gestione relazioni con cache intelligente, WebSocket integration, CRUD relazioni tipizzate
- ✅ **relation-list.js** (550 righe): Web Component per visualizzazione liste entità correlate con filtri, azioni e real-time updates
- ✅ **relation-editor.js** (763 righe): Editor modale per creazione/modifica relazioni con ricerca entità, validazione e attributi personalizzati
- ✅ **StandardContactCard v3.0.0**: Template evoluto con sezione relations, sub-moduli configurabili, azioni relazioni
- ✅ **CompactContactCard v1.0.0**: Template compatto universale per sub-moduli in liste relazioni
- ✅ **views/relation-test.html**: Pagina test completa per tutti i componenti di relazione con logging avanzato

**Funzionalità Validate:**
- ✅ CRUD relazioni tipizzate con RelationEngine backend integration
- ✅ Visualizzazione liste entità correlate con filtri per tipo e direzione
- ✅ Editor relazioni con ricerca entità target e selezione tipo relazione
- ✅ Sub-moduli configurabili per rendering entità in liste relazioni
- ✅ WebSocket real-time per sincronizzazione eventi relazioni
- ✅ Cache intelligente con invalidazione automatica per performance
- ✅ Template evolution con supporto relations section
- ✅ Interface testing completa con logging e statistiche real-time

**Architettura Implementata:**
- ✅ **RelationService**: Cache 30s, deduplicazione richieste, WebSocket events, pattern matching
- ✅ **relation-list**: Lazy loading, paginazione, azioni configurabili, sub-module rendering
- ✅ **relation-editor**: Modalità create/edit, ricerca entità, attributi personalizzati, validazione
- ✅ **Template Integration**: Relations section nei template JSON, configurazione sub-moduli
- ✅ **Cross-Component Communication**: Eventi customizzati per integrazione seamless

**Integrazione Backend-Frontend:**
- ✅ **API RelationEngine**: Utilizzo completo endpoint /api/relations/* per CRUD
- ✅ **WebSocket Events**: Sottoscrizione relation-created/updated/deleted con propagazione
- ✅ **Schema Integration**: Compatibilità con SchemaService per validazione attributi
- ✅ **EntityService Integration**: Ricerca e selezione entità per creazione relazioni

**✅ RISOLUZIONE PROBLEMA RELAZIONI UNIVERSALI (03 Gennaio 2025):**

**Problema Identificato:**
- **Validazione troppo restrittiva**: Schema relazioni "Conosce" limitato a Persona↔Persona
- **Errore**: "Tipo sorgente non valido: Contact. Tipi consentiti: Persona"
- **Richiesta utente**: Permettere relazioni tra qualsiasi tipo di entità

**✅ Soluzione Implementata - Supporto Wildcard "*":**

**1. Modifica RelationSchema.validateRelation():**
- **File**: `mvp-ssot/backend/core/relationSchema.js` (righe 53-59)
- **Cambiamento**: Aggiunto controllo `!this.sourceTypes.includes('*')` e `!this.targetTypes.includes('*')`
- **Effetto**: Schema con wildcard "*" permettono relazioni tra qualsiasi tipo di entità

**2. Aggiornamento supportsRelation():**
- **Coerenza**: Metodo `supportsRelation()` aggiornato per supportare wildcard
- **Logica**: `sourceTypes.includes('*')` bypassa validazione tipo specifico

**3. Test Validazione Cross-Type:**
- ✅ **Relazione Contact → Persona**: Creata con successo usando tipo "Correlato"
- ✅ **Relazione Persona → Persona**: Funziona con tipi esistenti "Conosce"
- ✅ **Sistema Permissivo**: Relazioni senza schema definito vengono accettate
- ✅ **4 relazioni totali**: 1 cross-type + 3 same-type

**4. Aggiornamento Pagina Test:**
- **Tipo predefinito**: Ripristinato "Contact" per testing cross-type
- **Relazioni universali**: Aggiunti tipi "Correlato", "È_Connesso_A", "Ha_Relazione_Con"
- **Quick actions**: Configurate per relazioni universali

**Architettura Finale Relazioni:**
- **Schema Specifici**: Relazioni con validazione tipo-specifica (es. "Conosce": Persona↔Persona)
- **Schema Universali**: Relazioni con wildcard "*" per qualsiasi tipo (es. "Correlato": *↔*)
- **Schema-less**: Relazioni senza schema definito accettate in modalità permissiva
- **Backward Compatibility**: Schema esistenti continuano a funzionare normalmente

**Vantaggi Soluzione:**
- ✅ **Flessibilità**: Relazioni tra qualsiasi combinazione di tipi entità
- ✅ **Controllo Semantico**: Schema specifici mantengono validazione quando necessario
- ✅ **Evolutiva**: Sistema supporta sia relazioni specifiche che universali
- ✅ **Compatibilità**: Nessuna modifica breaking per sistema esistente

</rewritten_file> 